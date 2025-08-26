import { Coordinates } from '../types';

// Simplified Google Places API service for destination search
export interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  coordinates: Coordinates;
  types: string[];
  rating?: number;
}

export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text?: string;
  };
  types: string[];
}

class SimplePlacesService {
  private apiKey: string | undefined;
  private initialized = false;

  constructor() {
    this.apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  }

  /**
   * Initialize Google Maps API if needed
   */
  async initialize(): Promise<void> {
    if (this.initialized || !this.apiKey) {
      return;
    }

    try {
      // Load Google Maps API if not already loaded
      if (!(window as any).google?.maps?.places) {
        await this.loadGoogleMapsScript();
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Google Places service:', error);
      throw error;
    }
  }

  /**
   * Load Google Maps script dynamically
   */
  private loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).google?.maps) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places&language=de`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Maps script'));
      
      document.head.appendChild(script);
    });
  }

  /**
   * Search for places based on input text using Autocomplete
   */
  async searchPlaces(
    input: string,
    options: {
      location?: Coordinates;
      radius?: number;
      types?: string[];
      componentRestrictions?: {
        country?: string | string[];
      };
    } = {}
  ): Promise<PlacePrediction[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!input.trim()) {
      return [];
    }

    try {
      // Use direct API call instead of JavaScript API
      const response = await this.autocompleteApiCall(input, options);
      return response;
    } catch (error) {
      console.error('Places search error:', error);
      return [];
    }
  }

  /**
   * Get detailed information about a specific place
   */
  async getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
    // For development, use mock data
    return this.getMockPlaceDetails(placeId);

    // In production, use actual API call
    /* 
    if (!this.apiKey) {
      throw new Error('Google Maps API key not found');
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?` +
        `place_id=${placeId}&` +
        `fields=place_id,name,formatted_address,geometry,types,rating&` +
        `language=de&` +
        `key=${this.apiKey}`
      );

      const data = await response.json();

      if (data.status === 'OK' && data.result) {
        const place = data.result;
        
        if (!place.geometry?.location) {
          throw new Error('Place has no location information');
        }

        return {
          place_id: place.place_id,
          name: place.name || 'Unbekannter Ort',
          formatted_address: place.formatted_address || '',
          coordinates: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          },
          types: place.types || [],
          rating: place.rating
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Place details error:', error);
      throw error;
    }
    */
  }

  /**
   * Make autocomplete API call
   */
  private async autocompleteApiCall(
    input: string,
    options: any = {}
  ): Promise<PlacePrediction[]> {
    if (!this.apiKey) {
      return [];
    }

    try {
      // Note: Google Places API call would go here
      // In a real application, you would make this call from your backend
      
      // For now, return mock data for demonstration
      return this.getMockPredictions(input);
    } catch (error) {
      console.error('Autocomplete API error:', error);
      return [];
    }
  }

  /**
   * Get mock predictions for development
   */
  private getMockPredictions(input: string): PlacePrediction[] {
    const mockData = [
      {
        place_id: 'ChIJ2V-Mo_l1nkcRfZixfUq4DAE',
        description: 'Brandenburger Tor, Pariser Platz, Berlin, Deutschland',
        structured_formatting: {
          main_text: 'Brandenburger Tor',
          secondary_text: 'Pariser Platz, Berlin, Deutschland'
        },
        types: ['tourist_attraction', 'establishment']
      },
      {
        place_id: 'ChIJAVkDPzdOqEcRcDteW0YgIQQ',
        description: 'Neuschwanstein Castle, Neuschwansteinstraße, Schwangau, Deutschland',
        structured_formatting: {
          main_text: 'Schloss Neuschwanstein',
          secondary_text: 'Neuschwansteinstraße, Schwangau, Deutschland'
        },
        types: ['tourist_attraction', 'establishment']
      },
      {
        place_id: 'ChIJ2WrMN9xlnkcRaHN4dQ2QZA',
        description: 'Reichstag Building, Platz der Republik, Berlin, Deutschland',
        structured_formatting: {
          main_text: 'Reichstagsgebäude',
          secondary_text: 'Platz der Republik, Berlin, Deutschland'
        },
        types: ['tourist_attraction', 'establishment']
      },
      {
        place_id: 'ChIJ5WDdUx6k2EcRdOmpf-mhSa0',
        description: 'Kölner Dom, Domkloster, Köln, Deutschland',
        structured_formatting: {
          main_text: 'Kölner Dom',
          secondary_text: 'Domkloster, Köln, Deutschland'
        },
        types: ['tourist_attraction', 'establishment']
      },
      {
        place_id: 'ChIJr8aZSMbgtUcRTdU4LjkJfZg',
        description: 'Oktoberfest, Theresienwiese, München, Deutschland',
        structured_formatting: {
          main_text: 'Oktoberfest',
          secondary_text: 'Theresienwiese, München, Deutschland'
        },
        types: ['tourist_attraction', 'establishment']
      },
      {
        place_id: 'ChIJLYz4oTvMtUcReU9pYFLXgfE',
        description: 'Marienplatz, München, Deutschland',
        structured_formatting: {
          main_text: 'Marienplatz',
          secondary_text: 'München, Deutschland'
        },
        types: ['tourist_attraction', 'establishment']
      },
      {
        place_id: 'ChIJZy0wACvHuEcReNGN6Ac_3cg',
        description: 'Heidelberger Schloss, Schlosshof, Heidelberg, Deutschland',
        structured_formatting: {
          main_text: 'Heidelberger Schloss',
          secondary_text: 'Schlosshof, Heidelberg, Deutschland'
        },
        types: ['tourist_attraction', 'establishment']
      },
      {
        place_id: 'ChIJ3YS4ZvANskgR2QP_Z4tJgYI',
        description: 'Hamburger Speicherstadt, Hamburg, Deutschland',
        structured_formatting: {
          main_text: 'Speicherstadt',
          secondary_text: 'Hamburg, Deutschland'
        },
        types: ['tourist_attraction', 'establishment']
      },
      {
        place_id: 'ChIJ6_Y5jRAP2EcR-gOc2VD8_sY',
        description: 'Rothenburg ob der Tauber, Deutschland',
        structured_formatting: {
          main_text: 'Rothenburg ob der Tauber',
          secondary_text: 'Deutschland'
        },
        types: ['locality', 'establishment']
      },
      {
        place_id: 'ChIJb5lR0HzFykcRTmgGjrjM_U0',
        description: 'Europa-Park, Rust, Deutschland',
        structured_formatting: {
          main_text: 'Europa-Park',
          secondary_text: 'Rust, Deutschland'
        },
        types: ['amusement_park', 'establishment']
      },
      // Zusätzliche Mock-Daten für bessere Demo-Erfahrung
      {
        place_id: 'mock_berlin_1',
        description: 'Berlin Hauptbahnhof, Europaplatz, Berlin, Deutschland',
        structured_formatting: {
          main_text: 'Berlin Hauptbahnhof',
          secondary_text: 'Europaplatz, Berlin, Deutschland'
        },
        types: ['transit_station', 'establishment']
      },
      {
        place_id: 'mock_munich_1',
        description: 'München Hauptbahnhof, Bahnhofplatz, München, Deutschland',
        structured_formatting: {
          main_text: 'München Hauptbahnhof',
          secondary_text: 'Bahnhofplatz, München, Deutschland'
        },
        types: ['transit_station', 'establishment']
      },
      {
        place_id: 'mock_hamburg_1',
        description: 'Hamburg Rathaus, Rathausmarkt, Hamburg, Deutschland',
        structured_formatting: {
          main_text: 'Hamburg Rathaus',
          secondary_text: 'Rathausmarkt, Hamburg, Deutschland'
        },
        types: ['city_hall', 'establishment']
      },
      {
        place_id: 'mock_cologne_1',
        description: 'Köln Hauptbahnhof, Trankgasse, Köln, Deutschland',
        structured_formatting: {
          main_text: 'Köln Hauptbahnhof',
          secondary_text: 'Trankgasse, Köln, Deutschland'
        },
        types: ['transit_station', 'establishment']
      },
      {
        place_id: 'mock_frankfurt_1',
        description: 'Frankfurt am Main Hauptbahnhof, Am Hauptbahnhof, Frankfurt am Main, Deutschland',
        structured_formatting: {
          main_text: 'Frankfurt Hauptbahnhof',
          secondary_text: 'Am Hauptbahnhof, Frankfurt am Main, Deutschland'
        },
        types: ['transit_station', 'establishment']
      }
    ];

    // Return sample data if input is too short (for demo purposes)
    if (!input || input.length < 1) {
      return mockData.slice(0, 8);
    }

    // Filter by input (case-insensitive and more flexible matching)
    const lowerInput = input.toLowerCase();
    
    const filtered = mockData.filter(item => {
      const mainText = item.structured_formatting.main_text.toLowerCase();
      const secondaryText = item.structured_formatting.secondary_text?.toLowerCase() || '';
      const description = item.description.toLowerCase();
      
      // Match if input is found in any part
      return mainText.includes(lowerInput) ||
             secondaryText.includes(lowerInput) ||
             description.includes(lowerInput) ||
             // Also match individual words
             mainText.split(' ').some(word => word.startsWith(lowerInput)) ||
             secondaryText.split(' ').some(word => word.startsWith(lowerInput));
    });

    return filtered.slice(0, 8); // Show more results for better UX
  }

  /**
   * Get mock place details
   */
  async getMockPlaceDetails(placeId: string): Promise<PlaceResult | null> {
    const mockDetails: Record<string, PlaceResult> = {
      'ChIJ2V-Mo_l1nkcRfZixfUq4DAE': {
        place_id: 'ChIJ2V-Mo_l1nkcRfZixfUq4DAE',
        name: 'Brandenburger Tor',
        formatted_address: 'Pariser Platz, 10117 Berlin, Deutschland',
        coordinates: { lat: 52.5162746, lng: 13.377704 },
        types: ['tourist_attraction', 'establishment'],
        rating: 4.5
      },
      'ChIJAVkDPzdOqEcRcDteW0YgIQQ': {
        place_id: 'ChIJAVkDPzdOqEcRcDteW0YgIQQ',
        name: 'Schloss Neuschwanstein',
        formatted_address: 'Neuschwansteinstraße 20, 87645 Schwangau, Deutschland',
        coordinates: { lat: 47.557574, lng: 10.749800 },
        types: ['tourist_attraction', 'establishment'],
        rating: 4.7
      },
      'ChIJ2WrMN9xlnkcRaHN4dQ2QZA': {
        place_id: 'ChIJ2WrMN9xlnkcRaHN4dQ2QZA',
        name: 'Reichstagsgebäude',
        formatted_address: 'Platz der Republik 1, 11011 Berlin, Deutschland',
        coordinates: { lat: 52.518623, lng: 13.376198 },
        types: ['tourist_attraction', 'establishment'],
        rating: 4.4
      },
      'ChIJ5WDdUx6k2EcRdOmpf-mhSa0': {
        place_id: 'ChIJ5WDdUx6k2EcRdOmpf-mhSa0',
        name: 'Kölner Dom',
        formatted_address: 'Domkloster 4, 50667 Köln, Deutschland',
        coordinates: { lat: 50.941357, lng: 6.958307 },
        types: ['tourist_attraction', 'establishment'],
        rating: 4.6
      },
      'ChIJr8aZSMbgtUcRTdU4LjkJfZg': {
        place_id: 'ChIJr8aZSMbgtUcRTdU4LjkJfZg',
        name: 'Oktoberfest',
        formatted_address: 'Theresienwiese, 80339 München, Deutschland',
        coordinates: { lat: 48.131321, lng: 11.549931 },
        types: ['tourist_attraction', 'establishment'],
        rating: 4.8
      },
      'ChIJLYz4oTvMtUcReU9pYFLXgfE': {
        place_id: 'ChIJLYz4oTvMtUcReU9pYFLXgfE',
        name: 'Marienplatz',
        formatted_address: 'Marienplatz, 80331 München, Deutschland',
        coordinates: { lat: 48.137154, lng: 11.575490 },
        types: ['tourist_attraction', 'establishment'],
        rating: 4.3
      },
      'ChIJZy0wACvHuEcReNGN6Ac_3cg': {
        place_id: 'ChIJZy0wACvHuEcReNGN6Ac_3cg',
        name: 'Heidelberger Schloss',
        formatted_address: 'Schlosshof 1, 69117 Heidelberg, Deutschland',
        coordinates: { lat: 49.410760, lng: 8.715208 },
        types: ['tourist_attraction', 'establishment'],
        rating: 4.6
      },
      'ChIJ3YS4ZvANskgR2QP_Z4tJgYI': {
        place_id: 'ChIJ3YS4ZvANskgR2QP_Z4tJgYI',
        name: 'Speicherstadt',
        formatted_address: 'Speicherstadt, 20457 Hamburg, Deutschland',
        coordinates: { lat: 53.544389, lng: 9.988611 },
        types: ['tourist_attraction', 'establishment'],
        rating: 4.4
      },
      'ChIJ6_Y5jRAP2EcR-gOc2VD8_sY': {
        place_id: 'ChIJ6_Y5jRAP2EcR-gOc2VD8_sY',
        name: 'Rothenburg ob der Tauber',
        formatted_address: 'Rothenburg ob der Tauber, Deutschland',
        coordinates: { lat: 49.377517, lng: 10.186357 },
        types: ['locality', 'establishment'],
        rating: 4.5
      },
      'ChIJb5lR0HzFykcRTmgGjrjM_U0': {
        place_id: 'ChIJb5lR0HzFykcRTmgGjrjM_U0',
        name: 'Europa-Park',
        formatted_address: 'Europa-Park-Straße 2, 77977 Rust, Deutschland',
        coordinates: { lat: 48.266667, lng: 7.721111 },
        types: ['amusement_park', 'establishment'],
        rating: 4.6
      },
      // Neue Mock-Daten Details
      'mock_berlin_1': {
        place_id: 'mock_berlin_1',
        name: 'Berlin Hauptbahnhof',
        formatted_address: 'Europaplatz 1, 10557 Berlin, Deutschland',
        coordinates: { lat: 52.525592, lng: 13.369545 },
        types: ['transit_station', 'establishment'],
        rating: 4.2
      },
      'mock_munich_1': {
        place_id: 'mock_munich_1',
        name: 'München Hauptbahnhof',
        formatted_address: 'Bahnhofplatz 2, 80335 München, Deutschland',
        coordinates: { lat: 48.140229, lng: 11.558336 },
        types: ['transit_station', 'establishment'],
        rating: 4.1
      },
      'mock_hamburg_1': {
        place_id: 'mock_hamburg_1',
        name: 'Hamburg Rathaus',
        formatted_address: 'Rathausmarkt 1, 20095 Hamburg, Deutschland',
        coordinates: { lat: 53.550341, lng: 9.992196 },
        types: ['city_hall', 'establishment'],
        rating: 4.5
      },
      'mock_cologne_1': {
        place_id: 'mock_cologne_1',
        name: 'Köln Hauptbahnhof',
        formatted_address: 'Trankgasse 11, 50667 Köln, Deutschland',
        coordinates: { lat: 50.943232, lng: 6.958878 },
        types: ['transit_station', 'establishment'],
        rating: 4.0
      },
      'mock_frankfurt_1': {
        place_id: 'mock_frankfurt_1',
        name: 'Frankfurt Hauptbahnhof',
        formatted_address: 'Am Hauptbahnhof, 60329 Frankfurt am Main, Deutschland',
        coordinates: { lat: 50.107149, lng: 8.663785 },
        types: ['transit_station', 'establishment'],
        rating: 4.1
      }
    };

    return mockDetails[placeId] || null;
  }

  /**
   * Get place type icon for display
   */
  getPlaceTypeIcon(types: string[]): string {
    const typeIconMap: Record<string, string> = {
      'tourist_attraction': '🎯',
      'museum': '🏛️',
      'restaurant': '🍽️',
      'cafe': '☕',
      'lodging': '🏨',
      'park': '🏞️',
      'establishment': '📍'
    };

    for (const type of types) {
      if (typeIconMap[type]) {
        return typeIconMap[type];
      }
    }

    return '📍';
  }

  /**
   * Format place display name
   */
  formatPlaceDisplayName(place: PlacePrediction | PlaceResult): string {
    if ('structured_formatting' in place) {
      return place.structured_formatting.main_text;
    } else {
      return place.name;
    }
  }

  /**
   * Format place secondary text
   */
  formatPlaceSecondaryText(place: PlacePrediction | PlaceResult): string {
    if ('structured_formatting' in place) {
      return place.structured_formatting.secondary_text || '';
    } else {
      return place.formatted_address;
    }
  }
}

// Global instance
export const simplePlacesService = new SimplePlacesService();