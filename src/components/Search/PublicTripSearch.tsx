import React, { useState, useMemo, useCallback } from 'react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { Trip, TripPrivacy, DestinationCategory } from '../../types';
import { 
  Search, 
  Filter,
  MapPin,
  Calendar,
  Eye,
  Plus,
  Users,
  Star,
  Clock,
  Euro,
  X,
  Globe,
  Lock,
  ChevronRight,
  Heart,
  Download
} from 'lucide-react';
import { 
  formatDate, 
  formatCurrency 
} from '../../utils';

interface PublicTripSearchProps {
  onTripSelect: (trip: Trip) => void;
  onModeChange?: (mode: 'destinations' | 'trips') => void;
  currentMode?: 'destinations' | 'trips';
}

const PublicTripSearch: React.FC<PublicTripSearchProps> = ({ 
  onTripSelect, 
  onModeChange,
  currentMode = 'trips' 
}) => {
  const { 
    publicTrips,
    destinations,
    currentTrip,
    uiState,
    loadPublicTrips
  } = useSupabaseApp();

  // Add CSS styles for smooth hover effects
  React.useEffect(() => {
    const styles = `
      .public-trip-card:hover {
        border-color: #3b82f6 !important;
        box-shadow: var(--shadow-md) !important;
        transform: translateY(-2px) !important;
      }
      .public-trip-view-button:hover {
        background: var(--color-primary-ocean) !important;
      }
      .public-trip-filter-button:hover {
        background: #e5e7eb !important;
        color: #374151 !important;
      }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
    
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<DestinationCategory[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'destinations' | 'budget'>('name');

  // Load public trips on component mount
  React.useEffect(() => {
    loadPublicTrips();
  }, [loadPublicTrips]);

  // Calculate enhanced trip data
  const enhancedPublicTrips = useMemo(() => {
    return publicTrips.map(trip => {
      const tripDestinations = destinations.filter(dest => 
        trip.destinations.includes(dest.id)
      );
      
      const destinationBudget = tripDestinations.reduce((sum, dest) => sum + (dest.budget || 0), 0);
      const totalBudget = trip.budget || destinationBudget;
      const totalActualCost = tripDestinations.reduce((sum, dest) => sum + (dest.actualCost || 0), 0);
      const categoryCounts = tripDestinations.reduce((acc, dest) => {
        acc[dest.category] = (acc[dest.category] || 0) + 1;
        return acc;
      }, {} as Record<DestinationCategory, number>);
      
      const tripDuration = Math.ceil(
        (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      return {
        ...trip,
        destinationCount: tripDestinations.length,
        totalBudget,
        totalActualCost,
        categoryCounts,
        duration: tripDuration,
        destinations: tripDestinations
      };
    });
  }, [publicTrips, destinations]);

  // Search and filter results
  const searchResults = useMemo(() => {
    let results = enhancedPublicTrips;

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(trip => 
        trip.name.toLowerCase().includes(query) ||
        trip.description?.toLowerCase().includes(query) ||
        trip.destinations.some(dest => 
          dest.name.toLowerCase().includes(query) ||
          dest.location.toLowerCase().includes(query)
        )
      );
    }

    // Category filter
    if (selectedCategories.length > 0) {
      results = results.filter(trip => 
        selectedCategories.some(category => 
          trip.categoryCounts[category] > 0
        )
      );
    }

    // Sorting
    results.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        case 'destinations':
          return b.destinationCount - a.destinationCount;
        case 'budget':
          return b.totalBudget - a.totalBudget;
        default:
          return 0;
      }
    });

    return results;
  }, [enhancedPublicTrips, searchQuery, selectedCategories, sortBy]);

  const handleCategoryToggle = (category: DestinationCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
  };

  const hasActiveFilters = searchQuery.trim() || selectedCategories.length > 0;

  const PublicTripCard: React.FC<{ trip: typeof enhancedPublicTrips[0] }> = ({ trip }) => (
    <div
      className="public-trip-card"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative'
      }}
      onClick={() => {
        // Convert enhanced trip back to Trip format for selection
        const originalTrip: Trip = {
          id: trip.id,
          name: trip.name,
          description: trip.description,
          startDate: trip.startDate,
          endDate: trip.endDate,
          budget: trip.budget,
          actualCost: trip.actualCost,
          participants: trip.participants,
          destinations: trip.destinations.map(d => d.id), // Convert back to ID array
          status: trip.status,
          coverImage: trip.coverImage,
          tags: trip.tags,
          privacy: trip.privacy,
          ownerId: trip.ownerId,
          taggedUsers: trip.taggedUsers,
          vehicleConfig: trip.vehicleConfig,
          createdAt: trip.createdAt,
          updatedAt: trip.updatedAt
        };
        onTripSelect(originalTrip);
      }}
    >
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '16px'
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '1.25rem',
              fontWeight: '600',
              color: 'var(--color-text-primary)'
            }}>
              {trip.name}
            </h3>
            <div style={{
              background: 'var(--color-success)',
              color: 'var(--color-surface)',
              borderRadius: '6px',
              padding: '2px 8px',
              fontSize: '0.75rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Globe size={12} />
              Öffentlich
            </div>
          </div>
          
          {trip.description && (
            <p style={{ 
              margin: 0,
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              lineHeight: '1.4'
            }}>
              {trip.description}
            </p>
          )}
        </div>
        
        <div style={{
          color: 'var(--color-text-secondary)',
          marginLeft: '16px'
        }}>
          <ChevronRight size={20} />
        </div>
      </div>

      {/* Trip Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: 'var(--color-primary-ocean)',
            color: 'white',
            borderRadius: '8px',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Calendar size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
              Zeitraum
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {trip.duration} Tag{trip.duration !== 1 ? 'e' : ''}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: 'var(--color-neutral-mist)',
            color: 'var(--color-success)',
            borderRadius: '8px',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MapPin size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
              Ziele
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              {trip.destinationCount} Orte
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {Object.keys(trip.categoryCounts).length} Kategorien
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: 'var(--color-neutral-mist)',
            color: 'var(--color-warning)',
            borderRadius: '8px',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Euro size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
              Budget
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              €{trip.totalBudget || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              Geplantes Budget
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: 'var(--color-neutral-mist)',
            color: 'var(--color-text-primary)',
            borderRadius: '8px',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Users size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
              Teilnehmer
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              {trip.participants?.length || 0} Person{(trip.participants?.length || 0) !== 1 ? 'en' : ''}
            </div>
            {trip.taggedUsers?.length > 0 && (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                +{trip.taggedUsers.length} getaggt
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Categories */}
      {Object.keys(trip.categoryCounts).length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--color-text-secondary)', 
            fontWeight: '500',
            marginBottom: '8px'
          }}>
            Beliebte Kategorien
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {Object.entries(trip.categoryCounts)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 4)
              .map(([category, count]) => (
                <span
                  key={category}
                  style={{
                    background: 'var(--color-neutral-mist)',
                    color: 'var(--color-text-primary)',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}
                >
                  {category} ({count})
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        paddingTop: '16px',
        borderTop: '1px solid #f3f4f6'
      }}>
        <button
          style={{
            flex: 1,
            background: 'var(--color-primary-ocean)',
            color: 'var(--color-surface)',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'background 0.2s'
          }}
          className="public-trip-view-button"
          onClick={(e) => {
            e.stopPropagation();
            // Convert enhanced trip back to Trip format for selection
            const originalTrip: Trip = {
              id: trip.id,
              name: trip.name,
              description: trip.description,
              startDate: trip.startDate,
              endDate: trip.endDate,
              budget: trip.budget,
              actualCost: trip.actualCost,
              participants: trip.participants,
              destinations: trip.destinations.map(d => d.id), // Convert back to ID array
              status: trip.status,
              coverImage: trip.coverImage,
              tags: trip.tags,
              privacy: trip.privacy,
              ownerId: trip.ownerId,
              taggedUsers: trip.taggedUsers,
              vehicleConfig: trip.vehicleConfig,
              createdAt: trip.createdAt,
              updatedAt: trip.updatedAt
            };
            onTripSelect(originalTrip);
          }}
        >
          <Eye size={16} />
          Ansehen
        </button>
        
        <button
          style={{
            background: 'var(--color-neutral-mist)',
            color: 'var(--color-text-secondary)',
            border: 'none',
            borderRadius: '8px',
            padding: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          className="public-trip-filter-button"
          onClick={(e) => e.stopPropagation()}
          title="Zu Favoriten hinzufügen"
        >
          <Heart size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ 
      padding: '24px',
      maxWidth: '1200px',
      margin: '0 auto',
      minHeight: '100vh',
      background: 'var(--color-background)'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h1 style={{ 
              margin: 0,
              fontSize: '2rem',
              fontWeight: '700',
              color: 'var(--color-text-primary)',
              marginBottom: '8px'
            }}>
              Öffentliche Reisen entdecken
            </h1>
            <p style={{ 
              margin: 0,
              fontSize: '1rem',
              color: 'var(--color-text-secondary)'
            }}>
              Entdecke inspirierende Reisen von anderen Nutzern und finde deine nächste Traumreise
            </p>
          </div>
          
          {/* Search Mode Toggle */}
          {onModeChange && (
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '4px',
              display: 'flex',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <button
                onClick={() => onModeChange('destinations')}
                style={{
                  background: currentMode === 'destinations' ? 'var(--color-primary-ocean)' : 'transparent',
                  color: currentMode === 'destinations' ? 'white' : 'var(--color-text-secondary)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
              >
                Meine Ziele
              </button>
              <button
                onClick={() => onModeChange('trips')}
                style={{
                  background: currentMode === 'trips' ? 'var(--color-primary-ocean)' : 'transparent',
                  color: currentMode === 'trips' ? 'white' : 'var(--color-text-secondary)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
              >
                Öffentliche Reisen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search and Controls */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          {/* Main Search Input */}
          <div style={{
            flex: 1,
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-secondary)'
            }}>
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder="Reisen, Orte, Beschreibungen durchsuchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 16px 16px 52px',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                fontSize: '1rem',
                background: 'var(--color-surface)',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxShadow: 'var(--shadow-sm)'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary-ocean)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
            />
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '0.875rem',
              cursor: 'pointer',
              outline: 'none',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <option value="name">Nach Name</option>
            <option value="date">Nach Datum</option>
            <option value="destinations">Nach Anzahl Ziele</option>
            <option value="budget">Nach Budget</option>
          </select>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              background: showFilters ? 'var(--color-primary-ocean)' : 'var(--color-surface)',
              color: showFilters ? 'white' : 'var(--color-text-secondary)',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.2s',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Filter size={18} />
            Filter
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                Filter
              </h3>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  style={{
                    background: 'transparent',
                    color: 'var(--color-error)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <X size={14} />
                  Filter löschen
                </button>
              )}
            </div>

            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                Kategorien
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {Object.values(DestinationCategory).map(category => (
                  <button
                    key={category}
                    onClick={() => handleCategoryToggle(category)}
                    style={{
                      background: selectedCategories.includes(category) ? 'var(--color-primary-ocean)' : 'var(--color-neutral-mist)',
                      color: selectedCategories.includes(category) ? 'white' : 'var(--color-text-secondary)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div style={{
        background: 'var(--color-primary-ocean)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ fontSize: '0.875rem', color: 'var(--color-primary-ocean)' }}>
          <strong>{searchResults.length}</strong> von <strong>{publicTrips.length}</strong> öffentlichen Reisen gefunden
        </div>
        {hasActiveFilters && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {searchQuery && (
              <span style={{
                background: 'white',
                color: 'var(--color-surface)',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '0.75rem'
              }}>
                "{searchQuery}"
              </span>
            )}
            {selectedCategories.length > 0 && (
              <span style={{
                background: 'var(--color-success)',
                color: 'var(--color-surface)',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '0.75rem'
              }}>
                {selectedCategories.length} Kategorie{selectedCategories.length > 1 ? 'n' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {searchResults.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
          gap: '20px'
        }}>
          {searchResults.map(trip => (
            <PublicTripCard key={trip.id} trip={trip} />
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '64px 24px',
          background: 'var(--color-surface)',
          borderRadius: '12px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'var(--color-neutral-mist)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Globe size={32} style={{ color: 'var(--color-text-secondary)' }} />
          </div>
          <h3 style={{ 
            margin: '0 0 8px 0',
            fontSize: '1.125rem',
            fontWeight: '600',
            color: 'var(--color-text-primary)'
          }}>
            Keine öffentlichen Reisen gefunden
          </h3>
          <p style={{ 
            margin: 0,
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
            marginBottom: '16px'
          }}>
            {hasActiveFilters 
              ? 'Versuche deine Suchkriterien zu ändern oder Filter zu entfernen.'
              : 'Es gibt noch keine öffentlichen Reisen zu entdecken.'
            }
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              style={{
                background: 'var(--color-primary-ocean)',
                color: 'var(--color-surface)',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PublicTripSearch;