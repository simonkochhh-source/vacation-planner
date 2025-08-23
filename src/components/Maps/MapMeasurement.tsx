import React, { useState, useEffect } from 'react';
import { useMapEvents, Polyline, Popup } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import { Ruler, X } from 'lucide-react';

interface MeasurementPoint {
  id: string;
  position: LatLngExpression;
}

interface MapMeasurementProps {
  isActive: boolean;
  onToggle: (active: boolean) => void;
}

const MapMeasurement: React.FC<MapMeasurementProps> = ({ isActive, onToggle }) => {
  const [points, setPoints] = useState<MeasurementPoint[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (point1: LatLngExpression, point2: LatLngExpression): number => {
    const lat1 = Array.isArray(point1) ? point1[0] : point1.lat;
    const lng1 = Array.isArray(point1) ? point1[1] : point1.lng;
    const lat2 = Array.isArray(point2) ? point2[0] : point2.lat;
    const lng2 = Array.isArray(point2) ? point2[1] : point2.lng;

    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Calculate total distance
  useEffect(() => {
    if (points.length < 2) {
      setTotalDistance(0);
      return;
    }

    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += calculateDistance(points[i-1].position, points[i].position);
    }
    setTotalDistance(total);
  }, [points]);

  // Map click handler
  useMapEvents({
    click: (e) => {
      if (!isActive) return;
      
      const newPoint: MeasurementPoint = {
        id: Date.now().toString(),
        position: [e.latlng.lat, e.latlng.lng]
      };
      
      setPoints(prev => [...prev, newPoint]);
    }
  });

  const clearMeasurement = () => {
    setPoints([]);
    setTotalDistance(0);
  };

  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    }
    return `${distance.toFixed(2)} km`;
  };

  return (
    <>
      {/* Control Panel */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'white',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 1000,
        display: isActive ? 'flex' : 'none',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Ruler size={16} style={{ color: '#3b82f6' }} />
          <span style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#374151'
          }}>
            Messung aktiv
          </span>
        </div>
        
        {totalDistance > 0 && (
          <div style={{
            padding: '0.25rem 0.5rem',
            background: '#f0f9ff',
            borderRadius: '4px',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#0891b2'
          }}>
            Gesamt: {formatDistance(totalDistance)}
          </div>
        )}
        
        <div style={{
          display: 'flex',
          gap: '0.5rem'
        }}>
          {points.length > 0 && (
            <button
              onClick={clearMeasurement}
              style={{
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '4px',
                padding: '0.25rem 0.5rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                color: '#6b7280'
              }}
            >
              Löschen
            </button>
          )}
          
          <button
            onClick={() => onToggle(false)}
            style={{
              background: '#ef4444',
              border: 'none',
              borderRadius: '4px',
              padding: '0.25rem',
              cursor: 'pointer',
              color: 'white',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Measurement Lines */}
      {points.length > 1 && (
        <Polyline
          positions={points.map(p => p.position)}
          color="#3b82f6"
          weight={3}
          opacity={0.8}
          dashArray="5, 10"
        >
          <Popup>
            <div style={{
              padding: '0.5rem',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.25rem'
              }}>
                Gemessene Entfernung
              </div>
              <div style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#3b82f6'
              }}>
                {formatDistance(totalDistance)}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                marginTop: '0.25rem'
              }}>
                {points.length} Punkte
              </div>
            </div>
          </Popup>
        </Polyline>
      )}

      {/* Instruction overlay */}
      {isActive && points.length === 0 && (
        <div style={{
          position: 'absolute',
          bottom: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          fontSize: '0.875rem',
          textAlign: 'center',
          zIndex: 1000,
          pointerEvents: 'none'
        }}>
          Klicken Sie auf die Karte, um Entfernungen zu messen
        </div>
      )}
    </>
  );
};

export default MapMeasurement;