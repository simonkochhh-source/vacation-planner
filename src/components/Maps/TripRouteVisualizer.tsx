import React, { useState, useEffect, useCallback } from 'react';
import { Polyline, Popup } from 'react-leaflet';
import { Destination } from '../../types';
import { LatLngExpression } from 'leaflet';
import { Clock, Route, MapPin, Car, Bike, User } from 'lucide-react';
import { routeCalculationService, RouteSegment } from '../../services/routeCalculationService';

interface TripRouteVisualizerProps {
  destinations: Destination[];
  showRoutes?: boolean;
  onRouteClick?: (fromDestination: Destination, toDestination: Destination, travelTime: number) => void;
}

interface VisualRouteSegment {
  segment: RouteSegment;
  path: LatLngExpression[];
  dayIndex: number;
}

const TripRouteVisualizer: React.FC<TripRouteVisualizerProps> = ({
  destinations,
  showRoutes = true,
  onRouteClick
}) => {
  const [routeCalculations, setRouteCalculations] = useState<VisualRouteSegment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load route calculations asynchronously
  useEffect(() => {
    const calculateRoutes = async () => {
      if (!destinations.length || !showRoutes) {
        setRouteCalculations([]);
        return;
      }

      setIsLoading(true);
      
      try {
        // Calculate comprehensive trip route
        const tripCalculation = await routeCalculationService.calculateTripRoute(destinations);

        // Group destinations by day for visualization
        const destinationsByDay = destinations
          .filter(dest => dest.coordinates)
          .reduce((acc, dest) => {
            const day = dest.startDate;
            if (!acc[day]) acc[day] = [];
            acc[day].push(dest);
            return acc;
          }, {} as Record<string, Destination[]>);

        // Create visual segments for each route segment
        const visualSegments: VisualRouteSegment[] = [];
        
        Object.entries(destinationsByDay).forEach(([day, dayDestinations], dayIndex) => {
          const sortedDestinations = dayDestinations.sort((a, b) => a.name.localeCompare(b.name));
          
          // Find matching segments for this day
          for (let i = 0; i < sortedDestinations.length - 1; i++) {
            const from = sortedDestinations[i];
            const to = sortedDestinations[i + 1];
            
            // Find the calculated segment that matches this route
            const matchingSegment = tripCalculation.segments.find(seg => 
              seg.from.id === from.id && seg.to.id === to.id
            );
            
            if (matchingSegment && from.coordinates && to.coordinates) {
              // Use actual route if available, otherwise straight line
              const path: LatLngExpression[] = matchingSegment.actualRoute 
                ? matchingSegment.actualRoute.map(coord => [coord.lat, coord.lng])
                : [[from.coordinates.lat, from.coordinates.lng], [to.coordinates.lat, to.coordinates.lng]];

              visualSegments.push({
                segment: matchingSegment,
                path,
                dayIndex
              });
            }
          }
        });

        setRouteCalculations(visualSegments);
      } catch (error) {
        console.error('Route calculation failed:', error);
        setRouteCalculations([]);
      } finally {
        setIsLoading(false);
      }
    };

    calculateRoutes();
  }, [destinations, showRoutes]);

  // Get transport mode icon and color
  const getTransportInfo = useCallback((transportMode: string) => {
    switch (transportMode) {
      case 'driving':
        return { icon: Car, color: '#ef4444', label: 'Auto' };
      case 'walking':
        return { icon: User, color: '#10b981', label: 'Wanderung' };
      case 'bicycle':
        return { icon: Bike, color: '#f59e0b', label: 'Fahrrad' };
      case 'public_transport':
        return { icon: Route, color: '#3b82f6', label: 'ÖPNV' };
      default:
        return { icon: Route, color: '#6b7280', label: 'Route' };
    }
  }, []);

  // Format travel time for display
  const formatTravelTime = useCallback((minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }, []);

  if (!showRoutes || (!isLoading && !routeCalculations.length)) {
    return null;
  }

  return (
    <>
      {routeCalculations.map((visualSegment, index) => {
        const { segment, path } = visualSegment;
        const transportInfo = getTransportInfo(segment.transportMode);
        const TransportIcon = transportInfo.icon;
        
        return (
          <Polyline
            key={`route-${index}-${segment.from.id}-${segment.to.id}`}
            positions={path}
            pathOptions={{
              color: transportInfo.color,
              weight: 4,
              opacity: 0.8,
              dashArray: segment.transportMode === 'walking' ? '10, 5' : undefined,
              lineCap: 'round',
              lineJoin: 'round'
            }}
            eventHandlers={{
              click: () => {
                if (onRouteClick) {
                  onRouteClick(segment.from, segment.to, segment.duration);
                }
              }
            }}
          >
            <Popup>
              <div style={{
                minWidth: '250px',
                padding: '0.75rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  <TransportIcon size={16} style={{ color: transportInfo.color }} />
                  {transportInfo.label}
                </div>
                
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.875rem',
                    color: '#4b5563',
                    marginBottom: '0.25rem'
                  }}>
                    <MapPin size={12} />
                    <strong>Von:</strong> {segment.from.name}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.875rem',
                    color: '#4b5563'
                  }}>
                    <MapPin size={12} />
                    <strong>Nach:</strong> {segment.to.name}
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.75rem',
                    color: '#6b7280'
                  }}>
                    <Clock size={10} />
                    <strong>Reisezeit:</strong>
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: transportInfo.color
                  }}>
                    {formatTravelTime(segment.duration)}
                  </div>
                  
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#6b7280'
                  }}>
                    <strong>Entfernung:</strong>
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#6b7280'
                  }}>
                    {segment.distance.toFixed(1)} km
                  </div>
                </div>

                <div style={{
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                  fontStyle: 'italic'
                }}>
                  {segment.actualRoute ? 'Tatsächliche Route' : 'Geschätzte Route'}
                </div>
              </div>
            </Popup>
          </Polyline>
        );
      })}
    </>
  );
};

export default TripRouteVisualizer;