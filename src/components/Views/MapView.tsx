import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, Marker, Popup } from 'react-leaflet';
import { useApp } from '../../stores/AppContext';
import { LatLngExpression, Icon } from 'leaflet';
import StatusBadge from '../UI/StatusBadge';
import RoutingMachine from '../Maps/RoutingMachine';
import MobileTimeline from '../Maps/MobileTimeline';
import MapLayerControl, { DynamicTileLayer } from '../Maps/MapLayerControl';
import DestinationCluster from '../Maps/DestinationCluster';
import OptimizedDestinationCluster from '../Maps/OptimizedDestinationCluster';
import VirtualizedMarkers from '../Maps/VirtualizedMarkers';
import MapMeasurement from '../Maps/MapMeasurement';
import MobileMapControls from '../Maps/MobileMapControls';
import { useResponsive } from '../../hooks/useResponsive';
import { useMapPerformance } from '../../hooks/useMapPerformance';
import { getCategoryIcon, getCategoryLabel, formatDate, formatTime } from '../../utils';
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
  const { currentTrip, destinations } = useApp();
  const { isMobile, isTablet, isTouchDevice } = useResponsive();
  const [mapRef, setMapRef] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<LatLngExpression | null>(null);
  const [showRouting, setShowRouting] = useState(false);
  const [routingMode, setRoutingMode] = useState<'driving' | 'walking' | 'cycling'>('driving');
  const [selectedDestination, setSelectedDestination] = useState<Destination | undefined>();
  const [showTimeline, setShowTimeline] = useState(!isMobile); // Hide timeline by default on mobile
  const [showMeasurement, setShowMeasurement] = useState(false);
  const [showClustering, setShowClustering] = useState(isMobile); // Enable clustering by default on mobile
  const [currentMapLayer, setCurrentMapLayer] = useState('openstreetmap');
  const [currentZoom, setCurrentZoom] = useState(isMobile ? 8 : 10);

  // Performance monitoring and optimization
  const {
    metrics,
    isOptimizing,
    createDebouncedHandler,
    getAdaptiveSettings,
    updateMarkerCount
  } = useMapPerformance(mapRef, {
    enableMetrics: true,
    targetFps: isMobile ? 20 : 30,
    maxMarkers: isMobile ? 50 : 100
  });

  // Adaptive settings based on performance
  const adaptiveSettings = useMemo(() => getAdaptiveSettings(), [getAdaptiveSettings]);

  // Performance-optimized clustering decision
  const useOptimizedClustering = useMemo(() => {
    return showClustering || adaptiveSettings.clusteringEnabled || isOptimizing;
  }, [showClustering, adaptiveSettings.clusteringEnabled, isOptimizing]);

  // Get current trip destinations with coordinates
  const currentDestinations = currentTrip 
    ? destinations.filter(dest => 
        currentTrip.destinations.includes(dest.id) && 
        dest.coordinates
      )
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

  // Update marker count for performance monitoring
  useEffect(() => {
    updateMarkerCount(currentDestinations.length);
  }, [currentDestinations.length, updateMarkerCount]);

  // Debounced event handlers for better performance
  const handleDebouncedZoomIn = createDebouncedHandler('zoomIn', () => {
    if (mapRef) {
      mapRef.zoomIn();
    }
  }, 200);

  const handleDebouncedZoomOut = createDebouncedHandler('zoomOut', () => {
    if (mapRef) {
      mapRef.zoomOut();
    }
  }, 200);

  const handleDebouncedReset = createDebouncedHandler('reset', () => {
    if (mapRef) {
      mapRef.setView(getMapCenter(), 10);
    }
  }, 300);

  const handleDebouncedLocate = createDebouncedHandler('locate', () => {
    if (mapRef && userLocation) {
      mapRef.setView(userLocation, 15);
    }
  }, 300);

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

  const handleTimelineDestinationSelect = (destination: Destination) => {
    setSelectedDestination(destination);
    if (mapRef && destination.coordinates) {
      mapRef.setView([destination.coordinates.lat, destination.coordinates.lng], 15);
    }
  };

  const createCustomIcon = (destination: Destination) => {
    return new Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="14" fill="${destination.color || '#3b82f6'}" stroke="white" stroke-width="2"/>
          <text x="16" y="20" text-anchor="middle" fill="white" font-size="14" font-family="Arial">
            ${getCategoryIcon(destination.category)}
          </text>
        </svg>
      `)}`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
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
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={getMapCenter()}
        zoom={currentDestinations.length > 0 ? (isMobile ? 8 : 10) : (isMobile ? 4 : 5)}
        style={{ height: '100%', width: '100%' }}
        ref={setMapRef}
        // Mobile optimizations
        touchZoom={isTouchDevice}
        doubleClickZoom={!isTouchDevice}
        scrollWheelZoom={!isTouchDevice}
        dragging={true}
        zoomControl={false} // We'll use custom controls
        attributionControl={!isMobile} // Hide on mobile to save space
        whenReady={() => {
          if (mapRef) {
            mapRef.on('zoomend', () => {
              setCurrentZoom(mapRef.getZoom());
            });
            
            // Mobile-specific map settings
            if (isMobile) {
              // Disable zoom animation on mobile for better performance
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

        {/* Performance-optimized destination markers */}
        {useOptimizedClustering ? (
          <OptimizedDestinationCluster
            destinations={currentDestinations}
            zoom={currentZoom}
            onDestinationClick={handleTimelineDestinationSelect}
            maxClusterRadius={adaptiveSettings.enableAnimations ? 80 : 120}
            minPointsToCluster={isOptimizing ? 3 : 2}
            isMobile={isMobile}
          />
        ) : (
          <VirtualizedMarkers
            destinations={currentDestinations}
            onDestinationClick={handleTimelineDestinationSelect}
            maxVisibleMarkers={adaptiveSettings.maxVisibleMarkers}
            isMobile={isMobile}
          />
        )}

        {/* Routing Component */}
        <RoutingMachine 
          destinations={currentDestinations}
          showRouting={showRouting}
          routingMode={routingMode}
        />

        {/* Measurement Component */}
        <MapMeasurement 
          isActive={showMeasurement}
          onToggle={setShowMeasurement}
        />
      </MapContainer>

      <MobileMapControls
        onZoomIn={adaptiveSettings.enableAnimations ? handleZoomIn : handleDebouncedZoomIn}
        onZoomOut={adaptiveSettings.enableAnimations ? handleZoomOut : handleDebouncedZoomOut}
        onReset={handleDebouncedReset}
        onLocate={handleDebouncedLocate}
        showRouting={showRouting}
        onToggleRouting={() => setShowRouting(!showRouting)}
        routingMode={routingMode}
        onChangeRoutingMode={setRoutingMode}
        showTimeline={showTimeline}
        onToggleTimeline={() => setShowTimeline(!showTimeline)}
        showMeasurement={showMeasurement}
        onToggleMeasurement={() => setShowMeasurement(!showMeasurement)}
        showClustering={showClustering}
        onToggleClustering={() => setShowClustering(!showClustering)}
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

      {/* Map Info Panel with Performance Metrics */}
      {!isMobile && (
        <div style={{
          position: 'absolute',
          bottom: showTimeline ? '180px' : '1rem',
          left: '1rem',
          background: 'white',
          padding: '1rem',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          maxWidth: '300px',
          zIndex: 1000
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600' }}>
            {currentTrip.name}
          </h4>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            {currentDestinations.length} Ziele auf der Karte
          </div>
          
          {/* Performance Metrics */}
          <div style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            paddingTop: '0.5rem',
            borderTop: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>FPS:</span>
              <span style={{ 
                color: metrics.fps >= (isMobile ? 20 : 30) ? '#10b981' : '#ef4444',
                fontWeight: '500'
              }}>
                {metrics.fps}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Marker:</span>
              <span>{metrics.markerCount}</span>
            </div>
            {isOptimizing && (
              <div style={{
                marginTop: '0.25rem',
                padding: '0.25rem 0.5rem',
                background: '#fef3c7',
                color: '#f59e0b',
                borderRadius: '4px',
                fontSize: '0.6875rem',
                textAlign: 'center'
              }}>
                Performance-Modus aktiv
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      {showTimeline && currentDestinations.length > 0 && (
        <MobileTimeline
          destinations={currentDestinations}
          onDestinationSelect={handleTimelineDestinationSelect}
          currentDestination={selectedDestination}
          isMobile={isMobile || isTablet}
        />
      )}
    </div>
  );
};

export default MapView;