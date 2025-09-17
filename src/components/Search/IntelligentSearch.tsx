import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { Destination, Trip } from '../../types';
import { Search, MapPin, Globe, Users, Calendar, ArrowRight } from 'lucide-react';
import { formatDate, getCategoryIcon } from '../../utils';

interface SearchSuggestion {
  type: 'destination' | 'trip';
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  data: Destination | Trip;
}

interface IntelligentSearchProps {
  value: string;
  onChange: (value: string) => void;
  onNavigate: (type: 'destination' | 'trip', id: string) => void;
  onShowSearchPage: (query: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  isMobile?: boolean;
}

const IntelligentSearch: React.FC<IntelligentSearchProps> = ({
  value,
  onChange,
  onNavigate,
  onShowSearchPage,
  placeholder = "Suchen...",
  className,
  style,
  isMobile = false
}) => {
  const { destinations, publicTrips, currentTrip, loadPublicTrips } = useSupabaseApp();
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load public trips on mount
  useEffect(() => {
    if (publicTrips.length === 0) {
      loadPublicTrips();
    }
  }, [loadPublicTrips, publicTrips.length]);

  // Generate suggestions based on search query
  const generateSuggestions = useCallback((query: string): SearchSuggestion[] => {
    if (!query.trim()) return [];

    const searchTerm = query.toLowerCase();
    const results: SearchSuggestion[] = [];

    // Search in destinations
    const matchingDestinations = destinations
      .filter(dest => 
        dest.name.toLowerCase().includes(searchTerm) ||
        dest.location.toLowerCase().includes(searchTerm) ||
        dest.tags?.some(tag => tag.toLowerCase().includes(searchTerm)) ||
        dest.notes?.toLowerCase().includes(searchTerm)
      )
      .slice(0, 3) // Limit to 3 destinations
      .map(dest => ({
        type: 'destination' as const,
        id: dest.id,
        title: dest.name,
        subtitle: `${dest.location} • ${formatDate(dest.startDate)}`,
        icon: getCategoryIcon(dest.category),
        data: dest
      }));

    results.push(...matchingDestinations);

    // Search in public trips
    const matchingTrips = publicTrips
      .filter(trip => 
        trip.name.toLowerCase().includes(searchTerm) ||
        trip.description?.toLowerCase().includes(searchTerm) ||
        trip.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
      )
      .slice(0, 3) // Limit to 3 trips
      .map(trip => ({
        type: 'trip' as const,
        id: trip.id,
        title: trip.name,
        subtitle: `${trip.destinations?.length || 0} Ziele • ${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}`,
        icon: '🧳',
        data: trip
      }));

    results.push(...matchingTrips);

    return results.slice(0, 6); // Maximum 6 total suggestions
  }, [destinations, publicTrips]);

  // Update suggestions when query changes
  useEffect(() => {
    const newSuggestions = generateSuggestions(value);
    setSuggestions(newSuggestions);
    setHighlightedIndex(-1);
  }, [value, generateSuggestions]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
  };

  // Handle key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
        return;
      }
      if (e.key === 'Enter' && value.trim()) {
        onShowSearchPage(value);
        return;
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          const suggestion = suggestions[highlightedIndex];
          handleSuggestionSelect(suggestion);
        } else if (value.trim()) {
          onShowSearchPage(value);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    onChange(suggestion.title);
    setIsOpen(false);
    setHighlightedIndex(-1);
    onNavigate(suggestion.type, suggestion.id);
  };

  // Handle focus/blur
  const handleFocus = () => {
    if (value.trim()) {
      setIsOpen(true);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Delay closing to allow clicks on suggestions
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }, 150);
  };

  return (
    <div className="relative" style={{ width: '100%' }}>
      {/* Search Icon */}
      <Search
        size={isMobile ? 16 : 18}
        style={{
          position: 'absolute',
          left: isMobile ? 'var(--space-sm)' : 'var(--space-md)',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--color-text-secondary)',
          zIndex: 2
        }}
      />
      
      {/* Input Field */}
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={className}
        style={{
          ...style,
          paddingLeft: isMobile ? '2.5rem' : '3rem',
        }}
      />

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            marginTop: '4px',
            overflow: 'hidden'
          }}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.type}-${suggestion.id}`}
              onClick={() => handleSuggestionSelect(suggestion)}
              style={{
                padding: 'var(--space-md)',
                cursor: 'pointer',
                borderBottom: index < suggestions.length - 1 ? '1px solid var(--color-border)' : 'none',
                background: index === highlightedIndex ? 'var(--color-bg-secondary)' : 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {/* Icon */}
              <div style={{
                fontSize: '1.2rem',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {suggestion.icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--text-sm)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {suggestion.title}
                </div>
                <div style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {suggestion.subtitle}
                </div>
              </div>

              {/* Type Badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-secondary)'
              }}>
                {suggestion.type === 'destination' ? <MapPin size={12} /> : <Globe size={12} />}
                {suggestion.type === 'destination' ? 'Ziel' : 'Reise'}
              </div>
            </div>
          ))}
          
          {/* Show All Results Option */}
          {value.trim() && (
            <div
              onClick={() => onShowSearchPage(value)}
              style={{
                padding: 'var(--space-md)',
                cursor: 'pointer',
                background: 'var(--color-bg-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-sm)',
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={() => setHighlightedIndex(-1)}
            >
              Alle Ergebnisse für "{value}" anzeigen
              <ArrowRight size={14} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IntelligentSearch;