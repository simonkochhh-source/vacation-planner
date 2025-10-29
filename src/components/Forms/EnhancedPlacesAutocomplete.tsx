import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, X, Clock } from 'lucide-react';
import { googleMapsService, PlacePrediction, PlaceResult } from '../../services/googleMapsService';
import { Coordinates } from '../../types';

interface EnhancedPlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: PlaceResult) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  searchNear?: Coordinates;
  searchRadius?: number;
  types?: string[];
  clearOnSelect?: boolean;
  showRecentSearches?: boolean;
}

const EnhancedPlacesAutocomplete: React.FC<EnhancedPlacesAutocompleteProps> = ({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Suche nach Orten...',
  disabled = false,
  className = '',
  style = {},
  searchNear,
  searchRadius = 50000,
  types,
  clearOnSelect = false,
  showRecentSearches = true
}) => {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [recentSearches, setRecentSearches] = useState<PlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    if (showRecentSearches) {
      try {
        const saved = localStorage.getItem('vacation-planner-recent-places');
        if (saved) {
          setRecentSearches(JSON.parse(saved));
        }
      } catch (error) {
        console.warn('Failed to load recent searches:', error);
      }
    }
  }, [showRecentSearches]);

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((place: PlaceResult) => {
    if (!showRecentSearches) return;

    try {
      const updated = [
        place,
        ...recentSearches.filter(item => item.place_id !== place.place_id)
      ].slice(0, 5); // Keep only 5 recent searches

      setRecentSearches(updated);
      localStorage.setItem('vacation-planner-recent-places', JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save recent search:', error);
    }
  }, [recentSearches, showRecentSearches]);

  // Debounced search function
  const debouncedSearch = useCallback(async (query: string) => {
    if (query.length === 0) {
      setPredictions([]);
      setIsOpen(recentSearches.length > 0);
      setSelectedIndex(-1);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await googleMapsService.searchPlaces(query, {
        location: searchNear,
        radius: searchRadius,
        types,
        componentRestrictions: { country: 'de' }
      });
      
      setPredictions(results);
      setIsOpen(results.length > 0 || recentSearches.length > 0);
      setSelectedIndex(-1);
    } catch (err) {
      console.error('Places search error:', err);
      setError('Suche fehlgeschlagen');
      setPredictions([]);
      setIsOpen(recentSearches.length > 0);
    } finally {
      setIsLoading(false);
    }
  }, [searchNear, searchRadius, types, recentSearches.length]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      debouncedSearch(newValue);
    }, 300);
  }, [onChange, debouncedSearch]);

  // Handle place selection
  const handlePlaceSelect = useCallback(async (prediction: PlacePrediction) => {
    setIsLoading(true);
    setIsOpen(false);

    try {
      const placeDetails = await googleMapsService.getPlaceDetails(prediction.place_id);
      if (placeDetails) {
        onPlaceSelect(placeDetails);
        saveRecentSearch(placeDetails);
        
        if (clearOnSelect) {
          onChange('');
        } else {
          onChange(placeDetails.name);
        }
      }
    } catch (err) {
      console.error('Error getting place details:', err);
      setError('Fehler beim Laden der Ortsdetails');
    } finally {
      setIsLoading(false);
    }
  }, [onPlaceSelect, onChange, clearOnSelect, saveRecentSearch]);

  // Handle recent search selection
  const handleRecentSelect = useCallback((place: PlaceResult) => {
    setIsOpen(false);
    onPlaceSelect(place);
    
    if (clearOnSelect) {
      onChange('');
    } else {
      onChange(place.name);
    }
  }, [onPlaceSelect, onChange, clearOnSelect]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const totalItems = predictions.length + (recentSearches.length > 0 && value.length === 0 ? recentSearches.length : 0);
    
    if (!isOpen || totalItems === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => prev < totalItems - 1 ? prev + 1 : prev);
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          if (value.length === 0 && selectedIndex < recentSearches.length) {
            // Recent search selected
            handleRecentSelect(recentSearches[selectedIndex]);
          } else if (predictions.length > 0) {
            // Prediction selected
            const predictionIndex = value.length === 0 
              ? selectedIndex - recentSearches.length 
              : selectedIndex;
            if (predictionIndex >= 0 && predictions[predictionIndex]) {
              handlePlaceSelect(predictions[predictionIndex]);
            }
          }
        }
        break;
      
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  }, [isOpen, predictions, recentSearches, selectedIndex, value.length, handlePlaceSelect, handleRecentSelect]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear button handler
  const handleClear = useCallback(() => {
    onChange('');
    setPredictions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  }, [onChange]);

  // Focus handler
  const handleFocus = useCallback(() => {
    if (value.length === 0 && recentSearches.length > 0) {
      setIsOpen(true);
    } else if (predictions.length > 0) {
      setIsOpen(true);
    }
  }, [value.length, recentSearches.length, predictions.length]);

  return (
    <div style={{ position: 'relative', ...style }} className={className}>
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center'
      }}>
        <Search 
          size={18} 
          style={{
            position: 'absolute',
            left: '12px',
            color: '#6b7280',
            zIndex: 1
          }}
        />
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '0.75rem 2.5rem 0.75rem 2.5rem',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '1rem',
            outline: 'none',
            boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
            borderColor: isOpen ? '#3b82f6' : '#e5e7eb',
            backgroundColor: disabled ? '#f9fafb' : 'white'
          }}
        />

        {value && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '12px',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: 'none',
              cursor: 'pointer',
              padding: '2px',
              borderRadius: '4px',
              color: '#6b7280',
              zIndex: 1
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {error && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          padding: '8px 12px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          color: '#dc2626',
          fontSize: '0.875rem',
          zIndex: 1000
        }}>
          {error}
        </div>
      )}

      {isOpen && (predictions.length > 0 || recentSearches.length > 0 || isLoading) && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            maxHeight: '400px',
            overflowY: 'auto',
            zIndex: 1000
          }}
        >
          {isLoading && (
            <div style={{
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #e5e7eb',
                borderTop: '2px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Suche läuft...
            </div>
          )}

          {/* Recent Searches */}
          {value.length === 0 && recentSearches.length > 0 && (
            <>
              <div style={{
                padding: '8px 16px',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#6b7280',
                backgroundColor: '#f9fafb',
                borderBottom: '1px solid #f3f4f6'
              }}>
                KÜRZLICH GESUCHT
              </div>
              {recentSearches.map((place, index) => (
                <div
                  key={`recent-${place.place_id}`}
                  onClick={() => handleRecentSelect(place)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: index < recentSearches.length - 1 ? '1px solid #f3f4f6' : 'none',
                    backgroundColor: selectedIndex === index ? '#f8fafc' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <Clock size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: '500',
                      color: '#111827',
                      fontSize: '0.9rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {place.name}
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#6b7280',
                      marginTop: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {place.formatted_address}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Search Results */}
          {predictions.length > 0 && (
            <>
              {value.length === 0 && recentSearches.length > 0 && (
                <div style={{
                  padding: '8px 16px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#6b7280',
                  backgroundColor: '#f9fafb',
                  borderBottom: '1px solid #f3f4f6'
                }}>
                  SUCHERGEBNISSE
                </div>
              )}
              {predictions.map((prediction, index) => {
                const displayIndex = value.length === 0 ? index + recentSearches.length : index;
                const icon = googleMapsService.getPlaceTypeIcon(prediction.types);
                const mainText = googleMapsService.formatPlaceDisplayName(prediction);
                const secondaryText = googleMapsService.formatPlaceSecondaryText(prediction);
                
                return (
                  <div
                    key={prediction.place_id}
                    onClick={() => handlePlaceSelect(prediction)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: index < predictions.length - 1 ? '1px solid #f3f4f6' : 'none',
                      backgroundColor: selectedIndex === displayIndex ? '#f8fafc' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                    onMouseEnter={() => setSelectedIndex(displayIndex)}
                  >
                    <span style={{ fontSize: '18px' }}>{icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: '500',
                        color: '#111827',
                        fontSize: '0.9rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {mainText}
                      </div>
                      {secondaryText && (
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#6b7280',
                          marginTop: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {secondaryText}
                        </div>
                      )}
                    </div>
                    <MapPin size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                  </div>
                );
              })}
            </>
          )}

          {/* No results */}
          {!isLoading && predictions.length === 0 && value.length > 0 && (
            <div style={{
              padding: '12px 16px',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>
              Keine Ergebnisse für "{value}" gefunden
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default EnhancedPlacesAutocomplete;