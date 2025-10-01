import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { Destination, Trip, UserSearchResult, canUserAccessTripAsync } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { Search, MapPin, Globe, Users, Calendar, ArrowRight, User } from 'lucide-react';
import { formatDate, getCategoryIcon } from '../../utils';
import { socialService } from '../../services/socialService';
import './IntelligentSearch.css';

interface SearchSuggestion {
  type: 'destination' | 'trip' | 'user';
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  data: Destination | Trip | UserSearchResult;
}

interface IntelligentSearchProps {
  value: string;
  onChange: (value: string) => void;
  onNavigate: (type: 'destination' | 'trip' | 'user', id: string) => void;
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
  const { destinations, trips, publicTrips, currentTrip, loadPublicTrips } = useSupabaseApp();
  const { user: currentUser } = useAuth();
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [userSuggestions, setUserSuggestions] = useState<UserSearchResult[]>([]);
  const [tripSuggestions, setTripSuggestions] = useState<Trip[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isSearchingTrips, setIsSearchingTrips] = useState(false);
  const [accessibleDestinations, setAccessibleDestinations] = useState<Destination[]>([]);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load public trips on mount
  useEffect(() => {
    if (publicTrips.length === 0) {
      loadPublicTrips();
    }
  }, [loadPublicTrips, publicTrips.length]);

  // Load destinations from all accessible trips (same logic as SearchPage)
  useEffect(() => {
    const loadAccessibleDestinations = async () => {
      if (!currentUser || trips.length === 0 || destinations.length === 0) {
        setAccessibleDestinations(destinations);
        return;
      }

      setIsLoadingDestinations(true);
      
      try {
        
        const accessibleDestIds = new Set<string>();
        
        // Check each trip for accessibility
        for (const trip of trips) {
          const hasAccess = await canUserAccessTripAsync(trip, currentUser.id);
          
          if (hasAccess) {
            trip.destinations.forEach(destId => accessibleDestIds.add(destId));
          } else {
          }
        }
        
        // Filter destinations to only include accessible ones
        const accessibleDests = destinations.filter(dest => accessibleDestIds.has(dest.id));
        
        setAccessibleDestinations(accessibleDests);
        
      } catch (error) {
        console.error('Failed to load accessible destinations:', error);
        // Fallback to user's own destinations on error
        setAccessibleDestinations(destinations);
      } finally {
        setIsLoadingDestinations(false);
      }
    };

    loadAccessibleDestinations();
  }, [trips, destinations, currentUser]);

  // Search for users with debouncing
  useEffect(() => {
    const searchUsers = async () => {
      if (!value.trim() || value.length < 2) {
        setUserSuggestions([]);
        return;
      }

      setIsSearchingUsers(true);
      try {
        const users = await socialService.searchUsers(value, 3);
        setUserSuggestions(users);
      } catch (error) {
        console.error('User search failed:', error);
        setUserSuggestions([]);
      } finally {
        setIsSearchingUsers(false);
      }
    };

    // Debounce user search - reduced delay for better UX
    const timeoutId = setTimeout(searchUsers, 150);
    return () => clearTimeout(timeoutId);
  }, [value]);

  // Enhanced trip search with permissions
  useEffect(() => {
    const searchTrips = async () => {
      if (!value.trim() || value.length < 2 || !currentUser) {
        setTripSuggestions([]);
        return;
      }

      setIsSearchingTrips(true);
      try {
        const searchTerm = value.toLowerCase();
        const matchingTrips: Trip[] = [];
        
        
        // Search through all trips
        for (const trip of trips) {
          // Check if trip matches search term
          const matchesSearch = 
            trip.name.toLowerCase().includes(searchTerm) ||
            trip.description?.toLowerCase().includes(searchTerm) ||
            trip.tags?.some(tag => tag.toLowerCase().includes(searchTerm));
          
          if (!matchesSearch) continue;
          
          
          // Check permissions
          const hasAccess = await canUserAccessTripAsync(trip, currentUser.id);
          
          if (hasAccess) {
            matchingTrips.push(trip);
            
            // Limit to 5 trips for performance
            if (matchingTrips.length >= 5) break;
          }
        }
        
        // Sort: own trips first, then contacts, then public
        const sortedTrips = matchingTrips.sort((a, b) => {
          const aIsOwn = a.ownerId === currentUser.id;
          const bIsOwn = b.ownerId === currentUser.id;
          const aIsPublic = a.privacy === 'public';
          const bIsPublic = b.privacy === 'public';
          
          // Own trips first
          if (aIsOwn && !bIsOwn) return -1;
          if (!aIsOwn && bIsOwn) return 1;
          
          // Then contacts/private trips
          if (!aIsPublic && bIsPublic) return -1;
          if (aIsPublic && !bIsPublic) return 1;
          
          return 0;
        });
        
        setTripSuggestions(sortedTrips);
      } catch (error) {
        console.error('Trip search failed:', error);
        setTripSuggestions([]);
      } finally {
        setIsSearchingTrips(false);
      }
    };

    const timeoutId = setTimeout(searchTrips, 150);
    return () => clearTimeout(timeoutId);
  }, [value, trips, currentUser]);

  // Generate suggestions based on search query
  const generateSuggestions = useCallback((query: string): SearchSuggestion[] => {
    
    if (!query.trim()) {
      return [];
    }

    const searchTerm = query.toLowerCase();
    const results: SearchSuggestion[] = [];

    // Search in accessible destinations (includes own + shared + public destinations)
    const matchingDestinations = accessibleDestinations
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

    // Use enhanced trip search results (includes own, contacts, and public trips)
    const tripResults = tripSuggestions
      .slice(0, 3) // Limit to 3 trips
      .map(trip => {
        // Determine icon and subtitle based on trip type
        const isOwn = currentUser && trip.ownerId === currentUser.id;
        const icon = isOwn ? '🎒' : (trip.privacy === 'public' ? '🌍' : '👥');
        const privacyLabel = isOwn ? 'Meine' : (trip.privacy === 'public' ? 'Öffentlich' : 'Kontakt');
        
        return {
          type: 'trip' as const,
          id: trip.id,
          title: trip.name,
          subtitle: `${privacyLabel} • ${trip.destinations?.length || 0} Ziele • ${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}`,
          icon,
          data: trip
        };
      });

    results.push(...tripResults);

    // Add user suggestions
    const userResults = userSuggestions.map(user => ({
      type: 'user' as const,
      id: user.id,
      title: `@${user.nickname}`,
      subtitle: user.display_name ? 
        `${user.display_name} • ${user.follower_count} Follower • ${user.trip_count} Reisen` :
        `${user.follower_count} Follower • ${user.trip_count} Reisen`,
      icon: '👤',
      data: user
    }));

    results.push(...userResults);

    return results.slice(0, 9); // Maximum 9 total suggestions (3 each type)
  }, [accessibleDestinations, tripSuggestions, userSuggestions, currentUser]);

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
    
    // Open dropdown immediately if there's text
    if (newValue.trim()) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
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

  const handleBlur = () => {
    // Delay closing to allow clicks on suggestions
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }, 300); // Increased delay for better UX
  };

  return (
    <div className="relative" style={{ width: '100%' }}>
      {/* Search Icon */}
      <Search
        size={isMobile ? 16 : 18}
        style={{
          position: 'absolute',
          left: isMobile ? '12px' : '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#6b7280', // Explizit grauer Farbton für bessere Sichtbarkeit
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
        className={`${className || ''} intelligent-search-input`.trim()}
        style={{
          ...style,
          paddingLeft: isMobile ? '2.5rem' : '3rem'
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
                {suggestion.type === 'destination' && <MapPin size={12} />}
                {suggestion.type === 'trip' && <Globe size={12} />}
                {suggestion.type === 'user' && <User size={12} />}
                {suggestion.type === 'destination' && 'Ziel'}
                {suggestion.type === 'trip' && 'Reise'}
                {suggestion.type === 'user' && 'User'}
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