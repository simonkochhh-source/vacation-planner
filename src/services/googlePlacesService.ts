import { Coordinates } from '../types';

// Google Places API service for destination search
export interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  coordinates: Coordinates;
  types: string[];
  rating?: number;
  opening_hours?: {
    open_now?: boolean;
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
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

class GooglePlacesService {
  private apiKey: string | undefined;
  private autocompleteService: google.maps.places.AutocompleteService | null = null;
  private placesService: google.maps.places.PlacesService | null = null;
  private initialized = false;

  constructor() {
    this.apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  }

  /**
   * Initialize Google Places API services
   */
  async initialize(): Promise<void> {
    if (this.initialized || !this.apiKey) {
      return;
    }

    try {
      // Load Google Maps API if not already loaded
      if (!window.google?.maps?.places) {
        await this.loadGoogleMapsScript();
      }

      // Initialize services
      this.autocompleteService = new google.maps.places.AutocompleteService();
      
      // Create a dummy div for PlacesService (it requires a map or div element)
      const div = document.createElement('div');
      this.placesService = new google.maps.places.PlacesService(div);
      
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
      if (window.google?.maps) {
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
   * Search for places based on input text
   */
  async searchPlaces(
    input: string,
    options: {
      location?: Coordinates;
      radius?: number; // in meters
      types?: string[];
      componentRestrictions?: {
        country?: string | string[];
      };
    } = {}
  ): Promise<PlacePrediction[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.autocompleteService || !input.trim()) {
      return [];
    }

    return new Promise((resolve, reject) => {
      // Handle component restrictions with proper type conversion
      const componentRestrictions: google.maps.places.ComponentRestrictions = {
        country: options.componentRestrictions?.country || 'de'
      };
        
      const request: google.maps.places.AutocompletionRequest = {
        input: input.trim(),
        componentRestrictions,
        ...(options.types && { types: options.types }),
      };

      // Add location bias if coordinates provided
      if (options.location) {
        request.location = new google.maps.LatLng(options.location.lat, options.location.lng);
        request.radius = options.radius || 50000; // 50km default radius
      }

      this.autocompleteService!.getPlacePredictions(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const predictions: PlacePrediction[] = results.map(result => ({
            place_id: result.place_id!,
            description: result.description,
            structured_formatting: result.structured_formatting,
            types: result.types || []
          }));
          resolve(predictions);
        } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([]);
        } else {
          reject(new Error(`Places search failed: ${status}`));
        }
      });
    });
  }

  /**
   * Get detailed information about a specific place
   */
  async getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.placesService) {
      throw new Error('Places service not initialized');
    }

    return new Promise((resolve, reject) => {
      const request: google.maps.places.PlaceDetailsRequest = {
        placeId,
        fields: [
          'place_id',
          'name',
          'formatted_address',
          'geometry',
          'types',
          'rating',
          'opening_hours',
          'photos'
        ]
      };

      this.placesService!.getDetails(request, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          if (!place.geometry?.location) {
            reject(new Error('Place has no location information'));
            return;
          }

          const result: PlaceResult = {
            place_id: place.place_id!,
            name: place.name || 'Unbekannter Ort',
            formatted_address: place.formatted_address || '',
            coordinates: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            },
            types: place.types || [],
            rating: place.rating,
            opening_hours: place.opening_hours ? {
              open_now: place.opening_hours.isOpen?.()
            } : undefined,
            photos: place.photos?.map(photo => ({
              photo_reference: photo.getUrl({ maxWidth: 400 }),
              height: photo.height,
              width: photo.width
            }))
          };

          resolve(result);
        } else {
          if (status === google.maps.places.PlacesServiceStatus.NOT_FOUND) {
            resolve(null);
          } else {
            reject(new Error(`Place details request failed: ${status}`));
          }
        }
      });
    });
  }

  /**
   * Search for places with text search (more flexible than autocomplete)
   */
  async textSearch(
    query: string,
    options: {
      location?: Coordinates;
      radius?: number;
      type?: string;
    } = {}
  ): Promise<PlaceResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.placesService || !query.trim()) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const request: google.maps.places.TextSearchRequest = {
        query: query.trim(),
        ...options
      };

      // Add location bias if coordinates provided
      if (options.location) {
        request.location = new google.maps.LatLng(options.location.lat, options.location.lng);
        request.radius = options.radius || 50000;
      }

      this.placesService!.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const places: PlaceResult[] = results
            .filter(place => place.geometry?.location)
            .map(place => ({
              place_id: place.place_id!,
              name: place.name || 'Unbekannter Ort',
              formatted_address: place.formatted_address || '',
              coordinates: {
                lat: place.geometry!.location!.lat(),
                lng: place.geometry!.location!.lng()
              },
              types: place.types || [],
              rating: place.rating,
              opening_hours: place.opening_hours ? {
                open_now: place.opening_hours.isOpen?.()
              } : undefined,
              photos: place.photos?.map(photo => ({
                photo_reference: photo.getUrl({ maxWidth: 400 }),
                height: photo.height,
                width: photo.width
              }))
            }));
          resolve(places);
        } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([]);
        } else {
          reject(new Error(`Text search failed: ${status}`));
        }
      });
    });
  }

  /**
   * Get place type icon for display
   */
  getPlaceTypeIcon(types: string[]): string {
    // Priority order for most relevant types
    const typeIconMap: Record<string, string> = {
      // Tourist attractions
      'tourist_attraction': '🎯',
      'museum': '🏛️',
      'amusement_park': '🎢',
      'aquarium': '🐠',
      'zoo': '🦁',
      'park': '🏞️',
      'natural_feature': '🏔️',
      
      // Food & Drink
      'restaurant': '🍽️',
      'cafe': '☕',
      'bar': '🍺',
      'meal_takeaway': '🥡',
      'bakery': '🥖',
      
      // Lodging
      'lodging': '🏨',
      
      // Transportation
      'airport': '✈️',
      'subway_station': '🚇',
      'train_station': '🚂',
      'bus_station': '🚌',
      'gas_station': '⛽',
      
      // Shopping
      'shopping_mall': '🛍️',
      'store': '🏪',
      'supermarket': '🏬',
      
      // Services
      'hospital': '🏥',
      'pharmacy': '💊',
      'bank': '🏦',
      'post_office': '📮',
      
      // Entertainment
      'movie_theater': '🎬',
      'night_club': '🌃',
      'bowling_alley': '🎳',
      
      // Default
      'establishment': '📍',
      'point_of_interest': '📍'
    };

    // Find the most specific type
    for (const type of types) {
      if (typeIconMap[type]) {
        return typeIconMap[type];
      }
    }

    return '📍'; // Default icon
  }

  /**
   * Format place display name
   */
  formatPlaceDisplayName(place: PlacePrediction | PlaceResult): string {
    if ('structured_formatting' in place) {
      // PlacePrediction
      return place.structured_formatting.main_text;
    } else {
      // PlaceResult
      return place.name;
    }
  }

  /**
   * Format place secondary text (address/location info)
   */
  formatPlaceSecondaryText(place: PlacePrediction | PlaceResult): string {
    if ('structured_formatting' in place) {
      // PlacePrediction
      return place.structured_formatting.secondary_text || '';
    } else {
      // PlaceResult
      return place.formatted_address;
    }
  }
}

// Global instance
export const googlePlacesService = new GooglePlacesService();

// Note: Google Maps types are handled globally by @types/google.maps