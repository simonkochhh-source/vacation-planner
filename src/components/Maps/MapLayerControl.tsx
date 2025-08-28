import React, { useState } from 'react';
import { TileLayer } from 'react-leaflet';
import { Layers, Map, Satellite, Navigation2 } from 'lucide-react';

interface MapLayer {
  id: string;
  name: string;
  url: string;
  attribution: string;
  icon: React.ReactNode;
}

const MAP_LAYERS: MapLayer[] = [
  {
    id: 'openstreetmap',
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    icon: <Map size={16} />
  },
  {
    id: 'satellite',
    name: 'Satellit',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
    icon: <Satellite size={16} />
  },
  {
    id: 'terrain',
    name: 'Gelände',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors',
    icon: <Navigation2 size={16} />
  },
  {
    id: 'transport',
    name: 'Transport',
    url: 'https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=YOUR_API_KEY',
    attribution: '&copy; <a href="https://www.thunderforest.com/">Thunderforest</a>',
    icon: <Layers size={16} />
  }
];

interface MapLayerControlProps {
  currentLayer: string;
  onLayerChange: (layerId: string) => void;
}

const MapLayerControl: React.FC<MapLayerControlProps> = ({
  currentLayer,
  onLayerChange
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const currentLayerData = MAP_LAYERS.find(layer => layer.id === currentLayer) || MAP_LAYERS[0];

  return (
    <div style={{
      position: 'relative',
      display: 'inline-block'
    }}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '0.5rem',
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
        title="Kartenlayer wechseln"
      >
        {currentLayerData.icon}
        <span style={{ fontSize: '0.75rem' }}>{currentLayerData.name}</span>
        <Layers size={12} style={{ 
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }} />
      </button>

      {/* Layer Selection Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10
            }}
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '0.25rem',
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              border: '1px solid #e5e7eb',
              padding: '0.5rem',
              minWidth: '200px',
              zIndex: 20
            }}
          >
            <div style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#6b7280',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Kartenlayer auswählen
            </div>

            {MAP_LAYERS.map((layer) => {
              const isSelected = layer.id === currentLayer;
              
              return (
                <button
                  key={layer.id}
                  onClick={() => {
                    onLayerChange(layer.id);
                    setIsOpen(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    border: 'none',
                    borderRadius: '6px',
                    background: isSelected ? '#f0f9ff' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.2s ease',
                    marginBottom: '0.25rem'
                  }}
                  onMouseOver={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{
                    color: isSelected ? '#0891b2' : '#6b7280'
                  }}>
                    {layer.icon}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: isSelected ? '#0891b2' : '#374151'
                    }}>
                      {layer.name}
                    </div>
                  </div>

                  {isSelected && (
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#3b82f6'
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

// Component to handle tile layer switching
export const DynamicTileLayer: React.FC<{ layerId: string }> = ({ layerId }) => {
  const layer = MAP_LAYERS.find(l => l.id === layerId) || MAP_LAYERS[0];
  
  return (
    <TileLayer
      key={layerId}
      attribution={layer.attribution}
      url={layer.url}
    />
  );
};

export default MapLayerControl;