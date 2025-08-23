import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader, X } from 'lucide-react';
import { geocodingService, SearchLocation } from '../../services/geocoding';
import { Coordinates } from '../../types';

interface LocationSearchProps {
  value: string;
  onChange: (location: string, coordinates?: Coordinates) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}

const LocationSearch: React.FC<LocationSearchProps> = ({
  value,
  onChange,
  placeholder = "Ort oder Adresse eingeben...",
  disabled = false,
  error,
  label,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const [results, setResults] = useState<SearchLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update search query when value prop changes
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const performSearch = async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const validation = geocodingService.validateLocation(query);
    if (!validation.isValid) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const searchResults = await geocodingService.searchLocations(query, 8);
      setResults(searchResults);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setSearchQuery(newValue);
    onChange(newValue); // Update parent with text value
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce search
    timeoutRef.current = setTimeout(() => {
      performSearch(newValue);
    }, 300);

    if (newValue.length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setResults([]);
    }
  };

  const handleResultSelect = (result: SearchLocation) => {
    setSearchQuery(result.displayName);
    onChange(result.displayName, result.coordinates);
    setIsOpen(false);
    setResults([]);
    setSelectedIndex(-1);
    
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleResultSelect(results[selectedIndex]);
        }
        break;
      
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        if (inputRef.current) {
          inputRef.current.blur();
        }
        break;
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    onChange('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleFocus = () => {
    if (searchQuery.length >= 2 && results.length > 0) {
      setIsOpen(true);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={dropdownRef}>
      {/* Label */}
      {label && (
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '0.5rem'
        }}>
          {label}
          {required && <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>}
        </label>
      )}

      {/* Input Container */}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{
          position: 'absolute',
          left: '0.75rem',
          zIndex: 10,
          color: '#6b7280'
        }}>
          {isLoading ? (
            <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Search size={16} />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            paddingLeft: '2.5rem',
            paddingRight: searchQuery ? '2.5rem' : '0.75rem',
            paddingTop: '0.75rem',
            paddingBottom: '0.75rem',
            border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`,
            borderRadius: '8px',
            fontSize: '0.875rem',
            backgroundColor: disabled ? '#f9fafb' : 'white',
            color: disabled ? '#6b7280' : '#374151',
            outline: 'none',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            boxShadow: error 
              ? '0 0 0 3px rgba(239, 68, 68, 0.1)' 
              : 'none'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = error ? '#ef4444' : '#3b82f6';
            e.target.style.boxShadow = error 
              ? '0 0 0 3px rgba(239, 68, 68, 0.1)' 
              : '0 0 0 3px rgba(59, 130, 246, 0.1)';
            handleFocus();
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? '#ef4444' : '#d1d5db';
            e.target.style.boxShadow = error 
              ? '0 0 0 3px rgba(239, 68, 68, 0.1)' 
              : 'none';
          }}
        />

        {/* Clear Button */}
        {searchQuery && !disabled && (
          <button
            type="button"
            onClick={clearSearch}
            style={{
              position: 'absolute',
              right: '0.75rem',
              padding: '0.25rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              borderRadius: '4px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p style={{
          marginTop: '0.25rem',
          fontSize: '0.75rem',
          color: '#ef4444'
        }}>
          {error}
        </p>
      )}

      {/* Dropdown Results */}
      {isOpen && (results.length > 0 || isLoading) && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '0.25rem',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb',
          maxHeight: '300px',
          overflowY: 'auto',
          zIndex: 50
        }}>
          {isLoading && (
            <div style={{
              padding: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>
              <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Suche läuft...
            </div>
          )}

          {!isLoading && results.map((result, index) => (
            <button
              key={result.placeId}
              onClick={() => handleResultSelect(result)}
              style={{
                width: '100%',
                padding: '0.75rem',
                textAlign: 'left',
                border: 'none',
                backgroundColor: index === selectedIndex ? '#f0f9ff' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              onMouseOver={(e) => {
                if (index !== selectedIndex) {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }
              }}
              onMouseOut={(e) => {
                if (index !== selectedIndex) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div style={{
                fontSize: '1rem',
                marginTop: '0.125rem',
                flexShrink: 0
              }}>
                {geocodingService.getLocationTypeIcon(result.type)}
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.125rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {result.displayName}
                </div>
                
                {result.address && (
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {result.address}
                  </div>
                )}
              </div>

              <div style={{
                fontSize: '0.75rem',
                color: '#9ca3af',
                flexShrink: 0,
                marginTop: '0.125rem'
              }}>
                <MapPin size={12} />
              </div>
            </button>
          ))}

          {!isLoading && results.length === 0 && searchQuery.length >= 2 && (
            <div style={{
              padding: '0.75rem',
              color: '#6b7280',
              fontSize: '0.875rem',
              textAlign: 'center'
            }}>
              Keine Orte gefunden für "{searchQuery}"
            </div>
          )}
        </div>
      )}

      {/* Spinning animation CSS */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default LocationSearch;