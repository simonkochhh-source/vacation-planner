import { Coordinates } from '../types';

// Geocoding interfaces
export interface GeocodingResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
  type: string;
  importance: number;
  boundingbox: [string, string, string, string];
  class?: string;
  category?: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

export interface SearchLocation {
  displayName: string;
  coordinates: Coordinates;
  address: string;
  type: string;
  importance: number;
  placeId: string;
}

class GeocodingService {
  private readonly baseUrl = 'https://nominatim.openstreetmap.org';
  private readonly userAgent = 'VacationPlanner/1.0';
  
  // Rate limiting
  private lastRequestTime = 0;
  private readonly minInterval = 1000; // 1 second between requests

  private async makeRequest(url: string): Promise<any> {
    // Respect Nominatim usage policy - max 1 request per second
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minInterval - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();

    const response = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json',
        'Accept-Language': 'de,en;q=0.8'
      }
    });

    if (!response.ok) {
      throw new Error(`Geocoding request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Search for locations by query string
   */
  async searchLocations(query: string, limit: number = 5): Promise<SearchLocation[]> {
    if (!query.trim()) {
      return [];
    }

    const encodedQuery = encodeURIComponent(query.trim());
    const url = `${this.baseUrl}/search?q=${encodedQuery}&format=json&limit=${limit}&addressdetails=1&extratags=1&namedetails=1`;

    try {
      const results: GeocodingResult[] = await this.makeRequest(url);
      
      return results.map(result => ({
        displayName: result.display_name,
        coordinates: {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        },
        address: this.formatAddress(result.address),
        type: result.type || result.class || 'location',
        importance: result.importance,
        placeId: result.place_id
      }));
    } catch (error) {
      console.error('Geocoding search failed:', error);
      throw new Error('Ortssuche fehlgeschlagen. Bitte versuchen Sie es später erneut.');
    }
  }

  /**
   * Reverse geocoding - get address from coordinates
   */
  async reverseGeocode(coordinates: Coordinates): Promise<SearchLocation | null> {
    const url = `${this.baseUrl}/reverse?lat=${coordinates.lat}&lon=${coordinates.lng}&format=json&addressdetails=1`;

    try {
      const result: GeocodingResult = await this.makeRequest(url);
      
      if (!result) {
        return null;
      }

      return {
        displayName: result.display_name,
        coordinates: {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        },
        address: this.formatAddress(result.address),
        type: result.type || result.class || 'location',
        importance: result.importance,
        placeId: result.place_id
      };
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return null;
    }
  }

  /**
   * Get detailed information about a place
   */
  async getPlaceDetails(placeId: string): Promise<SearchLocation | null> {
    const url = `${this.baseUrl}/details?place_id=${placeId}&format=json&addressdetails=1`;

    try {
      const result: GeocodingResult = await this.makeRequest(url);
      
      if (!result) {
        return null;
      }

      return {
        displayName: result.display_name,
        coordinates: {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        },
        address: this.formatAddress(result.address),
        type: result.type || result.class || 'location',
        importance: result.importance,
        placeId: result.place_id
      };
    } catch (error) {
      console.error('Place details request failed:', error);
      return null;
    }
  }

  /**
   * Search for locations near given coordinates
   */
  async searchNearby(
    coordinates: Coordinates, 
    radius: number = 1000, // meters
    limit: number = 10
  ): Promise<SearchLocation[]> {
    // Convert radius from meters to degrees (approximate)
    const radiusInDegrees = radius / 111000; // roughly 111km per degree
    
    const bbox = [
      coordinates.lng - radiusInDegrees, // west
      coordinates.lat - radiusInDegrees, // south
      coordinates.lng + radiusInDegrees, // east
      coordinates.lat + radiusInDegrees  // north
    ];

    const url = `${this.baseUrl}/search?format=json&limit=${limit}&addressdetails=1&bounded=1&viewbox=${bbox.join(',')}&extratags=1`;

    try {
      const results: GeocodingResult[] = await this.makeRequest(url);
      
      return results.map(result => ({
        displayName: result.display_name,
        coordinates: {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        },
        address: this.formatAddress(result.address),
        type: result.type || result.class || 'location',
        importance: result.importance,
        placeId: result.place_id
      }));
    } catch (error) {
      console.error('Nearby search failed:', error);
      return [];
    }
  }

  /**
   * Validate and clean location input
   */
  validateLocation(input: string): { isValid: boolean; suggestion?: string } {
    const trimmed = input.trim();
    
    if (trimmed.length < 2) {
      return { isValid: false, suggestion: 'Bitte geben Sie mindestens 2 Zeichen ein' };
    }

    if (trimmed.length > 200) {
      return { isValid: false, suggestion: 'Ortsname zu lang (max. 200 Zeichen)' };
    }

    // Check for obviously invalid patterns
    if (/^\d+$/.test(trimmed)) {
      return { isValid: false, suggestion: 'Bitte geben Sie einen Ortsnamen ein, nicht nur Zahlen' };
    }

    return { isValid: true };
  }

  /**
   * Format address components into readable string
   */
  private formatAddress(address?: GeocodingResult['address']): string {
    if (!address) {
      return '';
    }

    const parts = [];
    
    if (address.house_number && address.road) {
      parts.push(`${address.road} ${address.house_number}`);
    } else if (address.road) {
      parts.push(address.road);
    }

    if (address.city) {
      parts.push(address.city);
    }

    if (address.state && address.state !== address.city) {
      parts.push(address.state);
    }

    if (address.country) {
      parts.push(address.country);
    }

    return parts.join(', ');
  }

  /**
   * Get type icon for location type
   */
  getLocationTypeIcon(type: string): string {
    const typeMap: Record<string, string> = {
      'city': '🏙️',
      'town': '🏘️',
      'village': '🏡',
      'tourism': '🏖️',
      'amenity': '🏢',
      'historic': '🏛️',
      'natural': '🌲',
      'place_of_worship': '⛪',
      'restaurant': '🍽️',
      'hotel': '🏨',
      'shop': '🛍️',
      'hospital': '🏥',
      'school': '🏫',
      'park': '🌳',
      'beach': '🏖️',
      'mountain': '⛰️',
      'airport': '✈️',
      'railway': '🚂',
      'bus_station': '🚌'
    };

    return typeMap[type] || '📍';
  }
}

// Export singleton instance
export const geocodingService = new GeocodingService();
export default geocodingService;