import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { Destination, TransportMode } from '../../types';

// Import React for FC type
import React from 'react';

// Route cache for performance
interface CachedRoute {
  coordinates: [number, number][];
  distance: number;
  time: number;
  timestamp: number;
}

const routeCache = new Map<string, CachedRoute>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface RoutingMachineProps {
  destinations: Destination[];
  showRouting: boolean;
}

// Create cache key for route
const createRouteKey = (from: { lat: number; lng: number }, to: { lat: number; lng: number }, profile: string): string => {
  return `${from.lat.toFixed(4)},${from.lng.toFixed(4)}-${to.lat.toFixed(4)},${to.lng.toFixed(4)}-${profile}`;
};

// Clean expired cache entries
const cleanCache = () => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  routeCache.forEach((cached, key) => {
    if (now - cached.timestamp > CACHE_DURATION) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => routeCache.delete(key));
};

// Multiple OSRM servers for better reliability
const OSRM_SERVERS = [
  'https://router.project-osrm.org',
  'https://routing.openstreetmap.de',
  // Add more OSRM servers if needed
];

// Try OSRM routing with multiple servers (each has different URL structure)
const tryOSRMRouting = async (
  from: { lat: number; lng: number }, 
  to: { lat: number; lng: number }, 
  osrmProfile: string,
  serverIndex: number = 0
): Promise<{ coordinates: [number, number][], distance: number, time: number } | null> => {
  if (serverIndex >= OSRM_SERVERS.length) {
    console.log('⚠️ All OSRM servers failed, returning null for fallback handling');
    return null; // All OSRM servers failed
  }
  
  // Different URL structures for different servers
  let url: string;
  if (serverIndex === 0) {
    // router.project-osrm.org format
    url = `${OSRM_SERVERS[serverIndex]}/route/v1/${osrmProfile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=false&alternatives=false&continue_straight=true`;
  } else if (serverIndex === 1) {
    // routing.openstreetmap.de format (different path structure)
    const profileMap: { [key: string]: string } = {
      'car': 'driving',
      'bike': 'cycling', 
      'foot': 'walking'
    };
    const mappedProfile = profileMap[osrmProfile] || 'driving';
    url = `${OSRM_SERVERS[serverIndex]}/routed-car/route/v1/${mappedProfile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=false&alternatives=false`;
  } else {
    // Default format for any additional servers
    url = `${OSRM_SERVERS[serverIndex]}/route/v1/${osrmProfile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=false&alternatives=false&continue_straight=true`;
  }
  
  console.log(`🌐 Trying OSRM server ${serverIndex + 1}/${OSRM_SERVERS.length}: ${osrmProfile}`);
  console.log(`🔗 URL: ${url}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second timeout per server
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Vacation-Planner-App/1.0'
      },
      cache: 'default'
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn(`OSRM server ${serverIndex + 1} failed (${response.status}), trying next...`);
      return await tryOSRMRouting(from, to, osrmProfile, serverIndex + 1);
    }
    
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      console.log(`✅ OSRM server ${serverIndex + 1} successful: ${osrmProfile}`);
      return {
        coordinates: route.geometry.coordinates as [number, number][],
        distance: Math.round(route.distance / 1000 * 10) / 10,
        time: Math.round(route.duration / 60)
      };
    }
    
    console.warn(`OSRM server ${serverIndex + 1} returned no routes, trying next...`);
    return await tryOSRMRouting(from, to, osrmProfile, serverIndex + 1);
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`OSRM server ${serverIndex + 1} timed out, trying next...`);
    } else {
      console.warn(`OSRM server ${serverIndex + 1} error:`, error);
    }
    return await tryOSRMRouting(from, to, osrmProfile, serverIndex + 1);
  }
};

// OSRM-only routing function - no fallback estimates
const getNavigableRoute = async (
  from: { lat: number; lng: number }, 
  to: { lat: number; lng: number }, 
  profile: string
): Promise<{ coordinates: [number, number][], distance: number, time: number } | null> => {
  // Check cache first
  const cacheKey = createRouteKey(from, to, profile);
  const cached = routeCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    console.log(`🚀 Using cached OSRM route: ${profile}`);
    return {
      coordinates: cached.coordinates,
      distance: cached.distance,
      time: cached.time
    };
  }
  
  // Convert Mapbox profiles to OSRM profiles
  let osrmProfile: string;
  switch (profile) {
    case 'driving':
      osrmProfile = 'car';
      break;
    case 'walking':
      osrmProfile = 'foot';
      break;
    case 'cycling':
      osrmProfile = 'bike';
      break;
    default:
      osrmProfile = 'car';
  }
  
  // Try OSRM servers only
  const routeData = await tryOSRMRouting(from, to, osrmProfile);
  
  if (routeData) {
    // Cache successful OSRM result
    routeCache.set(cacheKey, {
      ...routeData,
      timestamp: Date.now()
    });
    
    // Clean old cache entries periodically
    if (routeCache.size > 100) {
      cleanCache();
    }
    
    console.log(`✅ OSRM route cached and returned: ${profile}`);
    return routeData;
  }
  
  // All OSRM servers failed - return null for direct line fallback in main component
  console.log(`❌ All OSRM servers failed for ${profile} - returning null`);
  return null;
};

const RoutingMachine: React.FC<RoutingMachineProps> = ({ 
  destinations, 
  showRouting 
}) => {
  const map = useMap();

  useEffect(() => {
    console.log('🚗 RoutingMachine useEffect triggered:', { showRouting, destinationsCount: destinations.length });
    
    if (!map) {
      console.log('No map available');
      return;
    }
    
    if (!showRouting) {
      console.log('Routing is disabled');
      return;
    }
    
    if (destinations.length < 2) {
      console.log('Not enough destinations for routing:', destinations.length);
      return;
    }

    // Filter destinations that have coordinates and sort by date
    const sortedDestinations = destinations
      .filter(dest => dest.coordinates)
      .sort((a, b) => {
        const dateA = new Date(a.startDate);
        const dateB = new Date(b.startDate);
        return dateA.getTime() - dateB.getTime();
      });

    console.log('✅ Sorted destinations with coordinates:', sortedDestinations.length);
    console.log('📍 Destinations:', sortedDestinations.map(d => ({ name: d.name, coords: d.coordinates })));

    if (sortedDestinations.length < 2) {
      console.log('Not enough destinations with coordinates for routing');
      return;
    }

    // Store route polylines for cleanup
    const routePolylines: L.Polyline[] = [];

    // Create navigable routes between consecutive destinations with parallel processing
    const createRoutes = async () => {
      // Prepare all route requests
      const routeRequests = [];
      
      for (let i = 0; i < sortedDestinations.length - 1; i++) {
        const from = sortedDestinations[i];
        const to = sortedDestinations[i + 1];
        
        // Determine transport mode using same logic as TripRouteVisualizer
        let transportMode: TransportMode;
        
        if (from.returnDestinationId && from.transportToNext?.mode && 
            (from.transportToNext.mode === TransportMode.WALKING || from.transportToNext.mode === TransportMode.BICYCLE)) {
          // Use the transport mode from the current (from) destination for walking/biking return journeys
          transportMode = from.transportToNext.mode;
        } else {
          // Default behavior: Get transport mode from 'to' destination (how we get TO that destination)
          transportMode = to.transportToNext?.mode || TransportMode.DRIVING;
        }
        
        console.log(`🛣️ Creating navigable route ${i + 1}: ${from.name} -> ${to.name}, Transport: ${transportMode}`);
        
        // Convert transport mode to Mapbox profile and styling
        let mapboxProfile: string;
        let routeColor: string;
        let dashArray: string | undefined;
        let weight: number = 6;
        let opacity: number = 0.8;
        
        switch (transportMode) {
          case TransportMode.WALKING:
            mapboxProfile = 'walking';
            routeColor = '#f97316'; // Orange for walking
            dashArray = '8, 4'; // Dashed line for walking
            weight = 4;
            break;
          case TransportMode.BICYCLE:
            mapboxProfile = 'cycling';
            routeColor = '#3b82f6'; // Blue for bicycle
            weight = 5;
            break;
          case TransportMode.DRIVING:
          default:
            mapboxProfile = 'driving';
            routeColor = '#ef4444'; // Red for driving
            weight = 6;
            break;
        }

        console.log(`🎨 Route config: Profile=${mapboxProfile}, Color=${routeColor}, Weight=${weight}`);
        
        // Add route request to batch
        routeRequests.push({
          index: i,
          from,
          to,
          mapboxProfile,
          routeColor,
          weight,
          opacity,
          dashArray,
          transportMode
        });
      }
      
      // Process routes in parallel (max 3 concurrent requests to avoid overwhelming server)
      const processRoutesBatch = async (requests: any[]) => {
        const results = [];
        for (let i = 0; i < requests.length; i += 3) {
          const batch = requests.slice(i, i + 3);
          const batchPromises = batch.map(async (request) => {
            try {
              const routeData = await getNavigableRoute(
                { lat: request.from.coordinates!.lat, lng: request.from.coordinates!.lng },
                { lat: request.to.coordinates!.lat, lng: request.to.coordinates!.lng },
                request.mapboxProfile
              );
              return { ...request, routeData };
            } catch (error) {
              console.error(`Error processing route ${request.from.name} -> ${request.to.name}:`, error);
              return { ...request, routeData: null };
            }
          });
          
          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);
        }
        return results;
      };
      
      const routeResults = await processRoutesBatch(routeRequests);
      
      // Create polylines from results
      for (const result of routeResults) {
        const { from, to, routeData, routeColor, weight, opacity, dashArray, transportMode, index } = result;
        
        try {
          
          if (routeData && routeData.coordinates.length > 0) {
            // Convert coordinates from [lng, lat] to [lat, lng] for Leaflet
            const leafletCoords: [number, number][] = routeData.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
            
            // Create polyline with the actual route
            const routePolyline = L.polyline(leafletCoords, {
              color: routeColor,
              weight: weight,
              opacity: opacity,
              dashArray: dashArray,
            });

            // Add route to map
            routePolyline.addTo(map);
            routePolylines.push(routePolyline);
            
            // Add popup with detailed route information
            const popupContent = `
              <div style="min-width: 220px; padding: 0.75rem;">
                <div style="font-weight: bold; color: ${routeColor}; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                  ${transportMode === TransportMode.DRIVING ? '🚗' : 
                    transportMode === TransportMode.BICYCLE ? '🚴' : 
                    transportMode === TransportMode.WALKING ? '🚶' : '📍'} 
                  ${transportMode === TransportMode.DRIVING ? 'Auto-Route' : 
                    transportMode === TransportMode.BICYCLE ? 'Fahrrad-Route' : 
                    transportMode === TransportMode.WALKING ? 'Fußweg-Route' : 'Route'}
                </div>
                <div style="margin-bottom: 0.25rem;">
                  <strong>Von:</strong> ${from.name}
                </div>
                <div style="margin-bottom: 0.75rem;">
                  <strong>Nach:</strong> ${to.name}
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; padding: 0.5rem; background: #f9fafb; border-radius: 4px;">
                  <div>
                    <div style="font-size: 0.75rem; color: #6b7280;">Entfernung</div>
                    <div style="font-weight: bold; color: ${routeColor};">${routeData.distance} km</div>
                  </div>
                  <div>
                    <div style="font-size: 0.75rem; color: #6b7280;">Zeit</div>
                    <div style="font-weight: bold; color: ${routeColor};">${routeData.time} min</div>
                  </div>
                </div>
                <div style="font-size: 0.75rem; color: #10b981; margin-top: 0.5rem; font-style: italic;">
                  ✅ ${routeCache.has(createRouteKey({ lat: from.coordinates!.lat, lng: from.coordinates!.lng }, { lat: to.coordinates!.lat, lng: to.coordinates!.lng }, result.mapboxProfile)) ? 'Gecachte OSRM-Route' : 'Navigierbare OSRM-Route'}
                </div>
              </div>
            `;
            
            routePolyline.bindPopup(popupContent);
            
            console.log(`✅ Route ${index + 1} created: ${from.name} -> ${to.name} (${routeData.distance}km, ${routeData.time}min)`);
            
          } else {
            // Fallback to direct line if OSRM fails
            console.log(`⚠️ OSRM failed, creating fallback line for ${from.name} -> ${to.name}`);
            
            const fallbackPolyline = L.polyline([
              [from.coordinates!.lat, from.coordinates!.lng],
              [to.coordinates!.lat, to.coordinates!.lng]
            ], {
              color: routeColor,
              weight: weight,
              opacity: 0.6,
              dashArray: '8, 8', // More dashed to indicate fallback
            });

            fallbackPolyline.addTo(map);
            routePolylines.push(fallbackPolyline);
            
            const fallbackPopup = `
              <div style="min-width: 200px; padding: 0.75rem;">
                <div style="font-weight: bold; color: ${routeColor}; margin-bottom: 0.5rem;">
                  ${transportMode === TransportMode.DRIVING ? '🚗' : 
                    transportMode === TransportMode.BICYCLE ? '🚴' : 
                    transportMode === TransportMode.WALKING ? '🚶' : '📍'} Direkte Verbindung
                </div>
                <div style="margin-bottom: 0.25rem;">
                  <strong>Von:</strong> ${from.name}
                </div>
                <div style="margin-bottom: 0.5rem;">
                  <strong>Nach:</strong> ${to.name}
                </div>
                <div style="font-size: 0.75rem; color: #f59e0b; font-style: italic;">
                  ⚠️ Luftlinienverbindung (OSRM nicht verfügbar)
                </div>
              </div>
            `;
            
            fallbackPolyline.bindPopup(fallbackPopup);
            
            console.log(`⚠️ Fallback route ${index + 1} created: ${from.name} -> ${to.name}`);
          }
          
        } catch (error) {
          console.error(`❌ Error creating route for ${from.name} -> ${to.name}:`, error);
        }
      }

      console.log(`🎯 Total routes created: ${routePolylines.length}`);
    };

    // Start creating routes
    createRoutes();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up route polylines:', routePolylines.length);
      routePolylines.forEach((polyline, index) => {
        try {
          if (polyline && map.hasLayer(polyline)) {
            console.log(`🗑️ Removing route polyline ${index + 1}`);
            map.removeLayer(polyline);
          }
        } catch (error) {
          console.error(`❌ Error removing route polyline ${index + 1}:`, error);
        }
      });
    };
  }, [map, destinations, showRouting]);

  return null; // This component doesn't render anything directly
};

export default RoutingMachine;