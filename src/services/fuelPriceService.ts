import { Coordinates, FuelPrice, FuelType } from '../types';

// Tankerkoenig API configuration
const TANKERKOENIG_BASE_URL = 'https://creativecommons.tankerkoenig.de/json';
const API_KEY = process.env.REACT_APP_TANKERKOENIG_API_KEY || '00000000-0000-0000-0000-000000000002'; // Demo key for testing

interface TankerkoenigStation {
  id: string;
  name: string;
  brand: string;
  street: string;
  place: string;
  lat: number;
  lng: number;
  dist: number;
  diesel?: number;
  e5?: number;
  e10?: number;
  isOpen: boolean;
}

interface TankerkoenigListResponse {
  ok: boolean;
  license: string;
  data: string;
  status: string;
  stations: TankerkoenigStation[];
}

interface TankerkoenigPricesResponse {
  ok: boolean;
  license: string;
  data: string;
  status: string;
  prices: Record<string, {
    status: string;
    e5?: number;
    e10?: number;
    diesel?: number;
  }>;
}

export class FuelPriceService {
  private static instance: FuelPriceService;
  private cache: Map<string, { data: FuelPrice[], timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  static getInstance(): FuelPriceService {
    if (!FuelPriceService.instance) {
      FuelPriceService.instance = new FuelPriceService();
    }
    return FuelPriceService.instance;
  }

  /**
   * Get fuel prices from nearby stations within specified radius
   * @param coordinates Center location
   * @param radius Radius in kilometers (max 25km)
   * @param fuelType Type of fuel to search for
   * @param limit Maximum number of stations to return
   */
  async getNearbyFuelPrices(
    coordinates: Coordinates,
    radius: number = 25,
    fuelType: FuelType = FuelType.DIESEL,
    limit: number = 10
  ): Promise<FuelPrice[]> {
    try {
      const cacheKey = `${coordinates.lat},${coordinates.lng},${radius},${fuelType}`;
      
      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data.slice(0, limit);
      }

      // Make API request
      const url = new URL(`${TANKERKOENIG_BASE_URL}/list.php`);
      url.searchParams.set('lat', coordinates.lat.toString());
      url.searchParams.set('lng', coordinates.lng.toString());
      url.searchParams.set('rad', Math.min(radius, 25).toString()); // Max 25km
      url.searchParams.set('type', fuelType);
      url.searchParams.set('sort', 'price');
      url.searchParams.set('apikey', API_KEY);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: TankerkoenigListResponse = await response.json();
      
      if (!data.ok) {
        throw new Error(`API error: ${data.status}`);
      }

      // Transform to our format
      const fuelPrices: FuelPrice[] = data.stations
        .filter(station => station.isOpen && this.getStationPrice(station, fuelType) !== undefined)
        .map(station => ({
          type: fuelType,
          price: this.getStationPrice(station, fuelType)!,
          stationId: station.id,
          stationName: `${station.brand} ${station.name}`,
          location: {
            lat: station.lat,
            lng: station.lng
          },
          lastUpdated: new Date().toISOString()
        }))
        .sort((a, b) => a.price - b.price); // Sort by price ascending

      // Cache the results
      this.cache.set(cacheKey, {
        data: fuelPrices,
        timestamp: Date.now()
      });

      return fuelPrices.slice(0, limit);

    } catch (error) {
      console.error('Error fetching fuel prices:', error);
      
      // Return fallback data if API fails
      return [{
        type: fuelType,
        price: this.getFallbackPrice(fuelType),
        stationId: 'fallback',
        stationName: 'Durchschnittspreis (Schätzung)',
        location: coordinates,
        lastUpdated: new Date().toISOString()
      }];
    }
  }

  /**
   * Get current prices for specific station IDs
   */
  async getStationPrices(stationIds: string[]): Promise<Record<string, FuelPrice | null>> {
    try {
      if (stationIds.length === 0) return {};
      
      const url = new URL(`${TANKERKOENIG_BASE_URL}/prices.php`);
      url.searchParams.set('ids', stationIds.slice(0, 10).join(',')); // Max 10 stations
      url.searchParams.set('apikey', API_KEY);

      const response = await fetch(url.toString());
      const data: TankerkoenigPricesResponse = await response.json();

      if (!data.ok) {
        throw new Error(`API error: ${data.status}`);
      }

      const result: Record<string, FuelPrice | null> = {};

      Object.entries(data.prices).forEach(([stationId, priceData]) => {
        if (priceData.status === 'open') {
          // Create fuel price objects for each available fuel type
          [FuelType.DIESEL, FuelType.E5, FuelType.E10].forEach(fuelType => {
            const price = this.getPriceFromData(priceData, fuelType);
            if (price !== undefined) {
              result[`${stationId}_${fuelType}`] = {
                type: fuelType,
                price,
                stationId,
                stationName: `Station ${stationId}`,
                location: { lat: 0, lng: 0 }, // Location would need separate API call
                lastUpdated: new Date().toISOString()
              };
            }
          });
        }
      });

      return result;

    } catch (error) {
      console.error('Error fetching station prices:', error);
      return {};
    }
  }

  /**
   * Get average fuel price for a fuel type in Germany
   */
  async getAverageFuelPrice(
    coordinates: Coordinates,
    fuelType: FuelType,
    radius: number = 25
  ): Promise<number> {
    try {
      const prices = await this.getNearbyFuelPrices(coordinates, radius, fuelType, 50);
      
      if (prices.length === 0) {
        return this.getFallbackPrice(fuelType);
      }

      const validPrices = prices.filter(p => p.price > 0);
      if (validPrices.length === 0) {
        return this.getFallbackPrice(fuelType);
      }

      // Calculate average of nearby prices
      const sum = validPrices.reduce((acc, price) => acc + price.price, 0);
      return Number((sum / validPrices.length).toFixed(3));

    } catch (error) {
      console.error('Error getting average fuel price:', error);
      return this.getFallbackPrice(fuelType);
    }
  }

  /**
   * Helper method to extract price from station data
   */
  private getStationPrice(station: TankerkoenigStation, fuelType: FuelType): number | undefined {
    switch (fuelType) {
      case FuelType.DIESEL:
        return station.diesel;
      case FuelType.E5:
        return station.e5;
      case FuelType.E10:
        return station.e10;
      default:
        return undefined;
    }
  }

  /**
   * Helper method to extract price from price data
   */
  private getPriceFromData(priceData: any, fuelType: FuelType): number | undefined {
    switch (fuelType) {
      case FuelType.DIESEL:
        return priceData.diesel;
      case FuelType.E5:
        return priceData.e5;
      case FuelType.E10:
        return priceData.e10;
      default:
        return undefined;
    }
  }

  /**
   * Get fallback prices when API is unavailable
   */
  private getFallbackPrice(fuelType: FuelType): number {
    // Approximate average prices in Germany (EUR per liter) - as of 2024
    switch (fuelType) {
      case FuelType.DIESEL:
        return 1.55;
      case FuelType.E5:
        return 1.75;
      case FuelType.E10:
        return 1.70;
      default:
        return 1.65;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Check if API key is configured (not using demo key)
   */
  isConfigured(): boolean {
    return API_KEY !== '00000000-0000-0000-0000-000000000002' && API_KEY.length > 0;
  }

  /**
   * Check if using demo key
   */
  isUsingDemoKey(): boolean {
    return API_KEY === '00000000-0000-0000-0000-000000000002';
  }

  /**
   * Get API configuration status message
   */
  getConfigurationStatus(): string {
    if (this.isConfigured()) {
      return 'Tankerkönig API ist konfiguriert - aktuelle Spritpreise verfügbar';
    } else if (this.isUsingDemoKey()) {
      return 'Tankerkönig API nicht konfiguriert - Demo-Modus mit Durchschnittspreisen';
    } else {
      return 'Tankerkönig API nicht konfiguriert - Durchschnittspreise werden verwendet';
    }
  }

  /**
   * Get fuel type display name
   */
  static getFuelTypeDisplayName(fuelType: FuelType): string {
    switch (fuelType) {
      case FuelType.DIESEL:
        return 'Diesel';
      case FuelType.E5:
        return 'Super E5';
      case FuelType.E10:
        return 'Super E10';
      default:
        return 'Kraftstoff';
    }
  }
}

// Export singleton instance
export const fuelPriceService = FuelPriceService.getInstance();