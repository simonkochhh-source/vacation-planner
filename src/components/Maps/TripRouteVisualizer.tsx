import React, { useState, useEffect, useCallback } from 'react';
import { Polyline, Popup } from 'react-leaflet';
import { Destination, TransportMode } from '../../types';
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
        // Use destinations in the order provided by MapView (already chronologically sorted)
        const chronologicalDestinations = destinations.filter(dest => dest.coordinates);

        // Create visual segments based on the already correct chronological order
        const visualSegments: VisualRouteSegment[] = [];
        
        // Create route segments for each consecutive pair in chronological order
        for (let i = 0; i < chronologicalDestinations.length - 1; i++) {
          const from = chronologicalDestinations[i];
          const to = chronologicalDestinations[i + 1];
          
          // Determine the transport mode using the same logic as EnhancedTimelineView
          // Special case: If current destination (from) is walking/biking with returnDestinationId,
          // use the transport mode from 'from' destination instead of 'to' destination
          let transportMode: TransportMode;
          
          if (from.returnDestinationId && from.transportToNext?.mode && 
              (from.transportToNext.mode === TransportMode.WALKING || from.transportToNext.mode === TransportMode.BICYCLE)) {
            // Use the transport mode from the current (from) destination for walking/biking return journeys
            transportMode = from.transportToNext.mode;
          } else {
            // Default behavior: Get transport mode from 'to' destination (how we get TO that destination)
            transportMode = to.transportToNext?.mode || TransportMode.DRIVING;
          }
          
          // Calculate the route segment using the explicit transport mode
          const segment = await routeCalculationService.calculateRoute(from, to, transportMode);
          
          // Use actual route if available, otherwise straight line
          const path: LatLngExpression[] = segment.actualRoute 
            ? segment.actualRoute.map(coord => [coord.lat, coord.lng])
            : [[from.coordinates!.lat, from.coordinates!.lng], [to.coordinates!.lat, to.coordinates!.lng]];

          visualSegments.push({
            segment,
            path,
            dayIndex: 0 // Since we process all destinations chronologically, dayIndex is not needed
          });
        }
        
        // Create additional car route segments that skip over walking/biking destinations
        // This allows showing continuous car routes even when interrupted by walking/biking
        const carDestinations = chronologicalDestinations.filter((dest, index) => {
          if (index === 0 || !dest.transportToNext) {
            return true; // First destination or no transport defined
          }
          
          // Apply same logic as the main transport mode determination
          // Check if previous destination has walking/biking with returnDestinationId
          const prevDest = chronologicalDestinations[index - 1];
          
          if (prevDest.returnDestinationId && prevDest.transportToNext?.mode && 
              (prevDest.transportToNext.mode === TransportMode.WALKING || prevDest.transportToNext.mode === TransportMode.BICYCLE)) {
            // For walking/biking return journeys, exclude from car destinations
            return false;
          } else {
            // Default behavior: Include if we DRIVE TO this destination
            return dest.transportToNext?.mode === TransportMode.DRIVING;
          }
        });
        
        // Create car route segments between car-accessible destinations
        for (let i = 0; i < carDestinations.length - 1; i++) {
          const from = carDestinations[i];
          const to = carDestinations[i + 1];
          
          // Only create car route if there are walking/biking destinations in between
          const fromIndex = chronologicalDestinations.indexOf(from);
          const toIndex = chronologicalDestinations.indexOf(to);
          
          if (toIndex - fromIndex > 1 && from.coordinates && to.coordinates) {
            // Check if there are non-driving destinations in between using the new logic
            const hasNonDrivingInBetween = chronologicalDestinations
              .slice(fromIndex + 1, toIndex + 1) // Include toIndex destination to check how we get to it
              .some((dest, relativeIndex) => {
                const actualIndex = fromIndex + 1 + relativeIndex;
                const prevDest = actualIndex > 0 ? chronologicalDestinations[actualIndex - 1] : null;
                
                // Apply same transport mode determination logic
                if (prevDest?.returnDestinationId && prevDest.transportToNext?.mode && 
                    (prevDest.transportToNext.mode === TransportMode.WALKING || prevDest.transportToNext.mode === TransportMode.BICYCLE)) {
                  // Walking/biking return journey
                  return prevDest.transportToNext.mode === TransportMode.WALKING || prevDest.transportToNext.mode === TransportMode.BICYCLE;
                } else {
                  // Default behavior: Check destination's own transport mode
                  return dest.transportToNext?.mode === TransportMode.WALKING || dest.transportToNext?.mode === TransportMode.BICYCLE;
                }
              });
            
            if (hasNonDrivingInBetween) {
              // Create a car route segment that skips the walking/biking section
              const segment = await routeCalculationService.calculateRoute(from, to, TransportMode.DRIVING);
              
              const path: LatLngExpression[] = segment.actualRoute 
                ? segment.actualRoute.map(coord => [coord.lat, coord.lng])
                : [[from.coordinates.lat, from.coordinates.lng], [to.coordinates.lat, to.coordinates.lng]];

              visualSegments.push({
                segment,
                path,
                dayIndex: 0 // Since we process chronologically, dayIndex is not relevant
              });
            }
          }
        }

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

  // Get transport mode icon, color, and time label - Updated colors as requested
  const getTransportInfo = useCallback((transportMode: TransportMode) => {
    switch (transportMode) {
      case TransportMode.DRIVING:
        return { icon: Car, color: '#ef4444', label: 'Auto', timeLabel: 'Fahrzeit' }; // Red for driving
      case TransportMode.WALKING:
        return { icon: User, color: '#f97316', label: 'Wanderung', timeLabel: 'Wanderzeit' }; // Orange for walking
      case TransportMode.BICYCLE:
        return { icon: Bike, color: '#3b82f6', label: 'Fahrrad', timeLabel: 'Fahrradzeit' }; // Blue for bicycle
      case TransportMode.PUBLIC_TRANSPORT:
        return { icon: Route, color: '#8b5cf6', label: 'ÖPNV', timeLabel: 'Reisezeit' }; // Purple for public transport
      default:
        return { icon: Route, color: '#6b7280', label: 'Route', timeLabel: 'Reisezeit' };
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
              dashArray: segment.transportMode === TransportMode.WALKING ? '10, 5' : undefined,
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
                    <strong>{transportInfo.timeLabel}:</strong>
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