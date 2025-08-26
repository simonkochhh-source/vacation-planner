import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Icon, Map as LeafletMap } from 'leaflet';
import { Coordinates } from '../../types';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React-Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface LeafletMapOnlyProps {
  coordinates?: Coordinates;
  onLocationSelect: (coordinates: Coordinates) => void;
  height?: string;
  zoom?: number;
}

// Component to handle map clicks
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (coordinates: Coordinates) => void }) {
  useMapEvents({
    click: (e) => {
      try {
        if (e.latlng && typeof e.latlng.lat === 'number' && typeof e.latlng.lng === 'number') {
          onLocationSelect({
            lat: e.latlng.lat,
            lng: e.latlng.lng
          });
        }
      } catch (error) {
        console.warn('Failed to handle map click:', error);
      }
    },
  });
  return null;
}

// Component to center map on coordinates
function MapCenterController({ coordinates }: { coordinates?: Coordinates }) {
  const map = useMap();
  
  useEffect(() => {
    if (coordinates && map) {
      try {
        // Add a small delay to ensure map is fully initialized
        setTimeout(() => {
          try {
            if (map && map.getContainer && map.getContainer()) {
              map.setView([coordinates.lat, coordinates.lng], map.getZoom());
            }
          } catch (error) {
            // Map might be disposed
            console.warn('Failed to center map:', error);
          }
        }, 100);
      } catch (error) {
        console.warn('Failed to center map:', error);
      }
    }
  }, [coordinates, map]);
  
  return null;
}

const LeafletMapOnly: React.FC<LeafletMapOnlyProps> = ({
  coordinates = { lat: 50.1109, lng: 8.6821 }, // Center of Europe
  onLocationSelect,
  height = '400px',
  zoom = 6
}) => {
  const [selectedLocation, setSelectedLocation] = useState<Coordinates>(coordinates);
  const [mapKey] = useState(0); // Force re-render key
  const mapRef = useRef<LeafletMap | null>(null);
  
  // Ensure coordinates are valid
  const validCoordinates = coordinates && 
    typeof coordinates.lat === 'number' && 
    typeof coordinates.lng === 'number' &&
    !isNaN(coordinates.lat) && 
    !isNaN(coordinates.lng) 
    ? coordinates 
    : { lat: 50.1109, lng: 8.6821 };

  // Update selectedLocation when coordinates prop changes
  useEffect(() => {
    if (validCoordinates) {
      setSelectedLocation(validCoordinates);
    }
  }, [validCoordinates]);

  // Cleanup effect for map
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        try {
          if (mapRef.current.getContainer && mapRef.current.getContainer()) {
            mapRef.current.remove();
          }
        } catch (error) {
          // Ignore cleanup errors
          console.warn('Map cleanup error:', error);
        }
      }
    };
  }, []);

  // Handle location selection
  const handleLocationSelect = useCallback((coords: Coordinates) => {
    setSelectedLocation(coords);
    onLocationSelect(coords);
  }, [onLocationSelect]);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          handleLocationSelect(coords);
        },
        (error) => {
          console.warn('Geolocation failed:', error);
        }
      );
    }
  }, [handleLocationSelect]);

  return (
    <div style={{ height, width: '100%', position: 'relative' }}>
      <MapContainer
        key={mapKey}
        center={[validCoordinates.lat, validCoordinates.lng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapClickHandler onLocationSelect={handleLocationSelect} />
        <MapCenterController coordinates={validCoordinates} />
        
        {selectedLocation && 
         typeof selectedLocation.lat === 'number' && 
         typeof selectedLocation.lng === 'number' &&
         !isNaN(selectedLocation.lat) && 
         !isNaN(selectedLocation.lng) && (
          <Marker 
            position={[selectedLocation.lat, selectedLocation.lng]}
          />
        )}
      </MapContainer>

      {/* Current Location Button */}
      <button
        onClick={getCurrentLocation}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'white',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          padding: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Aktueller Standort"
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#f9fafb';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'white';
        }}
      >
        📍
      </button>

      {/* Location Info */}
      {selectedLocation && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '0.75rem',
          color: '#374151',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          maxWidth: '200px'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '2px' }}>Ausgewählt:</div>
          <div>{selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}</div>
        </div>
      )}
    </div>
  );
};

export default LeafletMapOnly;