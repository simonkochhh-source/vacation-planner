import { Coordinates } from '../types';

// Web-based destination discovery service
export interface WebDestination {
  id: string;
  name: string;
  description: string;
  location: string;
  coordinates?: Coordinates;
  category: string;
  rating?: number;
  imageUrl?: string;
  websiteUrl?: string;
  tags: string[];
  estimatedVisitDuration?: number; // in hours
  bestTimeToVisit?: string;
  entryFee?: {
    adult?: number;
    child?: number;
    currency: string;
  };
  source: 'wikipedia' | 'tripadvisor' | 'google_places' | 'local_tourism' | 'mock';
}

export interface DestinationSearchFilters {
  category?: string[];
  location?: string;
  radius?: number; // km
  minRating?: number;
  maxPrice?: number;
  tags?: string[];
  language?: string;
}

class WebDestinationService {
  private readonly WIKIPEDIA_API = 'https://de.wikipedia.org/api/rest_v1';
  private readonly OPENSTREETMAP_API = 'https://nominatim.openstreetmap.org';
  
  /**
   * Search for destinations on the web
   */
  async searchWebDestinations(
    query: string,
    filters: DestinationSearchFilters = {}
  ): Promise<WebDestination[]> {
    const results: WebDestination[] = [];
    
    try {
      // Search multiple sources in parallel
      const [wikipediaResults, placesResults, mockResults] = await Promise.allSettled([
        this.searchWikipedia(query, filters),
        this.searchGooglePlaces(query, filters),
        this.getMockDestinations(query, filters)
      ]);

      // Add Wikipedia results
      if (wikipediaResults.status === 'fulfilled') {
        results.push(...wikipediaResults.value);
      }

      // Add Google Places results
      if (placesResults.status === 'fulfilled') {
        results.push(...placesResults.value);
      }

      // Add mock results as fallback
      if (mockResults.status === 'fulfilled') {
        results.push(...mockResults.value);
      }
      
    } catch (error) {
      console.error('Web destination search error:', error);
    }
    
    // Remove duplicates and limit results
    const uniqueResults = this.removeDuplicates(results);
    return uniqueResults.slice(0, 20);
  }

  /**
   * Get destination details with enriched information
   */
  async getDestinationDetails(destination: WebDestination): Promise<WebDestination> {
    try {
      // Enrich with coordinates if missing
      if (!destination.coordinates && destination.location) {
        const coords = await this.geocodeLocation(destination.location);
        if (coords) {
          destination.coordinates = coords;
        }
      }

      return destination;
    } catch (error) {
      console.error('Error enriching destination details:', error);
      return destination;
    }
  }

  /**
   * Search destinations by region/area
   */
  async getDestinationsByRegion(
    region: string,
    filters: DestinationSearchFilters = {}
  ): Promise<WebDestination[]> {
    const query = `sehenswürdigkeiten ${region} deutschland`;
    return this.searchWebDestinations(query, {
      ...filters,
      location: region
    });
  }

  /**
   * Get trending/popular destinations
   */
  async getTrendingDestinations(
    country: string = 'Deutschland',
    limit: number = 10
  ): Promise<WebDestination[]> {
    try {
      // Search for popular destinations via Wikipedia
      const popularQueries = [
        'Sehenswürdigkeiten Deutschland',
        'Touristische Attraktionen Deutschland',
        'UNESCO Weltkulturerbe Deutschland',
        'Nationalparks Deutschland'
      ];
      
      const results: WebDestination[] = [];
      for (const query of popularQueries.slice(0, 2)) { // Limit to avoid rate limiting
        const searchResults = await this.searchWikipedia(query);
        results.push(...searchResults.slice(0, 3)); // Take top 3 from each
      }
      
      // Add mock results as fallback
      const mockResults = await this.getMockTrendingDestinations(country, limit);
      results.push(...mockResults);
      
      return this.removeDuplicates(results).slice(0, limit);
    } catch (error) {
      console.error('Error fetching trending destinations:', error);
      // Fallback to mock data
      return this.getMockTrendingDestinations(country, limit);
    }
  }

  /**
   * Search Wikipedia for destinations
   */
  private async searchWikipedia(
    query: string,
    filters: DestinationSearchFilters = {}
  ): Promise<WebDestination[]> {
    try {
      // First, search for articles
      const searchUrl = `https://de.wikipedia.org/w/api.php?` +
        `action=query&` +
        `list=search&` +
        `srsearch=${encodeURIComponent(query + ' Deutschland')}&` +
        `format=json&` +
        `origin=*&` +
        `srlimit=10`;

      const searchResponse = await fetch(searchUrl);
      if (!searchResponse.ok) {
        throw new Error('Wikipedia search failed');
      }

      const searchData = await searchResponse.json();
      const searchResults = searchData.query?.search || [];

      const destinations: WebDestination[] = [];

      // Process each search result
      for (const result of searchResults.slice(0, 5)) {
        try {
          const destination = await this.getWikipediaDestination(result.title);
          if (destination) {
            destinations.push(destination);
          }
        } catch (error) {
          console.warn(`Failed to process Wikipedia article: ${result.title}`, error);
        }
      }

      return destinations;
    } catch (error) {
      console.error('Wikipedia search error:', error);
      return [];
    }
  }

  /**
   * Get detailed Wikipedia destination information
   */
  private async getWikipediaDestination(title: string): Promise<WebDestination | null> {
    try {
      // Get page info, extract, and coordinates
      const infoUrl = `https://de.wikipedia.org/w/api.php?` +
        `action=query&` +
        `titles=${encodeURIComponent(title)}&` +
        `prop=extracts|coordinates|pageimages|info&` +
        `exintro=true&` +
        `exlimit=1&` +
        `explaintext=true&` +
        `exsectionformat=plain&` +
        `piprop=thumbnail&` +
        `pithumbsize=300&` +
        `inprop=url&` +
        `format=json&` +
        `origin=*`;

      const response = await fetch(infoUrl);
      if (!response.ok) return null;

      const data = await response.json();
      const pages = data.query?.pages;
      if (!pages) return null;

      const pageId = Object.keys(pages)[0];
      const page = pages[pageId];

      if (page.missing) return null;

      const extract = page.extract || '';
      if (extract.length < 100) return null; // Skip very short articles

      // Extract coordinates if available
      let coordinates: Coordinates | undefined;
      if (page.coordinates && page.coordinates.length > 0) {
        coordinates = {
          lat: page.coordinates[0].lat,
          lng: page.coordinates[0].lon
        };
      }

      // Determine category based on content
      const category = this.categorizeFromWikipedia(extract, title);

      // Extract tags from content
      const tags = this.extractTagsFromText(extract, title);

      const destination: WebDestination = {
        id: `wikipedia-${pageId}`,
        name: title,
        description: extract.substring(0, 300) + (extract.length > 300 ? '...' : ''),
        location: this.extractLocationFromText(extract) || title,
        coordinates,
        category,
        imageUrl: page.thumbnail?.source,
        websiteUrl: page.fullurl,
        tags,
        estimatedVisitDuration: this.estimateVisitDuration(category),
        source: 'wikipedia'
      };

      return destination;
    } catch (error) {
      console.error(`Error getting Wikipedia destination for ${title}:`, error);
      return null;
    }
  }

  /**
   * Search Google Places for destinations
   */
  private async searchGooglePlaces(
    query: string,
    filters: DestinationSearchFilters = {}
  ): Promise<WebDestination[]> {
    try {
      // Use the existing Google Places Text Search
      const placesQuery = `${query} sehenswürdigkeiten deutschland`;
      
      // For now, use simplified approach due to CORS limitations
      // In production, this would go through a backend proxy
      const destinations: WebDestination[] = [];
      
      // Use Nominatim to search for places
      const nominatimUrl = `${this.OPENSTREETMAP_API}/search?` +
        `q=${encodeURIComponent(placesQuery)}&` +
        `format=json&` +
        `limit=10&` +
        `countrycodes=de&` +
        `extratags=1&` +
        `addressdetails=1`;

      const response = await fetch(nominatimUrl);
      if (!response.ok) return destinations;

      const places = await response.json();

      for (const place of places.slice(0, 5)) {
        if (place.type && this.isRelevantPlaceType(place.type)) {
          const destination = await this.convertNominatimToDestination(place);
          if (destination) {
            destinations.push(destination);
          }
        }
      }

      return destinations;
    } catch (error) {
      console.error('Google Places search error:', error);
      return [];
    }
  }

  /**
   * Check if Nominatim place type is relevant for tourism
   */
  private isRelevantPlaceType(type: string): boolean {
    const relevantTypes = [
      'tourism', 'attraction', 'museum', 'castle', 'monument', 
      'memorial', 'artwork', 'viewpoint', 'gallery', 'theatre',
      'park', 'nature_reserve', 'national_park'
    ];
    return relevantTypes.includes(type);
  }

  /**
   * Convert Nominatim result to WebDestination
   */
  private async convertNominatimToDestination(place: any): Promise<WebDestination | null> {
    try {
      const name = place.display_name.split(',')[0];
      const category = this.mapNominatimTypeToCategory(place.type);
      
      const destination: WebDestination = {
        id: `nominatim-${place.place_id}`,
        name,
        description: `${place.type} in ${place.address?.city || place.address?.town || place.address?.state || 'Deutschland'}`,
        location: place.display_name,
        coordinates: {
          lat: parseFloat(place.lat),
          lng: parseFloat(place.lon)
        },
        category,
        tags: [place.type, place.address?.state || 'Deutschland'].filter(Boolean),
        estimatedVisitDuration: this.estimateVisitDuration(category),
        source: 'google_places'
      };

      return destination;
    } catch (error) {
      console.error('Error converting Nominatim place:', error);
      return null;
    }
  }

  /**
   * Map Nominatim types to our categories
   */
  private mapNominatimTypeToCategory(type: string): string {
    const typeMap: Record<string, string> = {
      'tourism': 'Sehenswürdigkeit',
      'attraction': 'Sehenswürdigkeit',
      'museum': 'Museum',
      'castle': 'Historische Stätte',
      'monument': 'Historische Stätte',
      'memorial': 'Historische Stätte',
      'artwork': 'Kultur',
      'viewpoint': 'Natur & Landschaft',
      'gallery': 'Museum',
      'theatre': 'Kultur',
      'park': 'Natur & Landschaft',
      'nature_reserve': 'Natur & Landschaft',
      'national_park': 'Natur & Landschaft'
    };
    return typeMap[type] || 'Sehenswürdigkeit';
  }

  /**
   * Remove duplicate destinations
   */
  private removeDuplicates(destinations: WebDestination[]): WebDestination[] {
    const seen = new Set<string>();
    const unique: WebDestination[] = [];

    for (const dest of destinations) {
      const key = dest.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(dest);
      }
    }

    return unique;
  }

  /**
   * Categorize destination from Wikipedia content
   */
  private categorizeFromWikipedia(text: string, title: string): string {
    const lowerText = (text + title).toLowerCase();
    
    if (lowerText.includes('museum') || lowerText.includes('galerie')) return 'Museum';
    if (lowerText.includes('schloss') || lowerText.includes('burg') || lowerText.includes('kloster')) return 'Historische Stätte';
    if (lowerText.includes('kirche') || lowerText.includes('dom') || lowerText.includes('kathedrale')) return 'Religiöse Stätte';
    if (lowerText.includes('nationalpark') || lowerText.includes('naturpark') || lowerText.includes('landschaft')) return 'Natur & Landschaft';
    if (lowerText.includes('unesco') || lowerText.includes('welterbe') || lowerText.includes('weltkulturerbe')) return 'UNESCO-Weltkulturerbe';
    if (lowerText.includes('theater') || lowerText.includes('oper') || lowerText.includes('kultur')) return 'Kultur';
    
    return 'Sehenswürdigkeit';
  }

  /**
   * Extract tags from text content
   */
  private extractTagsFromText(text: string, title: string): string[] {
    const content = (text + title).toLowerCase();
    const tags: string[] = [];
    
    const tagPatterns = [
      { pattern: /architektur|barock|gotisch|romanisch/, tag: 'Architektur' },
      { pattern: /geschichte|historisch|mittelalter/, tag: 'Geschichte' },
      { pattern: /natur|landschaft|wandern|berg/, tag: 'Natur' },
      { pattern: /kultur|kunst|galerie|ausstellung/, tag: 'Kultur' },
      { pattern: /tourist|besucher|sehenswürdigkeit/, tag: 'Tourismus' },
      { pattern: /unesco|welterbe|weltkulturerbe/, tag: 'UNESCO' },
      { pattern: /restaurant|küche|essen/, tag: 'Gastronomie' },
      { pattern: /familie|kinder|spielplatz/, tag: 'Familie' }
    ];
    
    for (const { pattern, tag } of tagPatterns) {
      if (pattern.test(content)) {
        tags.push(tag);
      }
    }
    
    return tags.length > 0 ? tags : ['Sehenswürdigkeit'];
  }

  /**
   * Extract location from text
   */
  private extractLocationFromText(text: string): string | null {
    const locationMatch = text.match(/in ([A-ZÄÖÜ][a-zäöüß\s-]+(?:, [A-ZÄÖÜ][a-zäöüß\s-]+)*)/);
    return locationMatch ? locationMatch[1] : null;
  }

  /**
   * Estimate visit duration based on category
   */
  private estimateVisitDuration(category: string): number {
    const durationMap: Record<string, number> = {
      'Museum': 3,
      'Historische Stätte': 2,
      'Religiöse Stätte': 1,
      'Natur & Landschaft': 4,
      'UNESCO-Weltkulturerbe': 3,
      'Kultur': 2,
      'Sehenswürdigkeit': 2
    };
    
    return durationMap[category] || 2;
  }

  /**
   * Geocode a location name to coordinates
   */
  private async geocodeLocation(locationName: string): Promise<Coordinates | null> {
    try {
      const response = await fetch(
        `${this.OPENSTREETMAP_API}/search?q=${encodeURIComponent(locationName)}&format=json&limit=1&countrycodes=de`
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  /**
   * Mock destination data for development
   */
  private async getMockDestinations(
    query: string,
    filters: DestinationSearchFilters
  ): Promise<WebDestination[]> {
    const mockDatabase: WebDestination[] = [
      {
        id: 'rothenburg-medieval',
        name: 'Rothenburg ob der Tauber - Mittelalterliche Altstadt',
        description: 'Eine der besterhaltenen mittelalterlichen Städte Deutschlands mit malerischen Fachwerkhäusern und historischen Stadtmauern.',
        location: 'Rothenburg ob der Tauber, Bayern',
        coordinates: { lat: 49.3779, lng: 10.1795 },
        category: 'Historische Stätte',
        rating: 4.6,
        imageUrl: '/api/placeholder/300/200',
        tags: ['Mittelalter', 'Architektur', 'Romantische Straße', 'Fotografie'],
        estimatedVisitDuration: 4,
        bestTimeToVisit: 'Frühling bis Herbst',
        source: 'mock'
      },
      {
        id: 'berchtesgaden-national-park',
        name: 'Nationalpark Berchtesgaden - Königssee',
        description: 'Kristallklarer Bergsee umgeben von majestätischen Alpengipfeln. Bootsfahrt zur St. Bartholomä Kapelle.',
        location: 'Berchtesgaden, Bayern',
        coordinates: { lat: 47.5941, lng: 12.9773 },
        category: 'Natur & Landschaft',
        rating: 4.8,
        imageUrl: '/api/placeholder/300/200',
        tags: ['Bergsee', 'Wandern', 'Alpen', 'Bootsfahrt', 'Nationalpark'],
        estimatedVisitDuration: 6,
        bestTimeToVisit: 'Mai bis Oktober',
        entryFee: { adult: 18, child: 9, currency: 'EUR' },
        source: 'mock'
      },
      {
        id: 'dresden-frauenkirche',
        name: 'Dresden - Frauenkirche und Altstadt',
        description: 'Barocke Pracht an der Elbe mit der wiederaufgebauten Frauenkirche als Wahrzeichen der Versöhnung.',
        location: 'Dresden, Sachsen',
        coordinates: { lat: 51.0515, lng: 13.7373 },
        category: 'Architektur & Kultur',
        rating: 4.5,
        imageUrl: '/api/placeholder/300/200',
        tags: ['Barock', 'Kirche', 'Geschichte', 'Architektur', 'Elbe'],
        estimatedVisitDuration: 5,
        bestTimeToVisit: 'Ganzjährig',
        source: 'mock'
      },
      {
        id: 'black-forest-cuckoo-clocks',
        name: 'Schwarzwald - Kuckucksuhren-Route',
        description: 'Traditionelle Kuckucksuhren-Werkstätten und malerische Schwarzwalddörfer entlang der berühmten Route.',
        location: 'Schwarzwald, Baden-Württemberg',
        coordinates: { lat: 48.1380, lng: 8.2139 },
        category: 'Handwerk & Tradition',
        rating: 4.3,
        imageUrl: '/api/placeholder/300/200',
        tags: ['Handwerk', 'Tradition', 'Schwarzwald', 'Kuckucksuhren', 'Dörfer'],
        estimatedVisitDuration: 8,
        bestTimeToVisit: 'Frühling bis Herbst',
        source: 'mock'
      },
      {
        id: 'ruegen-chalk-cliffs',
        name: 'Rügen - Kreidefelsen Jasmund',
        description: 'Spektakuläre weiße Kreidefelsen an der Ostsee, berühmt durch Caspar David Friedrichs Gemälde.',
        location: 'Rügen, Mecklenburg-Vorpommern',
        coordinates: { lat: 54.5701, lng: 13.6622 },
        category: 'Natur & Landschaft',
        rating: 4.7,
        imageUrl: '/api/placeholder/300/200',
        tags: ['Kreidefelsen', 'Ostsee', 'Wandern', 'Fotografie', 'Nationalpark'],
        estimatedVisitDuration: 4,
        bestTimeToVisit: 'April bis Oktober',
        entryFee: { adult: 8, child: 4, currency: 'EUR' },
        source: 'mock'
      },
      {
        id: 'wuerzburg-residence',
        name: 'Würzburg - Würzburger Residenz',
        description: 'UNESCO-Weltkulturerbe: Prächtige Barockresidenz mit dem größten Deckenfresko der Welt von Tiepolo.',
        location: 'Würzburg, Bayern',
        coordinates: { lat: 49.7935, lng: 9.9399 },
        category: 'UNESCO-Weltkulturerbe',
        rating: 4.4,
        imageUrl: '/api/placeholder/300/200',
        tags: ['UNESCO', 'Barock', 'Residenz', 'Fresko', 'Architektur'],
        estimatedVisitDuration: 3,
        bestTimeToVisit: 'Ganzjährig',
        entryFee: { adult: 9, child: 0, currency: 'EUR' },
        source: 'mock'
      },
      {
        id: 'harz-brocken',
        name: 'Harz - Brocken mit Harzer Schmalspurbahn',
        description: 'Fahrt mit der historischen Dampflok auf den höchsten Berg Norddeutschlands.',
        location: 'Harz, Sachsen-Anhalt',
        coordinates: { lat: 51.7998, lng: 10.6167 },
        category: 'Natur & Transport',
        rating: 4.5,
        imageUrl: '/api/placeholder/300/200',
        tags: ['Berg', 'Dampflok', 'Wandern', 'Geschichte', 'Natur'],
        estimatedVisitDuration: 7,
        bestTimeToVisit: 'Mai bis Oktober',
        entryFee: { adult: 32, child: 19, currency: 'EUR' },
        source: 'mock'
      },
      {
        id: 'bamberg-old-town',
        name: 'Bamberg - Altstadt und Klein-Venedig',
        description: 'UNESCO-Weltkulturerbe mit mittelalterlicher Altstadt und malerischem Fischerviertel "Klein-Venedig".',
        location: 'Bamberg, Bayern',
        coordinates: { lat: 49.8975, lng: 10.9026 },
        category: 'UNESCO-Weltkulturerbe',
        rating: 4.6,
        imageUrl: '/api/placeholder/300/200',
        tags: ['UNESCO', 'Mittelalter', 'Fachwerk', 'Fluss', 'Bier'],
        estimatedVisitDuration: 4,
        bestTimeToVisit: 'April bis Oktober',
        source: 'mock'
      }
    ];

    // Filter by query
    const lowerQuery = query.toLowerCase();
    let filtered = mockDatabase.filter(dest =>
      dest.name.toLowerCase().includes(lowerQuery) ||
      dest.description.toLowerCase().includes(lowerQuery) ||
      dest.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      dest.location.toLowerCase().includes(lowerQuery)
    );

    // Apply filters
    if (filters.category && filters.category.length > 0) {
      filtered = filtered.filter(dest =>
        filters.category!.some(cat => dest.category.toLowerCase().includes(cat.toLowerCase()))
      );
    }

    if (filters.minRating) {
      filtered = filtered.filter(dest => (dest.rating || 0) >= filters.minRating!);
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(dest =>
        filters.tags!.some(tag => 
          dest.tags.some(destTag => destTag.toLowerCase().includes(tag.toLowerCase()))
        )
      );
    }

    return filtered;
  }

  /**
   * Mock trending destinations
   */
  private async getMockTrendingDestinations(
    country: string,
    limit: number
  ): Promise<WebDestination[]> {
    const trending: WebDestination[] = [
      {
        id: 'spreewald-biosphere',
        name: 'Spreewald - Biosphärenreservat',
        description: 'Einzigartiges Wasserwegenetz mit traditionellen Kahnfahrten durch urwüchsige Natur.',
        location: 'Spreewald, Brandenburg',
        coordinates: { lat: 51.8559, lng: 14.2447 },
        category: 'UNESCO-Biosphärenreservat',
        rating: 4.4,
        imageUrl: '/api/placeholder/300/200',
        tags: ['Biosphäre', 'Kahnfahrt', 'Natur', 'Gurken', 'Sorbisch'],
        estimatedVisitDuration: 6,
        bestTimeToVisit: 'April bis Oktober',
        source: 'mock'
      },
      {
        id: 'wadden-sea-national-park',
        name: 'Wattenmeer - Nationalpark',
        description: 'UNESCO-Weltnaturerbe: Wattwanderungen und Seehundbeobachtung im größten Gezeitengebiet der Welt.',
        location: 'Nordsee, Schleswig-Holstein',
        coordinates: { lat: 54.1203, lng: 8.6436 },
        category: 'UNESCO-Weltnaturerbe',
        rating: 4.5,
        imageUrl: '/api/placeholder/300/200',
        tags: ['Wattenmeer', 'Seehunde', 'Gezeiten', 'UNESCO', 'Wattwandern'],
        estimatedVisitDuration: 5,
        bestTimeToVisit: 'Mai bis September',
        source: 'mock'
      }
    ];

    return trending.slice(0, limit);
  }

  /**
   * Get destination categories for filtering
   */
  getDestinationCategories(): string[] {
    return [
      'Natur & Landschaft',
      'Historische Stätte', 
      'Architektur & Kultur',
      'UNESCO-Weltkulturerbe',
      'UNESCO-Weltnaturerbe',
      'UNESCO-Biosphärenreservat',
      'Handwerk & Tradition',
      'Natur & Transport',
      'Museum',
      'Religiöse Stätte',
      'Freizeitpark',
      'Wellness & Erholung'
    ];
  }

  /**
   * Get popular tags for filtering
   */
  getPopularTags(): string[] {
    return [
      'Wandern', 'Architektur', 'Geschichte', 'Natur', 'Fotografie',
      'Familie', 'Romantik', 'Kultur', 'UNESCO', 'Barock',
      'Mittelalter', 'Berge', 'Seen', 'Küste', 'Städte',
      'Dörfer', 'Handwerk', 'Tradition', 'Wellness', 'Abenteuer'
    ];
  }
}

// Global instance
export const webDestinationService = new WebDestinationService();