import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTripContext } from '../../contexts/TripContext';
import { useDestinationContext } from '../../contexts/DestinationContext';
import { useUIContext } from '../../contexts/UIContext';
import { useResponsive } from '../../hooks/useResponsive';
import { Destination, DestinationCategory, DestinationStatus, Trip, canUserAccessTripAsync } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import PublicTripSearch from './PublicTripSearch';
import PublicTripView from '../Views/PublicTripView';
import TripImportService from '../../services/tripImportService';
import DestinationBrowser from './DestinationBrowser';
import TripImportModal from '../Destinations/TripImportModal';
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
  X,
  ArrowLeft,
  DollarSign,
  Camera,
  Mountain,
  Download
} from 'lucide-react';
import { 
  formatDate, 
  getCategoryIcon, 
  getCategoryLabel,
  calculateDistance,
  getDestinationBudget,
  formatCurrency
} from '../../utils';
import StatusBadge from '../UI/StatusBadge';
import { WeatherWidget } from '../Weather';
import PhotoPreview from '../Photos/PhotoPreview';
import { WeatherService } from '../../services/weatherService';

const SearchPage: React.FC = () => {
  const { currentTrip, trips, publicTrips } = useTripContext();
  const { destinations } = useDestinationContext();
  const { 
    searchQuery,
    selectedDestinationId,
    showDestinationDetails,
    selectedTripId,
    showTripDetails,
    updateUIState
  } = useUIContext();
  const { createTrip } = useTripContext();
  const { createDestination } = useDestinationContext();
  const { user: currentUser } = useAuth();
  const { isMobile } = useResponsive();
  
  const [selectedCategories, setSelectedCategories] = useState<DestinationCategory[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<DestinationStatus[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [searchMode, setSearchMode] = useState<'destinations' | 'trips' | 'destination-browser'>('destinations');
  const [showDestinationBrowser, setShowDestinationBrowser] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [showTripView, setShowTripView] = useState(false);
  const [accessibleDestinations, setAccessibleDestinations] = useState<Destination[]>([]);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [showDestinationDetail, setShowDestinationDetail] = useState(false);

  // Handle navigation from header search
  React.useEffect(() => {
    // Handle trip navigation
    if (selectedTripId && showTripDetails) {
      // Search in all trips, not just public trips, to include own trips and contact trips
      const trip = trips.find(t => t.id === selectedTripId);
      if (trip) {
        setSelectedTrip(trip);
        setShowTripView(true);
        // Clear the navigation state to prevent re-triggering
        updateUIState({ 
          selectedTripId: undefined, 
          showTripDetails: false 
        });
      } else {
        console.log(`🔍 [SearchPage] Trip with ID ${selectedTripId} not found in trips list`);
        console.log(`📊 [SearchPage] Available trips: ${trips.length}`);
        console.log(`📋 [SearchPage] Trip IDs: ${trips.map(t => t.id).join(', ')}`);
      }
    }

    // Handle destination navigation
    if (selectedDestinationId && showDestinationDetails) {
      const destination = accessibleDestinations.find(d => d.id === selectedDestinationId);
      if (destination) {
        setSelectedDestination(destination);
        setShowDestinationDetail(true);
        // Clear the navigation state to prevent re-triggering
        updateUIState({ 
          selectedDestinationId: undefined, 
          showDestinationDetails: false 
        });
      } else {
        console.log(`🔍 [SearchPage] Destination with ID ${selectedDestinationId} not found in accessible destinations`);
        console.log(`📊 [SearchPage] Available destinations: ${accessibleDestinations.length}`);
      }
    }
  }, [selectedTripId, showTripDetails, selectedDestinationId, showDestinationDetails, trips, accessibleDestinations, updateUIState]);

  // Load destinations from all accessible trips
  useEffect(() => {
    const loadAccessibleDestinations = async () => {
      if (!currentUser || trips.length === 0 || destinations.length === 0) {
        setAccessibleDestinations(destinations);
        return;
      }

      setIsLoadingDestinations(true);
      
      try {
        console.log(`🔍 [SearchPage] Loading accessible destinations from ${trips.length} trips`);
        
        const accessibleDestIds = new Set<string>();
        
        // Check each trip for accessibility
        for (const trip of trips) {
          const hasAccess = await canUserAccessTripAsync(trip, currentUser.id);
          
          if (hasAccess) {
            console.log(`✅ [SearchPage] Access granted to trip: "${trip.name}" (${trip.destinations.length} destinations)`);
            trip.destinations.forEach(destId => accessibleDestIds.add(destId));
          } else {
            console.log(`❌ [SearchPage] Access denied to trip: "${trip.name}"`);
          }
        }
        
        // Filter destinations to only include accessible ones
        const accessibleDests = destinations.filter(dest => accessibleDestIds.has(dest.id));
        
        console.log(`📊 [SearchPage] Accessible destinations: ${accessibleDests.length} of ${destinations.length} total`);
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

  // For search, always show all accessible destinations regardless of current trip
  const currentDestinations = accessibleDestinations;

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
    updateUIState({ searchQuery: '' });
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

  const handleImportDestination = async (destination: Destination, sourceTrip: Trip) => {
    try {
      if (!currentTrip) {
        alert('Bitte wähle zuerst eine Reise aus, in die das Ziel importiert werden soll.');
        return;
      }

      // Create a copy of the destination data for import
      const { id, createdAt, updatedAt, ...destinationData } = destination;
      
      
      const importedDestination = await createDestination(currentTrip?.id || '', {
        ...destinationData,
        // Keep original name without "Copy of" prefix
        name: destination.name,
        status: DestinationStatus.PLANNED, // Reset status for imported destinations
        notes: destination.notes ? 
          `${destination.notes}\n\n[Importiert aus "${sourceTrip.name}"]` : 
          `[Importiert aus "${sourceTrip.name}"]`
      }, currentTrip.id);

      // Show success message
      alert(`Ziel "${destination.name}" wurde erfolgreich in deine Reise importiert!`);
      
      // Close destination browser
      setShowDestinationBrowser(false);
      
    } catch (error) {
      console.error('Import failed:', error);
      alert(`Fehler beim Importieren: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
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
        setSelectedDestination(destination);
        setShowDestinationDetail(true);
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

  // Destination Detail View Component
  const DestinationDetailView: React.FC<{ destination: Destination; onBack: () => void }> = ({ 
    destination, 
    onBack 
  }) => {
    const [weatherDate, setWeatherDate] = useState<string>(destination.startDate);
    const [weatherInfo, setWeatherInfo] = useState<{
      weather?: any;
      seasonal?: string;
      type: 'current' | 'forecast' | 'seasonal';
    } | null>(null);
    const [isLoadingWeather, setIsLoadingWeather] = useState(false);
    const [showTripImport, setShowTripImport] = useState(false);

    // Load weather data when date changes
    useEffect(() => {
      const loadWeatherData = async () => {
        if (!destination.coordinates || !weatherDate) return;

        setIsLoadingWeather(true);
        try {
          const result = await WeatherService.getDestinationWeather(destination.coordinates, weatherDate);
          setWeatherInfo(result);
        } catch (error) {
          console.error('Failed to load weather:', error);
          setWeatherInfo(null);
        } finally {
          setIsLoadingWeather(false);
        }
      };

      loadWeatherData();
    }, [destination.coordinates, weatherDate]);

    // Get user's own trips for import (exclude current destination's trip)
    const userTrips = trips.filter(trip => 
      trip.ownerId === currentUser?.id && 
      !trip.destinations.includes(destination.id)
    );

    const handleImportComplete = async (targetTrip: Trip, selectedDate: string) => {
      try {
        // Call the copy function from supabase service
        const { SupabaseService } = await import('../../services/supabaseService');
        const copiedDestination = await SupabaseService.copyDestinationToTrip(destination.id, targetTrip.id);
        
        // Update the copied destination with the selected date
        if (copiedDestination && selectedDate !== destination.startDate) {
          await SupabaseService.updateDestination(copiedDestination.id, {
            startDate: selectedDate,
            endDate: selectedDate // For single-day imports, set end date same as start date
          });
        }
        
        console.log(`✅ Destination "${destination.name}" imported to trip "${targetTrip.name}" for date ${selectedDate}`);
        
        // Close modal
        setShowTripImport(false);
        
        // Show success message (you could replace this with a toast notification)
        alert(`Ziel "${destination.name}" wurde erfolgreich in die Reise "${targetTrip.name}" für den ${selectedDate} importiert!`);
      } catch (error) {
        console.error('Failed to import destination:', error);
        alert('Fehler beim Importieren des Ziels. Bitte versuchen Sie es erneut.');
        throw error; // Re-throw to handle in the modal
      }
    };

    return (
    <div style={{ 
      padding: 'var(--space-lg)',
      maxWidth: 'var(--container-max-width)',
      margin: '0 auto',
      minHeight: '100vh',
      background: 'var(--color-background)'
    }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-medium)',
            marginBottom: 'var(--space-lg)',
            padding: 'var(--space-sm)',
            borderRadius: 'var(--radius-md)',
            transition: 'all var(--transition-normal)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'var(--color-neutral-mist)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }}
        >
          <ArrowLeft size={16} />
          Zurück zur Suche
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--space-xl)',
          marginBottom: 'var(--space-lg)'
        }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: 'var(--radius-xl)',
              background: `linear-gradient(135deg, ${destination.color || 'var(--color-primary-sage)'} 0%, var(--color-secondary-forest) 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              color: 'white',
              flexShrink: 0,
              boxShadow: 'var(--shadow-lg)',
              border: '3px solid rgba(255, 255, 255, 0.3)'
            }}
          >
            {getCategoryIcon(destination.category)}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              margin: '0 0 var(--space-sm) 0',
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-3xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text-primary)',
              lineHeight: 1.2
            }}>
              {destination.name}
            </h1>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-lg)',
              marginBottom: 'var(--space-md)'
            }}>
              <MapPin size={20} style={{ color: 'var(--color-primary-ocean)' }} />
              <span>{destination.location}</span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-md)'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                background: 'var(--color-primary-sage)',
                color: 'white',
                padding: 'var(--space-sm) var(--space-lg)',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                boxShadow: 'var(--shadow-md)'
              }}>
                <Mountain size={16} />
                {getCategoryLabel(destination.category)}
              </div>
              
              {/* Import Button - only show if user has trips to import to */}
              {currentUser && userTrips.length > 0 && (
                <button
                  onClick={() => setShowTripImport(true)}
                  style={{
                    background: 'var(--color-secondary-sky)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-full)',
                    padding: 'var(--space-sm) var(--space-lg)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    boxShadow: 'var(--shadow-md)',
                    transition: 'all var(--transition-normal)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'var(--color-primary-ocean)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'var(--color-secondary-sky)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <Download size={16} />
                  In Reise importieren
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-2xl)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--color-border)'
      }}>
        {/* Details Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-xl)',
          marginBottom: 'var(--space-2xl)'
        }}>
          {/* Budget */}
          {(destination.budget || destination.actualCost) && (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: 'var(--space-md)'
              }}>
                <DollarSign size={18} style={{ color: 'var(--color-accent-campfire)' }} />
                <span>Budget</span>
              </div>
              <div style={{ 
                fontSize: 'var(--text-lg)', 
                color: 'var(--color-text-primary)',
                fontWeight: 'var(--font-weight-semibold)',
                marginBottom: 'var(--space-sm)'
              }}>
                {destination.budget && `Geplant: ${formatCurrency(destination.budget)}`}
              </div>
              {destination.actualCost && (
                <div style={{ 
                  fontSize: 'var(--text-base)', 
                  color: 'var(--color-text-secondary)'
                }}>
                  Ausgegeben: {formatCurrency(destination.actualCost)}
                </div>
              )}
            </div>
          )}

          {/* Weather Widget */}
          {destination.coordinates && (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: 'var(--space-md)'
              }}>
                <span>🌤️ Wetter</span>
              </div>
              
              {/* Date Input */}
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <input
                  type="date"
                  value={weatherDate}
                  onChange={(e) => setWeatherDate(e.target.value)}
                  style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-sm)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                    outline: 'none',
                    transition: 'border-color var(--transition-normal)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-primary-ocean)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                />
              </div>

              {/* Weather Display */}
              {isLoadingWeather ? (
                <div style={{
                  padding: 'var(--space-lg)',
                  background: 'var(--color-neutral-cream)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--text-sm)'
                }}>
                  🔄 Lade Wetterdaten...
                </div>
              ) : weatherInfo ? (
                weatherInfo.type === 'seasonal' ? (
                  <div style={{
                    padding: 'var(--space-lg)',
                    background: 'linear-gradient(135deg, var(--color-secondary-sky) 0%, var(--color-primary-ocean) 100%)',
                    borderRadius: 'var(--radius-md)',
                    color: 'white',
                    fontSize: 'var(--text-sm)',
                    lineHeight: 1.5
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-sm)',
                      marginBottom: 'var(--space-sm)',
                      fontSize: 'var(--text-base)',
                      fontWeight: 'var(--font-weight-semibold)'
                    }}>
                      🔮 Saisonale Vorhersage
                    </div>
                    {weatherInfo.seasonal}
                  </div>
                ) : weatherInfo.weather ? (
                  <WeatherWidget
                    coordinates={destination.coordinates}
                    date={weatherDate}
                    size="lg"
                    showDetails={true}
                  />
                ) : (
                  <div style={{
                    padding: 'var(--space-lg)',
                    background: 'var(--color-neutral-cream)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    color: 'var(--color-text-secondary)',
                    fontSize: 'var(--text-sm)'
                  }}>
                    ❌ Keine Wetterdaten verfügbar
                  </div>
                )
              ) : (
                <div style={{
                  padding: 'var(--space-lg)',
                  background: 'var(--color-neutral-cream)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--text-sm)'
                }}>
                  📍 Wähle ein Datum für die Wettervorhersage
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        {destination.notes && (
          <div style={{
            background: 'var(--color-neutral-mist)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-xl)',
            marginBottom: 'var(--space-xl)',
            border: '2px solid rgba(135, 169, 107, 0.1)'
          }}>
            <div style={{
              fontSize: 'var(--text-base)',
              color: 'var(--color-text-secondary)',
              fontWeight: 'var(--font-weight-medium)',
              marginBottom: 'var(--space-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)'
            }}>
              📝 Notizen
            </div>
            <div style={{
              fontSize: 'var(--text-base)',
              color: 'var(--color-text-primary)',
              lineHeight: 1.6,
              fontFamily: 'var(--font-body)'
            }}>
              {destination.notes}
            </div>
          </div>
        )}

        {/* Tags */}
        {destination.tags.length > 0 && (
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <div style={{
              fontSize: 'var(--text-base)',
              color: 'var(--color-text-secondary)',
              fontWeight: 'var(--font-weight-medium)',
              marginBottom: 'var(--space-md)'
            }}>
              🏷️ Tags
            </div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--space-md)'
            }}>
              {destination.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    background: 'var(--color-secondary-sky)',
                    color: 'white',
                    padding: 'var(--space-sm) var(--space-lg)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    boxShadow: 'var(--shadow-md)',
                    border: '2px solid rgba(255, 255, 255, 0.2)'
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Photo Preview Section */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-weight-medium)',
            marginBottom: 'var(--space-lg)'
          }}>
            <Camera size={20} style={{ color: 'var(--color-accent-campfire)' }} />
            <span>Fotos</span>
          </div>
          <PhotoPreview
            destinationId={destination.id}
            maxPreview={6}
            size="lg"
            className=""
          />
        </div>
      </div>

      {/* Trip Import Modal */}
      <TripImportModal
        destination={destination}
        isOpen={showTripImport}
        onClose={() => setShowTripImport(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
    );
  };

  // Show destination detail view if selected
  if (showDestinationDetail && selectedDestination) {
    return (
      <DestinationDetailView
        destination={selectedDestination}
        onBack={() => {
          setShowDestinationDetail(false);
          setSelectedDestination(null);
        }}
      />
    );
  }

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
  if ((searchMode as string) === 'trips') {
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
      padding: isMobile ? 'var(--space-md)' : 'var(--space-lg)',
      // iPhone safe area support
      paddingLeft: isMobile ? 'max(var(--space-md), env(safe-area-inset-left))' : 'var(--space-lg)',
      paddingRight: isMobile ? 'max(var(--space-md), env(safe-area-inset-right))' : 'var(--space-lg)',
      paddingBottom: isMobile ? 'max(var(--space-md), env(safe-area-inset-bottom))' : 'var(--space-lg)',
      maxWidth: 'var(--container-max-width)',
      margin: '0 auto',
      minHeight: '100vh',
      background: 'var(--color-background)'
    }} className="theme-surface">
      {/* Header */}
      <div style={{ marginBottom: isMobile ? 'var(--space-lg)' : 'var(--space-2xl)' }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'flex-start' : 'flex-start', 
          marginBottom: 'var(--space-md)',
          gap: isMobile ? 'var(--space-lg)' : 0
        }}>
          <div>
            <h1 style={{ 
              margin: 0,
              fontSize: isMobile ? 'var(--text-2xl)' : 'var(--text-3xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-sm)'
            }}>
              Suche
            </h1>
            <p style={{ 
              margin: 0,
              fontSize: isMobile ? 'var(--text-sm)' : 'var(--text-base)',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.4
            }}>
              {(searchMode as string) === 'destinations' 
                ? `${isMobile ? 'Durchsuche' : 'Durchsuche'} ${isLoadingDestinations ? 'alle zugänglichen Reiseziele' : `${currentDestinations.length} ${isMobile ? 'Ziele' : 'zugängliche Reiseziele aus allen deinen Reisen'}`} ${isMobile ? '' : 'und finde genau was du suchst'}`
                : (searchMode as string) === 'trips'
                  ? isMobile ? 'Öffentliche Reisen entdecken' : 'Entdecke öffentliche Reisen von anderen Nutzern'
                  : isMobile ? 'Ziele importieren' : 'Importiere Ziele aus anderen Reisen in deine eigene'
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
            flexDirection: isMobile ? 'column' : 'row',
            boxShadow: 'var(--shadow-sm)',
            width: isMobile ? '100%' : 'auto',
            gap: isMobile ? '2px' : 0
          }}>
            <button
              onClick={() => setSearchMode('destinations')}
              style={{
                background: (searchMode as string) === 'destinations' ? 'var(--color-primary-ocean)' : 'transparent',
                color: (searchMode as string) === 'destinations' ? 'white' : 'var(--color-text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: isMobile ? 'var(--space-md) var(--space-lg)' : 'var(--space-sm) var(--space-md)',
                cursor: 'pointer',
                fontSize: isMobile ? '16px' : 'var(--text-sm)', // Prevent zoom on iOS
                fontWeight: 'var(--font-weight-medium)',
                transition: 'all var(--transition-normal)',
                minHeight: isMobile ? '48px' : 'auto', // Touch target
                // iOS Safari optimizations
                WebkitTapHighlightColor: 'transparent',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none'
              }}
            >
              Alle Ziele
            </button>
            <button
              onClick={() => setSearchMode('trips')}
              style={{
                background: (searchMode as string) === 'trips' ? 'var(--color-primary-ocean)' : 'transparent',
                color: (searchMode as string) === 'trips' ? 'white' : 'var(--color-text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: isMobile ? 'var(--space-md) var(--space-lg)' : 'var(--space-sm) var(--space-md)',
                cursor: 'pointer',
                fontSize: isMobile ? '16px' : 'var(--text-sm)', // Prevent zoom on iOS
                fontWeight: 'var(--font-weight-medium)',
                transition: 'all var(--transition-normal)',
                minHeight: isMobile ? '48px' : 'auto', // Touch target
                // iOS Safari optimizations
                WebkitTapHighlightColor: 'transparent',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none'
              }}
            >
              Alle Reisen
            </button>
            <button
              onClick={() => setShowDestinationBrowser(true)}
              style={{
                background: 'transparent',
                color: 'var(--color-text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: isMobile ? 'var(--space-md) var(--space-lg)' : 'var(--space-sm) var(--space-md)',
                cursor: 'pointer',
                fontSize: isMobile ? '16px' : 'var(--text-sm)', // Prevent zoom on iOS
                fontWeight: 'var(--font-weight-medium)',
                transition: 'all var(--transition-normal)',
                minHeight: isMobile ? '48px' : 'auto', // Touch target
                // iOS Safari optimizations
                WebkitTapHighlightColor: 'transparent',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none'
              }}
            >
              {isMobile ? 'Importieren' : 'Ziele importieren'}
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: isMobile ? 'var(--space-lg)' : '24px' }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 'var(--space-md)' : '12px',
          alignItems: isMobile ? 'stretch' : 'center'
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
              <Search size={isMobile ? 18 : 20} />
            </div>
            <input
              type="text"
              placeholder={isMobile ? "Suchen..." : "Ziele, Orte, Tags durchsuchen..."}
              value={searchQuery}
              onChange={(e) => updateUIState({ searchQuery: e.target.value })}
              style={{
                width: '100%',
                padding: isMobile ? '16px 16px 16px 48px' : '16px 16px 16px 52px',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                fontSize: isMobile ? '16px' : '1rem', // Prevent zoom on iOS
                background: 'var(--color-surface)',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                minHeight: isMobile ? '48px' : 'auto', // Touch target
                // iOS Safari optimizations
                WebkitTapHighlightColor: 'transparent',
                WebkitAppearance: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary-ocean)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
            />
          </div>

          {/* Control Buttons Container */}
          <div style={{
            display: 'flex',
            gap: isMobile ? 'var(--space-sm)' : '12px',
            alignItems: 'center'
          }}>
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                background: showFilters ? 'var(--color-primary-ocean)' : 'var(--color-surface)',
                color: showFilters ? 'var(--color-surface)' : 'var(--color-text-secondary)',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: isMobile ? '12px 16px' : '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '6px' : '8px',
                fontSize: isMobile ? '14px' : '0.875rem',
                fontWeight: '500',
                transition: 'all var(--transition-normal)',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                flex: isMobile ? 1 : 'none',
                minHeight: isMobile ? '48px' : 'auto', // Touch target
                justifyContent: 'center',
                // iOS Safari optimizations
                WebkitTapHighlightColor: 'transparent',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none'
              }}
            >
              <Filter size={isMobile ? 16 : 18} />
              {isMobile ? 'Filter' : 'Filter'}
            </button>

            {/* View Mode Toggle */}
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '4px',
              display: 'flex',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              flex: isMobile ? 1 : 'none'
            }}>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  background: viewMode === 'list' ? 'var(--color-primary-ocean)' : 'transparent',
                  color: viewMode === 'list' ? 'var(--color-surface)' : 'var(--color-text-secondary)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: isMobile ? '12px' : '8px 12px',
                  cursor: 'pointer',
                  transition: 'all var(--transition-normal)',
                  flex: isMobile ? 1 : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: isMobile ? '40px' : 'auto',
                  // iOS Safari optimizations
                  WebkitTapHighlightColor: 'transparent'
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
                  padding: isMobile ? '12px' : '8px 12px',
                  cursor: 'pointer',
                  transition: 'all var(--transition-normal)',
                  flex: isMobile ? 1 : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: isMobile ? '40px' : 'auto',
                  // iOS Safari optimizations
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <Square size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: isMobile ? 'var(--space-lg)' : '24px',
          marginBottom: isMobile ? 'var(--space-lg)' : '24px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            marginBottom: isMobile ? 'var(--space-lg)' : '20px',
            gap: isMobile ? 'var(--space-md)' : 0
          }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: isMobile ? '1rem' : '1.125rem', 
              fontWeight: '600', 
              color: 'var(--color-text-primary)' 
            }}>
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
                  fontSize: isMobile ? '14px' : '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-xs)',
                  padding: isMobile ? 'var(--space-sm)' : 0,
                  minHeight: isMobile ? '40px' : 'auto',
                  // iOS Safari optimizations
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <X size={14} />
                {isMobile ? 'Zurücksetzen' : 'Alle Filter löschen'}
              </button>
            )}
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: isMobile ? 'var(--space-lg)' : '24px' 
          }}>
            {/* Categories */}
            <div>
              <h4 style={{ 
                margin: `0 0 ${isMobile ? '16px' : '12px'} 0`, 
                fontSize: isMobile ? '0.9rem' : '0.875rem', 
                fontWeight: '600', 
                color: '#374151' 
              }}>
                Kategorien
              </h4>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: isMobile ? '12px' : '8px' 
              }}>
                {availableCategories.map(category => (
                  <button
                    key={category}
                    onClick={() => handleCategoryToggle(category)}
                    style={{
                      background: selectedCategories.includes(category) ? 'var(--color-primary-ocean)' : 'var(--color-neutral-mist)',
                      color: selectedCategories.includes(category) ? 'var(--color-surface)' : 'var(--color-text-secondary)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: isMobile ? '12px 16px' : '8px 12px',
                      cursor: 'pointer',
                      fontSize: isMobile ? '14px' : '0.875rem',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all var(--transition-normal)',
                      minHeight: isMobile ? '44px' : 'auto', // Touch target
                      // iOS Safari optimizations
                      WebkitTapHighlightColor: 'transparent',
                      WebkitTouchCallout: 'none',
                      WebkitUserSelect: 'none'
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
              <h4 style={{ 
                margin: `0 0 ${isMobile ? '16px' : '12px'} 0`, 
                fontSize: isMobile ? '0.9rem' : '0.875rem', 
                fontWeight: '600', 
                color: '#374151' 
              }}>
                Status
              </h4>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: isMobile ? '12px' : '8px' 
              }}>
                {Object.values(DestinationStatus).map(status => (
                  <button
                    key={status}
                    onClick={() => handleStatusToggle(status)}
                    style={{
                      background: selectedStatus.includes(status) ? getStatusColor(status) : 'var(--color-neutral-mist)',
                      color: selectedStatus.includes(status) ? 'var(--color-surface)' : 'var(--color-text-secondary)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: isMobile ? '12px 16px' : '8px 12px',
                      cursor: 'pointer',
                      fontSize: isMobile ? '14px' : '0.875rem',
                      fontWeight: '500',
                      transition: 'all var(--transition-normal)',
                      minHeight: isMobile ? '44px' : 'auto', // Touch target
                      // iOS Safari optimizations
                      WebkitTapHighlightColor: 'transparent',
                      WebkitTouchCallout: 'none',
                      WebkitUserSelect: 'none'
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
                <h4 style={{ 
                  margin: `0 0 ${isMobile ? '16px' : '12px'} 0`, 
                  fontSize: isMobile ? '0.9rem' : '0.875rem', 
                  fontWeight: '600', 
                  color: '#374151' 
                }}>
                  Tags
                </h4>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: isMobile ? '10px' : '8px', 
                  maxHeight: isMobile ? '160px' : '120px', 
                  overflowY: 'auto' 
                }}>
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      style={{
                        background: selectedTags.includes(tag) ? '#1d4ed8' : '#eff6ff',
                        color: selectedTags.includes(tag) ? 'var(--color-surface)' : '#1d4ed8',
                        border: 'none',
                        borderRadius: '6px',
                        padding: isMobile ? '10px 14px' : '6px 10px',
                        cursor: 'pointer',
                        fontSize: isMobile ? '13px' : '0.75rem',
                        fontWeight: '500',
                        transition: 'all var(--transition-normal)',
                        minHeight: isMobile ? '36px' : 'auto', // Touch target
                        // iOS Safari optimizations
                        WebkitTapHighlightColor: 'transparent',
                        WebkitTouchCallout: 'none',
                        WebkitUserSelect: 'none'
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
          gridTemplateColumns: viewMode === 'grid' 
            ? isMobile 
              ? '1fr' // Single column on mobile
              : 'repeat(auto-fill, minmax(300px, 1fr))' 
            : undefined,
          flexDirection: viewMode === 'list' ? 'column' : undefined,
          gap: isMobile 
            ? viewMode === 'grid' ? '16px' : '12px'
            : viewMode === 'grid' ? '16px' : '12px'
        }}>
          {searchResults.map(destination => (
            <DestinationCard 
              key={destination.id} 
              destination={destination} 
              compact={viewMode === 'grid' && !isMobile} // Don't use compact on mobile
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

      {/* Destination Browser Modal */}
      <DestinationBrowser
        isOpen={showDestinationBrowser}
        onClose={() => setShowDestinationBrowser(false)}
        onImportDestination={handleImportDestination}
      />
    </div>
  );
};

export default SearchPage;