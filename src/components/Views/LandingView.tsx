import React, { useState, useMemo, useEffect } from 'react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
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
  
  const [selectedSuggestion, setSelectedSuggestion] = useState<TravelSuggestion | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importingTripId, setImportingTripId] = useState<string | null>(null);

  // Generate personalized travel suggestions based on user behavior
  const generatePersonalizedSuggestions = (): TravelSuggestion[] => {
    const userDestinations = destinations;
    const userTrips = trips;
    
    // Analyze user preferences
    const categoryPreferences = userDestinations.reduce((acc, dest) => {
      acc[dest.category] = (acc[dest.category] || 0) + 1;
      return acc;
    }, {} as Record<DestinationCategory, number>);
    
    const mostVisitedCategories = Object.entries(categoryPreferences)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category as DestinationCategory);
    
    const averageBudget = userDestinations.length > 0
      ? userDestinations.reduce((sum, dest) => sum + (dest.budget || 0), 0) / userDestinations.length
      : 500;
    
    // Base suggestions with AI-like personalization
    const baseSuggestions: TravelSuggestion[] = [
      {
        id: 'alpine-adventure',
        title: 'Alpine Wanderparadies',
        description: 'Entdecke die schönsten Bergwege der Alpen mit kristallklaren Seen und majestätischen Gipfeln',
        reason: mostVisitedCategories.includes(DestinationCategory.NATURE) 
          ? 'Basierend auf deiner Liebe zur Natur' 
          : 'Neue Inspiration für Outdoor-Abenteuer',
        category: DestinationCategory.NATURE,
        estimatedBudget: Math.round(averageBudget * 1.2),
        estimatedDuration: 7,
        locations: ['Zermatt', 'Interlaken', 'Grindelwald', 'St. Moritz'],
        coordinates: { lat: 46.5197, lng: 7.4815 },
        difficulty: 'moderate',
        season: 'summer',
        tags: ['Berge', 'Wandern', 'Natur', 'Fotografie'],
        inspirationText: '🏔️ "Die Berge rufen - erlebe unvergessliche Momente zwischen Himmel und Erde!"'
      },
      {
        id: 'cultural-cities',
        title: 'Europäische Kulturmetropolen',
        description: 'Eine Reise durch die reichste Kulturgeschichte Europas - Museen, Architektur und Kunst',
        reason: mostVisitedCategories.includes(DestinationCategory.CULTURAL)
          ? 'Perfekt für deinen kulturellen Geschmack'
          : 'Erweitere deinen kulturellen Horizont',
        category: DestinationCategory.CULTURAL,
        estimatedBudget: Math.round(averageBudget * 1.5),
        estimatedDuration: 10,
        locations: ['Paris', 'Rom', 'Florenz', 'Wien'],
        coordinates: { lat: 48.8566, lng: 2.3522 },
        difficulty: 'easy',
        season: 'all',
        tags: ['Kultur', 'Museen', 'Architektur', 'Geschichte'],
        inspirationText: '🎭 "Tauche ein in jahrtausendealte Geschichte und erlebe Kunst, die die Welt bewegte!"'
      },
      {
        id: 'culinary-journey',
        title: 'Kulinarische Entdeckungsreise',
        description: 'Von Michelin-Sternen bis zu versteckten Lokaljuwelen - eine Reise für alle Sinne',
        reason: mostVisitedCategories.includes(DestinationCategory.RESTAURANT)
          ? 'Für den Genießer in dir'
          : 'Entdecke neue Geschmackswelten',
        category: DestinationCategory.RESTAURANT,
        estimatedBudget: Math.round(averageBudget * 1.8),
        estimatedDuration: 5,
        locations: ['Lyon', 'San Sebastián', 'Bologna', 'Kopenhagen'],
        coordinates: { lat: 45.7640, lng: 4.8357 },
        difficulty: 'easy',
        season: 'all',
        tags: ['Gourmet', 'Wein', 'Lokalität', 'Genuss'],
        inspirationText: '🍷 "Lass dich von authentischen Aromen verführen und entdecke kulinarische Schätze!"'
      },
      {
        id: 'coastal-retreat',
        title: 'Mediterrane Küstenträume',
        description: 'Entspannung pur: Türkisblaues Wasser, weiße Sandstrände und malerische Küstenstädtchen',
        reason: 'Perfekt für eine entspannende Auszeit',
        category: DestinationCategory.NATURE,
        estimatedBudget: Math.round(averageBudget * 1.3),
        estimatedDuration: 8,
        locations: ['Santorini', 'Amalfiküste', 'Mallorca', 'Côte d\'Azur'],
        coordinates: { lat: 36.3932, lng: 25.4615 },
        difficulty: 'easy',
        season: 'summer',
        tags: ['Strand', 'Entspannung', 'Sonne', 'Meer'],
        inspirationText: '🌊 "Spüre den Sand zwischen den Zehen und lass die Seele am Meer baumeln!"'
      },
      {
        id: 'winter-magic',
        title: 'Winterzauber & Wellness',
        description: 'Verschneite Landschaften, gemütliche Hütten und entspannende Wellness-Oasen',
        reason: 'Für magische Wintermomente',
        category: DestinationCategory.SPORTS,
        estimatedBudget: Math.round(averageBudget * 1.4),
        estimatedDuration: 6,
        locations: ['Tirol', 'Schwarzwald', 'Dolomiten', 'Salzburg'],
        coordinates: { lat: 47.2692, lng: 11.4041 },
        difficulty: 'moderate',
        season: 'winter',
        tags: ['Ski', 'Wellness', 'Winter', 'Erholung'],
        inspirationText: '❄️ "Erlebe die Stille verschneiter Wälder und wärme dich an knisternden Kaminfeuern!"'
      }
    ];

    // Filter and personalize based on user behavior
    return baseSuggestions
      .map(suggestion => ({
        ...suggestion,
        // Boost score if user has experience with this category
        score: mostVisitedCategories.includes(suggestion.category) ? 10 : 5
      }))
      .sort((a, b) => (b as any).score - (a as any).score)
      .slice(0, 4);
  };

  const personalizedSuggestions = useMemo(() => {
    return generatePersonalizedSuggestions();
  }, [destinations, trips]);

  // Welcome message based on time and user activity
  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    const userName = 'Explorer'; // TODO: Add displayName to AppSettings interface
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

      // Create destinations for each location
      for (let i = 0; i < suggestion.locations.length; i++) {
        const location = suggestion.locations[i];
        const startDate = new Date(Date.now() + i * 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        await createDestinationForTrip({
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
    <div className="app-container" style={{ padding: 'var(--space-lg)' }}>
      {/* Welcome Section */}
      <div className="text-center" style={{ marginBottom: 'var(--space-2xl)' }}>
        <div className="flex justify-center items-center" style={{ marginBottom: 'var(--space-lg)' }}>
          <div 
            className="flex items-center justify-center rounded-full" 
            style={{ 
              width: '80px', 
              height: '80px',
              backgroundColor: 'var(--color-primary-sage)',
              marginRight: 'var(--space-md)'
            }}
          >
            <Compass size={40} style={{ color: 'white' }} />
          </div>
          <div>
            <h1 style={{ 
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-3xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text-primary)',
              margin: 0
            }}>
              {welcomeData.greeting}
            </h1>
            <div className="flex items-center justify-center" style={{ gap: 'var(--space-xs)', marginTop: 'var(--space-xs)' }}>
              <Zap size={16} style={{ color: 'var(--color-primary-ocean)' }} />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                Deine persönlichen Reiseempfehlungen
              </span>
            </div>
          </div>
        </div>
        
        <p style={{ 
          fontSize: 'var(--text-lg)',
          color: 'var(--color-text-secondary)',
          maxWidth: '600px',
          margin: '0 auto var(--space-sm)',
          lineHeight: 1.6
        }}>
          {welcomeData.message}
        </p>
        
        <p style={{ 
          fontSize: 'var(--text-base)',
          color: 'var(--color-text-secondary)',
          fontStyle: 'italic'
        }}>
          {welcomeData.subtitle}
        </p>
      </div>

      {/* Travel Suggestions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {personalizedSuggestions.map((suggestion) => (
          <div 
            key={suggestion.id}
            className="card"
            style={{ 
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg)',
              transition: 'all var(--transition-normal)',
              cursor: 'pointer',
              position: 'relative'
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
            padding: 'var(--space-lg)'
          }}
          onClick={() => setShowImportModal(false)}
        >
          <div 
            className="card"
            style={{ 
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-2xl)',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start" style={{ marginBottom: 'var(--space-lg)' }}>
              <div>
                <h2 style={{ 
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'var(--text-2xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-text-primary)',
                  margin: 0
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
            <div className="flex" style={{ gap: 'var(--space-md)' }}>
              <button
                onClick={() => setShowImportModal(false)}
                className="btn btn-secondary flex-1"
                style={{
                  backgroundColor: 'transparent',
                  border: '2px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  padding: 'var(--space-md) var(--space-lg)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-base)',
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
                  padding: 'var(--space-md) var(--space-lg)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-base)',
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