import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, Marker, Popup, Polyline } from 'react-leaflet';
import { useTripContext } from '../../contexts/TripContext';
import { useDestinationContext } from '../../contexts/DestinationContext';
import { LatLngExpression, Icon } from 'leaflet';
import MapLayerControl, { DynamicTileLayer } from '../Maps/MapLayerControl';
import MapMeasurement from '../Maps/MapMeasurement';
import MobileMapControls from '../Maps/MobileMapControls';
import { useResponsive } from '../../hooks/useResponsive';
import { Trip, Destination, TripStatus, DestinationStatus } from '../../types';
import { MapPin, Route, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default markers in React
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface RouteInfo {
  trip: Trip;
  destinations: Destination[];
  isCompleted: boolean;
  routeColor: string;
  routeWeight: number;
}

interface TripStatistics {
  totalTrips: number;
  completedTrips: number;
  totalDestinations: number;
  visitedDestinations: number;
  plannedTrips: number;
  activeTrips: number;
}

const AllRoutesMapView: React.FC = () => {
  const { trips } = useTripContext();
  const { destinations } = useDestinationContext();
  const { isMobile, isTablet, isTouchDevice } = useResponsive();
  const [mapRef, setMapRef] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<LatLngExpression | null>(null);
  const [showMeasurement, setShowMeasurement] = useState(false);
  const [currentMapLayer, setCurrentMapLayer] = useState('openstreetmap');
  const [currentZoom, setCurrentZoom] = useState(isMobile ? 6 : 8);
  const [showCompleted, setShowCompleted] = useState(true);
  const [showPlanned, setShowPlanned] = useState(true);
  const [showActive, setShowActive] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  // Color configuration for different trip states
  const routeColors = {
    completed: '#22c55e', // Green for completed trips
    active: '#3b82f6', // Blue for active trips  
    planned: '#6b7280', // Gray for planned trips
    cancelled: '#ef4444' // Red for cancelled trips (if needed)
  };

  // Calculate comprehensive trip statistics
  const tripStatistics = useMemo((): TripStatistics => {
    const stats = {
      totalTrips: trips.length,
      completedTrips: trips.filter(trip => trip.status === TripStatus.COMPLETED).length,
      plannedTrips: trips.filter(trip => trip.status === TripStatus.PLANNING).length,
      activeTrips: trips.filter(trip => trip.status === TripStatus.ACTIVE).length,
      totalDestinations: 0,
      visitedDestinations: 0
    };

    // Count all destinations across all trips
    trips.forEach(trip => {
      const tripDestinations = trip.destinations
        .map(id => destinations.find(dest => dest.id === id))
        .filter((dest): dest is Destination => dest !== undefined);
      
      stats.totalDestinations += tripDestinations.length;
      stats.visitedDestinations += tripDestinations.filter(dest => dest.status === DestinationStatus.VISITED).length;
    });

    return stats;
  }, [trips, destinations]);

  // Process all trips into route information
  const allRoutes = useMemo((): RouteInfo[] => {
    return trips
      .map(trip => {
        const tripDestinations = trip.destinations
          .map(id => destinations.find(dest => dest.id === id))
          .filter((dest): dest is Destination => dest !== undefined && !!dest.coordinates);

        if (tripDestinations.length < 2) return null;

        const isCompleted = trip.status === TripStatus.COMPLETED;
        const isActive = trip.status === TripStatus.ACTIVE;
        
        let routeColor: string;
        let routeWeight: number;

        if (isCompleted) {
          routeColor = routeColors.completed;
          routeWeight = 4;
        } else if (isActive) {
          routeColor = routeColors.active;
          routeWeight = 3;
        } else {
          routeColor = routeColors.planned;
          routeWeight = 2;
        }

        return {
          trip,
          destinations: tripDestinations,
          isCompleted,
          routeColor,
          routeWeight
        };
      })
      .filter((route): route is RouteInfo => route !== null);
  }, [trips, destinations]);

  // Filter routes based on current view settings
  const filteredRoutes = useMemo(() => {
    return allRoutes.filter(route => {
      if (route.trip.status === TripStatus.COMPLETED && !showCompleted) return false;
      if (route.trip.status === TripStatus.ACTIVE && !showActive) return false;
      if (route.trip.status === TripStatus.PLANNING && !showPlanned) return false;
      return true;
    });
  }, [allRoutes, showCompleted, showPlanned, showActive]);

  // Get all unique destinations from filtered routes
  const allDestinations = useMemo(() => {
    const destinationMap = new Map<string, Destination>();
    filteredRoutes.forEach(route => {
      route.destinations.forEach(dest => {
        destinationMap.set(dest.id, dest);
      });
    });
    return Array.from(destinationMap.values());
  }, [filteredRoutes]);

  // Default center (Europe center)
  const defaultCenter: LatLngExpression = [50.8503, 4.3517]; // Brussels
  
  // Calculate map center based on all destinations
  const getMapCenter = (): LatLngExpression => {
    if (allDestinations.length === 0) {
      return userLocation || defaultCenter;
    }

    const latSum = allDestinations.reduce((sum, dest) => sum + (dest.coordinates?.lat || 0), 0);
    const lngSum = allDestinations.reduce((sum, dest) => sum + (dest.coordinates?.lng || 0), 0);
    
    return [
      latSum / allDestinations.length,
      lngSum / allDestinations.length
    ];
  };

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.log('Geolocation error:', error);
        }
      );
    }
  }, []);

  // Auto-fit map to show all destinations on initial load
  useEffect(() => {
    if (!mapRef || allDestinations.length === 0) return;
    
    const bounds = allDestinations
      .filter(dest => dest.coordinates)
      .map(dest => [dest.coordinates!.lat, dest.coordinates!.lng] as [number, number]);
    
    if (bounds.length > 0) {
      try {
        mapRef.fitBounds(bounds, {
          padding: [30, 30],
          maxZoom: isMobile ? 10 : 12
        });
        console.log(`🗺️ Auto-fitted global map to ${bounds.length} destinations`);
      } catch (error) {
        console.warn('Could not auto-fit map bounds:', error);
        const center = getMapCenter();
        mapRef.setView(center, isMobile ? 6 : 8);
      }
    }
  }, [mapRef, allDestinations, isMobile]);

  // Standard map controls
  const handleZoomIn = () => mapRef?.zoomIn();
  const handleZoomOut = () => mapRef?.zoomOut();
  const handleReset = () => mapRef?.setView(getMapCenter(), isMobile ? 6 : 8);
  const handleLocate = () => {
    if (mapRef && userLocation) {
      mapRef.setView(userLocation, 15);
    }
  };

  // Trip selection handler
  const handleTripSelect = (trip: Trip) => {
    setSelectedTrip(trip);
    const tripRoute = filteredRoutes.find(route => route.trip.id === trip.id);
    if (tripRoute && mapRef) {
      const bounds = tripRoute.destinations
        .filter(dest => dest.coordinates)
        .map(dest => [dest.coordinates!.lat, dest.coordinates!.lng] as [number, number]);
      
      if (bounds.length > 0) {
        mapRef.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 });
      }
    }
  };

  // Get marker color based on destination status
  const getMarkerColor = (destination: Destination) => {
    switch (destination.status) {
      case DestinationStatus.VISITED:
        return routeColors.completed;
      case DestinationStatus.IN_PROGRESS:
        return routeColors.active;
      default:
        return routeColors.planned;
    }
  };

  // Create route polylines
  const routePolylines = filteredRoutes.map(route => {
    const positions: LatLngExpression[] = route.destinations
      .filter(dest => dest.coordinates)
      .map(dest => [dest.coordinates!.lat, dest.coordinates!.lng]);

    return (
      <Polyline
        key={route.trip.id}
        positions={positions}
        color={route.routeColor}
        weight={route.routeWeight}
        opacity={route.isCompleted ? 0.8 : 0.6}
        eventHandlers={{
          click: () => handleTripSelect(route.trip)
        }}
      />
    );
  });

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {/* Statistics Header */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        zIndex: 1000,
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        boxShadow: 'var(--shadow-lg)',
        minWidth: isMobile ? '280px' : '320px',
        maxWidth: isMobile ? '90vw' : '400px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-3)'
        }}>
          <Route size={20} style={{ color: 'var(--color-primary-sage)' }} />
          <h3 style={{
            margin: 0,
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)'
          }}>
            Alle Routen
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-primary-sage)'
            }}>
              {tripStatistics.completedTrips}
            </div>
            <div style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)'
            }}>
              Abgeschlossen
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-primary-ocean)'
            }}>
              {tripStatistics.activeTrips}
            </div>
            <div style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)'
            }}>
              Aktiv
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text-secondary)'
            }}>
              {tripStatistics.plannedTrips}
            </div>
            <div style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)'
            }}>
              Geplant
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-accent-sunset)'
            }}>
              {tripStatistics.visitedDestinations}
            </div>
            <div style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)'
            }}>
              Besucht
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{
          borderTop: '1px solid var(--color-border)',
          paddingTop: 'var(--space-3)',
          marginTop: 'var(--space-3)'
        }}>
          <div style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-2)'
          }}>
            Anzeigen:
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                padding: 'var(--space-1) var(--space-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: showCompleted ? routeColors.completed : 'transparent',
                color: showCompleted ? 'white' : 'var(--color-text-secondary)',
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              <CheckCircle size={12} />
              Abgeschlossen
            </button>

            <button
              onClick={() => setShowActive(!showActive)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                padding: 'var(--space-1) var(--space-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: showActive ? routeColors.active : 'transparent',
                color: showActive ? 'white' : 'var(--color-text-secondary)',
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              <Clock size={12} />
              Aktiv
            </button>

            <button
              onClick={() => setShowPlanned(!showPlanned)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                padding: 'var(--space-1) var(--space-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: showPlanned ? routeColors.planned : 'transparent',
                color: showPlanned ? 'white' : 'var(--color-text-secondary)',
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              <Calendar size={12} />
              Geplant
            </button>
          </div>
        </div>
      </div>

      <MapContainer
        center={getMapCenter()}
        zoom={allDestinations.length > 0 ? (isMobile ? 6 : 8) : (isMobile ? 3 : 4)}
        style={{ height: '100%', width: '100%' }}
        ref={setMapRef}
        touchZoom={isTouchDevice}
        doubleClickZoom={!isTouchDevice}
        scrollWheelZoom={!isTouchDevice}
        dragging={true}
        zoomControl={false}
        attributionControl={!isMobile}
        whenReady={() => {
          if (mapRef) {
            mapRef.on('zoomend', () => {
              setCurrentZoom(mapRef.getZoom());
            });
            
            if (isMobile) {
              mapRef.options.zoomAnimation = false;
              mapRef.options.fadeAnimation = false;
              mapRef.options.markerZoomAnimation = false;
            }
          }
        }}
      >
        <DynamicTileLayer layerId={currentMapLayer} />
        
        {/* User location marker */}
        {userLocation && (
          <Marker position={userLocation}>
            <Popup>
              <div style={{ textAlign: 'center' }}>
                <strong>Ihre Position</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination markers with status-based colors */}
        {allDestinations.map(dest => (
          dest.coordinates ? (
            <Marker
              key={dest.id}
              position={[dest.coordinates.lat, dest.coordinates.lng]}
            >
              <Popup>
                <div>
                  <div style={{
                    fontWeight: 'var(--font-weight-medium)',
                    marginBottom: 'var(--space-1)'
                  }}>
                    {dest.name}
                  </div>
                  <div style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)',
                    marginBottom: 'var(--space-1)'
                  }}>
                    {dest.location}
                  </div>
                  <div style={{
                    fontSize: 'var(--text-xs)',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                    background: getMarkerColor(dest),
                    color: 'white',
                    display: 'inline-block'
                  }}>
                    {dest.status === DestinationStatus.VISITED ? 'Besucht' :
                     dest.status === DestinationStatus.IN_PROGRESS ? 'In Bearbeitung' : 'Geplant'}
                  </div>
                </div>
              </Popup>
            </Marker>
          ) : null
        ))}

        {/* Route polylines */}
        {routePolylines}

        {/* Measurement Component */}
        <MapMeasurement 
          isActive={showMeasurement}
          onToggle={setShowMeasurement}
        />
      </MapContainer>

      {/* Mobile Controls */}
      <MobileMapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
        onLocate={handleLocate}
        showMeasurement={showMeasurement}
        onToggleMeasurement={() => setShowMeasurement(!showMeasurement)}
        isMobile={isMobile || isTablet}
        // Hide routing specific controls for global view
        showRouting={false}
        onToggleRouting={() => {}} // No-op for global view
        showTimeline={false}
        onToggleTimeline={() => {}} // No-op for global view
        showClustering={false}
        onToggleClustering={() => {}} // No-op for global view
        showTripRoutes={false}
      />

      {/* Map Layer Control */}
      {!isMobile && (
        <div style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          zIndex: 1000
        }}>
          <MapLayerControl
            currentLayer={currentMapLayer}
            onLayerChange={setCurrentMapLayer}
          />
        </div>
      )}

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '1rem',
        left: '1rem',
        zIndex: 1000,
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-3)',
        boxShadow: 'var(--shadow-lg)',
        fontSize: 'var(--text-xs)'
      }}>
        <div style={{
          fontWeight: 'var(--font-weight-medium)',
          marginBottom: 'var(--space-2)',
          color: 'var(--color-text-primary)'
        }}>
          Legende
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div style={{
              width: '20px',
              height: '3px',
              background: routeColors.completed,
              borderRadius: '2px'
            }} />
            <span style={{ color: 'var(--color-text-secondary)' }}>Abgeschlossene Reisen</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div style={{
              width: '20px',
              height: '3px',
              background: routeColors.active,
              borderRadius: '2px'
            }} />
            <span style={{ color: 'var(--color-text-secondary)' }}>Aktive Reisen</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div style={{
              width: '20px',
              height: '3px',
              background: routeColors.planned,
              borderRadius: '2px'
            }} />
            <span style={{ color: 'var(--color-text-secondary)' }}>Geplante Reisen</span>
          </div>
        </div>
      </div>

      {/* Selected Trip Info */}
      {selectedTrip && (
        <div style={{
          position: 'absolute',
          bottom: '1rem',
          right: '1rem',
          zIndex: 1000,
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4)',
          boxShadow: 'var(--shadow-lg)',
          maxWidth: isMobile ? '280px' : '320px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 'var(--space-2)'
          }}>
            <h4 style={{
              margin: 0,
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)'
            }}>
              {selectedTrip.name}
            </h4>
            <button
              onClick={() => setSelectedTrip(null)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                padding: '4px'
              }}
            >
              ×
            </button>
          </div>
          
          <div style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-2)'
          }}>
            {new Date(selectedTrip.startDate).toLocaleDateString('de-DE')} - {new Date(selectedTrip.endDate).toLocaleDateString('de-DE')}
          </div>

          <div style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-weight-medium)',
            background: selectedTrip.status === TripStatus.COMPLETED ? routeColors.completed :
                       selectedTrip.status === TripStatus.ACTIVE ? routeColors.active : routeColors.planned,
            color: 'white'
          }}>
            {selectedTrip.status === TripStatus.COMPLETED ? 'Abgeschlossen' :
             selectedTrip.status === TripStatus.ACTIVE ? 'Aktiv' : 'Geplant'}
          </div>
        </div>
      )}
    </div>
  );
};

export default AllRoutesMapView;