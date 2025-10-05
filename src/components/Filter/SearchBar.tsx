import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTripContext } from '../../contexts/TripContext';
import { useDestinationContext } from '../../contexts/DestinationContext';
import { useUIContext } from '../../contexts/UIContext';
import { 
  Search, 
  X,
  Clock,
  MapPin,
  Tag,
  Star,
  ChevronDown,
  Filter as FilterIcon
} from 'lucide-react';
import { getCategoryIcon, getCategoryLabel } from '../../utils';
import { Destination } from '../../types';

interface SearchBarProps {
  onToggleFilters?: () => void;
  showFilterButton?: boolean;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onToggleFilters,
  showFilterButton = true,
  placeholder = "Ziele, Orte, Tags durchsuchen...",
  size = 'md'
}) => {
  const { currentTrip } = useTripContext();
  const { destinations } = useDestinationContext();
  const { searchQuery, filters, updateUIState } = useUIContext();
  
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Get current trip destinations
  const currentDestinations = currentTrip 
    ? destinations.filter(dest => currentTrip.destinations.includes(dest.id))
    : [];

  // Generate search suggestions
  const searchSuggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];

    const query = searchQuery.toLowerCase();
    const suggestions: Array<{
      type: 'destination' | 'location' | 'tag' | 'category';
      value: string;
      label: string;
      destination?: Destination;
      count?: number;
    }> = [];

    // Destination name matches
    currentDestinations.forEach(dest => {
      if (dest.name.toLowerCase().includes(query)) {
        suggestions.push({
          type: 'destination',
          value: dest.name,
          label: dest.name,
          destination: dest
        });
      }
    });

    // Location matches
    const uniqueLocations = new Set<string>();
    currentDestinations.forEach(dest => {
      if (dest.location.toLowerCase().includes(query)) {
        const locationParts = dest.location.split(',');
        const city = locationParts[locationParts.length - 1]?.trim();
        if (city && !uniqueLocations.has(city)) {
          uniqueLocations.add(city);
          const count = currentDestinations.filter(d => 
            d.location.toLowerCase().includes(city.toLowerCase())
          ).length;
          suggestions.push({
            type: 'location',
            value: city,
            label: `📍 ${city}`,
            count
          });
        }
      }
    });

    // Tag matches
    const allTags = new Set<string>();
    currentDestinations.forEach(dest => {
      dest.tags.forEach(tag => {
        if (tag.toLowerCase().includes(query) && !allTags.has(tag)) {
          allTags.add(tag);
          const count = currentDestinations.filter(d => d.tags.includes(tag)).length;
          suggestions.push({
            type: 'tag',
            value: tag,
            label: `#${tag}`,
            count
          });
        }
      });
    });

    // Category matches
    Object.values(currentDestinations.reduce((acc, dest) => {
      const categoryLabel = getCategoryLabel(dest.category);
      if (categoryLabel.toLowerCase().includes(query) && !acc[dest.category]) {
        const count = currentDestinations.filter(d => d.category === dest.category).length;
        acc[dest.category] = {
          type: 'category' as const,
          value: dest.category,
          label: `${getCategoryIcon(dest.category)} ${categoryLabel}`,
          count
        };
      }
      return acc;
    }, {} as Record<string, any>)).forEach(suggestion => suggestions.push(suggestion));

    return suggestions
      .slice(0, 8) // Limit to 8 suggestions
      .sort((a, b) => {
        // Sort by relevance: exact matches first, then by count
        if (a.value.toLowerCase() === query) return -1;
        if (b.value.toLowerCase() === query) return 1;
        return (b.count || 0) - (a.count || 0);
      });
  }, [searchQuery, currentDestinations]);

  const handleInputChange = (value: string) => {
    updateUIState({ searchQuery: value });
    setShowSuggestions(value.length > 1);
    setSelectedSuggestion(-1);
  };

  const handleSuggestionSelect = (suggestion: typeof searchSuggestions[0]) => {
    if (suggestion.type === 'destination') {
      updateUIState({ searchQuery: suggestion.value });
    } else if (suggestion.type === 'location') {
      updateUIState({ searchQuery: suggestion.value });
    } else if (suggestion.type === 'tag') {
      // Add tag to filter instead of search query
      const currentTags = filters.tags || [];
      if (!currentTags.includes(suggestion.value)) {
        updateUIState({ 
          filters: { 
            ...filters, 
            tags: [...currentTags, suggestion.value] 
          },
          searchQuery: ''
        });
      }
    } else if (suggestion.type === 'category') {
      // Add category to filter
      const currentCategories = filters.category || [];
      if (!currentCategories.includes(suggestion.value as any)) {
        updateUIState({ 
          filters: { 
            ...filters, 
            category: [...currentCategories, suggestion.value as any] 
          },
          searchQuery: ''
        });
      }
    }
    
    setShowSuggestions(false);
    setSelectedSuggestion(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || searchSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev < searchSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestion(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestion >= 0) {
          handleSuggestionSelect(searchSuggestions[selectedSuggestion]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestion(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleClear = () => {
    updateUIState({ searchQuery: '' });
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedSuggestion(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sizeStyles = {
    sm: {
      container: 'min-h-[40px]',
      input: 'text-sm py-2 px-3',
      button: 'p-2',
      icon: 16
    },
    md: {
      container: 'min-h-[48px]',
      input: 'text-base py-3 px-4',
      button: 'p-2.5',
      icon: 18
    },
    lg: {
      container: 'min-h-[56px]',
      input: 'text-lg py-4 px-5',
      button: 'p-3',
      icon: 20
    }
  };

  const currentSize = sizeStyles[size];

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Search Input Container */}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        background: 'white',
        border: isFocused ? '2px solid #3b82f6' : '1px solid #e5e7eb',
        borderRadius: '12px',
        transition: 'all 0.2s',
        boxShadow: isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        minHeight: size === 'sm' ? '40px' : size === 'lg' ? '56px' : '48px'
      }}>
        
        {/* Search Icon */}
        <div style={{
          position: 'absolute',
          left: size === 'sm' ? '12px' : size === 'lg' ? '20px' : '16px',
          color: isFocused ? '#3b82f6' : '#6b7280',
          transition: 'color 0.2s'
        }}>
          <Search size={currentSize.icon} />
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            if (searchQuery.length > 1) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: size === 'sm' ? '0.875rem' : size === 'lg' ? '1.125rem' : '1rem',
            color: '#1f2937',
            paddingLeft: size === 'sm' ? '44px' : size === 'lg' ? '56px' : '52px',
            paddingRight: size === 'sm' ? '80px' : size === 'lg' ? '100px' : '90px',
            paddingTop: size === 'sm' ? '8px' : size === 'lg' ? '16px' : '12px',
            paddingBottom: size === 'sm' ? '8px' : size === 'lg' ? '16px' : '12px'
          }}
        />

        {/* Right Side Actions */}
        <div style={{
          position: 'absolute',
          right: size === 'sm' ? '8px' : size === 'lg' ? '16px' : '12px',
          display: 'flex',
          alignItems: 'center',
          gap: size === 'sm' ? '4px' : '8px'
        }}>
          
          {/* Clear Button */}
          {searchQuery && (
            <button
              onClick={handleClear}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
                padding: size === 'sm' ? '4px' : '6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#f3f4f6'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <X size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
            </button>
          )}

          {/* Filter Button */}
          {showFilterButton && (
            <button
              onClick={onToggleFilters}
              style={{
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                color: '#6b7280',
                padding: size === 'sm' ? '6px' : size === 'lg' ? '10px' : '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#e5e7eb';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <FilterIcon size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
            </button>
          )}
        </div>
      </div>

      {/* Search Suggestions */}
      {showSuggestions && searchSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            marginTop: '4px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 50,
            maxHeight: '300px',
            overflowY: 'auto'
          }}
        >
          <div style={{
            padding: '8px',
            fontSize: '0.75rem',
            color: '#6b7280',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderBottom: '1px solid #f3f4f6'
          }}>
            Vorschläge
          </div>

          {searchSuggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.value}`}
              onClick={() => handleSuggestionSelect(suggestion)}
              style={{
                width: '100%',
                background: selectedSuggestion === index ? '#f0f9ff' : 'transparent',
                border: 'none',
                padding: '12px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.875rem',
                color: selectedSuggestion === index ? '#0369a1' : '#374151',
                transition: 'all 0.2s',
                textAlign: 'left'
              }}
              onMouseOver={(e) => {
                if (selectedSuggestion !== index) {
                  e.currentTarget.style.background = '#f9fafb';
                }
              }}
              onMouseOut={(e) => {
                if (selectedSuggestion !== index) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: selectedSuggestion === index ? '#0369a1' : '#f3f4f6',
                  color: selectedSuggestion === index ? 'white' : '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem'
                }}>
                  {suggestion.type === 'destination' ? <MapPin size={12} /> :
                   suggestion.type === 'location' ? <MapPin size={12} /> :
                   suggestion.type === 'tag' ? <Tag size={12} /> :
                   suggestion.type === 'category' ? getCategoryIcon(suggestion.value as any) : 
                   <Search size={12} />}
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '500' }}>
                    {suggestion.label}
                  </div>
                  {suggestion.destination && (
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                      {suggestion.destination.location}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {suggestion.count && (
                  <span style={{
                    background: selectedSuggestion === index ? '#0369a1' : '#e5e7eb',
                    color: selectedSuggestion === index ? 'white' : '#6b7280',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    {suggestion.count}
                  </span>
                )}
                {suggestion.type !== 'destination' && (
                  <div style={{
                    color: selectedSuggestion === index ? '#0369a1' : '#d1d5db',
                    fontSize: '0.75rem'
                  }}>
                    ↵
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Search Stats */}
      {searchQuery && currentDestinations.length > 0 && (
        <div style={{
          marginTop: '8px',
          fontSize: '0.75rem',
          color: '#6b7280',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Clock size={12} />
          <span>
            {currentDestinations.filter(dest => {
              const searchTerm = searchQuery.toLowerCase();
              return dest.name.toLowerCase().includes(searchTerm) ||
                     dest.location.toLowerCase().includes(searchTerm) ||
                     dest.notes?.toLowerCase().includes(searchTerm) ||
                     dest.tags.some(tag => tag.toLowerCase().includes(searchTerm));
            }).length} von {currentDestinations.length} Zielen gefunden
          </span>
        </div>
      )}
    </div>
  );
};

export default SearchBar;