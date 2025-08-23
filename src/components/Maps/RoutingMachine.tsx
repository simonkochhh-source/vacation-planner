import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { Destination } from '../../types';

// Import React for FC type
import React from 'react';

interface RoutingMachineProps {
  destinations: Destination[];
  showRouting: boolean;
  routingMode?: 'driving' | 'walking' | 'cycling';
}

const RoutingMachine: React.FC<RoutingMachineProps> = ({ 
  destinations, 
  showRouting, 
  routingMode = 'driving' 
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !showRouting || destinations.length < 2) return;

    // Filter destinations that have coordinates and sort by date/time
    const sortedDestinations = destinations
      .filter(dest => dest.coordinates)
      .sort((a, b) => {
        const dateA = new Date(`${a.startDate}T${a.startTime}`);
        const dateB = new Date(`${b.startDate}T${b.startTime}`);
        return dateA.getTime() - dateB.getTime();
      });

    if (sortedDestinations.length < 2) return;

    // Create waypoints from sorted destinations
    const waypoints = sortedDestinations.map(dest => 
      L.latLng(dest.coordinates!.lat, dest.coordinates!.lng)
    );

    // Create routing control
    const routingControl = (L as any).Routing.control({
      waypoints,
      routeWhileDragging: false,
      addWaypoints: false,
      createMarker: () => null, // Don't create markers, we have our own
      lineOptions: {
        styles: [{
          color: '#3b82f6',
          weight: 4,
          opacity: 0.7
        }]
      },
      router: (L as any).Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        profile: routingMode === 'walking' ? 'foot' : routingMode === 'cycling' ? 'bike' : 'driving'
      }),
      show: false, // Hide the routing panel
      collapsible: false,
      draggableWaypoints: false,
      fitSelectedRoutes: false
    });

    routingControl.addTo(map);

    // Custom styling for the route
    routingControl.on('routesfound', function(e: any) {
      const routes = e.routes;
      if (routes && routes.length > 0) {
        const route = routes[0];
        
        // Add route information to a custom popup or info panel
        const distance = (route.summary.totalDistance / 1000).toFixed(1);
        const duration = Math.round(route.summary.totalTime / 60);
        
        // Create a simple info div
        const routeInfo = L.DomUtil.create('div', 'route-info');
        routeInfo.innerHTML = `
          <div style="
            position: absolute; 
            top: 70px; 
            right: 10px; 
            background: white; 
            padding: 10px; 
            border-radius: 8px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            font-size: 14px;
            z-index: 1000;
          ">
            <strong>Route:</strong><br/>
            📏 ${distance} km<br/>
            ⏱️ ${duration} min
          </div>
        `;
        
        map.getContainer().appendChild(routeInfo);
      }
    });

    // Cleanup function
    return () => {
      if (map.hasLayer(routingControl)) {
        map.removeControl(routingControl);
      }
      // Remove route info div
      const routeInfos = map.getContainer().querySelectorAll('.route-info');
      routeInfos.forEach(info => info.remove());
    };
  }, [map, destinations, showRouting, routingMode]);

  return null; // This component doesn't render anything directly
};

export default RoutingMachine;