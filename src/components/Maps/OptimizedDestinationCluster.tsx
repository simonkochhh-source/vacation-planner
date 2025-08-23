import React, { useMemo, useCallback, useState } from 'react';
import { Marker, Popup, CircleMarker } from 'react-leaflet';
import { LatLngExpression, Icon } from 'leaflet';
import { Destination, DestinationCategory } from '../../types';
import { getCategoryIcon, getCategoryColor, formatDate, formatTime } from '../../utils';
import StatusBadge from '../UI/StatusBadge';
import { MapPin, Users, Calendar } from 'lucide-react';

interface ClusterData {
  destinations: Destination[];
  center: LatLngExpression;
  isCluster: boolean;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

interface OptimizedDestinationClusterProps {
  destinations: Destination[];
  zoom: number;
  onDestinationClick: (destination: Destination) => void;
  maxClusterRadius?: number;
  minPointsToCluster?: number;
  isMobile?: boolean;
}

// Efficient clustering algorithm using spatial grid
const clusterDestinations = (
  destinations: Destination[], 
  zoom: number, 
  maxRadius: number = 80,
  minPoints: number = 2
): ClusterData[] => {
  if (zoom >= 14) {
    // At high zoom levels, show individual markers
    return destinations.map(dest => ({
      destinations: [dest],
      center: [dest.coordinates!.lat, dest.coordinates!.lng] as LatLngExpression,
      isCluster: false
    }));
  }

  // Use grid-based clustering for better performance
  const gridSize = maxRadius / Math.pow(2, zoom - 10);
  const clusters: Map<string, Destination[]> = new Map();

  destinations.forEach(dest => {
    if (!dest.coordinates) return;
    
    // Create grid key based on rounded coordinates
    const gridX = Math.floor(dest.coordinates.lat / gridSize);
    const gridY = Math.floor(dest.coordinates.lng / gridSize);
    const gridKey = `${gridX},${gridY}`;
    
    if (!clusters.has(gridKey)) {
      clusters.set(gridKey, []);
    }
    clusters.get(gridKey)!.push(dest);
  });

  const result: ClusterData[] = [];

  clusters.forEach(destGroup => {
    if (destGroup.length >= minPoints) {
      // Calculate cluster center
      const latSum = destGroup.reduce((sum, dest) => sum + dest.coordinates!.lat, 0);
      const lngSum = destGroup.reduce((sum, dest) => sum + dest.coordinates!.lng, 0);
      const center: LatLngExpression = [latSum / destGroup.length, lngSum / destGroup.length];
      
      // Calculate bounds for cluster
      const lats = destGroup.map(d => d.coordinates!.lat);
      const lngs = destGroup.map(d => d.coordinates!.lng);
      
      result.push({
        destinations: destGroup,
        center,
        isCluster: true,
        bounds: {
          north: Math.max(...lats),
          south: Math.min(...lats),
          east: Math.max(...lngs),
          west: Math.min(...lngs)
        }
      });
    } else {
      // Individual markers for small groups
      destGroup.forEach(dest => {
        result.push({
          destinations: [dest],
          center: [dest.coordinates!.lat, dest.coordinates!.lng] as LatLngExpression,
          isCluster: false
        });
      });
    }
  });

  return result;
};

// Memoized cluster icon creation
const createClusterIcon = (() => {
  const iconCache = new Map<string, Icon>();
  
  return (cluster: ClusterData, dominantColor: string): Icon => {
    const count = cluster.destinations.length;
    const size = Math.min(60, Math.max(40, 20 + count * 2));
    const cacheKey = `cluster-${count}-${dominantColor}-${size}`;
    
    if (iconCache.has(cacheKey)) {
      return iconCache.get(cacheKey)!;
    }
    
    const icon = new Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${dominantColor}" stroke="white" stroke-width="3" opacity="0.8"/>
          <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 8}" fill="white" opacity="0.9"/>
          <text x="${size/2}" y="${size/2 + 4}" text-anchor="middle" fill="${dominantColor}" font-size="${Math.min(16, size/3)}" font-weight="bold" font-family="Arial">
            ${count}
          </text>
        </svg>
      `)}`,
      iconSize: [size, size],
      iconAnchor: [size/2, size/2],
      popupAnchor: [0, -size/2]
    });
    
    iconCache.set(cacheKey, icon);
    return icon;
  };
})();

// Individual marker icon creation (reused from VirtualizedMarkers)
const createMarkerIcon = (() => {
  const iconCache = new Map<string, Icon>();
  
  return (destination: Destination): Icon => {
    const cacheKey = `${destination.category}-${destination.color}`;
    
    if (iconCache.has(cacheKey)) {
      return iconCache.get(cacheKey)!;
    }
    
    const icon = new Icon({
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
    
    iconCache.set(cacheKey, icon);
    return icon;
  };
})();

const OptimizedDestinationCluster: React.FC<OptimizedDestinationClusterProps> = ({
  destinations,
  zoom,
  onDestinationClick,
  maxClusterRadius = 80,
  minPointsToCluster = 2,
  isMobile = false
}) => {
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());

  // Memoize clusters calculation for performance
  const clusters = useMemo(() => {
    return clusterDestinations(destinations, zoom, maxClusterRadius, minPointsToCluster);
  }, [destinations, zoom, maxClusterRadius, minPointsToCluster]);

  // Memoized click handlers
  const handleDestinationClick = useCallback((destination: Destination) => {
    onDestinationClick(destination);
  }, [onDestinationClick]);

  const handleClusterClick = useCallback((cluster: ClusterData) => {
    const center = Array.isArray(cluster.center) ? cluster.center : [cluster.center.lat, cluster.center.lng];
    const clusterKey = `${center[0]}-${center[1]}`;
    setExpandedClusters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clusterKey)) {
        newSet.delete(clusterKey);
      } else {
        newSet.add(clusterKey);
      }
      return newSet;
    });
  }, []);

  // Memoized cluster popup content
  const createClusterPopupContent = useCallback((cluster: ClusterData) => {
    const center = Array.isArray(cluster.center) ? cluster.center : [cluster.center.lat, cluster.center.lng];
    const clusterKey = `${center[0]}-${center[1]}`;
    const isExpanded = expandedClusters.has(clusterKey);
    
    // Category statistics
    const categoryStats = cluster.destinations.reduce((stats, dest) => {
      stats[dest.category] = (stats[dest.category] || 0) + 1;
      return stats;
    }, {} as Record<DestinationCategory, number>);

    const statusStats = cluster.destinations.reduce((stats, dest) => {
      stats[dest.status] = (stats[dest.status] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    return (
      <div style={{ 
        padding: isMobile ? '0.5rem' : '0.75rem', 
        minWidth: isMobile ? '250px' : '300px',
        maxWidth: isMobile ? '280px' : '400px'
      }}>
        {/* Cluster Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.75rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#3b82f6',
            color: 'white'
          }}>
            <Users size={20} />
          </div>
          <div>
            <h3 style={{
              margin: '0 0 0.25rem 0',
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              {cluster.destinations.length} Ziele
            </h3>
            <p style={{
              margin: 0,
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              In diesem Bereich
            </p>
          </div>
        </div>

        {/* Statistics */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            {Object.entries(categoryStats).map(([category, count]) => (
              <div key={category} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.25rem 0.5rem',
                background: '#f8fafc',
                borderRadius: '6px',
                fontSize: '0.75rem'
              }}>
                <span>{getCategoryIcon(category as DestinationCategory)}</span>
                <span>{count}</span>
              </div>
            ))}
          </div>
          
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap'
          }}>
            {Object.entries(statusStats).map(([status, count]) => (
              <div key={status} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <StatusBadge status={status as any} size="sm" />
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Toggle expansion */}
        <button
          onClick={() => handleClusterClick(cluster)}
          style={{
            width: '100%',
            padding: '0.5rem',
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem',
            color: '#374151',
            cursor: 'pointer',
            marginBottom: isExpanded ? '0.75rem' : '0'
          }}
        >
          {isExpanded ? 'Liste ausblenden' : 'Liste anzeigen'}
        </button>

        {/* Expanded destination list */}
        {isExpanded && (
          <div style={{
            maxHeight: '200px',
            overflowY: 'auto',
            border: '1px solid #e5e7eb',
            borderRadius: '6px'
          }}>
            {cluster.destinations.map((destination, index) => (
              <button
                key={destination.id}
                onClick={() => handleDestinationClick(destination)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: 'none',
                  borderBottom: index < cluster.destinations.length - 1 ? '1px solid #f3f4f6' : 'none',
                  background: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseOut={(e) => e.currentTarget.style.background = 'white'}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  background: destination.color || '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  color: 'white'
                }}>
                  {getCategoryIcon(destination.category)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {destination.name}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <Calendar size={10} />
                    {formatDate(destination.startDate)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }, [expandedClusters, handleClusterClick, handleDestinationClick, isMobile]);

  // Memoized individual destination popup content
  const createDestinationPopupContent = useCallback((destination: Destination) => (
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
            <span>{destination.location}</span>
          </div>
        </div>
      </div>

      <StatusBadge status={destination.status} size="sm" />
    </div>
  ), [isMobile]);

  return (
    <>
      {clusters.map((cluster, index) => {
        if (cluster.isCluster) {
          // Determine dominant color
          const colorCounts = cluster.destinations.reduce((counts, dest) => {
            const color = dest.color || getCategoryColor(dest.category);
            counts[color] = (counts[color] || 0) + 1;
            return counts;
          }, {} as Record<string, number>);
          
          const dominantColor = Object.entries(colorCounts)
            .sort(([,a], [,b]) => b - a)[0][0];

          return (
            <Marker
              key={`cluster-${index}`}
              position={cluster.center}
              icon={createClusterIcon(cluster, dominantColor)}
            >
              <Popup maxWidth={isMobile ? 300 : 400} closeButton={!isMobile}>
                {createClusterPopupContent(cluster)}
              </Popup>
            </Marker>
          );
        } else {
          // Individual destination marker
          const destination = cluster.destinations[0];
          return (
            <Marker
              key={destination.id}
              position={cluster.center}
              icon={createMarkerIcon(destination)}
              eventHandlers={{
                click: () => handleDestinationClick(destination)
              }}
            >
              <Popup maxWidth={isMobile ? 280 : 300} closeButton={!isMobile}>
                {createDestinationPopupContent(destination)}
              </Popup>
            </Marker>
          );
        }
      })}
    </>
  );
};

export default React.memo(OptimizedDestinationCluster);