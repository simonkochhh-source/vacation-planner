import React, { useState, useCallback, useMemo } from 'react';
import { useResponsive } from '../../hooks/useResponsive';
import { DestinationCategory, Destination, Coordinates, TransportMode } from '../../types';
import { getCategoryIcon } from '../../utils';
import EnhancedPlaceSearch from '../Search/EnhancedPlaceSearch';
import { PlacePrediction } from '../../services/openStreetMapService';
import {
  X,
  MapPin,
  Calendar,
  Euro,
  Check,
  ArrowRight
} from 'lucide-react';

interface NativeInlineDestinationCreatorProps {
  isVisible: boolean;
  position: {
    between?: {
      previous?: Destination;
      next?: Destination;
    };
    day: string;
    index: number;
  };
  onAdd: (destination: {
    name: string;
    location: string;
    coordinates?: Coordinates;
    category: DestinationCategory;
    day: string;
    index: number;
    endDate?: string;
    actualCost?: number;
    isPaid: boolean;
    transportMode: TransportMode;
  }) => void;
  onCancel: () => void;
}

const CATEGORY_OPTIONS = [
  { id: DestinationCategory.HOTEL, label: 'Hotel', icon: '🏨', desc: 'Übernachtung' },
  { id: DestinationCategory.RESTAURANT, label: 'Restaurant', icon: '🍽️', desc: 'Essen' },
  { id: DestinationCategory.TRANSPORT, label: 'Tankstelle', icon: '⛽', desc: 'Tanken' },
  { id: DestinationCategory.ATTRACTION, label: 'Sehenswürdigkeit', icon: '🎯', desc: 'Besichtigen' },
  { id: DestinationCategory.SHOPPING, label: 'Shopping', icon: '🛍️', desc: 'Einkaufen' },
  { id: DestinationCategory.MUSEUM, label: 'Museum', icon: '🏛️', desc: 'Kultur' }
];

const TRANSPORT_OPTIONS = [
  { mode: TransportMode.DRIVING, icon: '🚗', label: 'Auto' },
  { mode: TransportMode.WALKING, icon: '🚶', label: 'Zu Fuß' },
  { mode: TransportMode.BICYCLE, icon: '🚲', label: 'Fahrrad' },
  { mode: TransportMode.PUBLIC_TRANSPORT, icon: '🚌', label: 'Öffentlich' }
];

const NativeInlineDestinationCreator: React.FC<NativeInlineDestinationCreatorProps> = ({
  isVisible,
  position,
  onAdd,
  onCancel
}) => {
  const { isMobile } = useResponsive();
  
  // State
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [coordinates, setCoordinates] = useState<Coordinates | undefined>();
  const [category, setCategory] = useState<DestinationCategory | null>(null);
  const [endDate, setEndDate] = useState('');
  const [actualCost, setActualCost] = useState<number | undefined>();
  const [isPaid, setIsPaid] = useState(false);
  const [transportMode, setTransportMode] = useState<TransportMode>(TransportMode.DRIVING);

  // Context information
  const contextText = useMemo(() => {
    const { previous, next } = position.between || {};
    if (previous && next) {
      return `zwischen ${previous.name} & ${next.name}`;
    } else if (previous) {
      return `nach ${previous.name}`;
    } else if (next) {
      return `vor ${next.name}`;
    }
    return 'am Tagesanfang';
  }, [position.between]);

  // Smart suggestions based on context
  const smartSuggestions = useMemo(() => {
    const { previous } = position.between || {};
    const timeOfDay = getTimeOfDay(position.index);
    
    const suggestions: Array<{ category: DestinationCategory; reason: string }> = [];
    
    if (timeOfDay === 'evening') {
      suggestions.push({ category: DestinationCategory.RESTAURANT, reason: 'Abendessen' });
      suggestions.push({ category: DestinationCategory.HOTEL, reason: 'Übernachtung' });
    } else if (timeOfDay === 'morning') {
      suggestions.push({ category: DestinationCategory.TRANSPORT, reason: 'Tanken' });
      suggestions.push({ category: DestinationCategory.RESTAURANT, reason: 'Frühstück' });
    } else {
      suggestions.push({ category: DestinationCategory.RESTAURANT, reason: 'Mittagessen' });
      suggestions.push({ category: DestinationCategory.ATTRACTION, reason: 'Besichtigung' });
    }
    
    return suggestions.slice(0, 2);
  }, [position]);

  const handlePlaceSelect = useCallback((place: PlacePrediction) => {
    setLocation(place.display_name);
    setName(place.structured_formatting?.main_text || place.display_name.split(',')[0]);
    setCoordinates(place.coordinates);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!category || !name) return;

    onAdd({
      name,
      location: location || name,
      coordinates,
      category,
      day: position.day,
      index: position.index,
      endDate: category === DestinationCategory.HOTEL ? endDate : undefined,
      actualCost,
      isPaid,
      transportMode
    });

    // Reset form
    setName('');
    setLocation('');
    setCoordinates(undefined);
    setCategory(null);
    setEndDate('');
    setActualCost(undefined);
    setIsPaid(false);
    setTransportMode(TransportMode.DRIVING);
  }, [category, name, location, coordinates, position, endDate, actualCost, isPaid, transportMode, onAdd]);

  const isComplete = category && name && (category !== DestinationCategory.HOTEL || endDate);

  if (!isVisible) return null;

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '2px solid var(--color-primary-ocean)',
      borderRadius: '16px',
      margin: '1rem 0',
      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15)',
      overflow: 'hidden',
      animation: 'slideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      width: '100%',
      maxWidth: '800px'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-primary-ocean), var(--color-primary-sage))',
        color: 'white',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          ⊕ Wo möchtest du als nächstes hin?
        </div>
        <button
          onClick={onCancel}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            padding: '0.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '1.5rem' }}>
        {/* Context */}
        <div style={{
          background: 'var(--color-neutral-cream)',
          borderRadius: '8px',
          padding: '0.875rem 1rem',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          color: 'var(--color-text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          💡 {contextText}
        </div>

        {/* Main Input Field */}
        <div style={{
          marginBottom: '1.5rem'
        }}>
          <EnhancedPlaceSearch
            value={name}
            onChange={setName}
            onPlaceSelect={handlePlaceSelect}
            placeholder="z.B. Hotel Le Marais, Restaurant xyz..."
            style={{
              width: '100%',
              padding: '1rem 1.25rem',
              fontSize: '1.125rem',
              fontWeight: '500',
              border: '2px solid var(--color-border)',
              borderRadius: '12px',
              background: 'var(--color-surface)',
              transition: 'all 0.2s',
              minHeight: '50px'
            }}
            autoFocus
          />
          
          {location && (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.75rem 1rem',
              background: 'var(--color-neutral-cream)',
              borderRadius: '8px',
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <MapPin size={14} />
              {location}
            </div>
          )}
        </div>

        {/* Main Content Card - True Horizontal Layout */}
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          display: isMobile ? 'flex' : 'grid',
          gridTemplateColumns: isMobile ? 'none' : '2fr 1fr',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '2rem'
        }}>
          {/* Left Section: Categories */}
          <div>
            <div style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: 'var(--color-text-primary)',
              marginBottom: '0.75rem'
            }}>
              Was für ein Ziel ist das?
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
              gap: '0.75rem'
            }}>
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  title={cat.label}
                  style={{
                    background: category === cat.id ? 'var(--color-primary-ocean)' : 'var(--color-surface)',
                    color: category === cat.id ? 'white' : 'var(--color-text-primary)',
                    border: category === cat.id ? '2px solid var(--color-primary-ocean)' : '2px solid var(--color-border)',
                    borderRadius: '12px',
                    padding: '16px 12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    minHeight: '80px',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    boxSizing: 'border-box',
                    width: '100%',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <div style={{ fontSize: '20px', lineHeight: '1' }}>{cat.icon}</div>
                  <div style={{ 
                    fontSize: '10px', 
                    fontWeight: 'bold',
                    textAlign: 'center',
                    lineHeight: '1.2',
                    color: category === cat.id ? 'white' : 'var(--color-text-primary)',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                    display: 'block',
                    width: '100%',
                    marginTop: '2px',
                    textTransform: 'none',
                    letterSpacing: '0px'
                  }}>
                    {cat.label}
                  </div>
                </button>
              ))}
            </div>
            
            {/* Hotel-specific: End Date - Below Categories */}
            {category === DestinationCategory.HOTEL && (
              <div style={{
                marginTop: '1.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem'
                }}>
                  <Calendar size={16} color="var(--color-primary-ocean)" />
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                    Bis wann bleibst du?
                  </span>
                </div>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    border: '2px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            )}
          </div>

          {/* Right Section: Always Visible Options */}
          <div style={{
            borderLeft: isMobile ? 'none' : '1px solid var(--color-border)',
            paddingLeft: isMobile ? '0' : '2rem',
            borderTop: isMobile ? '1px solid var(--color-border)' : 'none',
            paddingTop: isMobile ? '1.5rem' : '0'
          }}>

            {/* Cost Input - Always Visible */}
            <div style={{
              marginBottom: '1.5rem'
            }}>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: 'var(--color-text-primary)',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Euro size={16} color="var(--color-text-secondary)" />
                Kosten
              </div>
              <input
                type="number"
                value={actualCost || ''}
                onChange={(e) => setActualCost(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="89.50"
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  border: '2px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}
                step="0.01"
                min="0"
              />
            </div>

            {/* Payment Status - Always Visible */}
            <div style={{
              marginBottom: '1.5rem'
            }}>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: 'var(--color-text-primary)',
                marginBottom: '0.75rem'
              }}>
                Bezahlstatus
              </div>
              <button
                onClick={() => setIsPaid(!isPaid)}
                style={{
                  background: isPaid ? 'var(--color-success)' : 'var(--color-border)',
                  color: isPaid ? 'white' : 'var(--color-text-secondary)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.875rem 1.25rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s',
                  fontWeight: '500',
                  width: '100%',
                  justifyContent: 'center'
                }}
              >
                {isPaid ? <Check size={16} /> : '○'}
                {isPaid ? 'Bezahlt' : 'Nicht bezahlt'}
              </button>
            </div>

            {/* Transport Mode - Always Visible */}
            <div>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: 'var(--color-text-primary)',
                marginBottom: '0.75rem'
              }}>
                Verkehrsmittel:
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.5rem'
              }}>
                {TRANSPORT_OPTIONS.map((transport) => (
                  <button
                    key={transport.mode}
                    onClick={() => setTransportMode(transport.mode)}
                    style={{
                      background: transportMode === transport.mode ? 'var(--color-primary-ocean)' : 'var(--color-surface)',
                      color: transportMode === transport.mode ? 'white' : 'var(--color-text-secondary)',
                      border: transportMode === transport.mode ? '2px solid var(--color-primary-ocean)' : '2px solid var(--color-border)',
                      borderRadius: '8px',
                      padding: '0.75rem 0.5rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      transition: 'all 0.2s',
                      fontWeight: '500',
                      minHeight: '60px'
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{transport.icon}</span>
                    <span style={{ fontSize: '0.7rem' }}>{transport.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Smart Suggestions */}
        {smartSuggestions.length > 0 && !category && name && (
          <div style={{
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <span style={{
              fontSize: '0.8rem',
              color: 'var(--color-text-secondary)',
              fontWeight: '500'
            }}>
              💡 Vorschläge:
            </span>
            {smartSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setCategory(suggestion.category)}
                style={{
                  background: 'var(--color-primary-ocean)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontWeight: '500'
                }}
              >
                {getCategoryIcon(suggestion.category)}
                {suggestion.reason}
              </button>
            ))}
          </div>
        )}


        {/* Submit Button */}
        {isComplete && (
          <button
            onClick={handleSubmit}
            style={{
              width: '100%',
              background: 'var(--color-primary-ocean)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '1.25rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              transition: 'all 0.2s'
            }}
          >
            Hinzufügen & Weiter
            <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

// Helper functions
function getTimeOfDay(index: number): 'morning' | 'afternoon' | 'evening' {
  if (index === 0) return 'morning';
  if (index <= 2) return 'afternoon';
  return 'evening';
}

export default NativeInlineDestinationCreator;