import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { Check, MapPin } from 'lucide-react';
import { Coordinates } from '../../types';
import MapClickHandler from '../Maps/MapClickHandler';
import { Icon } from 'leaflet';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import { useResponsive } from '../../hooks/useResponsive';
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
  const { isMobile } = useResponsive();
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

  const footer = (
    <>
      <Button
        variant="secondary"
        onClick={handleCancel}
        size={isMobile ? 'sm' : 'md'}
      >
        Abbrechen
      </Button>
      
      <Button
        variant="primary"
        onClick={handleConfirm}
        disabled={!selectedCoordinates}
        size={isMobile ? 'sm' : 'md'}
        leftIcon={<Check size={16} />}
      >
        Standort bestätigen
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Standort auf Karte auswählen"
      subtitle={isSelecting ? 'Klicken Sie auf die Karte, um einen Standort auszuwählen' : 'Standort ausgewählt'}
      size="lg"
      footer={footer}
      preventScroll={true}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', height: '100%' }}>

        {/* Selected Location Info */}
        {selectedCoordinates && selectedLocation && (
          <div style={{
            padding: 'var(--space-md)',
            backgroundColor: 'var(--color-neutral-cream)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-md)'
            }}>
              <MapPin size={16} style={{ color: 'var(--color-primary-ocean)', marginTop: '0.125rem' }} />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--space-xs)'
                }}>
                  {selectedLocation}
                </div>
                <div style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-secondary)'
                }}>
                  {selectedCoordinates.lat.toFixed(6)}, {selectedCoordinates.lng.toFixed(6)}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetSelection}
              >
                Zurücksetzen
              </Button>
            </div>
          </div>
        )}

        {/* Map Container */}
        <div style={{
          flex: 1,
          minHeight: '400px',
          position: 'relative',
          backgroundColor: 'var(--color-neutral-mist)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden'
        }}>
          <MapContainer
            center={[mapCenter.lat, mapCenter.lng]}
            zoom={13}
            style={{ 
              height: '400px', 
              width: '100%',
              zIndex: 1
            }}
            attributionControl={true}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
              detectRetina={true}
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
              top: 'var(--space-md)',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: 'var(--space-md) var(--space-lg)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              zIndex: 1000,
              pointerEvents: 'none'
            }}>
              📍 Klicken Sie auf die Karte, um einen Standort auszuwählen
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default MapSelectionModal;