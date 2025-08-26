import React, { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { Destination } from '../../types';
import { getCategoryIcon, formatDate } from '../../utils';
import StatusBadge from '../UI/StatusBadge';

interface ClusterPoint {
  destinations: Destination[];
  center: LatLngExpression;
  isCluster: boolean;
}

interface DestinationClusterProps {
  destinations: Destination[];
  zoom: number;
  onDestinationClick?: (destination: Destination) => void;
}

const DestinationCluster: React.FC<DestinationClusterProps> = ({
  destinations,
  zoom,
  onDestinationClick
}) => {
  // Simple clustering algorithm based on zoom level and distance
  const clusters = useMemo(() => {
    if (zoom >= 12) {
      // At high zoom, show individual markers
      return destinations.map(dest => ({
        destinations: [dest],
        center: [dest.coordinates!.lat, dest.coordinates!.lng] as LatLngExpression,
        isCluster: false
      }));
    }

    // Group nearby destinations into clusters
    const clusterRadius = zoom < 8 ? 1 : 0.5; // degrees
    const clusters: ClusterPoint[] = [];
    const processed = new Set<string>();

    destinations.forEach(dest => {
      if (processed.has(dest.id)) return;

      const nearby = destinations.filter(other => {
        if (processed.has(other.id) || other.id === dest.id) return false;
        
        const distance = Math.sqrt(
          Math.pow(dest.coordinates!.lat - other.coordinates!.lat, 2) +
          Math.pow(dest.coordinates!.lng - other.coordinates!.lng, 2)
        );
        
        return distance <= clusterRadius;
      });

      const clusterDestinations = [dest, ...nearby];
      
      // Mark all as processed
      clusterDestinations.forEach(d => processed.add(d.id));

      // Calculate center point
      const centerLat = clusterDestinations.reduce((sum, d) => sum + d.coordinates!.lat, 0) / clusterDestinations.length;
      const centerLng = clusterDestinations.reduce((sum, d) => sum + d.coordinates!.lng, 0) / clusterDestinations.length;

      clusters.push({
        destinations: clusterDestinations,
        center: [centerLat, centerLng],
        isCluster: clusterDestinations.length > 1
      });
    });

    return clusters;
  }, [destinations, zoom]);

  const createClusterIcon = (count: number, destinations: Destination[]) => {
    const size = Math.min(60, 20 + count * 5);
    const dominantCategory = destinations[0].category;
    const dominantColor = destinations[0].color || '#3b82f6';

    return new Icon({
      iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
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
  };

  const createSingleIcon = (destination: Destination) => {
    return new Icon({
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
  };

  return (
    <>
      {clusters.map((cluster, index) => (
        <Marker
          key={`cluster-${index}`}
          position={cluster.center}
          icon={cluster.isCluster 
            ? createClusterIcon(cluster.destinations.length, cluster.destinations)
            : createSingleIcon(cluster.destinations[0])
          }
          eventHandlers={!cluster.isCluster && onDestinationClick ? {
            click: () => onDestinationClick(cluster.destinations[0])
          } : {}}
        >
          <Popup maxWidth={cluster.isCluster ? 400 : 300}>
            {cluster.isCluster ? (
              // Cluster popup
              <div style={{ padding: '0.5rem', maxWidth: '350px' }}>
                <h4 style={{
                  margin: '0 0 0.75rem 0',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  {cluster.destinations.length} Ziele in diesem Bereich
                </h4>
                
                <div style={{
                  display: 'grid',
                  gap: '0.5rem',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {cluster.destinations.map(destination => (
                    <button
                      key={destination.id}
                      onClick={() => onDestinationClick?.(destination)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.5rem',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%'
                      }}
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
                        color: 'white',
                        flexShrink: 0
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
                          color: '#6b7280'
                        }}>
                          {formatDate(destination.startDate)}
                        </div>
                      </div>
                      
                      <StatusBadge status={destination.status} size="sm" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Single destination popup
              <div style={{ padding: '0.5rem', minWidth: '250px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '0.75rem'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    background: cluster.destinations[0].color || '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.125rem',
                    color: 'white'
                  }}>
                    {getCategoryIcon(cluster.destinations[0].category)}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      margin: '0 0 0.25rem 0',
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: '#1f2937'
                    }}>
                      {cluster.destinations[0].name}
                    </h3>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      {cluster.destinations[0].location}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <StatusBadge status={cluster.destinations[0].status} size="sm" />
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#374151'
                }}>
                  <div>
                    <strong>Start:</strong><br />
                    {formatDate(cluster.destinations[0].startDate)}
                  </div>
                  <div>
                    <strong>Ende:</strong><br />
                    {formatDate(cluster.destinations[0].endDate)}
                  </div>
                </div>
                
                {cluster.destinations[0].duration && (
                  <div style={{
                    marginTop: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#374151'
                  }}>
                    <strong>Dauer:</strong> {Math.floor(cluster.destinations[0].duration / 60)}h {cluster.destinations[0].duration % 60}min
                  </div>
                )}

                {cluster.destinations[0].notes && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem',
                    background: '#f9fafb',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    color: '#374151'
                  }}>
                    {cluster.destinations[0].notes}
                  </div>
                )}
              </div>
            )}
          </Popup>
        </Marker>
      ))}
    </>
  );
};

export default DestinationCluster;