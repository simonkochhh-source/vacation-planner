import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search, MapPin, Clock, X, Star, Navigation, Home, Map } from 'lucide-react';
import { openStreetMapService, PlacePrediction } from '../../services/openStreetMapService';
import { Coordinates } from '../../types';

interface EnhancedPlaceSearchProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: PlacePrediction & { formattedAddress: string; distance?: string }) => void;
  placeholder?: string;
  searchNear?: Coordinates;
  searchRadius?: number;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  showCategories?: boolean;
  autoFocus?: boolean;
}

interface SearchCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  tags: string[];
  color: string;
}

const searchCategories: SearchCategory[] = [
  {
    id: 'accommodation',
    name: 'Unterkünfte',
    icon: <Star size={16} />,
    tags: ['hotel', 'hostel', 'guest_house', 'apartment'],
    color: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'camping',
    name: 'Camping',
    icon: <MapPin size={16} />,
    tags: ['camp_site', 'camping', 'campground'],
    color: 'bg-green-100 text-green-800'
  },
  {
    id: 'restaurant',
    name: 'Restaurants',
    icon: <Star size={16} />,
    tags: ['restaurant', 'cafe', 'bar', 'pub', 'fast_food'],
    color: 'bg-orange-100 text-orange-800'
  },
  {
    id: 'attraction',
    name: 'Sehenswürdigkeiten',
    icon: <Star size={16} />,
    tags: ['attraction', 'museum', 'castle', 'monument', 'viewpoint'],
    color: 'bg-purple-100 text-purple-800'
  },
  {
    id: 'fuel',
    name: 'Tankstellen',
    icon: <Navigation size={16} />,
    tags: ['fuel', 'gas_station'],
    color: 'bg-red-100 text-red-800'
  },
  {
    id: 'transport',
    name: 'Transport',
    icon: <Navigation size={16} />,
    tags: ['airport', 'train_station', 'bus_station', 'subway'],
    color: 'bg-gray-100 text-gray-800'
  }
];

const EnhancedPlaceSearch: React.FC<EnhancedPlaceSearchProps> = ({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Suche nach Orten, Hotels, Restaurants, Sehenswürdigkeiten...",
  searchNear,
  searchRadius = 50000,
  className = "",
  disabled = false,
  showCategories = false,
  autoFocus = false
}) => {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<PlacePrediction[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Auto focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Load recent searches
  useEffect(() => {
    try {
      const saved = localStorage.getItem('enhanced-place-search-recent');
      if (saved) {
        const parsed = JSON.parse(saved);
        setRecentSearches(parsed.slice(0, 5)); // Limit to 5 recent searches
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
      ].slice(0, 5);
      
      setRecentSearches(updated);
      localStorage.setItem('enhanced-place-search-recent', JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save recent search:', error);
    }
  }, [recentSearches]);

  // Calculate distance if searchNear is provided
  const calculateDistance = useCallback((coordinates: Coordinates): string | undefined => {
    if (!searchNear) return undefined;
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = (coordinates.lat - searchNear.lat) * Math.PI / 180;
    const dLon = (coordinates.lng - searchNear.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(searchNear.lat * Math.PI / 180) * Math.cos(coordinates.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    } else {
      return `${distance.toFixed(1)}km`;
    }
  }, [searchNear]);

  // Simplified search for addresses and places
  const performSearch = useCallback(async (query: string, categoryFilter?: string) => {
    
    if (!query.trim()) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    
    try {
      const searchQuery = query.trim();

      const results = await openStreetMapService.searchPlaces(searchQuery, {
        location: searchNear,
        radius: searchRadius,
        limit: 15,
        addressdetails: true,
        countrycodes: 'de,at,ch,fr,it,es,nl,be,lu,pl,cz,dk,se,no' // European countries
      });


      // Sort by distance if near location is provided, otherwise by importance
      let sortedResults = results;
      if (searchNear) {
        sortedResults.sort((a, b) => {
          const distanceA = calculateDistance(a.coordinates);
          const distanceB = calculateDistance(b.coordinates);
          if (distanceA && distanceB) {
            const numA = parseFloat(distanceA.replace(/[km]/g, ''));
            const numB = parseFloat(distanceB.replace(/[km]/g, ''));
            return numA - numB;
          }
          return 0;
        });
      } else {
        // Sort by importance if no location reference
        sortedResults.sort((a, b) => (b.importance || 0) - (a.importance || 0));
      }

      setPredictions(sortedResults.slice(0, 10)); // Show more results
    } catch (error) {
      console.error('🚨 Search error:', error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchNear, searchRadius, calculateDistance]);

  // Debounced search
  const debouncedSearch = useCallback((query: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  }, [performSearch]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setHighlightedIndex(-1);
    
    if (newValue.trim()) {
      setIsOpen(true);
      debouncedSearch(newValue);
    } else {
      setIsOpen(false);
      setPredictions([]);
    }
  }, [onChange, debouncedSearch]);

  // Handle place selection
  const handlePlaceSelect = useCallback((place: PlacePrediction) => {
    const distance = calculateDistance(place.coordinates);
    const enhancedPlace = {
      ...place,
      formattedAddress: place.structured_formatting.secondary_text || place.display_name,
      distance
    };
    
    onChange(place.structured_formatting.main_text);
    onPlaceSelect(enhancedPlace);
    saveRecentSearch(place);
    setIsOpen(false);
    setPredictions([]);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  }, [onChange, onPlaceSelect, calculateDistance, saveRecentSearch]);

  // Handle category selection (simplified - no filtering)
  const handleCategorySelect = useCallback((categoryId: string) => {
    if (selectedCategory === categoryId) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(categoryId);
    }
  }, [selectedCategory]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const totalItems = predictions.length + (recentSearches.length > 0 && !value.trim() ? recentSearches.length : 0);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          if (!value.trim() && recentSearches.length > 0) {
            setPredictions([]);
          } else if (value.trim()) {
            debouncedSearch(value);
          }
        } else {
          setHighlightedIndex(prev => prev < totalItems - 1 ? prev + 1 : prev);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          const allItems = !value.trim() && recentSearches.length > 0 
            ? recentSearches 
            : predictions;
          if (highlightedIndex < allItems.length) {
            handlePlaceSelect(allItems[highlightedIndex]);
          }
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setPredictions([]);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  }, [isOpen, predictions, recentSearches, highlightedIndex, value, handlePlaceSelect, debouncedSearch]);

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsOpen(true);
    if (!value.trim() && recentSearches.length > 0) {
      setPredictions([]);
    } else if (value.trim()) {
      debouncedSearch(value);
    }
  }, [value, recentSearches, debouncedSearch]);

  // Handle blur
  const handleBlur = useCallback((e: React.FocusEvent) => {
    
    // Check if the blur is due to clicking inside the dropdown
    if (containerRef.current && containerRef.current.contains(e.relatedTarget as Node)) {
      return;
    }
    
    setTimeout(() => {
      setIsOpen(false);
      setPredictions([]);
      setHighlightedIndex(-1);
    }, 300); // Längere Verzögerung
  }, [isOpen]);

  // Clear search
  const clearSearch = useCallback(() => {
    onChange('');
    setPredictions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  }, [onChange]);

  // Get place type icon with enhanced categorization
  const getEnhancedPlaceIcon = useCallback((prediction: PlacePrediction): React.ReactNode => {
    const { type, class: placeClass } = prediction;
    const typeKey = type.toLowerCase();
    const classKey = placeClass.toLowerCase();
    
    // Tourism & Attractions
    if (['attraction', 'museum', 'castle', 'monument', 'viewpoint', 'artwork'].includes(typeKey) ||
        ['tourism'].includes(classKey)) {
      return <Star size={18} className="text-purple-600" />;
    }
    // Accommodation
    if (['hotel', 'hostel', 'guest_house', 'apartment', 'chalet'].includes(typeKey)) {
      return <Home size={18} className="text-blue-600" />;
    }
    // Camping
    if (['camp_site', 'camping', 'campground', 'caravan_site'].includes(typeKey)) {
      return <Map size={18} className="text-green-600" />;
    }
    // Food & Drink
    if (['restaurant', 'cafe', 'bar', 'pub', 'fast_food', 'food_court'].includes(typeKey) ||
        ['amenity'].includes(classKey)) {
      return <MapPin size={18} className="text-orange-600" />;
    }
    // Transport
    if (['airport', 'train_station', 'bus_station', 'subway', 'fuel'].includes(typeKey)) {
      return <Navigation size={18} className="text-gray-600" />;
    }
    // Car
    if (['fuel', 'gas_station'].includes(typeKey)) {
      return <Navigation size={18} className="text-red-600" />;
    }
    
    // Default location pin
    return <MapPin size={18} className="text-blue-500" />;
  }, []);

  const displayItems = isOpen && !value.trim() && recentSearches.length > 0 ? recentSearches : predictions;
  
  const showRecentSearches = isOpen && !value.trim() && recentSearches.length > 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Main Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search size={20} className="text-gray-400" />
        </div>
        
        <div style={{ position: 'relative' }}>
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
            className={`
              w-full pl-12 pr-12 py-4 
              text-base font-medium
              bg-white border-2 border-gray-200 
              rounded-xl shadow-sm
              focus:border-blue-500 focus:ring-0 focus:outline-none
              transition-all duration-200
              ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-300'}
              ${isOpen ? 'border-blue-500 shadow-lg' : ''}
            `}
          />
          {/* MOVED DROPDOWN HERE */}
          {isOpen && displayItems.length > 0 && (
            <div style={{
              position: 'absolute',
              zIndex: 9999,
              top: '100%',
              left: 0,
              right: 0,
              width: '100%',
              marginTop: '4px',
              background: 'white',
              border: '2px solid #3b82f6',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              maxHeight: '320px',
              overflow: 'hidden',
              minHeight: '40px'
            }}>
              <div style={{
                padding: '4px',
                backgroundColor: '#dbeafe',
                fontSize: '12px',
                color: '#1e40af',
                fontWeight: '600'
              }}>
                {displayItems.length} Ergebnis{displayItems.length !== 1 ? 'se' : ''} gefunden
              </div>
              
              {/* Results List */}
              <ul ref={listRef} style={{
                maxHeight: '280px',
                overflowY: 'auto'
              }}>
                {displayItems.map((prediction, index) => {
                  const isHighlighted = index === highlightedIndex;
                  const distance = calculateDistance(prediction.coordinates);
                  
                  return (
                    <li
                      key={prediction.place_id}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f9fafb',
                        transition: 'background-color 0.15s',
                        background: isHighlighted ? '#eff6ff' : 'white'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isHighlighted ? '#eff6ff' : 'white';
                      }}
                      onClick={() => handlePlaceSelect(prediction)}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ flexShrink: 0, marginTop: '2px' }}>
                          {getEnhancedPlaceIcon(prediction)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#111827',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {prediction.structured_formatting.main_text}
                              </p>
                              {prediction.structured_formatting.secondary_text && (
                                <p style={{
                                  fontSize: '12px',
                                  color: '#6b7280',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {prediction.structured_formatting.secondary_text}
                                </p>
                              )}
                            </div>
                            {distance && (
                              <span style={{
                                fontSize: '12px',
                                color: '#6b7280',
                                fontWeight: '500',
                                flexShrink: 0,
                                marginLeft: '8px',
                                whiteSpace: 'nowrap'
                              }}>
                                {distance}
                              </span>
                            )}
                          </div>
                          
                          {/* Place Type Badge */}
                          <div style={{ marginTop: '8px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '500',
                              background: '#f3f4f6',
                              color: '#374151'
                            }}>
                              {getPlaceCategoryName(prediction.type, prediction.class)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              
              {/* No Results */}
              {!isLoading && displayItems.length === 0 && value.trim() && (
                <div style={{ padding: '24px', textAlign: 'center' }}>
                  <p style={{ color: '#6b7280' }}>
                    Keine Ergebnisse für "{value}"
                  </p>
                  <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '4px' }}>
                    Versuchen Sie es mit anderen Suchbegriffen oder weniger spezifischen Angaben
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Loading Spinner / Clear Button */}
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
          ) : value ? (
            <button
              onClick={clearSearch}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              type="button"
            >
              <X size={20} />
            </button>
          ) : null}
        </div>
      </div>

      {/* Category Filters */}
      {showCategories && (
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium whitespace-nowrap
              ${showFilters ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}
              transition-colors
            `}
          >
            <Star size={14} />
            Filter
          </button>
          
          {showFilters && searchCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategorySelect(category.id)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium whitespace-nowrap
                transition-colors
                ${selectedCategory === category.id 
                  ? `${category.color} border-current` 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              {category.icon}
              {category.name}
            </button>
          ))}
        </div>
      )}

      {/* Dropdown Results - ALWAYS SHOW FOR TESTING */}
      {(isOpen && (displayItems.length > 0 || showRecentSearches)) || true && (
        <div style={{
          position: 'absolute',
          zIndex: 9999,
          top: '100%',
          left: 0,
          right: 0,
          width: '100%',
          marginTop: '4px',
          background: 'white',
          border: '2px solid #3b82f6',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          maxHeight: '320px',
          overflow: 'hidden',
          minHeight: '40px'
        }}>
          <div style={{
            padding: '4px',
            backgroundColor: '#dbeafe',
            fontSize: '12px',
            color: '#1e40af',
            fontWeight: '600'
          }}>
            {displayItems.length} Ergebnis{displayItems.length !== 1 ? 'se' : ''} gefunden
          </div>
          {/* Recent Searches Header */}
          {showRecentSearches && (
            <div style={{
              padding: '8px 16px',
              background: '#f9fafb',
              borderBottom: '1px solid #f3f4f6'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#6b7280'
              }}>
                <Clock size={14} />
                Zuletzt gesucht
              </div>
            </div>
          )}
          
          {/* Results List */}
          <ul ref={listRef} style={{
            maxHeight: '320px',
            overflowY: 'auto'
          }}>
            {displayItems.map((prediction, index) => {
              const isHighlighted = index === highlightedIndex;
              const distance = calculateDistance(prediction.coordinates);
              
              return (
                <li
                  key={prediction.place_id}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f9fafb',
                    transition: 'background-color 0.15s',
                    background: isHighlighted ? '#eff6ff' : 'white'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isHighlighted ? '#eff6ff' : 'white';
                  }}
                  onClick={() => handlePlaceSelect(prediction)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ flexShrink: 0, marginTop: '2px' }}>
                      {getEnhancedPlaceIcon(prediction)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#111827',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {prediction.structured_formatting.main_text}
                          </p>
                          {prediction.structured_formatting.secondary_text && (
                            <p style={{
                              fontSize: '14px',
                              color: '#6b7280',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginTop: '2px'
                            }}>
                              {prediction.structured_formatting.secondary_text}
                            </p>
                          )}
                        </div>
                        {distance && (
                          <span style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            fontWeight: '500',
                            whiteSpace: 'nowrap'
                          }}>
                            {distance}
                          </span>
                        )}
                      </div>
                      
                      {/* Place Type Badge */}
                      <div style={{ marginTop: '8px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          background: '#f3f4f6',
                          color: '#374151'
                        }}>
                          {getPlaceCategoryName(prediction.type, prediction.class)}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
                  );
                })}
              </ul>
            </div>
          )}
    </div>
  );
};

// Helper function to get place category styling
const getPlaceCategoryStyle = (type: string, placeClass: string): string => {
  const typeKey = type.toLowerCase();
  const classKey = placeClass.toLowerCase();
  
  if (['attraction', 'museum', 'castle', 'monument'].includes(typeKey) || ['tourism'].includes(classKey)) {
    return 'bg-purple-100 text-purple-800';
  }
  if (['hotel', 'hostel', 'guest_house', 'apartment'].includes(typeKey)) {
    return 'bg-blue-100 text-blue-800';
  }
  if (['camp_site', 'camping', 'campground'].includes(typeKey)) {
    return 'bg-green-100 text-green-800';
  }
  if (['restaurant', 'cafe', 'bar', 'pub', 'fast_food'].includes(typeKey) || ['amenity'].includes(classKey)) {
    return 'bg-orange-100 text-orange-800';
  }
  if (['fuel', 'gas_station'].includes(typeKey)) {
    return 'bg-red-100 text-red-800';
  }
  if (['airport', 'train_station', 'bus_station', 'subway'].includes(typeKey)) {
    return 'bg-gray-100 text-gray-800';
  }
  
  return 'bg-blue-100 text-blue-800';
};

// Helper function to get human-readable category names
const getPlaceCategoryName = (type: string, placeClass: string): string => {
  const typeKey = type.toLowerCase();
  const classKey = placeClass.toLowerCase();
  
  if (['attraction', 'museum', 'castle', 'monument', 'viewpoint'].includes(typeKey) || ['tourism'].includes(classKey)) {
    return 'Sehenswürdigkeit';
  }
  if (['hotel', 'hostel', 'guest_house', 'apartment'].includes(typeKey)) {
    return 'Unterkunft';
  }
  if (['camp_site', 'camping', 'campground'].includes(typeKey)) {
    return 'Camping';
  }
  if (['restaurant', 'cafe', 'bar', 'pub', 'fast_food'].includes(typeKey) || 
      (['amenity'].includes(classKey) && ['restaurant', 'cafe', 'bar', 'pub', 'fast_food'].includes(typeKey))) {
    return 'Gastronomie';
  }
  if (['fuel', 'gas_station'].includes(typeKey)) {
    return 'Tankstelle';
  }
  if (['airport', 'train_station', 'bus_station', 'subway'].includes(typeKey)) {
    return 'Transport';
  }
  
  return 'Ort';
};

export default EnhancedPlaceSearch;