import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, MapPin, Star, Clock, Euro, Plus, ExternalLink, Heart } from 'lucide-react';
import { webDestinationService, WebDestination, DestinationSearchFilters } from '../../services/webDestinationService';
import { useDestinationContext } from '../../contexts/DestinationContext';
import { DestinationCategory, DestinationStatus } from '../../types';

interface DestinationDiscoveryProps {
  onAddDestination?: (destination: WebDestination) => void;
  className?: string;
}

const DestinationDiscovery: React.FC<DestinationDiscoveryProps> = ({
  onAddDestination,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WebDestination[]>([]);
  const [trendingDestinations, setTrendingDestinations] = useState<WebDestination[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<DestinationSearchFilters>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  const { createDestination } = useDestinationContext();

  // Load trending destinations on mount
  useEffect(() => {
    const loadTrendingDestinations = async () => {
      try {
        const trending = await webDestinationService.getTrendingDestinations('Deutschland', 6);
        setTrendingDestinations(trending);
      } catch (error) {
        console.error('Error loading trending destinations:', error);
      }
    };

    loadTrendingDestinations();
  }, []);

  // Search destinations with debouncing
  const searchDestinations = useCallback(async (query: string, searchFilters: DestinationSearchFilters = {}) => {
    if (!query.trim() && Object.keys(searchFilters).length === 0) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await webDestinationService.searchWebDestinations(query.trim() || 'sehenswürdigkeiten deutschland', searchFilters);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching destinations:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      searchDestinations(newQuery, filters);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchDestinations, filters]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: DestinationSearchFilters) => {
    setFilters(newFilters);
    searchDestinations(searchQuery, newFilters);
  }, [searchQuery, searchDestinations]);

  // Add destination to trip
  const handleAddToTrip = useCallback(async (destination: WebDestination) => {
    try {
      // Get enriched destination details
      const enrichedDestination = await webDestinationService.getDestinationDetails(destination);
      
      // Convert to trip destination format
      const destinationData = {
        name: enrichedDestination.name,
        location: enrichedDestination.location,
        coordinates: enrichedDestination.coordinates,
        category: DestinationCategory.ATTRACTION,
        description: enrichedDestination.description,
        startDate: new Date().toISOString().split('T')[0], // Today's date
        endDate: new Date().toISOString().split('T')[0],
        startTime: '10:00',
        endTime: enrichedDestination.estimatedVisitDuration ? 
          `${10 + enrichedDestination.estimatedVisitDuration}:00` : '16:00',
        budget: enrichedDestination.entryFee?.adult || 0,
        notes: `Geschätzte Besuchsdauer: ${enrichedDestination.estimatedVisitDuration || 4} Stunden\n\n${enrichedDestination.description}`,
        tags: enrichedDestination.tags,
        priority: 3,
        status: DestinationStatus.PLANNED,
        photos: []
      };

      await createDestination(destinationData);
      
      if (onAddDestination) {
        onAddDestination(enrichedDestination);
      }

      // Show success feedback (you could add a toast here)
      console.log(`Destination "${enrichedDestination.name}" added to trip!`);
    } catch (error) {
      console.error('Error adding destination to trip:', error);
    }
  }, [createDestination, onAddDestination]);

  // Toggle favorite
  const toggleFavorite = useCallback((destinationId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(destinationId)) {
        newFavorites.delete(destinationId);
      } else {
        newFavorites.add(destinationId);
      }
      return newFavorites;
    });
  }, []);

  // Render destination card
  const renderDestinationCard = useCallback((destination: WebDestination, showAddButton: boolean = true) => (
    <div key={destination.id} style={{
      backgroundColor: 'var(--color-neutral-cream)',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    }}>
      {/* Image placeholder */}
      <div style={{
        height: '160px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '3rem',
        position: 'relative'
      }}>
        <MapPin size={48} style={{ opacity: 0.7 }} />
        
        {/* Favorite button */}
        <button
          onClick={() => toggleFavorite(destination.id)}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(255, 255, 255, 0.9)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
        >
          <Heart 
            size={16} 
            style={{ 
              color: favorites.has(destination.id) ? '#ef4444' : '#6b7280',
              fill: favorites.has(destination.id) ? '#ef4444' : 'none'
            }} 
          />
        </button>
      </div>

      <div style={{ padding: '1rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '0.75rem' }}>
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#111827',
            margin: '0 0 0.5rem 0',
            lineHeight: '1.3'
          }}>
            {destination.name}
          </h3>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem',
            flexWrap: 'wrap'
          }}>
            <span style={{
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              padding: '0.25rem 0.5rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: '500'
            }}>
              {destination.category}
            </span>
            
            {/* Source Badge */}
            <span style={{
              backgroundColor: destination.source === 'wikipedia' ? '#dcfce7' : 
                             destination.source === 'google_places' ? '#fef3c7' : '#f3f4f6',
              color: destination.source === 'wikipedia' ? '#15803d' : 
                     destination.source === 'google_places' ? '#d97706' : '#6b7280',
              padding: '0.25rem 0.5rem',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: '500'
            }}>
              {destination.source === 'wikipedia' ? '📖 Wikipedia' : 
               destination.source === 'google_places' ? '🗺️ Maps' : '💾 Local'}
            </span>
            
            {destination.rating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Star size={12} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  {destination.rating}
                </span>
              </div>
            )}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            color: '#6b7280',
            fontSize: '0.8rem',
            marginBottom: '0.5rem'
          }}>
            <MapPin size={12} />
            <span>{destination.location}</span>
          </div>
        </div>

        {/* Description */}
        <p style={{
          fontSize: '0.875rem',
          color: '#4b5563',
          lineHeight: '1.4',
          margin: '0 0 1rem 0',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {destination.description}
        </p>

        {/* Meta information */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem',
          marginBottom: '1rem',
          fontSize: '0.75rem',
          color: '#6b7280'
        }}>
          {destination.estimatedVisitDuration && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Clock size={10} />
              <span>{destination.estimatedVisitDuration}h</span>
            </div>
          )}
          
          {destination.entryFee && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Euro size={10} />
              <span>ab {destination.entryFee.adult}€</span>
            </div>
          )}
        </div>

        {/* Tags */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.25rem',
          marginBottom: '1rem'
        }}>
          {destination.tags.slice(0, 3).map(tag => (
            <span key={tag} style={{
              backgroundColor: '#f3f4f6',
              color: '#4b5563',
              padding: '0.125rem 0.375rem',
              borderRadius: '4px',
              fontSize: '0.7rem'
            }}>
              {tag}
            </span>
          ))}
          {destination.tags.length > 3 && (
            <span style={{
              color: '#9ca3af',
              fontSize: '0.7rem',
              padding: '0.125rem 0.375rem'
            }}>
              +{destination.tags.length - 3} mehr
            </span>
          )}
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '0.5rem'
        }}>
          {showAddButton && (
            <button
              onClick={() => handleAddToTrip(destination)}
              style={{
                flex: 1,
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }}
            >
              <Plus size={16} />
              Zur Reise hinzufügen
            </button>
          )}
          
          {destination.websiteUrl && (
            <button
              onClick={() => window.open(destination.websiteUrl, '_blank')}
              style={{
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.color = '#3b82f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.color = '#6b7280';
              }}
            >
              <ExternalLink size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  ), [favorites, toggleFavorite, handleAddToTrip]);

  return (
    <div className={className} style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{
          fontSize: '1.875rem',
          fontWeight: '700',
          color: '#111827',
          marginBottom: '0.5rem'
        }}>
          Neue Reiseziele entdecken
        </h2>
        <p style={{ color: '#6b7280', fontSize: '1rem', marginBottom: '1rem' }}>
          Suchen Sie nach spannenden Zielen für Ihre nächste Reise
        </p>
        
        {/* Search Sources Info */}
        <div style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #e0f2fe',
          borderRadius: '8px',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Search size={16} style={{ color: '#0891b2' }} />
          <span style={{ color: '#0c4a6e', fontSize: '0.875rem' }}>
            🔍 <strong>Live Web-Suche aktiv:</strong> Wikipedia, OpenStreetMap & eigene Datenbank werden durchsucht
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          <div style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={20} style={{
              position: 'absolute',
              left: '12px',
              color: '#6b7280',
              zIndex: 1
            }} />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Suchen Sie nach Orten, Aktivitäten oder Sehenswürdigkeiten..."
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              backgroundColor: showFilters ? 'var(--color-primary-ocean)' : 'var(--color-neutral-cream)',
              color: showFilters ? 'white' : 'var(--color-text-secondary)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            <Filter size={16} />
            Filter
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1rem',
            marginTop: '1rem'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              {/* Category Filter */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Kategorie
                </label>
                <select
                  value={filters.category?.[0] || ''}
                  onChange={(e) => handleFilterChange({
                    ...filters,
                    category: e.target.value ? [e.target.value] : undefined
                  })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">Alle Kategorien</option>
                  {webDestinationService.getDestinationCategories().map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Rating Filter */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Mindestbewertung
                </label>
                <select
                  value={filters.minRating || ''}
                  onChange={(e) => handleFilterChange({
                    ...filters,
                    minRating: e.target.value ? Number(e.target.value) : undefined
                  })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">Alle Bewertungen</option>
                  <option value="4.5">4.5+ Sterne</option>
                  <option value="4.0">4.0+ Sterne</option>
                  <option value="3.5">3.5+ Sterne</option>
                  <option value="3.0">3.0+ Sterne</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {isLoading && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem',
          color: '#6b7280'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '2px solid #e5e7eb',
            borderTop: '2px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginRight: '0.5rem'
          }} />
          Suche läuft...
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '1rem' 
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Suchergebnisse ({searchResults.length})
            </h3>
            
            {/* Source Statistics */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {[
                { source: 'wikipedia', count: searchResults.filter(d => d.source === 'wikipedia').length, emoji: '📖' },
                { source: 'google_places', count: searchResults.filter(d => d.source === 'google_places').length, emoji: '🗺️' },
                { source: 'mock', count: searchResults.filter(d => d.source === 'mock').length, emoji: '💾' }
              ].filter(s => s.count > 0).map(({ source, count, emoji }) => (
                <span key={source} style={{
                  backgroundColor: '#f9fafb',
                  color: '#4b5563',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem'
                }}>
                  {emoji} {count}
                </span>
              ))}
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '1.5rem'
          }}>
            {searchResults.map(destination => renderDestinationCard(destination))}
          </div>
        </div>
      )}

      {/* Trending Destinations */}
      {trendingDestinations.length > 0 && !searchQuery && searchResults.length === 0 && (
        <div>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '1rem'
          }}>
            Beliebte Reiseziele
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '1.5rem'
          }}>
            {trendingDestinations.map(destination => renderDestinationCard(destination))}
          </div>
        </div>
      )}

      {/* No Results */}
      {searchQuery && searchResults.length === 0 && !isLoading && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: '#6b7280'
        }}>
          <MapPin size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '500', marginBottom: '0.5rem' }}>
            Keine Ergebnisse gefunden
          </h3>
          <p>Versuchen Sie andere Suchbegriffe oder verwenden Sie die Filter.</p>
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

export default DestinationDiscovery;