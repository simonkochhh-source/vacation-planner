import { Coordinates } from '../types';

// Google Maps Places API Types
export interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  coordinates: Coordinates;
  types: string[];
  rating?: number;
  photos?: string[];
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  formatted_phone_number?: string;
  website?: string;
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

export interface SearchOptions {
  location?: Coordinates;
  radius?: number;
  types?: string[];
  componentRestrictions?: {
    country?: string;
  };
}

class GoogleMapsService {
  private apiKey: string | undefined;
  private useMockData: boolean;
  private isScriptLoaded = false;

  constructor() {
    this.apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    this.useMockData = process.env.REACT_APP_USE_MOCK_PLACES === 'true' || !this.apiKey;
  }

  // Load Google Maps JavaScript API
  async loadGoogleMapsAPI(): Promise<void> {
    // Skip API loading entirely when using mock data
    if (this.useMockData) {
      return Promise.resolve();
    }
    
    if (this.isScriptLoaded) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps && window.google.maps.places) {
        this.isScriptLoaded = true;
        resolve();
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places&language=de`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        this.isScriptLoaded = true;
        resolve();
      };

      script.onerror = (error) => {
        console.error('Failed to load Google Maps API:', error);
        this.useMockData = true; // Fallback to mock data
        resolve(); // Don't reject, fall back gracefully
      };

      document.head.appendChild(script);
    });
  }

  // Search for places using Google Places API
  async searchPlaces(query: string, options: SearchOptions = {}): Promise<PlacePrediction[]> {
    if (this.useMockData) {
      return this.getMockPredictions(query);
    }

    await this.loadGoogleMapsAPI();

    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.warn('Google Maps API not available, falling back to mock data');
        resolve(this.getMockPredictions(query));
        return;
      }

      const service = new window.google.maps.places.AutocompleteService();
      const request: google.maps.places.AutocompletionRequest = {
        input: query,
        language: 'de',
      };

      // Add location bias if provided
      if (options.location && options.radius) {
        request.location = new window.google.maps.LatLng(
          options.location.lat,
          options.location.lng
        );
        request.radius = options.radius;
      }

      // Add component restrictions (default to Germany)
      if (options.componentRestrictions?.country) {
        request.componentRestrictions = {
          country: options.componentRestrictions.country
        };
      } else {
        request.componentRestrictions = { country: 'de' };
      }

      // Add place types if specified
      if (options.types && options.types.length > 0) {
        request.types = options.types as google.maps.places.AutocompletionRequest['types'];
      }

      service.getPlacePredictions(request, (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          const results: PlacePrediction[] = predictions.map(prediction => ({
            place_id: prediction.place_id,
            description: prediction.description,
            structured_formatting: {
              main_text: prediction.structured_formatting.main_text,
              secondary_text: prediction.structured_formatting.secondary_text
            },
            types: prediction.types || []
          }));
          resolve(results);
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([]);
        } else {
          console.warn('Places API request failed, falling back to mock data:', status);
          resolve(this.getMockPredictions(query));
        }
      });
    });
  }

  // Get detailed place information
  async getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
    if (this.useMockData) {
      return this.getMockPlaceDetails(placeId);
    }

    await this.loadGoogleMapsAPI();

    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.warn('Google Maps API not available, falling back to mock data');
        resolve(this.getMockPlaceDetails(placeId));
        return;
      }

      // Create a temporary div for the PlacesService
      const map = new window.google.maps.Map(document.createElement('div'));
      const service = new window.google.maps.places.PlacesService(map);

      const request: google.maps.places.PlaceDetailsRequest = {
        placeId: placeId,
        fields: [
          'place_id',
          'name', 
          'formatted_address',
          'geometry',
          'types',
          'rating',
          'photos',
          'opening_hours',
          'formatted_phone_number',
          'website'
        ],
        language: 'de'
      };

      service.getDetails(request, (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          const result: PlaceResult = {
            place_id: place.place_id!,
            name: place.name!,
            formatted_address: place.formatted_address!,
            coordinates: {
              lat: place.geometry!.location!.lat(),
              lng: place.geometry!.location!.lng()
            },
            types: place.types || [],
            rating: place.rating,
            formatted_phone_number: place.formatted_phone_number,
            website: place.website
          };

          // Add photo URLs if available
          if (place.photos && place.photos.length > 0) {
            result.photos = place.photos.slice(0, 3).map(photo => 
              photo.getUrl({ maxWidth: 400, maxHeight: 300 })
            );
          }

          // Add opening hours if available
          if (place.opening_hours) {
            result.opening_hours = {
              open_now: place.opening_hours.open_now,
              weekday_text: place.opening_hours.weekday_text
            };
          }

          resolve(result);
        } else {
          console.warn('Place details request failed, falling back to mock data:', status);
          resolve(this.getMockPlaceDetails(placeId));
        }
      });
    });
  }

  // Geocode an address to coordinates
  async geocodeAddress(address: string): Promise<Coordinates | null> {
    if (this.useMockData) {
      return this.getMockGeocode(address);
    }

    await this.loadGoogleMapsAPI();

    return new Promise((resolve) => {
      if (!window.google || !window.google.maps) {
        console.warn('Google Maps API not available for geocoding');
        resolve(this.getMockGeocode(address));
        return;
      }

      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        {
          address: address,
          language: 'de',
          region: 'de'
        },
        (results, status) => {
          if (status === window.google.maps.GeocoderStatus.OK && results && results[0]) {
            const location = results[0].geometry.location;
            resolve({
              lat: location.lat(),
              lng: location.lng()
            });
          } else {
            console.warn('Geocoding failed:', status);
            resolve(this.getMockGeocode(address));
          }
        }
      );
    });
  }

  // Mock data fallbacks
  private getMockPredictions(input: string): PlacePrediction[] {
    const mockData: PlacePrediction[] = [
      {
        place_id: 'mock_1',
        description: 'Brandenburger Tor, Berlin, Deutschland',
        structured_formatting: { main_text: 'Brandenburger Tor', secondary_text: 'Berlin, Deutschland' },
        types: ['tourist_attraction', 'point_of_interest', 'establishment']
      },
      {
        place_id: 'mock_2', 
        description: 'Neuschwanstein Castle, Schwangau, Deutschland',
        structured_formatting: { main_text: 'Neuschwanstein Castle', secondary_text: 'Schwangau, Deutschland' },
        types: ['tourist_attraction', 'point_of_interest', 'establishment']
      },
      {
        place_id: 'mock_3',
        description: 'Marienplatz, München, Deutschland', 
        structured_formatting: { main_text: 'Marienplatz', secondary_text: 'München, Deutschland' },
        types: ['tourist_attraction', 'point_of_interest', 'establishment']
      },
      {
        place_id: 'mock_4',
        description: 'Kölner Dom, Köln, Deutschland',
        structured_formatting: { main_text: 'Kölner Dom', secondary_text: 'Köln, Deutschland' },
        types: ['church', 'tourist_attraction', 'point_of_interest', 'establishment']
      },
      {
        place_id: 'mock_5',
        description: 'Heidelberger Schloss, Heidelberg, Deutschland',
        structured_formatting: { main_text: 'Heidelberger Schloss', secondary_text: 'Heidelberg, Deutschland' },
        types: ['tourist_attraction', 'point_of_interest', 'establishment']
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
        formatted_address: 'Pariser Platz, 10117 Berlin, Deutschland',
        coordinates: { lat: 52.516275, lng: 13.377704 },
        types: ['tourist_attraction', 'point_of_interest', 'establishment'],
        rating: 4.4
      },
      'mock_2': {
        place_id: 'mock_2',
        name: 'Neuschwanstein Castle',
        formatted_address: 'Neuschwansteinstraße 20, 87645 Schwangau, Deutschland',
        coordinates: { lat: 47.557574, lng: 10.749800 },
        types: ['tourist_attraction', 'point_of_interest', 'establishment'],
        rating: 4.6
      },
      'mock_3': {
        place_id: 'mock_3',
        name: 'Marienplatz',
        formatted_address: 'Marienplatz, 80331 München, Deutschland',
        coordinates: { lat: 48.137154, lng: 11.575721 },
        types: ['tourist_attraction', 'point_of_interest', 'establishment'],
        rating: 4.5
      }
    };

    return mockDetails[placeId] || {
      place_id: placeId,
      name: 'Unbekannter Ort',
      formatted_address: 'Deutschland',
      coordinates: { lat: 51.1657, lng: 10.4515 }, // Center of Germany
      types: ['establishment'],
      rating: 4.0
    };
  }

  private getMockGeocode(address: string): Coordinates | null {
    // Simple mock geocoding based on address keywords
    const addressLower = address.toLowerCase();
    
    if (addressLower.includes('berlin')) {
      return { lat: 52.5200, lng: 13.4050 };
    } else if (addressLower.includes('münchen') || addressLower.includes('munich')) {
      return { lat: 48.1351, lng: 11.5820 };
    } else if (addressLower.includes('hamburg')) {
      return { lat: 53.5511, lng: 9.9937 };
    } else if (addressLower.includes('köln') || addressLower.includes('cologne')) {
      return { lat: 50.9375, lng: 6.9603 };
    } else {
      // Default to center of Germany
      return { lat: 51.1657, lng: 10.4515 };
    }
  }

  // Utility methods
  getPlaceTypeIcon(types: string[]): string {
    if (types.includes('restaurant') || types.includes('food')) return '🍽️';
    if (types.includes('lodging') || types.includes('hotel')) return '🏨';
    if (types.includes('tourist_attraction')) return '🎯';
    if (types.includes('museum')) return '🏛️';
    if (types.includes('church')) return '⛪';
    if (types.includes('park')) return '🌳';
    if (types.includes('shopping_mall') || types.includes('store')) return '🛍️';
    if (types.includes('gas_station')) return '⛽';
    if (types.includes('hospital')) return '🏥';
    if (types.includes('bank')) return '🏦';
    return '📍';
  }

  formatPlaceDisplayName(prediction: PlacePrediction): string {
    return prediction.structured_formatting.main_text;
  }

  formatPlaceSecondaryText(prediction: PlacePrediction): string | undefined {
    return prediction.structured_formatting.secondary_text;
  }
}

// Note: Google Maps types are handled globally by @types/google.maps

export const googleMapsService = new GoogleMapsService();
export default googleMapsService;