import React, { useState, useMemo, useEffect } from 'react';
import { useTripContext } from '../../contexts/TripContext';
import { useDestinationContext } from '../../contexts/DestinationContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Destination, 
  Trip, 
  DestinationCategory, 
  canUserAccessTripAsync 
} from '../../types';
import { 
  Search, 
  Filter,
  MapPin,
  Calendar,
  Star,
  Download,
  Eye,
  X,
  ChevronRight,
  Users,
  Globe,
  Lock
} from 'lucide-react';
import { 
  formatDate, 
  getCategoryIcon, 
  getCategoryLabel,
  formatCurrency 
} from '../../utils';

interface DestinationBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDestination: (destination: Destination, sourceTrip: Trip) => void;
}

const DestinationBrowser: React.FC<DestinationBrowserProps> = ({
  isOpen,
  onClose,
  onImportDestination
}) => {
  const { trips } = useTripContext();
  const { destinations } = useDestinationContext();
  const { user: currentUser } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<DestinationCategory[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [accessibleTrips, setAccessibleTrips] = useState<Trip[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);

  // Load accessible trips with permission checking
  useEffect(() => {
    const loadAccessibleTrips = async () => {
      if (!currentUser || trips.length === 0) {
        setAccessibleTrips([]);
        return;
      }

      setIsLoadingTrips(true);
      try {
        const accessibleTripsList: Trip[] = [];
        
        for (const trip of trips) {
          const hasAccess = await canUserAccessTripAsync(trip, currentUser.id);
          
          if (hasAccess) {
            accessibleTripsList.push(trip);
          }
        }
        
        setAccessibleTrips(accessibleTripsList);
      } catch (error) {
        console.error('Failed to load accessible trips:', error);
        setAccessibleTrips([]);
      } finally {
        setIsLoadingTrips(false);
      }
    };

    if (isOpen) {
      loadAccessibleTrips();
    }
  }, [trips, currentUser, isOpen]);

  // Get all destinations from accessible trips
  const accessibleDestinations = useMemo(() => {
    const destinationMap = new Map<string, { destination: Destination; sourceTrip: Trip }>();
    
    for (const trip of accessibleTrips) {
      for (const destId of trip.destinations) {
        const destination = destinations.find(d => d.id === destId);
        if (destination) {
          destinationMap.set(destination.id, { destination, sourceTrip: trip });
        }
      }
    }
    
    return Array.from(destinationMap.values());
  }, [accessibleTrips, destinations]);

  // Search and filter results
  const searchResults = useMemo(() => {
    let results = accessibleDestinations;

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(({ destination, sourceTrip }) => 
        destination.name.toLowerCase().includes(query) ||
        destination.location.toLowerCase().includes(query) ||
        destination.notes?.toLowerCase().includes(query) ||
        destination.tags.some(tag => tag.toLowerCase().includes(query)) ||
        sourceTrip.name.toLowerCase().includes(query) ||
        getCategoryLabel(destination.category).toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategories.length > 0) {
      results = results.filter(({ destination }) => 
        selectedCategories.includes(destination.category)
      );
    }

    // Sort by trip ownership and date
    results.sort((a, b) => {
      const aIsOwn = a.sourceTrip.ownerId === currentUser?.id;
      const bIsOwn = b.sourceTrip.ownerId === currentUser?.id;
      
      // Own trips last (user probably doesn't want to import from their own trips)
      if (aIsOwn && !bIsOwn) return 1;
      if (!aIsOwn && bIsOwn) return -1;
      
      // Then by date (newest first)
      return new Date(b.destination.startDate).getTime() - new Date(a.destination.startDate).getTime();
    });

    return results;
  }, [accessibleDestinations, searchQuery, selectedCategories, currentUser]);

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

  // Get privacy info for trip
  const getTripPrivacyInfo = (trip: Trip) => {
    const isOwn = currentUser && trip.ownerId === currentUser.id;
    return {
      label: isOwn ? 'Meine Reise' : (trip.privacy === 'public' ? 'Öffentlich' : 'Für Kontakte'),
      color: isOwn ? 'var(--color-primary-ocean)' : (trip.privacy === 'public' ? 'var(--color-success)' : 'var(--color-warning)'),
      icon: isOwn ? Users : (trip.privacy === 'public' ? Globe : Users)
    };
  };

  const DestinationCard: React.FC<{ 
    destination: Destination; 
    sourceTrip: Trip;
  }> = ({ destination, sourceTrip }) => {
    const privacyInfo = getTripPrivacyInfo(sourceTrip);
    const isOwnTrip = Boolean(currentUser && sourceTrip.ownerId === currentUser.id);
    
    return (
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-md)',
          transition: 'all var(--transition-normal)',
          boxShadow: 'var(--shadow-sm)',
          position: 'relative'
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
      >
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: 'var(--space-sm)'
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: 'var(--text-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-xs)'
            }}>
              {destination.name}
            </h3>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--space-xs)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-xs)'
            }}>
              <MapPin size={14} />
              <span>{destination.location}</span>
            </div>
            
            {/* Source Trip Info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-xs)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)'
            }}>
              <span>aus:</span>
              <div style={{
                background: privacyInfo.color,
                color: 'var(--color-surface)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 6px',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-weight-medium)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <privacyInfo.icon size={10} />
                {sourceTrip.name}
              </div>
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-sm)',
            marginLeft: 'var(--space-sm)'
          }}>
            {/* Category Icon */}
            <div style={{
              background: 'var(--color-neutral-mist)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px',
              color: 'var(--color-text-secondary)'
            }}>
              {getCategoryIcon(destination.category)}
            </div>
          </div>
        </div>

        {/* Date and Budget */}
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
              <span>€{destination.budget}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {destination.tags.length > 0 && (
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 'var(--space-xs)',
            marginBottom: 'var(--space-sm)'
          }}>
            {destination.tags.slice(0, 3).map(tag => (
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
            {destination.tags.length > 3 && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                +{destination.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: 'var(--space-sm)',
          paddingTop: 'var(--space-sm)',
          borderTop: '1px solid var(--color-border)'
        }}>
          <button
            onClick={() => onImportDestination(destination, sourceTrip)}
            disabled={isOwnTrip}
            style={{
              flex: 1,
              background: isOwnTrip ? 'var(--color-neutral-mist)' : 'var(--color-primary-ocean)',
              color: isOwnTrip ? 'var(--color-text-secondary)' : 'var(--color-surface)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-sm) var(--space-md)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-medium)',
              cursor: isOwnTrip ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-xs)',
              transition: 'background 0.2s',
              opacity: isOwnTrip ? 0.6 : 1
            }}
            title={isOwnTrip ? 'Eigene Ziele können nicht importiert werden' : 'Ziel in meine Reise importieren'}
          >
            <Download size={16} />
            {isOwnTrip ? 'Eigenes Ziel' : 'Importieren'}
          </button>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-md)'
    }}>
      <div style={{
        background: 'var(--color-background)',
        borderRadius: 'var(--radius-lg)',
        width: '90vw',
        maxWidth: '1200px',
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-xl)'
      }}>
        {/* Header */}
        <div style={{
          padding: 'var(--space-lg)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-xs)'
            }}>
              Ziele-Browser
            </h2>
            <p style={{
              margin: 0,
              fontSize: 'var(--text-base)',
              color: 'var(--color-text-secondary)'
            }}>
              Entdecke Ziele aus anderen Reisen und importiere sie in deine eigene
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--color-neutral-mist)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-secondary)',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--color-border)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'var(--color-neutral-mist)'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search and Controls */}
        <div style={{
          padding: 'var(--space-lg)',
          borderBottom: '1px solid var(--color-border)'
        }}>
          <div style={{
            display: 'flex',
            gap: 'var(--space-md)',
            alignItems: 'center',
            marginBottom: 'var(--space-md)'
          }}>
            {/* Search Input */}
            <div style={{ flex: 1, position: 'relative' }}>
              <Search 
                size={18} 
                style={{
                  position: 'absolute',
                  left: 'var(--space-md)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-secondary)'
                }}
              />
              <input
                type="text"
                placeholder="Ziele, Orte, Reisen durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--space-md) var(--space-md) var(--space-md) 3rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-base)',
                  background: 'var(--color-surface)',
                  outline: 'none',
                  transition: 'border-color 0.2s'
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
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-md)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                transition: 'all 0.2s'
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
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-md)'
              }}>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: 'var(--text-base)', 
                  fontWeight: 'var(--font-weight-semibold)', 
                  color: 'var(--color-text-primary)' 
                }}>
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
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)'
                    }}
                  >
                    <X size={14} />
                    Filter löschen
                  </button>
                )}
              </div>

              <div>
                <h4 style={{ 
                  margin: '0 0 var(--space-sm) 0', 
                  fontSize: 'var(--text-sm)', 
                  fontWeight: 'var(--font-weight-semibold)', 
                  color: 'var(--color-text-primary)' 
                }}>
                  Kategorien
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                  {Object.values(DestinationCategory).map(category => (
                    <button
                      key={category}
                      onClick={() => handleCategoryToggle(category)}
                      style={{
                        background: selectedCategories.includes(category) ? 'var(--color-primary-ocean)' : 'var(--color-neutral-mist)',
                        color: selectedCategories.includes(category) ? 'var(--color-surface)' : 'var(--color-text-secondary)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        padding: 'var(--space-sm) var(--space-md)',
                        cursor: 'pointer',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--font-weight-medium)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-xs)',
                        transition: 'all 0.2s'
                      }}
                    >
                      {getCategoryIcon(category)}
                      {getCategoryLabel(category)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Results Summary */}
          <div style={{
            background: 'var(--color-neutral-mist)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-sm) var(--space-md)',
            marginTop: 'var(--space-md)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)'
          }}>
            <strong>{searchResults.length}</strong> von <strong>{accessibleDestinations.length}</strong> Zielen gefunden
            {isLoadingTrips && <span style={{ marginLeft: 'var(--space-xs)', fontStyle: 'italic' }}>Laden...</span>}
          </div>
        </div>

        {/* Results */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: 'var(--space-lg)'
        }}>
          {searchResults.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: 'var(--space-md)'
            }}>
              {searchResults.map(({ destination, sourceTrip }) => (
                <DestinationCard 
                  key={`${destination.id}-${sourceTrip.id}`}
                  destination={destination} 
                  sourceTrip={sourceTrip}
                />
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: 'var(--space-2xl)',
              color: 'var(--color-text-secondary)'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: 'var(--color-neutral-mist)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-md)'
              }}>
                <Search size={32} />
              </div>
              <h3 style={{ 
                margin: '0 0 var(--space-xs) 0',
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)'
              }}>
                {isLoadingTrips ? 'Ziele werden geladen...' : 'Keine Ziele gefunden'}
              </h3>
              <p style={{ 
                margin: 0,
                fontSize: 'var(--text-base)',
                color: 'var(--color-text-secondary)'
              }}>
                {hasActiveFilters 
                  ? 'Versuche deine Suchkriterien zu ändern oder Filter zu entfernen.'
                  : isLoadingTrips 
                    ? 'Bitte warten...'
                    : 'Es gibt noch keine zugänglichen Ziele zu importieren.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DestinationBrowser;