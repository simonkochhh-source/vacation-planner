import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  Save,
  Edit
} from 'lucide-react';

interface NativeInlineDestinationEditorProps {
  destination: Destination;
  onSave: (updatedData: {
    name: string;
    location: string;
    coordinates?: Coordinates;
    category: DestinationCategory;
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

const getTransportLabel = (mode: TransportMode): string => {
  const transport = TRANSPORT_OPTIONS.find(t => t.mode === mode);
  return transport?.label || 'Auto';
};

const NativeInlineDestinationEditor: React.FC<NativeInlineDestinationEditorProps> = ({
  destination,
  onSave,
  onCancel
}) => {
  const { isMobile } = useResponsive();
  
  // Initialize state with destination values
  const [name, setName] = useState(destination.name);
  const [location, setLocation] = useState(destination.location || '');
  const [coordinates, setCoordinates] = useState<Coordinates | undefined>(destination.coordinates);
  const [category, setCategory] = useState<DestinationCategory>(destination.category);
  const [endDate, setEndDate] = useState(destination.endDate || destination.startDate);
  const [actualCost, setActualCost] = useState<number | undefined>(destination.actualCost);
  const [isPaid, setIsPaid] = useState(destination.actualCost !== undefined && destination.actualCost > 0);
  const [transportMode, setTransportMode] = useState<TransportMode>(
    destination.transportToNext?.mode || TransportMode.DRIVING
  );

  useEffect(() => {
    // Update isPaid status based on actualCost
    setIsPaid(actualCost !== undefined && actualCost > 0);
  }, [actualCost]);

  const handlePlaceSelect = useCallback((place: PlacePrediction) => {
    setLocation(place.display_name);
    setName(place.structured_formatting?.main_text || place.display_name.split(',')[0]);
    setCoordinates(place.coordinates);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!category || !name) return;

    onSave({
      name,
      location: location || name,
      coordinates,
      category,
      endDate: category === DestinationCategory.HOTEL ? endDate : destination.startDate,
      actualCost,
      isPaid,
      transportMode
    });
  }, [category, name, location, coordinates, endDate, actualCost, isPaid, transportMode, destination.startDate, onSave]);

  const isComplete = category && name && (category !== DestinationCategory.HOTEL || endDate);
  const hasChanges = 
    name !== destination.name ||
    location !== (destination.location || '') ||
    category !== destination.category ||
    endDate !== (destination.endDate || destination.startDate) ||
    actualCost !== destination.actualCost ||
    transportMode !== (destination.transportToNext?.mode || TransportMode.DRIVING);

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
          <Edit size={18} />
          {destination.name} bearbeiten
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

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              border: '2px solid var(--color-border)',
              borderRadius: '12px',
              padding: '0.875rem 1.5rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            Abbrechen
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={!isComplete || !hasChanges}
            style={{
              background: isComplete && hasChanges ? 'var(--color-primary-ocean)' : 'var(--color-border)',
              color: isComplete && hasChanges ? 'white' : 'var(--color-text-secondary)',
              border: 'none',
              borderRadius: '12px',
              padding: '0.875rem 1.5rem',
              fontSize: '0.875rem',
              cursor: isComplete && hasChanges ? 'pointer' : 'not-allowed',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
              opacity: isComplete && hasChanges ? 1 : 0.6
            }}
          >
            <Save size={16} />
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
};

export default NativeInlineDestinationEditor;