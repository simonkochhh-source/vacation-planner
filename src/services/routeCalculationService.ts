import { Destination, TransportMode, Coordinates } from '../types';

// Types for route calculations
export interface RouteSegment {
  from: Destination;
  to: Destination;
  transportMode: TransportMode;
  distance: number; // in kilometers
  duration: number; // in minutes
  actualRoute?: Coordinates[]; // GPS coordinates for the actual route
}

export interface TripRouteCalculation {
  totalDistance: number;
  totalDuration: number;
  segments: RouteSegment[];
  distanceByTransportMode: Record<TransportMode, number>;
  durationByTransportMode: Record<TransportMode, number>;
}

// API Configuration
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const KOMOOT_API_KEY = process.env.REACT_APP_KOMOOT_API_KEY;

class RouteCalculationService {
  private cache = new Map<string, RouteSegment>();
  
  /**
   * Calculate route between two destinations based on transport mode
   */
  async calculateRoute(from: Destination, to: Destination, transportMode?: TransportMode): Promise<RouteSegment> {
    if (!from.coordinates || !to.coordinates) {
      throw new Error('Coordinates missing for route calculation');
    }

    // Use transport mode from destination notes/tags if not provided
    const mode = transportMode || this.extractTransportMode(from) || TransportMode.DRIVING;
    
    const cacheKey = `${from.id}-${to.id}-${mode}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let segment: RouteSegment;

    try {
      switch (mode) {
        case TransportMode.DRIVING:
          segment = await this.calculateDrivingRoute(from, to);
          break;
        case TransportMode.WALKING:
          segment = await this.calculateWalkingRoute(from, to);
          break;
        case TransportMode.BICYCLE:
          segment = await this.calculateBicycleRoute(from, to);
          break;
        case TransportMode.PUBLIC_TRANSPORT:
          segment = await this.calculatePublicTransportRoute(from, to);
          break;
        default:
          segment = await this.calculateFallbackRoute(from, to, mode);
      }

      this.cache.set(cacheKey, segment);
      return segment;
    } catch (error) {
      console.warn(`Route calculation failed for ${mode}, using fallback:`, error);
      segment = await this.calculateFallbackRoute(from, to, mode);
      this.cache.set(cacheKey, segment);
      return segment;
    }
  }

  /**
   * Calculate driving route using Google Maps API
   */
  private async calculateDrivingRoute(from: Destination, to: Destination): Promise<RouteSegment> {
    if (!GOOGLE_MAPS_API_KEY) {
      return this.calculateFallbackRoute(from, to, TransportMode.DRIVING);
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${from.coordinates!.lat},${from.coordinates!.lng}&` +
        `destination=${to.coordinates!.lat},${to.coordinates!.lng}&` +
        `mode=driving&` +
        `key=${GOOGLE_MAPS_API_KEY}`
      );

      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];
        
        return {
          from,
          to,
          transportMode: TransportMode.DRIVING,
          distance: leg.distance.value / 1000, // Convert meters to kilometers
          duration: Math.round(leg.duration.value / 60), // Convert seconds to minutes
          actualRoute: this.decodePolyline(route.overview_polyline.points)
        };
      }
    } catch (error) {
      console.error('Google Maps API error:', error);
    }

    return this.calculateFallbackRoute(from, to, TransportMode.DRIVING);
  }

  /**
   * Calculate walking route using Komoot API
   */
  private async calculateWalkingRoute(from: Destination, to: Destination): Promise<RouteSegment> {
    if (!KOMOOT_API_KEY) {
      return this.calculateFallbackRoute(from, to, TransportMode.WALKING);
    }

    try {
      // Komoot API for hiking routes
      const response = await fetch(
        `https://api.komoot.de/v007/routing?` +
        `waypoints=${from.coordinates!.lat},${from.coordinates!.lng}|${to.coordinates!.lat},${to.coordinates!.lng}&` +
        `sport=hike&` +
        `key=${KOMOOT_API_KEY}`
      );

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const properties = feature.properties;
        
        return {
          from,
          to,
          transportMode: TransportMode.WALKING,
          distance: properties.distance / 1000, // Convert meters to kilometers
          duration: Math.round(properties.time / 60), // Convert seconds to minutes
          actualRoute: feature.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }))
        };
      }
    } catch (error) {
      console.error('Komoot API error:', error);
    }

    return this.calculateFallbackRoute(from, to, TransportMode.WALKING);
  }

  /**
   * Calculate bicycle route using Google Maps API
   */
  private async calculateBicycleRoute(from: Destination, to: Destination): Promise<RouteSegment> {
    if (!GOOGLE_MAPS_API_KEY) {
      return this.calculateFallbackRoute(from, to, TransportMode.BICYCLE);
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${from.coordinates!.lat},${from.coordinates!.lng}&` +
        `destination=${to.coordinates!.lat},${to.coordinates!.lng}&` +
        `mode=bicycling&` +
        `key=${GOOGLE_MAPS_API_KEY}`
      );

      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];
        
        return {
          from,
          to,
          transportMode: TransportMode.BICYCLE,
          distance: leg.distance.value / 1000, // Convert meters to kilometers
          duration: Math.round(leg.duration.value / 60), // Convert seconds to minutes
          actualRoute: this.decodePolyline(route.overview_polyline.points)
        };
      }
    } catch (error) {
      console.error('Google Maps Bicycling API error:', error);
    }

    return this.calculateFallbackRoute(from, to, TransportMode.BICYCLE);
  }

  /**
   * Calculate public transport route using Google Maps API
   */
  private async calculatePublicTransportRoute(from: Destination, to: Destination): Promise<RouteSegment> {
    if (!GOOGLE_MAPS_API_KEY) {
      return this.calculateFallbackRoute(from, to, TransportMode.PUBLIC_TRANSPORT);
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${from.coordinates!.lat},${from.coordinates!.lng}&` +
        `destination=${to.coordinates!.lat},${to.coordinates!.lng}&` +
        `mode=transit&` +
        `key=${GOOGLE_MAPS_API_KEY}`
      );

      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];
        
        return {
          from,
          to,
          transportMode: TransportMode.PUBLIC_TRANSPORT,
          distance: leg.distance.value / 1000, // Convert meters to kilometers
          duration: Math.round(leg.duration.value / 60), // Convert seconds to minutes
          actualRoute: this.decodePolyline(route.overview_polyline.points)
        };
      }
    } catch (error) {
      console.error('Google Maps Transit API error:', error);
    }

    return this.calculateFallbackRoute(from, to, TransportMode.PUBLIC_TRANSPORT);
  }

  /**
   * Fallback route calculation using Haversine formula with transport-specific adjustments
   */
  private calculateFallbackRoute(from: Destination, to: Destination, transportMode: TransportMode): RouteSegment {
    if (!from.coordinates || !to.coordinates) {
      throw new Error('Coordinates required for fallback calculation');
    }

    // Calculate straight-line distance using Haversine formula
    const straightDistance = this.calculateHaversineDistance(from.coordinates, to.coordinates);
    
    // Apply transport-specific distance and speed factors
    let distanceFactor: number;
    let averageSpeed: number;
    
    switch (transportMode) {
      case TransportMode.DRIVING:
        distanceFactor = 1.4; // Roads are typically 40% longer than straight line
        averageSpeed = straightDistance < 5 ? 30 : straightDistance < 50 ? 60 : straightDistance < 200 ? 80 : 90;
        break;
      case TransportMode.WALKING:
        distanceFactor = 1.2; // Walking paths are typically 20% longer
        averageSpeed = 4.5; // Average walking speed: 4.5 km/h
        break;
      case TransportMode.BICYCLE:
        distanceFactor = 1.3; // Bike paths are typically 30% longer
        averageSpeed = straightDistance < 5 ? 12 : straightDistance < 20 ? 15 : 18; // 12-18 km/h depending on distance
        break;
      case TransportMode.PUBLIC_TRANSPORT:
        distanceFactor = 1.6; // Public transport routes are typically 60% longer
        averageSpeed = straightDistance < 10 ? 20 : straightDistance < 50 ? 35 : 50; // Including waiting times
        break;
      default:
        distanceFactor = 1.4;
        averageSpeed = 50;
    }
    
    const actualDistance = straightDistance * distanceFactor;
    const duration = Math.round((actualDistance / averageSpeed) * 60); // Convert hours to minutes
    
    return {
      from,
      to,
      transportMode,
      distance: actualDistance,
      duration: Math.max(transportMode === TransportMode.WALKING ? 5 : 10, duration) // Minimum durations
    };
  }

  /**
   * Calculate cumulative trip statistics
   */
  async calculateTripRoute(destinations: Destination[]): Promise<TripRouteCalculation> {
    if (destinations.length < 2) {
      return {
        totalDistance: 0,
        totalDuration: 0,
        segments: [],
        distanceByTransportMode: {} as Record<TransportMode, number>,
        durationByTransportMode: {} as Record<TransportMode, number>
      };
    }

    const segments: RouteSegment[] = [];
    const distanceByMode: Record<TransportMode, number> = {} as Record<TransportMode, number>;
    const durationByMode: Record<TransportMode, number> = {} as Record<TransportMode, number>;

    // Calculate segments between consecutive destinations
    for (let i = 0; i < destinations.length - 1; i++) {
      const from = destinations[i];
      const to = destinations[i + 1];
      
      const segment = await this.calculateRoute(from, to);
      segments.push(segment);

      // Accumulate by transport mode
      if (!distanceByMode[segment.transportMode]) {
        distanceByMode[segment.transportMode] = 0;
        durationByMode[segment.transportMode] = 0;
      }
      
      distanceByMode[segment.transportMode] += segment.distance;
      durationByMode[segment.transportMode] += segment.duration;
    }

    const totalDistance = segments.reduce((sum, segment) => sum + segment.distance, 0);
    const totalDuration = segments.reduce((sum, segment) => sum + segment.duration, 0);

    return {
      totalDistance,
      totalDuration,
      segments,
      distanceByTransportMode: distanceByMode,
      durationByTransportMode: durationByMode
    };
  }

  /**
   * Extract transport mode from destination notes or tags
   */
  private extractTransportMode(destination: Destination): TransportMode | null {
    const text = `${destination.notes || ''} ${destination.tags?.join(' ') || ''}`.toLowerCase();
    
    if (text.includes('wanderung') || text.includes('hiking') || text.includes('walking')) {
      return TransportMode.WALKING;
    }
    if (text.includes('fahrrad') || text.includes('bicycle') || text.includes('bike')) {
      return TransportMode.BICYCLE;
    }
    if (text.includes('öffentlich') || text.includes('public') || text.includes('transport')) {
      return TransportMode.PUBLIC_TRANSPORT;
    }
    if (text.includes('auto') || text.includes('car') || text.includes('driving')) {
      return TransportMode.DRIVING;
    }
    
    return null;
  }

  /**
   * Calculate straight-line distance using Haversine formula
   */
  private calculateHaversineDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth's radius in km
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Decode Google Maps polyline to coordinates
   */
  private decodePolyline(polyline: string): Coordinates[] {
    const coordinates: Coordinates[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < polyline.length) {
      let result = 1;
      let shift = 0;
      let b;

      do {
        b = polyline.charCodeAt(index++) - 63 - 1;
        result += b << shift;
        shift += 5;
      } while (b >= 0x1f);

      lat += (result & 1) !== 0 ? ~(result >> 1) : (result >> 1);

      result = 1;
      shift = 0;

      do {
        b = polyline.charCodeAt(index++) - 63 - 1;
        result += b << shift;
        shift += 5;
      } while (b >= 0x1f);

      lng += (result & 1) !== 0 ? ~(result >> 1) : (result >> 1);

      coordinates.push({
        lat: lat / 1e5,
        lng: lng / 1e5
      });
    }

    return coordinates;
  }

  /**
   * Clear route cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const routeCalculationService = new RouteCalculationService();