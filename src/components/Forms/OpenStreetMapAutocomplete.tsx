import React, { useState, useCallback, useEffect, useRef } from 'react';
import { openStreetMapService, PlacePrediction } from '../../services/openStreetMapService';
import { Coordinates } from '../../types';

interface OpenStreetMapAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: PlacePrediction) => void;
  placeholder?: string;
  searchNear?: Coordinates;
  searchRadius?: number;
  className?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

const OpenStreetMapAutocomplete: React.FC<OpenStreetMapAutocompleteProps> = ({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Nach Orten suchen...",
  searchNear,
  searchRadius = 50000, // 50km default
  className = "",
  disabled = false,
  style
}) => {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<PlacePrediction[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('osm-recent-searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.warn('Failed to load recent searches:', error);
    }
  }, []);

  // Save recent search
  const saveRecentSearch = useCallback((place: PlacePrediction) => {
    try {
      const updated = [
        place,
        ...recentSearches.filter(p => p.place_id !== place.place_id)
      ].slice(0, 5); // Keep only last 5 searches
      
      setRecentSearches(updated);
      localStorage.setItem('osm-recent-searches', JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save recent search:', error);
    }
  }, [recentSearches]);

  // Debounced search
  const debouncedSearch = useCallback(async (query: string) => {
    console.log('OpenStreetMapAutocomplete: Starting search for:', query);
    if (!query.trim()) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('OpenStreetMapAutocomplete: Calling searchPlaces API...');
      const results = await openStreetMapService.searchPlaces(query, {
        location: searchNear,
        radius: searchRadius
      });
      console.log('OpenStreetMapAutocomplete: API returned', results.length, 'results');
      
      // Filter out duplicates and combine with recent searches if query is short
      const filteredResults = results.filter((result, index, self) => 
        index === self.findIndex(r => r.place_id === result.place_id)
      );
      
      // If query is short, add relevant recent searches
      if (query.length <= 3 && recentSearches.length > 0) {
        const relevantRecent = recentSearches.filter(recent => {
          const searchTerms = query.toLowerCase();
          return recent.structured_formatting.main_text.toLowerCase().includes(searchTerms) ||
                 recent.structured_formatting.secondary_text?.toLowerCase().includes(searchTerms);
        });
        
        // Merge and deduplicate
        const combined = [...relevantRecent, ...filteredResults];
        const unique = combined.filter((item, index, self) => 
          index === self.findIndex(i => i.place_id === item.place_id)
        );
        
        setPredictions(unique.slice(0, 8));
      } else {
        setPredictions(filteredResults);
      }
    } catch (error) {
      console.warn('Search failed:', error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchNear, searchRadius, recentSearches]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setHighlightedIndex(-1);
    
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Debounce search
    debounceRef.current = setTimeout(() => {
      debouncedSearch(newValue);
    }, 300);
  }, [onChange, debouncedSearch]);

  // Handle place selection
  const handlePlaceSelect = useCallback((place: PlacePrediction) => {
    onChange(place.structured_formatting.main_text);
    onPlaceSelect(place);
    saveRecentSearch(place);
    setPredictions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, [onChange, onPlaceSelect, saveRecentSearch]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || predictions.length === 0) {
      if (e.key === 'ArrowDown' && !isOpen) {
        setIsOpen(true);
        debouncedSearch(value);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < predictions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < predictions.length) {
          handlePlaceSelect(predictions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setPredictions([]);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  }, [isOpen, predictions, highlightedIndex, handlePlaceSelect, debouncedSearch, value]);

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsOpen(true);
    if (!value.trim() && recentSearches.length > 0) {
      setPredictions(recentSearches);
    } else if (value.trim()) {
      debouncedSearch(value);
    }
  }, [value, recentSearches, debouncedSearch]);

  // Handle blur
  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Delay closing to allow clicks on predictions
    setTimeout(() => {
      setIsOpen(false);
      setPredictions([]);
      setHighlightedIndex(-1);
    }, 150);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : ''
        } ${className}`}
        style={style}
      />
      
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <svg className="animate-spin h-4 w-4 text-gray-400" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      )}

      {isOpen && predictions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto mt-1"
        >
          {predictions.map((prediction, index) => {
            const isRecent = recentSearches.some(recent => recent.place_id === prediction.place_id);
            const isHighlighted = index === highlightedIndex;
            
            return (
              <li
                key={prediction.place_id}
                className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                  isHighlighted ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => handlePlaceSelect(prediction)}
              >
                <div className="flex items-start space-x-3">
                  <div className="text-lg flex-shrink-0 mt-0.5">
                    {openStreetMapService.getPlaceTypeIcon(prediction.type, prediction.class)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {prediction.structured_formatting.main_text}
                      </p>
                      {isRecent && (
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                          Kürzlich
                        </span>
                      )}
                    </div>
                    {prediction.structured_formatting.secondary_text && (
                      <p className="text-sm text-gray-500 truncate mt-0.5">
                        {prediction.structured_formatting.secondary_text}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {isOpen && !isLoading && predictions.length === 0 && value.trim() && (
        <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 p-4">
          <p className="text-sm text-gray-500 text-center">
            Keine Orte gefunden für "{value}"
          </p>
        </div>
      )}
    </div>
  );
};

export default OpenStreetMapAutocomplete;