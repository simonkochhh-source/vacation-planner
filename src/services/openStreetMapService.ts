import { Coordinates } from '../types';

// OpenStreetMap and Nominatim API service for location search
export interface PlaceResult {
  place_id: string;
  name: string;
  display_name: string;
  formatted_address: string;
  coordinates: Coordinates;
  type: string;
  class: string;
  importance?: number;
  icon?: string;
}

export interface PlacePrediction {
  place_id: string;
  description: string;
  display_name: string;
  structured_formatting: {
    main_text: string;
    secondary_text?: string;
  };
  type: string;
  class: string;
  coordinates: Coordinates;
  importance?: number;
}

export interface SearchOptions {
  location?: Coordinates;
  radius?: number;
  countrycodes?: string;
  addressdetails?: boolean;
  limit?: number;
}

class OpenStreetMapService {
  private baseUrl = 'https://nominatim.openstreetmap.org';
  private useMockData: boolean;

  constructor() {
    this.useMockData = process.env.REACT_APP_USE_MOCK_PLACES === 'true';
    console.log('🚀 OpenStreetMapService initialized:', {
      REACT_APP_USE_MOCK_PLACES: process.env.REACT_APP_USE_MOCK_PLACES,
      useMockData: this.useMockData,
      NODE_ENV: process.env.NODE_ENV
    });
  }

  // Search for places using Nominatim API
  async searchPlaces(query: string, options: SearchOptions = {}): Promise<PlacePrediction[]> {
    console.log('openStreetMapService: searchPlaces called with query:', query, 'useMockData:', this.useMockData);
    
    if (this.useMockData) {
      console.log('openStreetMapService: Using mock data');
      return this.getMockPredictions(query);
    }

    if (!query.trim()) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        q: query.trim(),
        format: 'json',
        addressdetails: '1',
        limit: (options.limit || 8).toString(),
        ...(options.countrycodes ? { countrycodes: options.countrycodes } : {}),
        'accept-language': 'de'
      });

      // Add location bias if provided
      if (options.location) {
        params.append('lat', options.location.lat.toString());
        params.append('lon', options.location.lng.toString());
        if (options.radius) {
          // Nominatim doesn't have direct radius support, but we can use viewbox
          const delta = options.radius / 111320; // rough conversion to degrees
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
      console.log('openStreetMapService: Making request to:', url);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'VacationPlanner/1.0'
        }
      });

      console.log('openStreetMapService: Response status:', response.status);
      console.log('openStreetMapService: Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const responseText = await response.text();
        console.warn('Nominatim search failed:', response.status, response.statusText);
        console.warn('Response body:', responseText);
        console.warn('Falling back to mock data');
        return this.getMockPredictions(query);
      }

      const data = await response.json();
      console.log('openStreetMapService: Response data:', data);
      console.log('openStreetMapService: Number of results:', data.length);
      
      return data.map((place: any): PlacePrediction => ({
        place_id: place.place_id.toString(),
        description: place.display_name,
        display_name: place.display_name,
        structured_formatting: {
          main_text: place.name || this.extractMainText(place.display_name),
          secondary_text: this.extractSecondaryText(place.display_name, place.name)
        },
        type: place.type,
        class: place.class,
        coordinates: {
          lat: parseFloat(place.lat),
          lng: parseFloat(place.lon)
        }
      }));
    } catch (error) {
      console.error('🚨 Nominatim API error:', error);
      console.error('Error type:', error instanceof Error ? error.name : typeof error);
      console.error('Error message:', error instanceof Error ? error.message : error);
      console.warn('Falling back to mock data for query:', query);
      return this.getMockPredictions(query);
    }
  }

  // Get detailed place information by place ID
  async getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
    if (this.useMockData) {
      return this.getMockPlaceDetails(placeId);
    }

    try {
      const params = new URLSearchParams({
        place_id: placeId,
        format: 'json',
        addressdetails: '1',
        'accept-language': 'de'
      });

      const response = await fetch(`${this.baseUrl}/lookup?${params}`, {
        headers: {
          'User-Agent': 'VacationPlanner/1.0'
        }
      });

      if (!response.ok) {
        return this.getMockPlaceDetails(placeId);
      }

      const data = await response.json();
      if (!data || data.length === 0) {
        return null;
      }

      const place = data[0];
      return {
        place_id: place.place_id.toString(),
        name: place.name || this.extractMainText(place.display_name),
        display_name: place.display_name,
        formatted_address: place.display_name,
        coordinates: {
          lat: parseFloat(place.lat),
          lng: parseFloat(place.lon)
        },
        type: place.type,
        class: place.class,
        importance: place.importance,
        icon: place.icon
      };
    } catch (error) {
      console.warn('Place details request failed:', error);
      return this.getMockPlaceDetails(placeId);
    }
  }

  // Geocode an address to coordinates
  async geocodeAddress(address: string): Promise<Coordinates | null> {
    if (this.useMockData) {
      return this.getMockGeocode(address);
    }

    try {
      const params = new URLSearchParams({
        q: address,
        format: 'json',
        limit: '1',
        'accept-language': 'de'
      });

      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        headers: {
          'User-Agent': 'VacationPlanner/1.0'
        }
      });

      if (!response.ok) {
        return this.getMockGeocode(address);
      }

      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }

      return null;
    } catch (error) {
      console.warn('Geocoding failed:', error);
      return this.getMockGeocode(address);
    }
  }

  // Reverse geocode coordinates to address
  async reverseGeocode(coordinates: Coordinates): Promise<string | null> {
    if (this.useMockData) {
      return this.getMockReverseGeocode(coordinates);
    }

    try {
      const params = new URLSearchParams({
        lat: coordinates.lat.toString(),
        lon: coordinates.lng.toString(),
        format: 'json',
        addressdetails: '1',
        'accept-language': 'de'
      });

      const response = await fetch(`${this.baseUrl}/reverse?${params}`, {
        headers: {
          'User-Agent': 'VacationPlanner/1.0'
        }
      });

      if (!response.ok) {
        return this.getMockReverseGeocode(coordinates);
      }

      const data = await response.json();
      return data?.display_name || null;
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      return this.getMockReverseGeocode(coordinates);
    }
  }

  // Helper methods for text processing
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

  // Mock data fallbacks with international landmarks
  private getMockPredictions(input: string): PlacePrediction[] {
    const mockData: PlacePrediction[] = [
      // Germany
      {
        place_id: 'mock_1',
        description: 'Brandenburger Tor, Berlin, Deutschland',
        display_name: 'Brandenburger Tor, Pariser Platz, Mitte, Berlin, Deutschland',
        structured_formatting: { main_text: 'Brandenburger Tor', secondary_text: 'Berlin, Deutschland' },
        type: 'monument',
        class: 'tourism',
        coordinates: { lat: 52.516275, lng: 13.377704 }
      },
      {
        place_id: 'mock_2',
        description: 'Neuschwanstein Castle, Schwangau, Deutschland',
        display_name: 'Schloss Neuschwanstein, Neuschwansteinstraße, Schwangau, Bayern, Deutschland',
        structured_formatting: { main_text: 'Neuschwanstein Castle', secondary_text: 'Schwangau, Deutschland' },
        type: 'castle',
        class: 'tourism',
        coordinates: { lat: 47.557574, lng: 10.749800 }
      },
      {
        place_id: 'mock_3',
        description: 'Marienplatz, München, Deutschland',
        display_name: 'Marienplatz, Altstadt-Lehel, München, Bayern, Deutschland',
        structured_formatting: { main_text: 'Marienplatz', secondary_text: 'München, Deutschland' },
        type: 'square',
        class: 'tourism',
        coordinates: { lat: 48.137154, lng: 11.575721 }
      },
      {
        place_id: 'mock_4',
        description: 'Kölner Dom, Köln, Deutschland',
        display_name: 'Kölner Dom, Domkloster, Innenstadt, Köln, Nordrhein-Westfalen, Deutschland',
        structured_formatting: { main_text: 'Kölner Dom', secondary_text: 'Köln, Deutschland' },
        type: 'cathedral',
        class: 'tourism',
        coordinates: { lat: 50.941357, lng: 6.958307 }
      },
      // France
      {
        place_id: 'mock_5',
        description: 'Louvre Museum, Paris, France',
        display_name: 'Musée du Louvre, Rue de Rivoli, 1er arrondissement, Paris, France',
        structured_formatting: { main_text: 'Louvre Museum', secondary_text: 'Paris, France' },
        type: 'museum',
        class: 'tourism',
        coordinates: { lat: 48.860611, lng: 2.337644 }
      },
      {
        place_id: 'mock_6',
        description: 'Eiffel Tower, Paris, France',
        display_name: 'Tour Eiffel, Champ de Mars, 7e arrondissement, Paris, France',
        structured_formatting: { main_text: 'Eiffel Tower', secondary_text: 'Paris, France' },
        type: 'monument',
        class: 'tourism',
        coordinates: { lat: 48.858844, lng: 2.294351 }
      },
      {
        place_id: 'mock_7',
        description: 'Notre-Dame Cathedral, Paris, France',
        display_name: 'Cathédrale Notre-Dame de Paris, Île de la Cité, 4e arrondissement, Paris, France',
        structured_formatting: { main_text: 'Notre-Dame Cathedral', secondary_text: 'Paris, France' },
        type: 'cathedral',
        class: 'tourism',
        coordinates: { lat: 48.852968, lng: 2.349902 }
      },
      // Italy
      {
        place_id: 'mock_8',
        description: 'Colosseum, Rome, Italy',
        display_name: 'Colosseo, Piazza del Colosseo, Celio, Rome, Italy',
        structured_formatting: { main_text: 'Colosseum', secondary_text: 'Rome, Italy' },
        type: 'monument',
        class: 'tourism',
        coordinates: { lat: 41.890251, lng: 12.492373 }
      },
      {
        place_id: 'mock_9',
        description: 'Vatican Museums, Vatican City',
        display_name: 'Musei Vaticani, Vatican City',
        structured_formatting: { main_text: 'Vatican Museums', secondary_text: 'Vatican City' },
        type: 'museum',
        class: 'tourism',
        coordinates: { lat: 41.906485, lng: 12.456373 }
      },
      // Spain
      {
        place_id: 'mock_10',
        description: 'Sagrada Familia, Barcelona, Spain',
        display_name: 'Basílica de la Sagrada Família, Carrer de Mallorca, Eixample, Barcelona, Spain',
        structured_formatting: { main_text: 'Sagrada Familia', secondary_text: 'Barcelona, Spain' },
        type: 'cathedral',
        class: 'tourism',
        coordinates: { lat: 41.403629, lng: 2.174356 }
      },
      {
        place_id: 'mock_11',
        description: 'Alhambra, Granada, Spain',
        display_name: 'Alhambra, Calle Real de la Alhambra, Granada, Andalusia, Spain',
        structured_formatting: { main_text: 'Alhambra', secondary_text: 'Granada, Spain' },
        type: 'castle',
        class: 'tourism',
        coordinates: { lat: 37.176487, lng: -3.588892 }
      },
      // Austria
      {
        place_id: 'mock_12',
        description: 'Schönbrunn Palace, Vienna, Austria',
        display_name: 'Schloss Schönbrunn, Schönbrunner Schloßstraße, Hietzing, Vienna, Austria',
        structured_formatting: { main_text: 'Schönbrunn Palace', secondary_text: 'Vienna, Austria' },
        type: 'castle',
        class: 'tourism',
        coordinates: { lat: 48.184516, lng: 16.312486 }
      },
      // Switzerland
      {
        place_id: 'mock_13',
        description: 'Matterhorn, Zermatt, Switzerland',
        display_name: 'Matterhorn, Zermatt, Valais, Switzerland',
        structured_formatting: { main_text: 'Matterhorn', secondary_text: 'Zermatt, Switzerland' },
        type: 'mountain',
        class: 'natural',
        coordinates: { lat: 45.976389, lng: 7.658056 }
      },
      // Netherlands
      {
        place_id: 'mock_14',
        description: 'Anne Frank House, Amsterdam, Netherlands',
        display_name: 'Anne Frank Huis, Prinsengracht, Centrum, Amsterdam, Netherlands',
        structured_formatting: { main_text: 'Anne Frank House', secondary_text: 'Amsterdam, Netherlands' },
        type: 'museum',
        class: 'tourism',
        coordinates: { lat: 52.375230, lng: 4.883975 }
      },
      // Czech Republic
      {
        place_id: 'mock_15',
        description: 'Prague Castle, Prague, Czech Republic',
        display_name: 'Pražský hrad, Hradčany, Prague, Czech Republic',
        structured_formatting: { main_text: 'Prague Castle', secondary_text: 'Prague, Czech Republic' },
        type: 'castle',
        class: 'tourism',
        coordinates: { lat: 50.090964, lng: 14.400362 }
      }
    ];

    if (!input || input.length < 1) {
      return mockData.slice(0, 5);
    }

    const lowerInput = input.toLowerCase();
    return mockData.filter(item => {
      const mainText = item.structured_formatting.main_text.toLowerCase();
      const secondaryText = item.structured_formatting.secondary_text?.toLowerCase() || '';
      const description = item.description.toLowerCase();
      
      return mainText.includes(lowerInput) ||
             secondaryText.includes(lowerInput) ||
             description.includes(lowerInput) ||
             mainText.split(' ').some(word => word.startsWith(lowerInput));
    }).slice(0, 8);
  }

  private getMockPlaceDetails(placeId: string): PlaceResult {
    const mockDetails: Record<string, PlaceResult> = {
      'mock_1': {
        place_id: 'mock_1',
        name: 'Brandenburger Tor',
        display_name: 'Brandenburger Tor, Pariser Platz, Mitte, Berlin, Deutschland',
        formatted_address: 'Pariser Platz, 10117 Berlin, Deutschland',
        coordinates: { lat: 52.516275, lng: 13.377704 },
        type: 'monument',
        class: 'tourism',
        importance: 0.8
      },
      'mock_2': {
        place_id: 'mock_2',
        name: 'Neuschwanstein Castle',
        display_name: 'Schloss Neuschwanstein, Neuschwansteinstraße, Schwangau, Bayern, Deutschland',
        formatted_address: 'Neuschwansteinstraße 20, 87645 Schwangau, Deutschland',
        coordinates: { lat: 47.557574, lng: 10.749800 },
        type: 'castle',
        class: 'tourism',
        importance: 0.9
      },
      'mock_3': {
        place_id: 'mock_3',
        name: 'Marienplatz',
        display_name: 'Marienplatz, Altstadt-Lehel, München, Bayern, Deutschland',
        formatted_address: 'Marienplatz, 80331 München, Deutschland',
        coordinates: { lat: 48.137154, lng: 11.575721 },
        type: 'square',
        class: 'tourism',
        importance: 0.7
      },
      'mock_5': {
        place_id: 'mock_5',
        name: 'Louvre Museum',
        display_name: 'Musée du Louvre, Rue de Rivoli, 1er arrondissement, Paris, France',
        formatted_address: 'Rue de Rivoli, 75001 Paris, France',
        coordinates: { lat: 48.860611, lng: 2.337644 },
        type: 'museum',
        class: 'tourism',
        importance: 0.95
      },
      'mock_6': {
        place_id: 'mock_6',
        name: 'Eiffel Tower',
        display_name: 'Tour Eiffel, Champ de Mars, 7e arrondissement, Paris, France',
        formatted_address: 'Champ de Mars, 75007 Paris, France',
        coordinates: { lat: 48.858844, lng: 2.294351 },
        type: 'monument',
        class: 'tourism',
        importance: 0.98
      },
      'mock_8': {
        place_id: 'mock_8',
        name: 'Colosseum',
        display_name: 'Colosseo, Piazza del Colosseo, Celio, Rome, Italy',
        formatted_address: 'Piazza del Colosseo, 1, 00184 Roma RM, Italy',
        coordinates: { lat: 41.890251, lng: 12.492373 },
        type: 'monument',
        class: 'tourism',
        importance: 0.96
      },
      'mock_10': {
        place_id: 'mock_10',
        name: 'Sagrada Familia',
        display_name: 'Basílica de la Sagrada Família, Carrer de Mallorca, Eixample, Barcelona, Spain',
        formatted_address: 'Carrer de Mallorca, 401, 08013 Barcelona, Spain',
        coordinates: { lat: 41.403629, lng: 2.174356 },
        type: 'cathedral',
        class: 'tourism',
        importance: 0.92
      }
    };

    return mockDetails[placeId] || {
      place_id: placeId,
      name: 'Unbekannter Ort',
      display_name: 'Unbekannter Ort, Deutschland',
      formatted_address: 'Deutschland',
      coordinates: { lat: 50.1109, lng: 8.6821 }, // Center of Europe
      type: 'unknown',
      class: 'place',
      importance: 0.5
    };
  }

  private getMockGeocode(address: string): Coordinates | null {
    // Simple mock geocoding based on address keywords
    const addressLower = address.toLowerCase();
    
    // Germany
    if (addressLower.includes('berlin')) {
      return { lat: 52.5200, lng: 13.4050 };
    } else if (addressLower.includes('münchen') || addressLower.includes('munich')) {
      return { lat: 48.1351, lng: 11.5820 };
    } else if (addressLower.includes('hamburg')) {
      return { lat: 53.5511, lng: 9.9937 };
    } else if (addressLower.includes('köln') || addressLower.includes('cologne')) {
      return { lat: 50.9375, lng: 6.9603 };
    }
    // France
    else if (addressLower.includes('paris')) {
      return { lat: 48.8566, lng: 2.3522 };
    } else if (addressLower.includes('louvre')) {
      return { lat: 48.8606, lng: 2.3376 };
    } else if (addressLower.includes('lyon')) {
      return { lat: 45.7640, lng: 4.8357 };
    }
    // Italy
    else if (addressLower.includes('rome') || addressLower.includes('roma')) {
      return { lat: 41.9028, lng: 12.4964 };
    } else if (addressLower.includes('milan') || addressLower.includes('milano')) {
      return { lat: 45.4642, lng: 9.1900 };
    } else if (addressLower.includes('vatican')) {
      return { lat: 41.9029, lng: 12.4534 };
    }
    // Spain
    else if (addressLower.includes('barcelona')) {
      return { lat: 41.3851, lng: 2.1734 };
    } else if (addressLower.includes('madrid')) {
      return { lat: 40.4168, lng: -3.7038 };
    } else if (addressLower.includes('granada')) {
      return { lat: 37.1773, lng: -3.5986 };
    }
    // Austria
    else if (addressLower.includes('vienna') || addressLower.includes('wien')) {
      return { lat: 48.2082, lng: 16.3738 };
    }
    // Switzerland
    else if (addressLower.includes('zurich') || addressLower.includes('zürich')) {
      return { lat: 47.3769, lng: 8.5417 };
    } else if (addressLower.includes('geneva') || addressLower.includes('genf')) {
      return { lat: 46.2044, lng: 6.1432 };
    }
    // Netherlands
    else if (addressLower.includes('amsterdam')) {
      return { lat: 52.3676, lng: 4.9041 };
    }
    // Czech Republic
    else if (addressLower.includes('prague') || addressLower.includes('praha')) {
      return { lat: 50.0755, lng: 14.4378 };
    }
    else {
      // Default to center of Europe
      return { lat: 50.1109, lng: 8.6821 };
    }
  }

  private getMockReverseGeocode(coordinates: Coordinates): string {
    // Simple mock reverse geocoding
    const { lat, lng } = coordinates;
    
    // Germany
    if (Math.abs(lat - 52.516) < 0.1 && Math.abs(lng - 13.378) < 0.1) {
      return 'Brandenburger Tor, Berlin, Deutschland';
    } else if (Math.abs(lat - 48.137) < 0.1 && Math.abs(lng - 11.576) < 0.1) {
      return 'Marienplatz, München, Deutschland';
    }
    // France
    else if (Math.abs(lat - 48.861) < 0.1 && Math.abs(lng - 2.338) < 0.1) {
      return 'Musée du Louvre, Paris, France';
    } else if (Math.abs(lat - 48.859) < 0.1 && Math.abs(lng - 2.294) < 0.1) {
      return 'Tour Eiffel, Paris, France';
    } else if (Math.abs(lat - 48.853) < 0.1 && Math.abs(lng - 2.350) < 0.1) {
      return 'Notre-Dame Cathedral, Paris, France';
    }
    // Italy
    else if (Math.abs(lat - 41.890) < 0.1 && Math.abs(lng - 12.492) < 0.1) {
      return 'Colosseum, Rome, Italy';
    } else if (Math.abs(lat - 41.906) < 0.1 && Math.abs(lng - 12.456) < 0.1) {
      return 'Vatican Museums, Vatican City';
    }
    // Spain
    else if (Math.abs(lat - 41.404) < 0.1 && Math.abs(lng - 2.174) < 0.1) {
      return 'Sagrada Familia, Barcelona, Spain';
    } else if (Math.abs(lat - 37.176) < 0.1 && Math.abs(lng + 3.589) < 0.1) {
      return 'Alhambra, Granada, Spain';
    }
    // Austria
    else if (Math.abs(lat - 48.185) < 0.1 && Math.abs(lng - 16.312) < 0.1) {
      return 'Schönbrunn Palace, Vienna, Austria';
    }
    // Switzerland
    else if (Math.abs(lat - 45.976) < 0.1 && Math.abs(lng - 7.658) < 0.1) {
      return 'Matterhorn, Zermatt, Switzerland';
    }
    // Netherlands
    else if (Math.abs(lat - 52.375) < 0.1 && Math.abs(lng - 4.884) < 0.1) {
      return 'Anne Frank House, Amsterdam, Netherlands';
    }
    // Czech Republic
    else if (Math.abs(lat - 50.091) < 0.1 && Math.abs(lng - 14.400) < 0.1) {
      return 'Prague Castle, Prague, Czech Republic';
    }
    // Default based on region
    else if (lat > 49 && lat < 55 && lng > 6 && lng < 15) {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}, Deutschland`;
    } else if (lat > 45 && lat < 50 && lng > 1 && lng < 8) {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}, France`;
    } else if (lat > 36 && lat < 47 && lng > 6 && lng < 19) {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}, Italy`;
    } else if (lat > 36 && lat < 44 && lng > -10 && lng < 5) {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}, Spain`;
    } else {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}, Europe`;
    }
  }

  // Utility methods
  getPlaceTypeIcon(type: string, classType: string): string {
    const typeIconMap: Record<string, string> = {
      // Tourism
      'monument': '🗿',
      'castle': '🏰',
      'cathedral': '⛪',
      'church': '⛪',
      'museum': '🏛️',
      'square': '🏛️',
      'attraction': '🎯',
      'viewpoint': '🔭',
      
      // Amenities
      'restaurant': '🍽️',
      'cafe': '☕',
      'bar': '🍺',
      'pub': '🍺',
      'fast_food': '🍔',
      'biergarten': '🍻',
      
      // Lodging
      'hotel': '🏨',
      'hostel': '🏠',
      'guest_house': '🏡',
      
      // Transportation
      'airport': '✈️',
      'train_station': '🚂',
      'subway': '🚇',
      'bus_station': '🚌',
      'fuel': '⛽',
      
      // Shopping
      'mall': '🛍️',
      'supermarket': '🏬',
      'shop': '🏪',
      
      // Healthcare
      'hospital': '🏥',
      'pharmacy': '💊',
      'clinic': '🏥',
      
      // Finance
      'bank': '🏦',
      'atm': '💰',
      
      // Entertainment
      'cinema': '🎬',
      'theatre': '🎭',
      'nightclub': '🌃',
      
      // Nature
      'park': '🏞️',
      'forest': '🌲',
      'lake': '🏞️',
      'mountain': '🏔️'
    };

    // Check type first, then class
    return typeIconMap[type] || typeIconMap[classType] || '📍';
  }

  formatPlaceDisplayName(prediction: PlacePrediction): string {
    return prediction.structured_formatting.main_text;
  }

  formatPlaceSecondaryText(prediction: PlacePrediction): string | undefined {
    return prediction.structured_formatting.secondary_text;
  }
}

export const openStreetMapService = new OpenStreetMapService();
export default openStreetMapService;