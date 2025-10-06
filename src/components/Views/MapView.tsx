import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, Marker, Popup } from 'react-leaflet';
import { useTripContext } from '../../contexts/TripContext';
import { useDestinationContext } from '../../contexts/DestinationContext';
import { LatLngExpression, Icon } from 'leaflet';
import RoutingMachine from '../Maps/RoutingMachine';
import MapLayerControl, { DynamicTileLayer } from '../Maps/MapLayerControl';
import MapMeasurement from '../Maps/MapMeasurement';
import MobileMapControls from '../Maps/MobileMapControls';
import TripRouteVisualizer from '../Maps/TripRouteVisualizer';
import { useResponsive } from '../../hooks/useResponsive';
import { Destination } from '../../types';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default markers in React
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});


const MapView: React.FC = () => {
  const { currentTrip } = useTripContext();
  const { destinations } = useDestinationContext();
  const { isMobile, isTablet, isTouchDevice } = useResponsive();
  const [mapRef, setMapRef] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<LatLngExpression | null>(null);
  const [showRouting, setShowRouting] = useState(true);
  
  // Debug logging for routing state
  useEffect(() => {
    console.log('🔄 MapView: showRouting state changed to:', showRouting);
    console.log('🔄 MapView: Current trip:', currentTrip?.name, 'Destinations:', currentDestinations.length);
  }, [showRouting]);
  const [showMeasurement, setShowMeasurement] = useState(false);
  const [showClustering, setShowClustering] = useState(isMobile); // Enable clustering by default on mobile
  const [currentMapLayer, setCurrentMapLayer] = useState('openstreetmap');
  const [currentZoom, setCurrentZoom] = useState(isMobile ? 8 : 10);
  const [showTripRoutes, setShowTripRoutes] = useState(false); // Hide routes by default for cleaner initial view

  // Simplified settings for mobile optimization
  const adaptiveSettings = useMemo(() => ({
    maxMarkers: isMobile ? 50 : 100,
    enableClustering: isMobile
  }), [isMobile]);


  // Get current trip destinations with coordinates - using same logic as EnhancedTimelineView
  const currentDestinations = currentTrip 
    ? currentTrip.destinations
        .map(id => destinations.find(dest => dest.id === id))
        .filter((dest): dest is Destination => dest !== undefined && !!dest.coordinates)
    : [];

  // Default center (Berlin)
  const defaultCenter: LatLngExpression = [52.520008, 13.404954];
  
  // Calculate map center based on destinations
  const getMapCenter = (): LatLngExpression => {
    if (currentDestinations.length === 0) {
      return userLocation || defaultCenter;
    }

    const latSum = currentDestinations.reduce((sum, dest) => sum + (dest.coordinates?.lat || 0), 0);
    const lngSum = currentDestinations.reduce((sum, dest) => sum + (dest.coordinates?.lng || 0), 0);
    
    return [
      latSum / currentDestinations.length,
      lngSum / currentDestinations.length
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

  // Track marker count
  useEffect(() => {
    console.log('Markers updated:', currentDestinations.length);
  }, [currentDestinations.length]);

  // Auto-fit map to show all destinations on initial load
  useEffect(() => {
    if (!mapRef || currentDestinations.length === 0) return;
    
    // Create bounds from all destination coordinates
    const bounds = currentDestinations
      .filter(dest => dest.coordinates)
      .map(dest => [dest.coordinates!.lat, dest.coordinates!.lng] as [number, number]);
    
    if (bounds.length > 0) {
      try {
        // Fit map to show all destinations with some padding
        mapRef.fitBounds(bounds, {
          padding: [20, 20] // Add some padding around the bounds
          // Remove maxZoom restriction to allow manual zooming after auto-fit
        });
        console.log(`🗺️ Auto-fitted map to ${bounds.length} destinations`);
      } catch (error) {
        console.warn('Could not auto-fit map bounds:', error);
        // Fallback to center calculation
        const center = getMapCenter();
        mapRef.setView(center, isMobile ? 8 : 10);
      }
    }
  }, [mapRef, currentDestinations, isMobile]);

  // Standard event handlers
  const handleZoomIn = () => {
    if (mapRef) {
      mapRef.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef) {
      mapRef.zoomOut();
    }
  };

  const handleReset = () => {
    if (mapRef) {
      mapRef.setView(getMapCenter(), 10);
    }
  };

  const handleLocate = () => {
    if (mapRef && userLocation) {
      mapRef.setView(userLocation, 15);
    }
  };

  const handleDestinationSelect = (destination: Destination) => {
    if (mapRef && destination.coordinates) {
      mapRef.setView([destination.coordinates.lat, destination.coordinates.lng], 15);
    }
  };


  if (!currentTrip) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
        color: '#6b7280'
      }}>
        <MapPin size={48} style={{ opacity: 0.5 }} />
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Keine Reise ausgewählt</h2>
        <p style={{ margin: 0, textAlign: 'center' }}>
          Wählen Sie eine Reise aus der Sidebar aus, um die Karte zu sehen.
        </p>
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'relative', 
      height: '100%', 
      width: '100%',
      // iPhone safe area support
      paddingLeft: isMobile ? 'max(0px, env(safe-area-inset-left))' : 0,
      paddingRight: isMobile ? 'max(0px, env(safe-area-inset-right))' : 0
    }}>
      <MapContainer
        center={getMapCenter()}
        zoom={currentDestinations.length > 0 ? (isMobile ? 8 : 10) : (isMobile ? 4 : 5)}
        minZoom={2} // Allow zooming out to see the world
        maxZoom={18} // Allow zooming in to street level
        style={{ 
          height: '100%', 
          width: '100%',
          // Mobile-specific optimizations
          touchAction: isMobile ? 'manipulation' : 'auto',
          userSelect: 'none'
        }}
        ref={setMapRef}
        // Mobile-optimized zoom and interaction settings
        touchZoom={isMobile ? 'center' : true} // Center zoom on mobile for better UX
        doubleClickZoom={true} 
        scrollWheelZoom={!isTouchDevice} // Disable scroll wheel zoom on touch devices
        dragging={true}
        zoomControl={false} // We'll use custom controls
        attributionControl={!isMobile} // Hide on mobile to save space
        whenReady={() => {
          if (mapRef) {
            mapRef.on('zoomend', () => {
              setCurrentZoom(mapRef.getZoom());
            });
            
            // Mobile-specific map settings for better performance and UX
            if (isMobile) {
              // Optimize animations for mobile performance
              mapRef.options.zoomAnimation = false;
              mapRef.options.fadeAnimation = false;
              mapRef.options.markerZoomAnimation = false;
              
              // Increase touch tolerance for better mobile interaction
              if (mapRef.options.tap) {
                mapRef.options.tap.tolerance = 15;
              }
              
              // Add mobile-specific event handlers
              mapRef.on('touchstart', (e: any) => {
                // Prevent iOS Safari bounce effect
                if (e.originalEvent && e.originalEvent.touches.length === 1) {
                  e.originalEvent.preventDefault();
                }
              });
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

        {/* Standard destination markers */}
        {currentDestinations.map(dest => (
          dest.coordinates ? (
            <Marker
              key={dest.id}
              position={[dest.coordinates.lat, dest.coordinates.lng]}
              eventHandlers={{
                click: () => handleDestinationSelect(dest)
              }}
            >
              <Popup>
                <div className="font-medium">{dest.name}</div>
              </Popup>
            </Marker>
          ) : null
        ))}

        {/* Trip Route Visualizer - Shows routes between destinations */}
        <TripRouteVisualizer
          destinations={currentDestinations}
          showRoutes={showTripRoutes && !showRouting}
          onRouteClick={(from, to, travelTime) => {
            console.log(`Route from ${from.name} to ${to.name}: ${travelTime} minutes`);
            // Optional: Show route details in UI
          }}
        />

        {/* Routing Component */}
        <RoutingMachine 
          destinations={currentDestinations}
          showRouting={showRouting}
        />

        {/* Measurement Component */}
        <MapMeasurement 
          isActive={showMeasurement}
          onToggle={setShowMeasurement}
        />
      </MapContainer>

      <MobileMapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
        onLocate={handleLocate}
        showRouting={showRouting}
        onToggleRouting={() => {
          console.log('🔘 MapView: Toggle routing CALLED!');
          console.log('🔘 Current showRouting state:', showRouting);
          const newState = !showRouting;
          console.log('🔘 Setting new state to:', newState);
          
          setShowRouting(newState);
          console.log('🔘 setShowRouting called with:', newState);
        }}
        showMeasurement={showMeasurement}
        onToggleMeasurement={() => setShowMeasurement(!showMeasurement)}
        showClustering={showClustering}
        onToggleClustering={() => setShowClustering(!showClustering)}
        showTripRoutes={showTripRoutes}
        onToggleTripRoutes={() => setShowTripRoutes(!showTripRoutes)}
        isMobile={isMobile || isTablet}
      />

      {/* Map Layer Control - Hide on mobile, show on larger screens */}
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



    </div>
  );
};

export default MapView;