import { Coordinates } from '../types';

// Enhanced interfaces for better type safety and functionality
export interface EnhancedPlaceResult {
  place_id: string;
  name: string;
  display_name: string;
  formatted_address: string;
  coordinates: Coordinates;
  type: string;
  class: string;
  category: PlaceCategory;
  importance?: number;
  icon?: string;
  address_components?: AddressComponent[];
  contact_info?: ContactInfo;
  opening_hours?: OpeningHours;
  rating?: number;
  price_level?: number;
}

export interface EnhancedPlacePrediction {
  place_id: string;
  description: string;
  display_name: string;
  structured_formatting: {
    main_text: string;
    secondary_text?: string;
  };
  type: string;
  class: string;
  category: PlaceCategory;
  coordinates: Coordinates;
  distance?: number; // Distance in meters from search center
  relevance_score?: number; // Search relevance score
}

export interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface ContactInfo {
  phone?: string;
  website?: string;
  email?: string;
}

export interface OpeningHours {
  open_now?: boolean;
  periods?: {
    open: { day: number; time: string };
    close?: { day: number; time: string };
  }[];
  weekday_text?: string[];
}

export enum PlaceCategory {
  ACCOMMODATION = 'accommodation',
  CAMPING = 'camping',
  RESTAURANT = 'restaurant',
  ATTRACTION = 'attraction',
  TRANSPORT = 'transport',
  FUEL = 'fuel',
  SHOPPING = 'shopping',
  HEALTHCARE = 'healthcare',
  ENTERTAINMENT = 'entertainment',
  NATURE = 'nature',
  EDUCATION = 'education',
  FINANCE = 'finance',
  OTHER = 'other'
}

export interface EnhancedSearchOptions {
  location?: Coordinates;
  radius?: number;
  countrycodes?: string;
  addressdetails?: boolean;
  limit?: number;
  category?: PlaceCategory;
  extratags?: boolean;
  namedetails?: boolean;
  dedupe?: boolean;
}

class EnhancedOpenStreetMapService {
  private baseUrl = 'https://nominatim.openstreetmap.org';
  private overpassUrl = 'https://overpass-api.de/api/interpreter';
  private useMockData: boolean;
  private requestCache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.useMockData = process.env.REACT_APP_USE_MOCK_PLACES === 'true';
    console.log('🚀 EnhancedOpenStreetMapService initialized:', {
      REACT_APP_USE_MOCK_PLACES: process.env.REACT_APP_USE_MOCK_PLACES,
      useMockData: this.useMockData,
      NODE_ENV: process.env.NODE_ENV
    });
  }

  // Enhanced search with category support and better filtering
  async searchPlaces(query: string, options: EnhancedSearchOptions = {}): Promise<EnhancedPlacePrediction[]> {
    console.log('🔍 EnhancedOpenStreetMapService: searchPlaces called', { query, options });
    
    if (this.useMockData) {
      console.log('🔍 Using mock data');
      return this.getEnhancedMockPredictions(query, options);
    }

    if (!query.trim()) {
      return [];
    }

    // Check cache first
    const cacheKey = `search_${query}_${JSON.stringify(options)}`;
    const cached = this.requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log('🔍 Returning cached results');
      return cached.data;
    }

    try {
      const params = new URLSearchParams({
        q: query.trim(),
        format: 'json',
        addressdetails: '1',
        extratags: '1',
        namedetails: '1',
        limit: (options.limit || 12).toString(),
        ...(options.countrycodes ? { countrycodes: options.countrycodes } : {}),
        'accept-language': 'de,en'
      });

      // Add location bias if provided
      if (options.location) {
        params.append('lat', options.location.lat.toString());
        params.append('lon', options.location.lng.toString());
        if (options.radius) {
          // Convert radius to viewbox (rough conversion)
          const delta = options.radius / 111320; // meters to degrees
          const viewbox = [
            options.location.lng - delta,
            options.location.lat + delta,
            options.location.lng + delta,
            options.location.lat - delta
          ].join(',');
          params.append('viewbox', viewbox);
          params.append('bounded', '1');
        }
      }

      const url = `${this.baseUrl}/search?${params}`;
      console.log('🔍 Making request to:', url);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'VacationPlanner/2.0 (https://vacation-planner.app)',
          'Accept': 'application/json'
        }
      });

      console.log('🔍 Response status:', response.status);
      
      if (!response.ok) {
        console.warn('Nominatim search failed:', response.status, response.statusText);
        const fallbackResults = this.getEnhancedMockPredictions(query, options);
        console.warn('Falling back to mock data, returned', fallbackResults.length, 'results');
        return fallbackResults;
      }

      const data = await response.json();
      console.log('🔍 Response data:', data.length, 'results');
      
      // Convert to enhanced predictions
      let enhancedResults = data.map((place: any): EnhancedPlacePrediction => {
        const category = this.categorizePlace(place.type, place.class, place.extratags || {});
        const distance = options.location ? this.calculateDistance(
          options.location,
          { lat: parseFloat(place.lat), lng: parseFloat(place.lon) }
        ) : undefined;

        return {
          place_id: place.place_id.toString(),
          description: place.display_name,
          display_name: place.display_name,
          structured_formatting: {
            main_text: place.name || this.extractMainText(place.display_name),
            secondary_text: this.extractSecondaryText(place.display_name, place.name)
          },
          type: place.type || 'unknown',
          class: place.class || 'unknown',
          category,
          coordinates: {
            lat: parseFloat(place.lat),
            lng: parseFloat(place.lon)
          },
          distance,
          relevance_score: this.calculateRelevanceScore(query, place, distance)
        };
      });

      // Filter by category if specified
      if (options.category) {
        enhancedResults = enhancedResults.filter((result: EnhancedPlacePrediction) => result.category === options.category);
      }

      // Sort by relevance and distance
      enhancedResults.sort((a: EnhancedPlacePrediction, b: EnhancedPlacePrediction) => {
        // Prioritize relevance score
        const relevanceDiff = (b.relevance_score || 0) - (a.relevance_score || 0);
        if (Math.abs(relevanceDiff) > 0.1) {
          return relevanceDiff;
        }
        
        // Then sort by distance if available
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        
        return 0;
      });

      // Remove duplicates if requested
      if (options.dedupe !== false) {
        enhancedResults = this.removeDuplicates(enhancedResults);
      }

      const finalResults = enhancedResults.slice(0, options.limit || 12);
      
      // Cache the results
      this.requestCache.set(cacheKey, { data: finalResults, timestamp: Date.now() });
      
      console.log('🔍 Processed results:', finalResults.length);
      return finalResults;

    } catch (error) {
      console.error('🚨 Enhanced Nominatim API error:', error);
      const fallbackResults = this.getEnhancedMockPredictions(query, options);
      console.warn('Falling back to mock data, returned', fallbackResults.length, 'results');
      return fallbackResults;
    }
  }

  // Categorize places based on type, class, and tags
  private categorizePlace(type: string, placeClass: string, extratags: Record<string, string> = {}): PlaceCategory {
    const typeKey = type?.toLowerCase() || '';
    const classKey = placeClass?.toLowerCase() || '';
    const tags = Object.keys(extratags).map(k => k.toLowerCase());

    // Accommodation
    if (['hotel', 'hostel', 'guest_house', 'apartment', 'resort', 'motel', 'bed_and_breakfast'].includes(typeKey) ||
        tags.some(tag => ['accommodation', 'hotel', 'hostel'].includes(tag))) {
      return PlaceCategory.ACCOMMODATION;
    }

    // Camping
    if (['camp_site', 'camping', 'campground', 'caravan_site'].includes(typeKey) ||
        tags.some(tag => ['camp_site', 'camping'].includes(tag))) {
      return PlaceCategory.CAMPING;
    }

    // Restaurants & Food
    if (['restaurant', 'cafe', 'bar', 'pub', 'fast_food', 'food_court', 'biergarten', 'ice_cream'].includes(typeKey) ||
        (classKey === 'amenity' && ['restaurant', 'cafe', 'bar', 'pub', 'fast_food'].includes(typeKey))) {
      return PlaceCategory.RESTAURANT;
    }

    // Attractions & Tourism
    if (['attraction', 'museum', 'castle', 'monument', 'memorial', 'artwork', 'viewpoint', 'gallery', 'zoo', 'aquarium', 'theme_park'].includes(typeKey) ||
        classKey === 'tourism' || classKey === 'historic') {
      return PlaceCategory.ATTRACTION;
    }

    // Transport
    if (['airport', 'train_station', 'bus_station', 'subway_entrance', 'tram_stop', 'ferry_terminal'].includes(typeKey) ||
        (classKey === 'railway' || classKey === 'aeroway' || classKey === 'public_transport')) {
      return PlaceCategory.TRANSPORT;
    }

    // Fuel
    if (['fuel', 'gas_station', 'charging_station'].includes(typeKey)) {
      return PlaceCategory.FUEL;
    }

    // Shopping
    if (['mall', 'supermarket', 'shop', 'marketplace', 'department_store'].includes(typeKey) ||
        classKey === 'shop') {
      return PlaceCategory.SHOPPING;
    }

    // Healthcare
    if (['hospital', 'clinic', 'pharmacy', 'dentist', 'veterinary'].includes(typeKey)) {
      return PlaceCategory.HEALTHCARE;
    }

    // Entertainment
    if (['cinema', 'theatre', 'nightclub', 'casino', 'amusement_arcade', 'bowling_alley'].includes(typeKey)) {
      return PlaceCategory.ENTERTAINMENT;
    }

    // Nature
    if (['park', 'forest', 'nature_reserve', 'beach', 'mountain_peak', 'lake', 'river'].includes(typeKey) ||
        classKey === 'natural' || classKey === 'leisure') {
      return PlaceCategory.NATURE;
    }

    // Education
    if (['school', 'university', 'college', 'library', 'research_institute'].includes(typeKey)) {
      return PlaceCategory.EDUCATION;
    }

    // Finance
    if (['bank', 'atm', 'bureau_de_change'].includes(typeKey)) {
      return PlaceCategory.FINANCE;
    }

    return PlaceCategory.OTHER;
  }

  // Calculate distance between two coordinates
  private calculateDistance(from: Coordinates, to: Coordinates): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLon = (to.lng - from.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in meters
  }

  // Calculate search relevance score
  private calculateRelevanceScore(query: string, place: any, distance?: number): number {
    const queryLower = query.toLowerCase();
    const name = (place.name || '').toLowerCase();
    const displayName = (place.display_name || '').toLowerCase();
    
    let score = 0;
    
    // Exact name match gets highest score
    if (name === queryLower) {
      score += 100;
    } else if (name.includes(queryLower)) {
      score += 80;
    } else if (name.startsWith(queryLower)) {
      score += 70;
    }
    
    // Display name match
    if (displayName.includes(queryLower)) {
      score += 30;
    }
    
    // Query words match
    const queryWords = queryLower.split(' ');
    const nameWords = name.split(' ');
    const matchingWords = queryWords.filter((qw: string) => nameWords.some((nw: string) => nw.includes(qw))).length;
    score += matchingWords * 20;
    
    // Importance boost (from OSM data)
    if (place.importance) {
      score += place.importance * 50;
    }
    
    // Distance penalty (closer is better)
    if (distance) {
      const maxDistance = 50000; // 50km
      const distancePenalty = Math.min(distance / maxDistance, 1) * 20;
      score -= distancePenalty;
    }
    
    return Math.max(0, score);
  }

  // Remove duplicate results
  private removeDuplicates(results: EnhancedPlacePrediction[]): EnhancedPlacePrediction[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = `${result.structured_formatting.main_text}_${result.coordinates.lat.toFixed(4)}_${result.coordinates.lng.toFixed(4)}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Enhanced mock data with better categorization
  private getEnhancedMockPredictions(query: string, options: EnhancedSearchOptions = {}): EnhancedPlacePrediction[] {
    const mockData: EnhancedPlacePrediction[] = [
      // Hotels & Accommodation
      {
        place_id: 'enhanced_mock_1',
        description: 'Hotel Vier Jahreszeiten Kempinski München, Maximilianstraße, München, Deutschland',
        display_name: 'Hotel Vier Jahreszeiten Kempinski München, Maximilianstraße, München, Deutschland',
        structured_formatting: { 
          main_text: 'Hotel Vier Jahreszeiten Kempinski München', 
          secondary_text: 'Maximilianstraße, München, Deutschland' 
        },
        type: 'hotel',
        class: 'tourism',
        category: PlaceCategory.ACCOMMODATION,
        coordinates: { lat: 48.137154, lng: 11.579454 },
        relevance_score: 90
      },
      {
        place_id: 'enhanced_mock_2',
        description: 'MEININGER Hotel Berlin Alexanderplatz, Schönhauser Allee, Berlin, Deutschland',
        display_name: 'MEININGER Hotel Berlin Alexanderplatz, Schönhauser Allee, Berlin, Deutschland',
        structured_formatting: { 
          main_text: 'MEININGER Hotel Berlin Alexanderplatz', 
          secondary_text: 'Schönhauser Allee, Berlin, Deutschland' 
        },
        type: 'hostel',
        class: 'tourism',
        category: PlaceCategory.ACCOMMODATION,
        coordinates: { lat: 52.531677, lng: 13.411892 },
        relevance_score: 85
      },

      // Camping
      {
        place_id: 'enhanced_mock_3',
        description: 'Campingplatz Münsing am Starnberger See, Münsing, Deutschland',
        display_name: 'Campingplatz Münsing am Starnberger See, Münsing, Deutschland',
        structured_formatting: { 
          main_text: 'Campingplatz Münsing am Starnberger See', 
          secondary_text: 'Münsing, Deutschland' 
        },
        type: 'camp_site',
        class: 'tourism',
        category: PlaceCategory.CAMPING,
        coordinates: { lat: 47.910233, lng: 11.370944 },
        relevance_score: 88
      },

      // Restaurants
      {
        place_id: 'enhanced_mock_4',
        description: 'Zur Letzten Instanz, Waisenstraße, Berlin, Deutschland',
        display_name: 'Zur Letzten Instanz, Waisenstraße, Berlin, Deutschland',
        structured_formatting: { 
          main_text: 'Zur Letzten Instanz', 
          secondary_text: 'Waisenstraße, Berlin, Deutschland' 
        },
        type: 'restaurant',
        class: 'amenity',
        category: PlaceCategory.RESTAURANT,
        coordinates: { lat: 52.515833, lng: 13.424167 },
        relevance_score: 92
      },

      // Attractions
      {
        place_id: 'enhanced_mock_5',
        description: 'Neuschwanstein Castle, Neuschwansteinstraße, Schwangau, Deutschland',
        display_name: 'Schloss Neuschwanstein, Neuschwansteinstraße, Schwangau, Bayern, Deutschland',
        structured_formatting: { 
          main_text: 'Neuschwanstein Castle', 
          secondary_text: 'Schwangau, Bayern, Deutschland' 
        },
        type: 'castle',
        class: 'tourism',
        category: PlaceCategory.ATTRACTION,
        coordinates: { lat: 47.557574, lng: 10.749800 },
        relevance_score: 95
      },
      
      // Transportation
      {
        place_id: 'enhanced_mock_6',
        description: 'Flughafen München Franz Josef Strauß, München, Deutschland',
        display_name: 'Flughafen München Franz Josef Strauß, München, Deutschland',
        structured_formatting: { 
          main_text: 'Flughafen München Franz Josef Strauß', 
          secondary_text: 'München, Deutschland' 
        },
        type: 'airport',
        class: 'aeroway',
        category: PlaceCategory.TRANSPORT,
        coordinates: { lat: 48.353783, lng: 11.786086 },
        relevance_score: 80
      },

      // Fuel
      {
        place_id: 'enhanced_mock_7',
        description: 'Shell Tankstelle, Autobahn A8, München, Deutschland',
        display_name: 'Shell Tankstelle, Autobahn A8, München, Deutschland',
        structured_formatting: { 
          main_text: 'Shell Tankstelle', 
          secondary_text: 'Autobahn A8, München, Deutschland' 
        },
        type: 'fuel',
        class: 'amenity',
        category: PlaceCategory.FUEL,
        coordinates: { lat: 48.137154, lng: 11.575721 },
        relevance_score: 75
      }
    ];

    if (!query || query.length < 1) {
      return mockData.slice(0, 5);
    }

    const lowerQuery = query.toLowerCase();
    let filtered = mockData.filter(item => {
      const mainText = item.structured_formatting.main_text.toLowerCase();
      const secondaryText = item.structured_formatting.secondary_text?.toLowerCase() || '';
      const description = item.description.toLowerCase();
      
      return mainText.includes(lowerQuery) ||
             secondaryText.includes(lowerQuery) ||
             description.includes(lowerQuery) ||
             mainText.split(' ').some(word => word.startsWith(lowerQuery));
    });

    // Filter by category if specified
    if (options.category) {
      filtered = filtered.filter(item => item.category === options.category);
    }

    // Calculate distances if location provided
    if (options.location) {
      filtered = filtered.map(item => ({
        ...item,
        distance: this.calculateDistance(options.location!, item.coordinates)
      }));
      
      // Sort by distance
      filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    return filtered.slice(0, options.limit || 8);
  }

  // Helper methods
  private extractMainText(displayName: string): string {
    const parts = displayName.split(',');
    return parts[0]?.trim() || 'Unbekannter Ort';
  }

  private extractSecondaryText(displayName: string, name?: string): string {
    const parts = displayName.split(',');
    if (name && parts.length > 1) {
      return parts.slice(1).join(',').trim();
    }
    if (parts.length > 1) {
      return parts.slice(1).join(',').trim();
    }
    return '';
  }

  // Get enhanced place type icon
  getEnhancedPlaceIcon(category: PlaceCategory, type: string = '', placeClass: string = ''): string {
    switch (category) {
      case PlaceCategory.ACCOMMODATION:
        return '🏨';
      case PlaceCategory.CAMPING:
        return '⛺';
      case PlaceCategory.RESTAURANT:
        return '🍽️';
      case PlaceCategory.ATTRACTION:
        if (type === 'castle') return '🏰';
        if (type === 'museum') return '🏛️';
        if (type === 'monument') return '🗿';
        return '⭐';
      case PlaceCategory.TRANSPORT:
        if (type === 'airport') return '✈️';
        if (type === 'train_station') return '🚂';
        if (type === 'bus_station') return '🚌';
        return '🚇';
      case PlaceCategory.FUEL:
        return '⛽';
      case PlaceCategory.SHOPPING:
        return '🛍️';
      case PlaceCategory.HEALTHCARE:
        return '🏥';
      case PlaceCategory.ENTERTAINMENT:
        return '🎬';
      case PlaceCategory.NATURE:
        return '🏞️';
      case PlaceCategory.EDUCATION:
        return '🎓';
      case PlaceCategory.FINANCE:
        return '🏦';
      default:
        return '📍';
    }
  }

  // Cleanup method to clear old cache entries
  private cleanupCache() {
    const now = Date.now();
    this.requestCache.forEach((value, key) => {
      if (now - value.timestamp > this.cacheTimeout) {
        this.requestCache.delete(key);
      }
    });
  }
}

export const enhancedOpenStreetMapService = new EnhancedOpenStreetMapService();
export default enhancedOpenStreetMapService;