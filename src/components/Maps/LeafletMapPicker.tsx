import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Icon, Map as LeafletMap } from 'leaflet';
import { Coordinates } from '../../types';
import { openStreetMapService } from '../../services/openStreetMapService';
import MapErrorBoundary from './MapErrorBoundary';
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

interface LeafletMapPickerProps {
  coordinates?: Coordinates;
  onLocationSelect: (coordinates: Coordinates, address?: string) => void;
  onClose: () => void;
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

const LeafletMapPicker: React.FC<LeafletMapPickerProps> = ({
  coordinates = { lat: 50.1109, lng: 8.6821 }, // Center of Europe
  onLocationSelect,
  onClose,
  height = '400px',
  zoom = 6
}) => {
  const [selectedLocation, setSelectedLocation] = useState<Coordinates>(coordinates);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>('');
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
  const handleLocationSelect = useCallback(async (coords: Coordinates) => {
    setSelectedLocation(coords);
    setIsLoadingAddress(true);
    
    try {
      const address = await openStreetMapService.reverseGeocode(coords);
      setCurrentAddress(address || '');
      onLocationSelect(coords, address || undefined);
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      onLocationSelect(coords);
    } finally {
      setIsLoadingAddress(false);
    }
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Standort auswählen</h3>
            <p className="text-sm text-gray-600 mt-1">
              Klicken Sie auf die Karte, um einen Standort auszuwählen
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Map Container */}
        <div style={{ height }} className="relative">
          <MapErrorBoundary>
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
          </MapErrorBoundary>

          {/* Current Location Button */}
          <button
            onClick={getCurrentLocation}
            className="absolute top-4 right-4 bg-white border border-gray-300 rounded-md p-2 shadow-md hover:bg-gray-50 z-[1000]"
            title="Aktueller Standort"
          >
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              {isLoadingAddress ? (
                <div className="flex items-center text-gray-600">
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Adresse wird geladen...
                </div>
              ) : currentAddress ? (
                <div>
                  <p className="text-sm font-medium text-gray-900">Ausgewählte Adresse:</p>
                  <p className="text-sm text-gray-600">{currentAddress}</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-gray-900">Koordinaten:</p>
                  <p className="text-sm text-gray-600">
                    {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex space-x-2 ml-4">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Abbrechen
              </button>
              <button
                onClick={() => onLocationSelect(selectedLocation, currentAddress || undefined)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Auswählen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeafletMapPicker;