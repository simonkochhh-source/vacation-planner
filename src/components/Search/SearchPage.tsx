import React, { useState, useMemo, useCallback } from 'react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { Destination, DestinationCategory, DestinationStatus, Trip } from '../../types';
import PublicTripSearch from './PublicTripSearch';
import PublicTripView from '../Views/PublicTripView';
import TripImportService from '../../services/tripImportService';
import { 
  Search, 
  Filter,
  MapPin,
  Calendar,
  Tag,
  Square,
  List,
  ChevronRight,
  Star,
  Clock,
  Euro,
  X
} from 'lucide-react';
import { 
  formatDate, 
  getCategoryIcon, 
  getCategoryLabel,
  calculateDistance,
  getDestinationBudget 
} from '../../utils';

const SearchPage: React.FC = () => {
  const { 
    currentTrip,
    destinations,
    publicTrips,
    uiState, 
    updateUIState,
    createTrip,
    createDestinationForTrip
  } = useSupabaseApp();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<DestinationCategory[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<DestinationStatus[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [searchMode, setSearchMode] = useState<'destinations' | 'trips'>('destinations');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [showTripView, setShowTripView] = useState(false);

  // Handle navigation from header search
  React.useEffect(() => {
    if (uiState.selectedTripId && uiState.showTripDetails) {
      const trip = publicTrips.find(t => t.id === uiState.selectedTripId);
      if (trip) {
        setSelectedTrip(trip);
        setShowTripView(true);
        // Clear the navigation state to prevent re-triggering
        updateUIState({ 
          selectedTripId: undefined, 
          showTripDetails: false 
        });
      }
    }
  }, [uiState.selectedTripId, uiState.showTripDetails, publicTrips, updateUIState]);

  // Get current trip destinations
  const currentDestinations = currentTrip 
    ? destinations.filter(dest => currentTrip.destinations.includes(dest.id))
    : destinations; // Show all if no trip selected

  // Search and filter results
  const searchResults = useMemo(() => {
    let results = currentDestinations;

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(dest => 
        dest.name.toLowerCase().includes(query) ||
        dest.location.toLowerCase().includes(query) ||
        dest.notes?.toLowerCase().includes(query) ||
        dest.tags.some(tag => tag.toLowerCase().includes(query)) ||
        getCategoryLabel(dest.category).toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategories.length > 0) {
      results = results.filter(dest => selectedCategories.includes(dest.category));
    }

    // Status filter
    if (selectedStatus.length > 0) {
      results = results.filter(dest => selectedStatus.includes(dest.status));
    }

    // Tags filter
    if (selectedTags.length > 0) {
      results = results.filter(dest => 
        selectedTags.some(tag => dest.tags.includes(tag))
      );
    }

    return results;
  }, [currentDestinations, searchQuery, selectedCategories, selectedStatus, selectedTags]);

  // Get all available tags
  const availableTags = useMemo(() => {
    const allTags = new Set<string>();
    currentDestinations.forEach(dest => {
      dest.tags.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags).sort();
  }, [currentDestinations]);

  // Get all available categories
  const availableCategories = useMemo(() => {
    const categories = new Set<DestinationCategory>();
    currentDestinations.forEach(dest => categories.add(dest.category));
    return Array.from(categories);
  }, [currentDestinations]);

  const handleCategoryToggle = (category: DestinationCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleStatusToggle = (status: DestinationStatus) => {
    setSelectedStatus(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedStatus([]);
    setSelectedTags([]);
  };

  const handleTripSelect = (trip: Trip) => {
    setSelectedTrip(trip);
    setShowTripView(true);
  };

  const handleTripImport = async (trip: Trip) => {
    try {
      const tripDestinations = destinations.filter(dest => trip.destinations.includes(dest.id));
      const result = await TripImportService.importPublicTrip(trip, tripDestinations);
      
      // Show success message
      alert(`Reise "${result.trip.name}" wurde erfolgreich importiert!`);
      
      // Close trip view and switch back to destination search
      setShowTripView(false);
      setSelectedTrip(null);
      setSearchMode('destinations');
      
    } catch (error) {
      console.error('Import failed:', error);
      alert(`Fehler beim Importieren: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  const handleBackFromTripView = () => {
    setShowTripView(false);
    setSelectedTrip(null);
  };

  const hasActiveFilters = searchQuery.trim() || selectedCategories.length > 0 || 
                         selectedStatus.length > 0 || selectedTags.length > 0;

  const getStatusColor = (status: DestinationStatus) => {
    switch (status) {
      case DestinationStatus.PLANNED: return 'var(--color-primary-ocean)';
      case DestinationStatus.VISITED: return 'var(--color-success)';
      case DestinationStatus.SKIPPED: return 'var(--color-warning)';
      default: return 'var(--color-text-secondary)';
    }
  };

  const getStatusLabel = (status: DestinationStatus) => {
    switch (status) {
      case DestinationStatus.PLANNED: return 'Geplant';
      case DestinationStatus.VISITED: return 'Besucht';
      case DestinationStatus.SKIPPED: return 'Übersprungen';
      default: return status;
    }
  };

  const DestinationCard: React.FC<{ destination: Destination; compact?: boolean }> = ({ 
    destination, 
    compact = false 
  }) => (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: compact ? 'var(--radius-sm)' : 'var(--radius-md)',
        padding: compact ? 'var(--space-sm)' : 'var(--space-md)',
        cursor: 'pointer',
        transition: 'all var(--transition-normal)',
        boxShadow: 'var(--shadow-sm)'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-primary-ocean)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border)';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      onClick={() => {
        updateUIState({ activeDestination: destination.id });
      }}
    >
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: compact ? 'var(--space-sm)' : 'var(--space-md)'
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: compact ? 'var(--text-sm)' : 'var(--text-base)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {destination.name}
          </h3>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-xs)',
            marginTop: 'var(--space-xs)',
            fontSize: compact ? 'var(--text-xs)' : 'var(--text-sm)',
            color: 'var(--color-text-secondary)'
          }}>
            <MapPin size={compact ? 12 : 14} />
            <span style={{ 
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {destination.location}
            </span>
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: compact ? 'var(--space-xs)' : 'var(--space-sm)',
          marginLeft: 'var(--space-sm)'
        }}>
          {/* Category Icon */}
          <div style={{
            background: 'var(--color-neutral-mist)',
            borderRadius: 'var(--radius-sm)',
            padding: compact ? 'var(--space-xs)' : '6px',
            color: 'var(--color-text-secondary)'
          }}>
            {getCategoryIcon(destination.category)}
          </div>
          
          {/* Status Indicator */}
          <div style={{
            width: compact ? '8px' : '10px',
            height: compact ? '8px' : '10px',
            borderRadius: '50%',
            background: getStatusColor(destination.status)
          }} />
        </div>
      </div>

      {/* Date and Budget */}
      {!compact && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-sm)',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <Calendar size={12} />
            <span>{formatDate(destination.startDate)}</span>
            {destination.endDate !== destination.startDate && (
              <span> - {formatDate(destination.endDate)}</span>
            )}
          </div>
          
          {destination.budget && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <Euro size={12} />
              <span>€{destination.budget}</span>
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {destination.tags.length > 0 && (
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 'var(--space-xs)',
          marginTop: compact ? '6px' : 'var(--space-sm)'
        }}>
          {destination.tags.slice(0, compact ? 2 : 4).map(tag => (
            <span
              key={tag}
              style={{
                background: 'var(--color-primary-ocean)',
                color: 'var(--color-surface)',
                borderRadius: 'var(--space-xs)',
                padding: '2px 6px',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-weight-medium)'
              }}
            >
              #{tag}
            </span>
          ))}
          {destination.tags.length > (compact ? 2 : 4) && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              +{destination.tags.length - (compact ? 2 : 4)}
            </span>
          )}
        </div>
      )}

      {/* Action Arrow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        right: '12px',
        transform: 'translateY(-50%)',
        color: '#d1d5db',
        opacity: 0,
        transition: 'opacity 0.2s'
      }}>
        <ChevronRight size={16} />
      </div>
    </div>
  );

  // Show trip detail view if selected
  if (showTripView && selectedTrip) {
    return (
      <PublicTripView
        trip={selectedTrip}
        onBack={handleBackFromTripView}
        onImportTrip={handleTripImport}
      />
    );
  }

  // Show public trip search if in trips mode
  if (searchMode === 'trips') {
    return (
      <PublicTripSearch 
        onTripSelect={handleTripSelect} 
        onModeChange={setSearchMode}
        currentMode={searchMode}
      />
    );
  }

  return (
    <div style={{ 
      padding: 'var(--space-lg)',
      maxWidth: 'var(--container-max-width)',
      margin: '0 auto',
      minHeight: '100vh',
      background: 'var(--color-background)'
    }} className="theme-surface">
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
          <div>
            <h1 style={{ 
              margin: 0,
              fontSize: 'var(--text-3xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-sm)'
            }}>
              Suche
            </h1>
            <p style={{ 
              margin: 0,
              fontSize: 'var(--text-base)',
              color: 'var(--color-text-secondary)'
            }}>
              {searchMode === 'destinations' 
                ? 'Durchsuche deine Reiseziele und finde genau was du suchst'
                : 'Entdecke öffentliche Reisen von anderen Nutzern'
              }
            </p>
          </div>
          
          {/* Search Mode Toggle */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-xs)',
            display: 'flex',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <button
              onClick={() => setSearchMode('destinations')}
              style={{
                background: searchMode === 'destinations' ? 'var(--color-primary-ocean)' : 'transparent',
                color: searchMode === 'destinations' ? 'white' : 'var(--color-text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-sm) var(--space-md)',
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                transition: 'all var(--transition-normal)'
              }}
            >
              Meine Ziele
            </button>
            <button
              onClick={() => setSearchMode('trips')}
              style={{
                background: searchMode === 'trips' ? 'var(--color-primary-ocean)' : 'transparent',
                color: searchMode === 'trips' ? 'white' : 'var(--color-text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-sm) var(--space-md)',
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                transition: 'all var(--transition-normal)'
              }}
            >
              Öffentliche Reisen
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
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
              placeholder="Ziele, Orte, Tags durchsuchen..."
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
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary-ocean)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              background: showFilters ? 'var(--color-primary-ocean)' : 'var(--color-surface)',
              color: showFilters ? 'var(--color-surface)' : 'var(--color-text-secondary)',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all var(--transition-normal)',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}
          >
            <Filter size={18} />
            Filter
          </button>

          {/* View Mode Toggle */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '4px',
            display: 'flex',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                background: viewMode === 'list' ? 'var(--color-primary-ocean)' : 'transparent',
                color: viewMode === 'list' ? 'var(--color-surface)' : 'var(--color-text-secondary)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                transition: 'all var(--transition-normal)'
              }}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                background: viewMode === 'grid' ? 'var(--color-primary-ocean)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--color-surface)' : 'var(--color-text-secondary)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                transition: 'all var(--transition-normal)'
              }}
            >
              <Square size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              Filter
            </h3>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                style={{
                  background: 'transparent',
                  color: '#ef4444',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-xs)'
                }}
              >
                <X size={14} />
                Alle Filter löschen
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            {/* Categories */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                Kategorien
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {availableCategories.map(category => (
                  <button
                    key={category}
                    onClick={() => handleCategoryToggle(category)}
                    style={{
                      background: selectedCategories.includes(category) ? 'var(--color-primary-ocean)' : 'var(--color-neutral-mist)',
                      color: selectedCategories.includes(category) ? 'var(--color-surface)' : 'var(--color-text-secondary)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all var(--transition-normal)'
                    }}
                  >
                    {getCategoryIcon(category)}
                    {getCategoryLabel(category)}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                Status
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {Object.values(DestinationStatus).map(status => (
                  <button
                    key={status}
                    onClick={() => handleStatusToggle(status)}
                    style={{
                      background: selectedStatus.includes(status) ? getStatusColor(status) : 'var(--color-neutral-mist)',
                      color: selectedStatus.includes(status) ? 'var(--color-surface)' : 'var(--color-text-secondary)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'all var(--transition-normal)'
                    }}
                  >
                    {getStatusLabel(status)}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            {availableTags.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  Tags
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      style={{
                        background: selectedTags.includes(tag) ? '#1d4ed8' : '#eff6ff',
                        color: selectedTags.includes(tag) ? 'var(--color-surface)' : '#1d4ed8',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        transition: 'all var(--transition-normal)'
                      }}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#1e40af' }}>
            <strong>{searchResults.length}</strong> von <strong>{currentDestinations.length}</strong> Zielen gefunden
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {searchQuery && (
              <span style={{
                background: '#1d4ed8',
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
                background: '#10b981',
                color: 'var(--color-surface)',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '0.75rem'
              }}>
                {selectedCategories.length} Kategorie{selectedCategories.length > 1 ? 'n' : ''}
              </span>
            )}
            {selectedTags.length > 0 && (
              <span style={{
                background: '#f59e0b',
                color: 'var(--color-surface)',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '0.75rem'
              }}>
                {selectedTags.length} Tag{selectedTags.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {searchResults.length > 0 ? (
        <div style={{
          display: viewMode === 'grid' ? 'grid' : 'flex',
          gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : undefined,
          flexDirection: viewMode === 'list' ? 'column' : undefined,
          gap: viewMode === 'grid' ? '16px' : '12px'
        }}>
          {searchResults.map(destination => (
            <DestinationCard 
              key={destination.id} 
              destination={destination} 
              compact={viewMode === 'grid'}
            />
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
            <Search size={32} style={{ color: 'var(--color-text-secondary)' }} />
          </div>
          <h3 style={{ 
            margin: '0 0 8px 0',
            fontSize: '1.125rem',
            fontWeight: '600',
            color: 'var(--color-text-primary)'
          }}>
            Keine Ergebnisse gefunden
          </h3>
          <p style={{ 
            margin: 0,
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
            marginBottom: '16px'
          }}>
            {hasActiveFilters 
              ? 'Versuche deine Suchkriterien zu ändern oder Filter zu entfernen.'
              : 'Beginne mit der Eingabe um deine Ziele zu durchsuchen.'
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

export default SearchPage;