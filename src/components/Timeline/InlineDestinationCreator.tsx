import React, { useState, useCallback, useMemo } from 'react';
import { useResponsive } from '../../hooks/useResponsive';
import { DestinationCategory, Destination, Coordinates } from '../../types';
import { getCategoryIcon, getCategoryLabel } from '../../utils';
import EnhancedPlaceSearch from '../Search/EnhancedPlaceSearch';
import { PlacePrediction } from '../../services/openStreetMapService';
import {
  Plus,
  X,
  ArrowRight,
  MapPin,
  Clock,
  Lightbulb
} from 'lucide-react';

interface InlineDestinationCreatorProps {
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
  }) => void;
  onCancel: () => void;
}

const QUICK_CATEGORIES: Array<{
  id: DestinationCategory;
  label: string;
  icon: React.ReactNode;
  color: string;
}> = [
  { id: 'hotel', label: 'Hotel', icon: '🏨', color: '#3B82F6' },
  { id: 'restaurant', label: 'Restaurant', icon: '🍽️', color: '#F59E0B' },
  { id: 'fuel', label: 'Tankstelle', icon: '⛽', color: '#10B981' },
  { id: 'sightseeing', label: 'Museum', icon: '🏛️', color: '#8B5CF6' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️', color: '#EC4899' },
  { id: 'other', label: 'Mehr...', icon: '👀', color: '#6B7280' }
];

type CreationStep = 'category' | 'location' | 'details';

const InlineDestinationCreator: React.FC<InlineDestinationCreatorProps> = ({
  isVisible,
  position,
  onAdd,
  onCancel
}) => {
  const { isMobile } = useResponsive();
  const [step, setStep] = useState<CreationStep>('category');
  const [selectedCategory, setSelectedCategory] = useState<DestinationCategory | null>(null);
  const [location, setLocation] = useState('');
  const [coordinates, setCoordinates] = useState<Coordinates | undefined>();
  const [name, setName] = useState('');

  // Generate smart suggestions based on context
  const smartSuggestions = useMemo(() => {
    const { previous, next } = position.between || {};
    const timeOfDay = getTimeOfDay(position.index);
    
    const suggestions: Array<{ category: DestinationCategory; reason: string }> = [];

    // Time-based suggestions
    if (timeOfDay === 'evening') {
      suggestions.push({ category: 'restaurant', reason: 'Abendessen Zeit' });
      suggestions.push({ category: 'hotel', reason: 'Übernachtung' });
    } else if (timeOfDay === 'morning') {
      suggestions.push({ category: 'fuel', reason: 'Tanken für die Weiterfahrt' });
      suggestions.push({ category: 'restaurant', reason: 'Frühstück' });
    }

    // Location-based suggestions
    if (previous && next) {
      const distance = calculateRouteDistance(previous.coordinates, next.coordinates);
      if (distance > 200) { // > 200km
        suggestions.push({ category: 'fuel', reason: 'Lange Strecke - Tanken empfohlen' });
      }
    }

    // Remove duplicates and limit to 2
    const unique = suggestions.filter((s, i, arr) => 
      arr.findIndex(x => x.category === s.category) === i
    ).slice(0, 2);

    return unique;
  }, [position]);

  const handleCategorySelect = useCallback((category: DestinationCategory) => {
    setSelectedCategory(category);
    setStep('location');
  }, []);

  const handlePlaceSelect = useCallback((place: PlacePrediction) => {
    setLocation(place.structured_formatting?.main_text || place.display_name);
    setName(place.structured_formatting?.main_text || '');
    setCoordinates(place.coordinates);
    setStep('details');
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedCategory || !location) return;

    onAdd({
      name: name || location,
      location,
      coordinates,
      category: selectedCategory,
      day: position.day,
      index: position.index
    });

    // Reset form
    setStep('category');
    setSelectedCategory(null);
    setLocation('');
    setCoordinates(undefined);
    setName('');
  }, [selectedCategory, location, name, coordinates, position, onAdd]);

  const handleBack = useCallback(() => {
    if (step === 'location') {
      setStep('category');
    } else if (step === 'details') {
      setStep('location');
    }
  }, [step]);

  if (!isVisible) return null;

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '2px solid var(--color-primary-ocean)',
      borderRadius: '12px',
      margin: '0.5rem 0',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
      overflow: 'hidden',
      animation: 'slideDown 0.2s ease-out'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-primary-ocean), var(--color-primary-sage))',
        color: 'white',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
            {step === 'category' && 'Was möchtest du hinzufügen?'}
            {step === 'location' && `${getCategoryLabel(selectedCategory!)} hinzufügen`}
            {step === 'details' && 'Details bestätigen'}
          </h3>
        </div>
        <button
          onClick={onCancel}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            padding: '0.25rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Smart Suggestions */}
      {step === 'category' && smartSuggestions.length > 0 && (
        <div style={{
          background: 'var(--color-neutral-cream)',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--color-border)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem',
            color: 'var(--color-text-secondary)',
            marginBottom: '0.5rem'
          }}>
            <Lightbulb size={14} />
            Smart Vorschläge:
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {smartSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleCategorySelect(suggestion.category)}
                style={{
                  background: 'var(--color-primary-ocean)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                {getCategoryIcon(suggestion.category, 12)}
                {getCategoryLabel(suggestion.category)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '1rem' }}>
        {/* Step 1: Category Selection */}
        {step === 'category' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
            gap: '0.75rem'
          }}>
            {QUICK_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                style={{
                  background: 'var(--color-background)',
                  border: '2px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  minHeight: '80px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = category.color;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>{category.icon}</span>
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'var(--color-text-primary)',
                  textAlign: 'center'
                }}>
                  {category.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Location Search */}
        {step === 'location' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              background: 'var(--color-neutral-cream)',
              borderRadius: '8px'
            }}>
              {getCategoryIcon(selectedCategory!, 20)}
              <span style={{ fontWeight: '500', color: 'var(--color-text-primary)' }}>
                {getCategoryLabel(selectedCategory!)} suchen
              </span>
            </div>
            
            <EnhancedPlaceSearch
              value={location}
              onChange={setLocation}
              onPlaceSelect={handlePlaceSelect}
              placeholder={`${getCategoryLabel(selectedCategory!)} suchen...`}
              showCategories={false}
              autoFocus={true}
            />
          </div>
        )}

        {/* Step 3: Details */}
        {step === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              background: 'var(--color-neutral-cream)',
              borderRadius: '8px'
            }}>
              <MapPin size={16} color="var(--color-text-secondary)" />
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                {location}
              </span>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--color-text-primary)',
                marginBottom: '0.5rem'
              }}>
                Name (optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`z.B. ${location}`}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  background: 'var(--color-background)',
                  color: 'var(--color-text-primary)'
                }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '1.5rem',
          gap: '0.75rem'
        }}>
          {step !== 'category' && (
            <button
              onClick={handleBack}
              style={{
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                fontSize: '0.875rem'
              }}
            >
              ← Zurück
            </button>
          )}
          
          <div style={{ flex: 1 }} />
          
          {step === 'details' && (
            <button
              onClick={handleSubmit}
              disabled={!selectedCategory || !location}
              style={{
                background: 'var(--color-primary-ocean)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: (!selectedCategory || !location) ? 0.5 : 1
              }}
            >
              Hinzufügen
              <ArrowRight size={16} />
            </button>
          )}
        </div>
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

function calculateRouteDistance(from?: Coordinates, to?: Coordinates): number {
  if (!from || !to) return 0;
  
  const R = 6371; // Earth's radius in km
  const dLat = (to.lat - from.lat) * Math.PI / 180;
  const dLon = (to.lng - from.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default InlineDestinationCreator;