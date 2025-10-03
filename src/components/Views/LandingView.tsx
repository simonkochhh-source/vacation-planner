import React, { useState, useMemo, useEffect } from 'react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { useAuth } from '../../contexts/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';
import { Destination, DestinationCategory, Trip, DestinationStatus, TripPrivacy } from '../../types';
import { 
  MapPin, 
  Calendar, 
  Star, 
  Compass, 
  Mountain, 
  Trees, 
  Coffee,
  Heart,
  TrendingUp,
  Zap,
  ArrowRight,
  Clock,
  Euro,
  Plus,
  Eye,
  X
} from 'lucide-react';
import { 
  formatDate, 
  getCategoryIcon, 
  getCategoryLabel,
  calculateDistance,
  getDestinationBudget 
} from '../../utils';
import TripImportService from '../../services/tripImportService';
import SocialActivityFeed from '../Social/SocialActivityFeed';

interface TravelSuggestion {
  id: string;
  title: string;
  description: string;
  reason: string;
  category: DestinationCategory;
  estimatedBudget: number;
  estimatedDuration: number;
  locations: string[];
  coordinates?: { lat: number; lng: number };
  difficulty: 'easy' | 'moderate' | 'challenging';
  season: 'spring' | 'summer' | 'autumn' | 'winter' | 'all';
  tags: string[];
  inspirationText: string;
}

const LandingView: React.FC = () => {
  const { 
    currentTrip,
    destinations,
    trips,
    publicTrips,
    createTrip,
    createDestinationForTrip,
    updateUIState,
    settings
  } = useSupabaseApp();
  
  const { userProfile } = useAuth();
  const { isMobile } = useResponsive();
  
  const [selectedSuggestion, setSelectedSuggestion] = useState<TravelSuggestion | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importingTripId, setImportingTripId] = useState<string | null>(null);

  // Generate personalized travel suggestions based on user behavior
  const generatePersonalizedSuggestions = (): TravelSuggestion[] => {
    const userDestinations = destinations;
    const userTrips = trips;
    
    // If user has no trips or destinations, return empty array (no mock suggestions)
    if (userDestinations.length === 0 && userTrips.length === 0) {
      return [];
    }
    
    // Only return suggestions based on actual user data
    // For now, return empty array until we implement real data-driven suggestions
    return [];
  };

  const personalizedSuggestions = useMemo(() => {
    return generatePersonalizedSuggestions();
  }, [destinations, trips]);

  // Welcome message based on time and user activity
  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    // Use user profile nickname (without @)
    const getUserName = () => {
      // Debug log to see what we have
      console.log('🔍 LandingView: userProfile:', userProfile);
      
      if (userProfile?.nickname) {
        const nickname = userProfile.nickname.startsWith('@') 
          ? userProfile.nickname.substring(1) 
          : userProfile.nickname;
        console.log('✅ LandingView: Using nickname:', nickname);
        return nickname;
      }
      
      console.log('⚠️ LandingView: No nickname found, using fallback');
      return 'Trailkeeper'; // Use your actual nickname as fallback
    };
    
    const userName = getUserName();
    const tripCount = trips.length;
    const destinationCount = destinations.length;

    let greeting;
    if (hour < 12) greeting = 'Guten Morgen';
    else if (hour < 18) greeting = 'Guten Tag';
    else greeting = 'Guten Abend';

    if (tripCount === 0) {
      return {
        greeting: `${greeting}, ${userName}! 👋`,
        message: 'Willkommen bei Trailkeeper! Bereit für dein erstes Abenteuer?',
        subtitle: 'Hier sind einige inspirierende Reiseideen, um deine Entdeckungsreise zu beginnen.'
      };
    } else {
      return {
        greeting: `${greeting}, ${userName}! 🌟`,
        message: `Du hast bereits ${tripCount} ${tripCount === 1 ? 'Reise' : 'Reisen'} mit ${destinationCount} ${destinationCount === 1 ? 'Ziel' : 'Zielen'} geplant.`,
        subtitle: 'Lass dich von neuen Abenteuern inspirieren, die perfekt zu deinen Vorlieben passen!'
      };
    }
  };

  const welcomeData = getWelcomeMessage();

  const getDifficultyIcon = (difficulty: TravelSuggestion['difficulty']) => {
    switch (difficulty) {
      case 'easy': return <Coffee size={16} style={{ color: 'var(--color-success)' }} />;
      case 'moderate': return <Mountain size={16} style={{ color: 'var(--color-warning)' }} />;
      case 'challenging': return <Trees size={16} style={{ color: 'var(--color-error)' }} />;
    }
  };

  const getSeasonIcon = (season: TravelSuggestion['season']) => {
    switch (season) {
      case 'spring': return '🌸';
      case 'summer': return '☀️';
      case 'autumn': return '🍂';
      case 'winter': return '❄️';
      case 'all': return '🌍';
    }
  };

  const handleImportSuggestion = async (suggestion: TravelSuggestion) => {
    try {
      setImportingTripId(suggestion.id);
      
      // Create new trip
      const newTrip = await createTrip({
        name: suggestion.title,
        description: suggestion.description,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + suggestion.estimatedDuration * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        budget: suggestion.estimatedBudget,
        participants: [],
        tags: suggestion.tags,
        privacy: TripPrivacy.PRIVATE
      });

      // Validate trip creation
      if (!newTrip || !newTrip.id) {
        throw new Error('Failed to create trip: Trip or Trip ID is missing');
      }

      console.log('✅ Trip created successfully:', newTrip.id, newTrip.name);

      // Create destinations for each location
      for (let i = 0; i < suggestion.locations.length; i++) {
        const location = suggestion.locations[i];
        const startDate = new Date(Date.now() + i * 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        console.log(`🎯 Creating destination ${i + 1}/${suggestion.locations.length}:`, location, 'for trip:', newTrip.id);
        
        const newDestination = await createDestinationForTrip({
          name: `${location} - ${suggestion.title}`,
          location: location,
          coordinates: suggestion.coordinates,
          category: suggestion.category,
          startDate,
          endDate: startDate,
          status: DestinationStatus.PLANNED,
          budget: Math.round(suggestion.estimatedBudget / suggestion.locations.length),
          notes: suggestion.description,
          tags: suggestion.tags
        }, newTrip.id);
        
        if (!newDestination) {
          console.warn('⚠️ Destination creation returned null/undefined for:', location);
        } else {
          console.log('✅ Destination created:', newDestination.name, newDestination.id);
        }
      }

      // Navigate to the new trip
      updateUIState({ currentView: 'list' });
      
    } catch (error) {
      console.error('Error importing suggestion:', error);
    } finally {
      setImportingTripId(null);
    }
  };

  const handleViewSuggestion = (suggestion: TravelSuggestion) => {
    setSelectedSuggestion(suggestion);
    setShowImportModal(true);
  };

  return (
    <div className="app-container" style={{ 
      padding: isMobile ? 'var(--space-md)' : 'var(--space-lg)',
      maxWidth: '100%',
      overflow: 'hidden'
    }}>
      {/* Welcome Section */}
      <div className="text-center" style={{ 
        marginBottom: isMobile ? 'var(--space-xl)' : 'var(--space-2xl)'
      }}>
        <div className={isMobile ? "flex flex-col items-center" : "flex justify-center items-center"} style={{ 
          marginBottom: isMobile ? 'var(--space-md)' : 'var(--space-lg)',
          gap: isMobile ? 'var(--space-md)' : 0
        }}>
          <div 
            className="flex items-center justify-center rounded-full" 
            style={{ 
              width: isMobile ? '60px' : '80px', 
              height: isMobile ? '60px' : '80px',
              backgroundColor: 'var(--color-primary-sage)',
              marginRight: isMobile ? 0 : 'var(--space-md)',
              flexShrink: 0
            }}
          >
            <Compass size={isMobile ? 30 : 40} style={{ color: 'white' }} />
          </div>
          <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
            <h1 style={{ 
              fontFamily: 'var(--font-heading)',
              fontSize: isMobile ? 'var(--text-2xl)' : 'var(--text-3xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text-primary)',
              margin: 0,
              lineHeight: 1.2
            }}>
              {welcomeData.greeting}
            </h1>
            <div className="flex items-center justify-center" style={{ 
              gap: 'var(--space-xs)', 
              marginTop: 'var(--space-xs)',
              flexWrap: 'wrap'
            }}>
              <Zap size={16} style={{ color: 'var(--color-primary-ocean)' }} />
              <span style={{ 
                fontSize: isMobile ? 'var(--text-xs)' : 'var(--text-sm)', 
                color: 'var(--color-text-secondary)',
                textAlign: 'center'
              }}>
                Deine persönlichen Reiseempfehlungen
              </span>
            </div>
          </div>
        </div>
        
        <p style={{ 
          fontSize: isMobile ? 'var(--text-base)' : 'var(--text-lg)',
          color: 'var(--color-text-secondary)',
          maxWidth: isMobile ? '100%' : '600px',
          margin: `0 auto var(--space-sm)`,
          lineHeight: 1.6,
          padding: isMobile ? '0 var(--space-xs)' : 0
        }}>
          {welcomeData.message}
        </p>
        
        <p style={{ 
          fontSize: isMobile ? 'var(--text-sm)' : 'var(--text-base)',
          color: 'var(--color-text-secondary)',
          fontStyle: 'italic',
          padding: isMobile ? '0 var(--space-sm)' : 0
        }}>
          {welcomeData.subtitle}
        </p>
      </div>

      {/* Social Activity Feed Section */}
      <div style={{ 
        maxWidth: '1200px', 
        margin: isMobile ? '0 auto var(--space-xl)' : '0 auto var(--space-2xl)',
        padding: isMobile ? '0' : 'var(--space-md)'
      }}>
        <SocialActivityFeed maxItems={isMobile ? 5 : 8} compact={true} />
      </div>

      {/* Travel Suggestions Grid */}
      <div className={`grid grid-cols-1 ${isMobile ? '' : 'md:grid-cols-2'} gap-${isMobile ? '4' : '6'}`} style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        padding: isMobile ? '0' : 'var(--space-md)'
      }}>
        {personalizedSuggestions.map((suggestion) => (
          <div 
            key={suggestion.id}
            className="card"
            style={{ 
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: isMobile ? 'var(--space-md)' : 'var(--space-lg)',
              transition: 'all var(--transition-normal)',
              cursor: 'pointer',
              position: 'relative',
              marginBottom: isMobile ? 'var(--space-md)' : 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              e.currentTarget.style.borderColor = 'var(--color-primary-ocean)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            {/* Header */}
            <div className="flex justify-between items-start" style={{ marginBottom: 'var(--space-md)' }}>
              <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
                <span style={{ fontSize: 'var(--text-lg)' }}>{getCategoryIcon(suggestion.category)}</span>
                <div>
                  <h3 style={{ 
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--text-xl)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-primary)',
                    margin: 0
                  }}>
                    {suggestion.title}
                  </h3>
                  <div className="flex items-center" style={{ gap: 'var(--space-xs)', marginTop: 'var(--space-xs)' }}>
                    <TrendingUp size={14} style={{ color: 'var(--color-primary-ocean)' }} />
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-ocean)' }}>
                      {suggestion.reason}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center" style={{ gap: 'var(--space-xs)' }}>
                {getDifficultyIcon(suggestion.difficulty)}
                <span style={{ fontSize: 'var(--text-lg)' }}>{getSeasonIcon(suggestion.season)}</span>
              </div>
            </div>

            {/* Inspiration Text */}
            <div 
              className="card"
              style={{ 
                backgroundColor: 'var(--color-neutral-cream)',
                padding: 'var(--space-md)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-md)',
                border: 'none'
              }}
            >
              <p style={{ 
                fontSize: 'var(--text-base)',
                color: 'var(--color-text-primary)',
                fontStyle: 'italic',
                margin: 0,
                lineHeight: 1.5
              }}>
                {suggestion.inspirationText}
              </p>
            </div>

            {/* Description */}
            <p style={{ 
              fontSize: 'var(--text-base)',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              marginBottom: 'var(--space-md)'
            }}>
              {suggestion.description}
            </p>

            {/* Locations */}
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <div className="flex items-center" style={{ gap: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
                <MapPin size={16} style={{ color: 'var(--color-text-secondary)' }} />
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
                  Highlights
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                {suggestion.locations.map((location) => (
                  <span 
                    key={location}
                    style={{ 
                      fontSize: 'var(--text-xs)',
                      padding: 'var(--space-xs) var(--space-sm)',
                      backgroundColor: 'var(--color-primary-sage)',
                      color: 'white',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 'var(--font-weight-medium)'
                    }}
                  >
                    {location}
                  </span>
                ))}
              </div>
            </div>

            {/* Meta Information */}
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-lg)' }}>
              <div className="flex items-center" style={{ gap: 'var(--space-lg)' }}>
                <div className="flex items-center" style={{ gap: 'var(--space-xs)' }}>
                  <Clock size={16} style={{ color: 'var(--color-text-secondary)' }} />
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                    {suggestion.estimatedDuration} Tage
                  </span>
                </div>
                <div className="flex items-center" style={{ gap: 'var(--space-xs)' }}>
                  <Euro size={16} style={{ color: 'var(--color-text-secondary)' }} />
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                    ~{suggestion.estimatedBudget}€
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex" style={{ gap: 'var(--space-sm)' }}>
              <button
                onClick={() => handleViewSuggestion(suggestion)}
                className="btn flex-1"
                style={{
                  backgroundColor: 'transparent',
                  border: '2px solid var(--color-primary-ocean)',
                  color: 'var(--color-primary-ocean)',
                  padding: 'var(--space-sm) var(--space-md)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  transition: 'all var(--transition-normal)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-xs)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-ocean)';
                  e.currentTarget.style.color = 'white';
                  e.stopPropagation();
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--color-primary-ocean)';
                  e.stopPropagation();
                }}
              >
                <Eye size={16} />
                Details
              </button>
              
              <button
                onClick={() => handleImportSuggestion(suggestion)}
                disabled={importingTripId === suggestion.id}
                className="btn btn-primary flex-1"
                style={{
                  backgroundColor: 'var(--color-primary-sage)',
                  color: 'white',
                  border: 'none',
                  padding: 'var(--space-sm) var(--space-md)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  transition: 'all var(--transition-normal)',
                  cursor: importingTripId === suggestion.id ? 'not-allowed' : 'pointer',
                  opacity: importingTripId === suggestion.id ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-xs)'
                }}
                onMouseEnter={(e) => {
                  if (importingTripId !== suggestion.id) {
                    e.currentTarget.style.backgroundColor = 'var(--color-secondary-forest)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.stopPropagation();
                  }
                }}
                onMouseLeave={(e) => {
                  if (importingTripId !== suggestion.id) {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-sage)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.stopPropagation();
                  }
                }}
              >
                {importingTripId === suggestion.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Importiere...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Zur Reise hinzufügen
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Suggestion Detail Modal */}
      {showImportModal && selectedSuggestion && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: isMobile ? 'var(--space-sm)' : 'var(--space-lg)'
          }}
          onClick={() => setShowImportModal(false)}
        >
          <div 
            className="card"
            style={{ 
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              padding: isMobile ? 'var(--space-lg)' : 'var(--space-2xl)',
              maxWidth: isMobile ? '100%' : '600px',
              width: '100%',
              maxHeight: isMobile ? '90vh' : '80vh',
              overflow: 'auto',
              margin: isMobile ? 'var(--space-sm)' : 0
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start" style={{ marginBottom: 'var(--space-lg)' }}>
              <div>
                <h2 style={{ 
                  fontFamily: 'var(--font-heading)',
                  fontSize: isMobile ? 'var(--text-xl)' : 'var(--text-2xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-text-primary)',
                  margin: 0,
                  lineHeight: 1.3
                }}>
                  {selectedSuggestion.title}
                </h2>
                <p style={{ 
                  fontSize: 'var(--text-base)',
                  color: 'var(--color-text-secondary)',
                  margin: 'var(--space-xs) 0 0 0'
                }}>
                  {selectedSuggestion.reason}
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 'var(--space-xs)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Inspiration Text */}
            <div 
              className="card"
              style={{ 
                backgroundColor: 'var(--color-neutral-cream)',
                padding: 'var(--space-lg)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-lg)',
                border: 'none'
              }}
            >
              <p style={{ 
                fontSize: 'var(--text-lg)',
                color: 'var(--color-text-primary)',
                fontStyle: 'italic',
                margin: 0,
                lineHeight: 1.6,
                textAlign: 'center'
              }}>
                {selectedSuggestion.inspirationText}
              </p>
            </div>

            {/* Description */}
            <p style={{ 
              fontSize: 'var(--text-base)',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              marginBottom: 'var(--space-lg)'
            }}>
              {selectedSuggestion.description}
            </p>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 'var(--space-lg)' }}>
              <div>
                <h4 style={{ 
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-primary)',
                  margin: '0 0 var(--space-xs) 0'
                }}>
                  Dauer
                </h4>
                <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', margin: 0 }}>
                  {selectedSuggestion.estimatedDuration} Tage
                </p>
              </div>
              <div>
                <h4 style={{ 
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-primary)',
                  margin: '0 0 var(--space-xs) 0'
                }}>
                  Budget
                </h4>
                <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', margin: 0 }}>
                  ~{selectedSuggestion.estimatedBudget}€
                </p>
              </div>
              <div>
                <h4 style={{ 
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-primary)',
                  margin: '0 0 var(--space-xs) 0'
                }}>
                  Schwierigkeit
                </h4>
                <div className="flex items-center" style={{ gap: 'var(--space-xs)' }}>
                  {getDifficultyIcon(selectedSuggestion.difficulty)}
                  <span style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)' }}>
                    {selectedSuggestion.difficulty === 'easy' ? 'Einfach' : 
                     selectedSuggestion.difficulty === 'moderate' ? 'Moderat' : 'Anspruchsvoll'}
                  </span>
                </div>
              </div>
              <div>
                <h4 style={{ 
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-primary)',
                  margin: '0 0 var(--space-xs) 0'
                }}>
                  Beste Reisezeit
                </h4>
                <div className="flex items-center" style={{ gap: 'var(--space-xs)' }}>
                  <span style={{ fontSize: 'var(--text-base)' }}>{getSeasonIcon(selectedSuggestion.season)}</span>
                  <span style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)' }}>
                    {selectedSuggestion.season === 'all' ? 'Ganzjährig' : 
                     selectedSuggestion.season === 'spring' ? 'Frühling' :
                     selectedSuggestion.season === 'summer' ? 'Sommer' :
                     selectedSuggestion.season === 'autumn' ? 'Herbst' : 'Winter'}
                  </span>
                </div>
              </div>
            </div>

            {/* Locations */}
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <h4 style={{ 
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                margin: '0 0 var(--space-sm) 0'
              }}>
                Reiseziele
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                {selectedSuggestion.locations.map((location) => (
                  <span 
                    key={location}
                    style={{ 
                      fontSize: 'var(--text-sm)',
                      padding: 'var(--space-sm) var(--space-md)',
                      backgroundColor: 'var(--color-primary-sage)',
                      color: 'white',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 'var(--font-weight-medium)'
                    }}
                  >
                    {location}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'}`} style={{ 
              gap: isMobile ? 'var(--space-sm)' : 'var(--space-md)'
            }}>
              <button
                onClick={() => setShowImportModal(false)}
                className="btn btn-secondary flex-1"
                style={{
                  backgroundColor: 'transparent',
                  border: '2px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  padding: isMobile ? 'var(--space-md) var(--space-lg)' : 'var(--space-md) var(--space-lg)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: isMobile ? 'var(--text-base)' : 'var(--text-base)',
                  minHeight: isMobile ? '48px' : 'auto',
                  fontWeight: 'var(--font-weight-medium)',
                  transition: 'all var(--transition-normal)',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-neutral-mist)';
                  e.currentTarget.style.borderColor = 'var(--color-primary-ocean)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                }}
              >
                Schließen
              </button>
              
              <button
                onClick={() => {
                  handleImportSuggestion(selectedSuggestion);
                  setShowImportModal(false);
                }}
                disabled={importingTripId === selectedSuggestion.id}
                className="btn btn-primary flex-1"
                style={{
                  backgroundColor: 'var(--color-primary-sage)',
                  color: 'white',
                  border: 'none',
                  padding: isMobile ? 'var(--space-md) var(--space-lg)' : 'var(--space-md) var(--space-lg)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: isMobile ? 'var(--text-base)' : 'var(--text-base)',
                  minHeight: isMobile ? '48px' : 'auto',
                  fontWeight: 'var(--font-weight-medium)',
                  transition: 'all var(--transition-normal)',
                  cursor: importingTripId === selectedSuggestion.id ? 'not-allowed' : 'pointer',
                  opacity: importingTripId === selectedSuggestion.id ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-sm)'
                }}
                onMouseEnter={(e) => {
                  if (importingTripId !== selectedSuggestion.id) {
                    e.currentTarget.style.backgroundColor = 'var(--color-secondary-forest)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (importingTripId !== selectedSuggestion.id) {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-sage)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {importingTripId === selectedSuggestion.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Erstelle Reise...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Reise erstellen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingView;