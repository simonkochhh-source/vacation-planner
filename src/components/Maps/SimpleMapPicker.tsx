import React, { useState, useCallback } from 'react';
import { MapPin, X } from 'lucide-react';
import { Coordinates } from '../../types';

interface SimpleMapPickerProps {
  coordinates?: Coordinates;
  onLocationSelect: (coordinates: Coordinates) => void;
  onClose: () => void;
  isVisible: boolean;
}

const SimpleMapPicker: React.FC<SimpleMapPickerProps> = ({
  coordinates,
  onLocationSelect,
  onClose,
  isVisible
}) => {
  const [selectedLocation, setSelectedLocation] = useState<Coordinates | null>(coordinates || null);

  const handleMapClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isVisible) return;
    
    const mapCenter = coordinates || { lat: 52.5200, lng: 13.4050 }; // Berlin als Standard
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Vereinfachte Koordinaten-Berechnung für Demo
    // In einer echten Implementierung würde man die Google Maps API verwenden
    const lng = mapCenter.lng + ((x - rect.width / 2) / rect.width) * 0.1;
    const lat = mapCenter.lat - ((y - rect.height / 2) / rect.height) * 0.1;
    
    const newCoords = { lat, lng };
    setSelectedLocation(newCoords);
  }, [coordinates, isVisible]);

  const handleConfirmLocation = useCallback(() => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      onClose();
    }
  }, [selectedLocation, onLocationSelect, onClose]);

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80%',
        overflow: 'auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            Ort auf der Karte auswählen
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0.25rem'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Simplified Map Area */}
        <div
          onClick={handleMapClick}
          style={{
            width: '100%',
            height: '300px',
            backgroundColor: '#f0f9ff',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            position: 'relative',
            cursor: 'crosshair',
            backgroundImage: `
              radial-gradient(circle at 25% 25%, #e0f2fe 0%, transparent 50%),
              radial-gradient(circle at 75% 75%, #f0f9ff 0%, transparent 50%),
              linear-gradient(45deg, #f8fafc 25%, transparent 25%),
              linear-gradient(-45deg, #f8fafc 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #f8fafc 75%),
              linear-gradient(-45deg, transparent 75%, #f8fafc 75%)
            `,
            backgroundSize: '20px 20px, 20px 20px, 10px 10px, 10px 10px, 10px 10px, 10px 10px',
            backgroundPosition: '0 0, 0 0, 0 0, 0 5px, 5px -5px, -5px 0px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {!selectedLocation && (
            <div style={{
              color: '#6b7280',
              fontSize: '0.875rem',
              textAlign: 'center',
              padding: '2rem'
            }}>
              <MapPin size={24} style={{ margin: '0 auto 0.5rem', display: 'block' }} />
              Klicken Sie auf die Karte, um einen Ort auszuwählen
            </div>
          )}
          
          {selectedLocation && (
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#dc2626',
              zIndex: 10
            }}>
              <MapPin size={32} fill="#dc2626" />
            </div>
          )}
        </div>

        {/* Coordinates Display */}
        {selectedLocation && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: '#f0f9ff',
            borderRadius: '6px',
            fontSize: '0.875rem',
            color: '#1e40af'
          }}>
            <strong>Ausgewählte Koordinaten:</strong><br />
            Breitengrad: {selectedLocation.lat.toFixed(4)}<br />
            Längengrad: {selectedLocation.lng.toFixed(4)}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          marginTop: '1.5rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              background: '#f3f4f6',
              color: '#6b7280',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={handleConfirmLocation}
            disabled={!selectedLocation}
            style={{
              background: selectedLocation ? '#3b82f6' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: selectedLocation ? 'pointer' : 'not-allowed'
            }}
          >
            Ort bestätigen
          </button>
        </div>

        {/* Info Text */}
        <div style={{
          marginTop: '1rem',
          fontSize: '0.75rem',
          color: '#6b7280',
          textAlign: 'center',
          fontStyle: 'italic'
        }}>
          💡 Hinweis: Dies ist eine vereinfachte Karte zur Demonstration. 
          In der finalen Version wird eine echte Google Maps Integration verwendet.
        </div>
      </div>
    </div>
  );
};

export default SimpleMapPicker;