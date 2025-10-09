import React, { useState } from 'react';
import { useResponsive } from '../../hooks/useResponsive';
import { DestinationCategory, Destination, Coordinates } from '../../types';
import TimelineInsertPoint from '../Timeline/TimelineInsertPoint';
import InlineDestinationCreator from '../Timeline/InlineDestinationCreator';

// Mock destinations for demo
const mockDestinations: Destination[] = [
  {
    id: 'mock-1',
    tripId: 'mock-trip',
    name: 'Louvre Museum',
    location: 'Paris, France',
    coordinates: { lat: 48.8606, lng: 2.3376 },
    startDate: '2024-03-15',
    endDate: '2024-03-15',
    category: DestinationCategory.MUSEUM,
    status: 'planned' as any,
    tags: [],
    photos: [],
    createdAt: '2024-03-15',
    updatedAt: '2024-03-15'
  },
  {
    id: 'mock-2',
    tripId: 'mock-trip',
    name: 'Restaurant Paul Bocuse',
    location: 'Lyon, France',
    coordinates: { lat: 45.7640, lng: 4.8357 },
    startDate: '2024-03-16',
    endDate: '2024-03-16',
    category: DestinationCategory.RESTAURANT,
    status: 'planned' as any,
    tags: [],
    photos: [],
    createdAt: '2024-03-16',
    updatedAt: '2024-03-16'
  }
];

const InlineCreationDemo: React.FC = () => {
  const { isMobile } = useResponsive();
  const [destinations, setDestinations] = useState<Destination[]>(mockDestinations);
  const [activeInsertPoint, setActiveInsertPoint] = useState<{
    day: string;
    index: number;
    between?: {
      previous?: Destination;
      next?: Destination;
    };
  } | null>(null);

  const handleActivateInsertPoint = (day: string, index: number, previous?: Destination, next?: Destination) => {
    setActiveInsertPoint({
      day,
      index,
      between: { previous, next }
    });
  };

  const handleCancelInlineCreation = () => {
    setActiveInsertPoint(null);
  };

  const handleInlineDestinationAdd = async (destinationData: {
    name: string;
    location: string;
    coordinates?: Coordinates;
    category: DestinationCategory;
    day: string;
    index: number;
  }) => {
    // Create mock destination
    const newDestination: Destination = {
      id: `mock-${Date.now()}`,
      tripId: 'mock-trip',
      name: destinationData.name,
      location: destinationData.location,
      coordinates: destinationData.coordinates,
      startDate: destinationData.day,
      endDate: destinationData.day,
      category: destinationData.category,
      status: 'planned' as any,
      tags: [],
      photos: [],
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };

    // Insert destination at the specified position
    const newDestinations = [...destinations];
    const insertIndex = destinationData.index;
    newDestinations.splice(insertIndex, 0, newDestination);
    setDestinations(newDestinations);

    // Close the creator
    setActiveInsertPoint(null);
    
    console.log('✅ Demo destination created:', newDestination);
  };

  return (
    <div style={{
      padding: isMobile ? '1rem' : '2rem',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{
        fontSize: '2rem',
        fontWeight: 'bold',
        marginBottom: '2rem',
        color: 'var(--color-text-primary)'
      }}>
        🎯 Inline Destination Creation Demo
      </h1>

      <div style={{
        background: 'var(--color-surface)',
        borderRadius: '12px',
        padding: '1.5rem',
        border: '1px solid var(--color-border)'
      }}>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          marginBottom: '1rem',
          color: 'var(--color-text-primary)'
        }}>
          Frankreich Reise Timeline
        </h2>

        {/* Timeline Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {destinations.map((destination, index) => (
            <React.Fragment key={destination.id}>
              {/* Insert Point Before */}
              {(activeInsertPoint?.day === destination.startDate && activeInsertPoint?.index === index) ? (
                <InlineDestinationCreator
                  isVisible={true}
                  position={{
                    between: activeInsertPoint.between,
                    day: activeInsertPoint.day,
                    index: activeInsertPoint.index
                  }}
                  onAdd={handleInlineDestinationAdd}
                  onCancel={handleCancelInlineCreation}
                />
              ) : (
                <TimelineInsertPoint
                  position={{
                    between: {
                      previous: index > 0 ? destinations[index - 1] : undefined,
                      next: destination
                    },
                    day: destination.startDate,
                    index: index
                  }}
                  onActivate={() => handleActivateInsertPoint(
                    destination.startDate,
                    index,
                    index > 0 ? destinations[index - 1] : undefined,
                    destination
                  )}
                  isActive={activeInsertPoint?.day === destination.startDate && activeInsertPoint?.index === index}
                />
              )}

              {/* Destination Item */}
              <div style={{
                background: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'var(--color-primary-ocean)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem'
                }}>
                  {destination.category === DestinationCategory.MUSEUM && '🏛️'}
                  {destination.category === DestinationCategory.RESTAURANT && '🍽️'}
                  {destination.category === DestinationCategory.HOTEL && '🏨'}
                  {destination.category === DestinationCategory.TRANSPORT && '⛽'}
                  {destination.category === DestinationCategory.SHOPPING && '🛍️'}
                  {destination.category === DestinationCategory.ATTRACTION && '🎯'}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: 'var(--color-text-primary)'
                  }}>
                    {destination.name}
                  </h3>
                  <p style={{
                    margin: '0.25rem 0 0 0',
                    fontSize: '0.875rem',
                    color: 'var(--color-text-secondary)'
                  }}>
                    📍 {destination.location} • {destination.startDate}
                  </p>
                </div>
              </div>
            </React.Fragment>
          ))}

          {/* Insert Point After Last Item */}
          {(activeInsertPoint?.day === 'end' && activeInsertPoint?.index === destinations.length) ? (
            <InlineDestinationCreator
              isVisible={true}
              position={{
                between: {
                  previous: destinations[destinations.length - 1],
                  next: undefined
                },
                day: 'end',
                index: destinations.length
              }}
              onAdd={handleInlineDestinationAdd}
              onCancel={handleCancelInlineCreation}
            />
          ) : (
            <TimelineInsertPoint
              position={{
                between: {
                  previous: destinations[destinations.length - 1],
                  next: undefined
                },
                day: 'end',
                index: destinations.length
              }}
              onActivate={() => handleActivateInsertPoint(
                'end',
                destinations.length,
                destinations[destinations.length - 1],
                undefined
              )}
              isActive={activeInsertPoint?.day === 'end' && activeInsertPoint?.index === destinations.length}
            />
          )}
        </div>

        {/* Demo Info */}
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          background: 'var(--color-neutral-cream)',
          borderRadius: '8px',
          border: '1px solid var(--color-border)'
        }}>
          <h3 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '1rem',
            fontWeight: '600',
            color: 'var(--color-text-primary)'
          }}>
            🎮 Demo Features
          </h3>
          <ul style={{
            margin: 0,
            paddingLeft: '1.5rem',
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6
          }}>
            <li>Klicke auf Insert Points (➕) um Ziele hinzuzufügen</li>
            <li>Smart Suggestions basierend auf Position und Zeit</li>
            <li>Step-by-step Creation Flow</li>
            <li>Enhanced Place Search Integration</li>
            <li>Mobile-optimierte Benutzerführung</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default InlineCreationDemo;