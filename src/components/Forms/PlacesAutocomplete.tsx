import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import { simplePlacesService, PlacePrediction, PlaceResult } from '../../services/simplePlacesService';
import { Coordinates } from '../../types';

interface PlacesAutocompleteProps {
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
}

const PlacesAutocomplete: React.FC<PlacesAutocompleteProps> = ({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Suche nach Orten...",
  disabled = false,
  className = "",
  style = {},
  searchNear,
  searchRadius = 50000,
  types,
  clearOnSelect = false
}) => {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search function
  const debouncedSearch = useCallback(async (query: string) => {
    // Show suggestions even for empty input or single character
    if (query.length === 0) {
      // Show sample suggestions when field is focused but empty
      const sampleResults = await simplePlacesService.searchPlaces('', {
        location: searchNear,
        radius: searchRadius,
        types
      });
      setPredictions(sampleResults.slice(0, 5));
      setIsOpen(sampleResults.length > 0);
      setSelectedIndex(-1);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await simplePlacesService.searchPlaces(query, {
        location: searchNear,
        radius: searchRadius,
        types
      });
      
      setPredictions(results);
      setIsOpen(results.length > 0);
      setSelectedIndex(-1);
    } catch (err) {
      console.error('Places search error:', err);
      setError('Suche fehlgeschlagen');
      setPredictions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [searchNear, searchRadius, types]);

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
      const placeDetails = await simplePlacesService.getPlaceDetails(prediction.place_id);
      if (placeDetails) {
        onPlaceSelect(placeDetails);
        
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
  }, [onPlaceSelect, onChange, clearOnSelect]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < predictions.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && predictions[selectedIndex]) {
          handlePlaceSelect(predictions[selectedIndex]);
        }
        break;
      
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  }, [isOpen, predictions, selectedIndex, handlePlaceSelect]);

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
          onFocus={() => {
            // Always show suggestions on focus
            if (predictions.length > 0) {
              setIsOpen(true);
            } else {
              // Trigger search to show sample results
              debouncedSearch(value);
            }
          }}
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
            backgroundColor: disabled ? '#f9fafb' : 'white',
            ...style
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

      {isOpen && (predictions.length > 0 || isLoading) && (
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
            maxHeight: '300px',
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

          {predictions.map((prediction, index) => {
            const icon = simplePlacesService.getPlaceTypeIcon(prediction.types);
            const mainText = simplePlacesService.formatPlaceDisplayName(prediction);
            const secondaryText = simplePlacesService.formatPlaceSecondaryText(prediction);
            
            return (
              <div
                key={prediction.place_id}
                onClick={() => handlePlaceSelect(prediction)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: index < predictions.length - 1 ? '1px solid #f3f4f6' : 'none',
                  backgroundColor: selectedIndex === index ? '#f8fafc' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
                onMouseEnter={() => setSelectedIndex(index)}
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

export default PlacesAutocomplete;