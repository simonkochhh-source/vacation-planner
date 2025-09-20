import React, { useMemo, useCallback } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import { Icon, LatLngBounds } from 'leaflet';
import { Destination } from '../../types';
import { getCategoryIcon, getCategoryLabel, formatDate } from '../../utils';
import StatusBadge from '../UI/StatusBadge';
import { MapPin } from 'lucide-react';

interface VirtualizedMarkersProps {
  destinations: Destination[];
  onDestinationClick: (destination: Destination) => void;
  maxVisibleMarkers?: number;
  isMobile?: boolean;
}

// Memoized custom icon creation to avoid recreation on every render
const createCustomIcon = (() => {
  const iconCache = new Map<string, Icon>();
  
  return (destination: Destination): Icon => {
    const cacheKey = `${destination.category}-${destination.color}`;
    
    if (iconCache.has(cacheKey)) {
      return iconCache.get(cacheKey)!;
    }
    
    const icon = new Icon({
      iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
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
    
    iconCache.set(cacheKey, icon);
    return icon;
  };
})();

const VirtualizedMarkers: React.FC<VirtualizedMarkersProps> = ({
  destinations,
  onDestinationClick,
  maxVisibleMarkers = 100,
  isMobile = false
}) => {
  const map = useMap();
  
  // Get current map bounds and zoom level for viewport-based filtering
  const visibleDestinations = useMemo(() => {
    if (!map || destinations.length === 0) return [];
    
    try {
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      
      // Filter destinations within viewport
      const inViewport = destinations.filter(dest => {
        if (!dest.coordinates) return false;
        return bounds.contains([dest.coordinates.lat, dest.coordinates.lng]);
      });
      
      // If too many markers in viewport, show only the most important ones
      if (inViewport.length > maxVisibleMarkers) {
        // Sort by status importance and then by name
        return inViewport
          .sort((a, b) => {
            // Primary sort: status (planned > visited > skipped)
            const statusPriority = { 'planned': 3, 'visited': 2, 'skipped': 1, 'in_progress': 4 };
            const statusDiff = (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0);
            if (statusDiff !== 0) return statusDiff;
            // Secondary sort: name
            return a.name.localeCompare(b.name);
          })
          .slice(0, maxVisibleMarkers);
      }
      
      return inViewport;
    } catch (error) {
      console.warn('Error filtering visible destinations:', error);
      return destinations.slice(0, maxVisibleMarkers);
    }
  }, [destinations, map, maxVisibleMarkers]);
  
  // Memoized click handler to prevent recreation
  const handleMarkerClick = useCallback((destination: Destination) => {
    onDestinationClick(destination);
  }, [onDestinationClick]);
  
  // Memoized popup content to prevent unnecessary re-renders
  const createPopupContent = useCallback((destination: Destination) => (
    <div style={{ padding: isMobile ? '0.25rem' : '0.5rem', minWidth: isMobile ? '200px' : '250px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '0.75rem'
      }}>
        <div
          style={{
            width: isMobile ? '32px' : '40px',
            height: isMobile ? '32px' : '40px',
            borderRadius: '8px',
            background: destination.color || '#6b7280',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isMobile ? '1rem' : '1.125rem',
            color: 'white'
          }}
        >
          {getCategoryIcon(destination.category)}
        </div>
        
        <div style={{ flex: 1 }}>
          <h3 style={{
            margin: '0 0 0.25rem 0',
            fontSize: isMobile ? '1rem' : '1.125rem',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            {destination.name}
          </h3>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
            <MapPin size={14} />
            <span style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {destination.location}
            </span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <StatusBadge status={destination.status} size="sm" />
        <span style={{
          marginLeft: '0.5rem',
          background: '#f3f4f6',
          color: '#374151',
          padding: '0.25rem 0.5rem',
          borderRadius: '12px',
          fontSize: '0.75rem'
        }}>
          {getCategoryLabel(destination.category)}
        </span>
      </div>

      {!isMobile && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem',
          fontSize: '0.875rem',
          color: '#374151'
        }}>
          <div>
            <strong>Start:</strong><br />
            {formatDate(destination.startDate)}
          </div>
          <div>
            <strong>Ende:</strong><br />
            {formatDate(destination.endDate)}
          </div>
        </div>
      )}
      
      {destination.duration && !isMobile && (
        <div style={{
          marginTop: '0.5rem',
          fontSize: '0.875rem',
          color: '#374151'
        }}>
          <strong>Dauer:</strong> {Math.floor(destination.duration / 60)}h {destination.duration % 60}min
        </div>
      )}

      {destination.notes && !isMobile && (
        <div style={{
          marginTop: '0.75rem',
          padding: '0.5rem',
          background: '#f9fafb',
          borderRadius: '6px',
          fontSize: '0.875rem',
          color: '#374151'
        }}>
          {destination.notes}
        </div>
      )}
    </div>
  ), [isMobile]);
  
  return (
    <>
      {visibleDestinations.map((destination) => (
        <Marker
          key={destination.id}
          position={[destination.coordinates!.lat, destination.coordinates!.lng]}
          icon={createCustomIcon(destination)}
          eventHandlers={{
            click: () => handleMarkerClick(destination)
          }}
        >
          <Popup 
            maxWidth={isMobile ? 280 : 300} 
            closeButton={!isMobile}
          >
            {createPopupContent(destination)}
          </Popup>
        </Marker>
      ))}
    </>
  );
};

export default React.memo(VirtualizedMarkers);