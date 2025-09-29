import React, { useState } from 'react';
import { Home, MapPin, Check, X } from 'lucide-react';
import { Destination, Coordinates } from '../../types';
import EnhancedPlaceSearch from '../Search/EnhancedPlaceSearch';
import { enhancedOpenStreetMapService } from '../../services/enhancedOpenStreetMapService';

interface HomepointSelectorProps {
  /** Optional homepoint destination from copied trip */
  suggestedHomepoint?: Destination;
  /** User's current homepoint from settings */
  userHomepoint?: { name: string; address: string; coordinates: Coordinates };
  /** Callback when homepoint is selected */
  onHomepointSelect: (homepoint: { name: string; location: string; coordinates: Coordinates }) => void;
  /** Callback when user chooses not to set a homepoint */
  onSkip: () => void;
  /** Loading state */
  loading?: boolean;
}

const HomepointSelector: React.FC<HomepointSelectorProps> = ({
  suggestedHomepoint,
  userHomepoint,
  onHomepointSelect,
  onSkip,
  loading = false
}) => {
  const [selectedOption, setSelectedOption] = useState<'user' | 'suggested' | 'custom' | null>(null);
  const [customLocation, setCustomLocation] = useState('');
  const [customCoordinates, setCustomCoordinates] = useState<Coordinates | undefined>();

  const handleUseUserHomepoint = () => {
    if (userHomepoint) {
      onHomepointSelect({
        name: 'Home',
        location: userHomepoint.address,
        coordinates: userHomepoint.coordinates
      });
    }
  };

  const handleUseSuggestedHomepoint = () => {
    if (suggestedHomepoint) {
      onHomepointSelect({
        name: 'Home',
        location: suggestedHomepoint.location,
        coordinates: suggestedHomepoint.coordinates || { lat: 0, lng: 0 }
      });
    }
  };

  const handleCustomPlaceSelect = (place: any) => {
    setCustomLocation(place.structured_formatting.main_text);
    setCustomCoordinates(place.coordinates);
  };

  const handleUseCustomLocation = () => {
    if (customLocation && customCoordinates) {
      onHomepointSelect({
        name: 'Home',
        location: customLocation,
        coordinates: customCoordinates
      });
    }
  };

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      padding: '1.5rem',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem', 
        marginBottom: '1rem' 
      }}>
        <Home size={20} style={{ color: 'var(--color-primary-ocean)' }} />
        <h3 style={{ 
          margin: 0, 
          color: 'var(--color-text-primary)',
          fontSize: '1.125rem'
        }}>
          Startpunkt für kopierte Reise festlegen
        </h3>
      </div>

      <p style={{
        color: 'var(--color-text-secondary)',
        fontSize: '0.875rem',
        marginBottom: '1.5rem',
        lineHeight: 1.5
      }}>
        Diese Reise wurde kopiert und benötigt einen Startpunkt. Sie können Ihren 
        gespeicherten Homepoint verwenden, den vorgeschlagenen Startpunkt übernehmen 
        oder einen eigenen Ort auswählen.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* User's Homepoint Option */}
        {userHomepoint && (
          <div style={{
            border: selectedOption === 'user' ? '2px solid var(--color-success)' : '1px solid var(--color-border)',
            borderRadius: '6px',
            padding: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onClick={() => setSelectedOption('user')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: '2px solid',
                borderColor: selectedOption === 'user' ? 'var(--color-success)' : 'var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {selectedOption === 'user' && <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'var(--color-success)'
                }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: '500', 
                  color: 'var(--color-text-primary)',
                  marginBottom: '0.25rem'
                }}>
                  Meinen gespeicherten Homepoint verwenden
                </div>
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: 'var(--color-text-secondary)' 
                }}>
                  {userHomepoint.address}
                </div>
              </div>
              <Home size={16} style={{ color: 'var(--color-success)' }} />
            </div>
          </div>
        )}

        {/* Suggested Homepoint Option */}
        {suggestedHomepoint && (
          <div style={{
            border: selectedOption === 'suggested' ? '2px solid var(--color-primary-ocean)' : '1px solid var(--color-border)',
            borderRadius: '6px',
            padding: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onClick={() => setSelectedOption('suggested')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: '2px solid',
                borderColor: selectedOption === 'suggested' ? 'var(--color-primary-ocean)' : 'var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {selectedOption === 'suggested' && <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'var(--color-primary-ocean)'
                }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: '500', 
                  color: 'var(--color-text-primary)',
                  marginBottom: '0.25rem'
                }}>
                  Vorgeschlagenen Startpunkt übernehmen
                </div>
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: 'var(--color-text-secondary)' 
                }}>
                  {suggestedHomepoint.location}
                </div>
              </div>
              <MapPin size={16} style={{ color: 'var(--color-primary-ocean)' }} />
            </div>
          </div>
        )}

        {/* Custom Location Option */}
        <div style={{
          border: selectedOption === 'custom' ? '2px solid var(--color-warning)' : '1px solid var(--color-border)',
          borderRadius: '6px',
          padding: '1rem',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onClick={() => setSelectedOption('custom')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: '2px solid',
              borderColor: selectedOption === 'custom' ? 'var(--color-warning)' : 'var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {selectedOption === 'custom' && <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: 'var(--color-warning)'
              }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontWeight: '500', 
                color: 'var(--color-text-primary)' 
              }}>
                Eigenen Startpunkt auswählen
              </div>
            </div>
          </div>
          
          {selectedOption === 'custom' && (
            <div style={{ marginLeft: '2.75rem' }}>
              <EnhancedPlaceSearch
                value={customLocation}
                onChange={setCustomLocation}
                onPlaceSelect={handleCustomPlaceSelect}
                placeholder="Suche nach Ihrer Adresse..."
                showCategories={false}
                className="w-full"
              />
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '0.75rem', 
        marginTop: '1.5rem',
        justifyContent: 'flex-end'
      }}>
        <button
          onClick={onSkip}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            background: 'transparent',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <X size={14} />
          Überspringen
        </button>

        <button
          onClick={() => {
            if (selectedOption === 'user') handleUseUserHomepoint();
            else if (selectedOption === 'suggested') handleUseSuggestedHomepoint();
            else if (selectedOption === 'custom') handleUseCustomLocation();
          }}
          disabled={loading || !selectedOption || (selectedOption === 'custom' && (!customLocation || !customCoordinates))}
          style={{
            padding: '0.5rem 1rem',
            background: (!selectedOption || (selectedOption === 'custom' && (!customLocation || !customCoordinates))) 
              ? 'var(--color-text-secondary)' 
              : 'var(--color-success)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: (loading || !selectedOption || (selectedOption === 'custom' && (!customLocation || !customCoordinates))) 
              ? 'not-allowed' 
              : 'pointer',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            opacity: (loading || !selectedOption || (selectedOption === 'custom' && (!customLocation || !customCoordinates))) 
              ? 0.6 
              : 1
          }}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full" style={{ width: '14px', height: '14px', borderBottomWidth: '2px', borderBottomColor: 'white', borderBottomStyle: 'solid' }} />
              Übernehmen...
            </>
          ) : (
            <>
              <Check size={14} />
              Startpunkt festlegen
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default HomepointSelector;