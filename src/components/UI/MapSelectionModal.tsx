import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { X, Check, MapPin } from 'lucide-react';
import { Coordinates } from '../../types';
import MapClickHandler from '../Maps/MapClickHandler';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default markers in React
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (location: string, coordinates: Coordinates) => void;
  initialCoordinates?: Coordinates;
  initialLocation?: string;
}

const MapSelectionModal: React.FC<MapSelectionModalProps> = ({
  isOpen,
  onClose,
  onLocationSelect,
  initialCoordinates,
  initialLocation
}) => {
  const [selectedCoordinates, setSelectedCoordinates] = useState<Coordinates | undefined>(initialCoordinates);
  const [selectedLocation, setSelectedLocation] = useState<string>(initialLocation || '');
  const [isSelecting, setIsSelecting] = useState(true);

  // Default center (Berlin)
  const defaultCenter: Coordinates = { lat: 52.520008, lng: 13.404954 };
  const mapCenter = selectedCoordinates || initialCoordinates || defaultCenter;

  const handleMapClick = (location: string, coordinates: Coordinates) => {
    setSelectedCoordinates(coordinates);
    setSelectedLocation(location);
    setIsSelecting(false);
  };

  const handleConfirm = () => {
    if (selectedCoordinates && selectedLocation) {
      onLocationSelect(selectedLocation, selectedCoordinates);
    }
    onClose();
  };

  const handleCancel = () => {
    setSelectedCoordinates(initialCoordinates);
    setSelectedLocation(initialLocation || '');
    setIsSelecting(true);
    onClose();
  };

  const resetSelection = () => {
    setSelectedCoordinates(undefined);
    setSelectedLocation('');
    setIsSelecting(true);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Standort auf Karte auswählen
            </h2>
            <p style={{
              margin: '0.25rem 0 0 0',
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              {isSelecting ? 'Klicken Sie auf die Karte, um einen Standort auszuwählen' : 'Standort ausgewählt'}
            </p>
          </div>
          <button
            onClick={handleCancel}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '6px',
              color: '#6b7280'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Selected Location Info */}
        {selectedCoordinates && selectedLocation && (
          <div style={{
            padding: '1rem 1.5rem',
            backgroundColor: '#f0f9ff',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}>
              <MapPin size={16} style={{ color: '#3b82f6', marginTop: '0.125rem' }} />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#1f2937',
                  marginBottom: '0.25rem'
                }}>
                  {selectedLocation}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#6b7280'
                }}>
                  {selectedCoordinates.lat.toFixed(6)}, {selectedCoordinates.lng.toFixed(6)}
                </div>
              </div>
              <button
                onClick={resetSelection}
                style={{
                  padding: '0.25rem 0.5rem',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                Zurücksetzen
              </button>
            </div>
          </div>
        )}

        {/* Map Container */}
        <div style={{
          flex: 1,
          minHeight: '400px',
          position: 'relative'
        }}>
          <MapContainer
            center={[mapCenter.lat, mapCenter.lng]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapClickHandler 
              onLocationSelect={handleMapClick}
              isActive={isSelecting}
            />
            
            {selectedCoordinates && (
              <Marker position={[selectedCoordinates.lat, selectedCoordinates.lng]} />
            )}
          </MapContainer>

          {/* Instruction Overlay */}
          {isSelecting && !selectedCoordinates && (
            <div style={{
              position: 'absolute',
              top: '1rem',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              zIndex: 1000,
              pointerEvents: 'none'
            }}>
              📍 Klicken Sie auf die Karte, um einen Standort auszuwählen
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '0.875rem',
              color: '#374151',
              cursor: 'pointer',
              fontWeight: '500'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            Abbrechen
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={!selectedCoordinates}
            style={{
              padding: '0.75rem 1.5rem',
              background: selectedCoordinates ? '#3b82f6' : '#9ca3af',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              color: 'white',
              cursor: selectedCoordinates ? 'pointer' : 'not-allowed',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseOver={(e) => {
              if (selectedCoordinates) {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseOut={(e) => {
              if (selectedCoordinates) {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }
            }}
          >
            <Check size={16} />
            Standort bestätigen
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapSelectionModal;