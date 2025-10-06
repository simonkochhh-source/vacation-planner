import React, { useState, useEffect } from 'react';
import { useTripContext } from '../../contexts/TripContext';
import { useDestinationContext } from '../../contexts/DestinationContext';
import { useUIContext } from '../../contexts/UIContext';
import TripForm from '../Forms/TripForm';
import ModernButton from '../UI/ModernButton';
import Card from '../Common/Card';
import { 
  Plus,
  Plane,
  ChevronDown,
  ChevronRight,
  Edit3,
  Calendar,
  DollarSign,
  MapPin,
  Compass,
  Trash2,
  Menu,
  Route,
  Car,
  Mountain,
  Bike
} from 'lucide-react';
import { DestinationStatus, TransportMode } from '../../types';
import { formatCurrency, calculateTravelCosts, calculateDistance } from '../../utils';

interface SidebarProps {
  isOpen: boolean;
  isMobile?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, isMobile = false, onClose }) => {
  const { currentTrip, trips, setCurrentTrip, deleteTrip } = useTripContext();
  const { destinations } = useDestinationContext();
  const { settings, updateUIState } = useUIContext();

  const [showTrips, setShowTrips] = useState(true);
  const [showTripForm, setShowTripForm] = useState(false);
  const [showEditTripForm, setShowEditTripForm] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);
  const [headerHeight, setHeaderHeight] = useState(120); // Increased default for mobile

  // Calculate header height dynamically with better timing
  useEffect(() => {
    const updateHeaderHeight = () => {
      const header = document.querySelector('header');
      if (header) {
        const height = header.getBoundingClientRect().height;
        setHeaderHeight(height);
        console.log('Header height updated:', height);
      }
    };
    
    if (isMobile) {
      // Initial calculation with delay to ensure DOM is ready
      setTimeout(updateHeaderHeight, 100);
      
      // Also update on resize
      window.addEventListener('resize', updateHeaderHeight);
      
      // Update when orientation changes (mobile specific)
      window.addEventListener('orientationchange', () => {
        setTimeout(updateHeaderHeight, 200);
      });
      
      return () => {
        window.removeEventListener('resize', updateHeaderHeight);
        window.removeEventListener('orientationchange', updateHeaderHeight);
      };
    }
  }, [isMobile]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveDropdown(null);
    };

    if (activeDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeDropdown]);

  // Get current trip destinations
  const currentDestinations = currentTrip && destinations && Array.isArray(destinations)
    ? destinations.filter(dest => currentTrip.destinations?.includes(dest.id))
    : [];

  // Calculate stats with distance calculations
  const destinationCosts = currentDestinations.reduce((sum, d) => sum + (d.actualCost || 0), 0);
  const travelCosts = calculateTravelCosts(
    currentDestinations,
    settings?.fuelConsumption || 9.0,
    1.65
  );

  // Calculate distances (similar to Enhanced Timeline View)
  const calculateDistanceStats = () => {
    let totalDistance = 0;
    let drivingDistance = 0;
    let walkingDistance = 0;
    let bikingDistance = 0;

    // Sort destinations by date
    const sortedDestinations = [...currentDestinations].sort((a, b) => 
      new Date(a.startDate || a.createdAt).getTime() - new Date(b.startDate || b.createdAt).getTime()
    );

    // Calculate travel between consecutive destinations
    for (let i = 0; i < sortedDestinations.length - 1; i++) {
      const current = sortedDestinations[i];
      const next = sortedDestinations[i + 1];
      
      if (current.coordinates && next.coordinates) {
        const straightDistance = calculateDistance(current.coordinates, next.coordinates);
        const transportMode = current.transportToNext?.mode || TransportMode.DRIVING;
        
        // Apply transport-specific distance factor
        let distanceFactor: number;
        switch (transportMode) {
          case TransportMode.DRIVING:
            distanceFactor = 1.4; // Roads are typically 40% longer than straight line
            break;
          case TransportMode.WALKING:
            distanceFactor = 1.2; // Walking paths are typically 20% longer
            break;
          case TransportMode.BICYCLE:
            distanceFactor = 1.3; // Bike paths are typically 30% longer
            break;
          case TransportMode.PUBLIC_TRANSPORT:
            distanceFactor = 1.6; // Public transport routes are typically 60% longer
            break;
          default:
            distanceFactor = 1.4;
        }
        
        const actualDistance = straightDistance * distanceFactor;
        
        // Add to appropriate category and total
        switch (transportMode) {
          case TransportMode.DRIVING:
          case TransportMode.PUBLIC_TRANSPORT:
            drivingDistance += actualDistance;
            break;
          case TransportMode.WALKING:
            walkingDistance += actualDistance;
            break;
          case TransportMode.BICYCLE:
            bikingDistance += actualDistance;
            break;
        }
        
        totalDistance += actualDistance;
      }
    }

    return { totalDistance, drivingDistance, walkingDistance, bikingDistance };
  };

  const distanceStats = calculateDistanceStats();
  
  const stats = {
    totalDestinations: currentDestinations.length,
    completedDestinations: currentDestinations.filter(d => d.status === DestinationStatus.VISITED).length,
    totalCost: destinationCosts + travelCosts,
    plannedCost: currentDestinations.reduce((sum, d) => sum + (d.budget || 0), 0) + travelCosts,
    ...distanceStats
  };

  // Enhanced functions to handle header visibility
  const handleShowTripForm = () => {
    setShowTripForm(true);
    updateUIState({ hideHeader: true });
  };

  const handleCloseTripForm = () => {
    setShowTripForm(false);
    updateUIState({ hideHeader: false });
  };

  const handleShowEditTripForm = () => {
    setShowEditTripForm(true);
    updateUIState({ hideHeader: true });
  };

  const handleCloseEditTripForm = () => {
    setShowEditTripForm(false);
    updateUIState({ hideHeader: false });
  };

  const handleDeleteTrip = async (tripId: string) => {
    try {
      await deleteTrip(tripId);
      setTripToDelete(null);
      setActiveDropdown(null);
      
      // If the deleted trip was the current trip, clear it
      if (currentTrip?.id === tripId) {
        // Set to the first available trip or null
        if (trips.length > 1) {
          const remainingTrips = trips.filter(t => t.id !== tripId);
          setCurrentTrip(remainingTrips[0].id);
        }
      }
    } catch (error) {
      console.error('Fehler beim Löschen der Reise:', error);
      alert('Fehler beim Löschen der Reise. Bitte versuchen Sie es erneut.');
    }
  };

  const handleTripMenuClick = (tripId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent trip selection
    setActiveDropdown(activeDropdown === tripId ? null : tripId);
  };


  // Calculate trip duration in days
  const tripDays = currentTrip ? 
    Math.ceil((new Date(currentTrip.endDate).getTime() - new Date(currentTrip.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  // For mobile, always render but use transform to show/hide
  // For desktop, use the isOpen prop to control rendering
  if (!isMobile && !isOpen) return null;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && onClose && (
        <div
          style={{
            position: 'fixed',
            top: `${headerHeight + 4}px`, // Match sidebar positioning
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 39,
            opacity: 1,
            transition: 'opacity var(--transition-normal)'
          }}
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div 
        style={{
          position: isMobile ? 'fixed' : 'relative',
          top: isMobile ? `${headerHeight + 4}px` : 0, // Add small margin below header
          left: 0,
          height: isMobile ? `calc(100vh - ${headerHeight + 4}px)` : '100%',
          width: isMobile ? '280px' : 'var(--sidebar-width)',
          background: 'var(--color-background)',
          borderRight: isMobile ? 'none' : '1px solid var(--color-border)',
          overflowY: 'auto',
          zIndex: isMobile ? 40 : 10,
          padding: 'var(--space-lg)',
          boxShadow: isMobile ? 'var(--shadow-lg)' : 'none',
          transform: isMobile && isOpen ? 'translateX(0)' : isMobile ? 'translateX(-100%)' : 'none',
          transition: isMobile ? 'transform var(--transition-normal)' : 'none',
          flexShrink: 0
        }}
      >

      {/* Trips List */}
      <Card style={{ background: 'var(--color-surface)' }}>
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowTrips(!showTrips)}
          style={{
            marginBottom: showTrips ? 'var(--space-md)' : 0,
            padding: 'var(--space-sm)',
            margin: '-var(--space-sm) -var(--space-sm) var(--space-md) -var(--space-sm)',
            borderRadius: 'var(--radius-md)',
            transition: 'background-color var(--transition-fast)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-neutral-mist)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <h3 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-weight-semibold)',
            margin: 0,
            color: 'var(--color-text-primary)'
          }}>
            Alle Reisen ({trips.length})
          </h3>
          {showTrips ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>

        {showTrips && (
          <div style={{ marginTop: 'var(--space-md)' }}>
            <ModernButton
              variant="outlined"
              size="default"
              onClick={handleShowTripForm}
              leftIcon={<Plus size={16} />}
              style={{ 
                width: '100%',
                marginBottom: 'var(--space-md)',
                justifyContent: 'flex-start'
              }}
            >
              Neue Reise erstellen
            </ModernButton>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  className="cursor-pointer"
                  onClick={() => setCurrentTrip(trip.id)}
                  style={{
                    padding: 'var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-sm)',
                    border: `2px solid ${currentTrip?.id === trip.id ? 'var(--color-primary-sage)' : 'var(--color-border)'}`,
                    background: currentTrip?.id === trip.id ? 'var(--color-primary-sage)' : 'var(--color-surface)',
                    color: currentTrip?.id === trip.id ? 'white' : 'var(--color-text-primary)',
                    transition: 'all var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => {
                    if (currentTrip?.id !== trip.id) {
                      e.currentTarget.style.borderColor = 'var(--color-primary-ocean)';
                      e.currentTarget.style.backgroundColor = 'var(--color-neutral-mist)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentTrip?.id !== trip.id) {
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                      e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div style={{
                      background: currentTrip?.id === trip.id ? 'rgba(255,255,255,0.2)' : 'var(--color-primary-ocean)',
                      color: 'white',
                      padding: 'var(--space-xs)',
                      borderRadius: 'var(--radius-sm)',
                      minWidth: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <MapPin size={16} />
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--font-weight-medium)',
                        marginBottom: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {trip.name}
                      </div>
                      
                      <div style={{
                        fontSize: 'var(--text-xs)',
                        opacity: 0.8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-xs)'
                      }}>
                        <Calendar size={12} />
                        {trip.startDate ? new Date(trip.startDate).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: 'short'
                        }) : 'Datum offen'}
                      </div>
                    </div>

                    {/* Trip Actions Menu */}
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={(e) => handleTripMenuClick(trip.id, e)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 'var(--space-xs)',
                          borderRadius: 'var(--radius-sm)',
                          color: currentTrip?.id === trip.id ? 'white' : 'var(--color-text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          transition: 'background-color var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = currentTrip?.id === trip.id 
                            ? 'rgba(255,255,255,0.2)' 
                            : 'var(--color-neutral-mist)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <Menu size={14} />
                      </button>

                      {/* Dropdown Menu */}
                      {activeDropdown === trip.id && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          boxShadow: 'var(--shadow-md)',
                          zIndex: 1000,
                          minWidth: '160px',
                          marginTop: '4px'
                        }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdown(null);
                              setTripToDelete(trip.id);
                            }}
                            style={{
                              width: '100%',
                              padding: 'var(--space-sm) var(--space-md)',
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--color-error)',
                              fontSize: 'var(--text-sm)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-sm)',
                              borderRadius: 'var(--radius-sm)',
                              margin: 'var(--space-xs)',
                              transition: 'background-color var(--transition-fast)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--color-error-light)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <Trash2 size={14} />
                            Reise löschen
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Current Trip Section */}
      {currentTrip ? (
        <Card className="mb-6" style={{ background: 'var(--color-surface)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div style={{
                background: 'var(--color-primary-sage)',
                color: 'white',
                padding: 'var(--space-sm)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Compass size={20} />
              </div>
              <div>
                <h3 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'var(--text-lg)',
                  fontWeight: 'var(--font-weight-semibold)',
                  margin: 0,
                  color: 'var(--color-text-primary)'
                }}>
                  {currentTrip.name}
                </h3>
                <p style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                  margin: 0
                }}>
                  Aktuelle Reise
                </p>
              </div>
            </div>
            
            <ModernButton 
              variant="text" 
              size="sm"
              onClick={handleShowEditTripForm}
              title="Reise bearbeiten"
              leftIcon={<Edit3 size={16} />}
            >
              Bearbeiten
            </ModernButton>
          </div>

          {/* Trip Stats */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 'var(--text-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-primary-sage)',
                lineHeight: 1
              }}>
                {stats.totalDestinations}
              </div>
              <div style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Ziele
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 'var(--text-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-primary-ocean)',
                lineHeight: 1
              }}>
                {tripDays}
              </div>
              <div style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Tage
              </div>
            </div>
          </div>

          {/* Distance Stats */}
          {stats.totalDistance > 0 && (
            <div style={{
              background: 'var(--color-neutral-mist)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md)',
              marginBottom: 'var(--space-md)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-md)'
              }}>
                <Route size={16} style={{ color: 'var(--color-primary-ocean)' }} />
                <h4 style={{
                  margin: 0,
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-primary)'
                }}>
                  Gesamtdistanz: {Math.round(stats.totalDistance)}km
                </h4>
              </div>
              
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--space-sm)'
              }}>
                {stats.drivingDistance > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-xs)'
                  }}>
                    <Car size={12} style={{ color: 'var(--color-primary-ocean)' }} />
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {Math.round(stats.drivingDistance)}km
                    </span>
                  </div>
                )}
                
                {stats.walkingDistance > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-xs)'
                  }}>
                    <Mountain size={12} style={{ color: 'var(--color-success)' }} />
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {Math.round(stats.walkingDistance)}km
                    </span>
                  </div>
                )}
                
                {stats.bikingDistance > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-xs)'
                  }}>
                    <Bike size={12} style={{ color: 'var(--color-error)' }} />
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {Math.round(stats.bikingDistance)}km
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Budget Overview */}
          <div style={{
            background: 'linear-gradient(135deg, var(--color-primary-sage) 0%, var(--color-secondary-forest) 100%)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)',
            border: '2px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div className="flex items-center justify-between mb-3">
              <span style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'white'
              }}>
                Gesamtbudget
              </span>
              <DollarSign size={16} style={{ color: 'white' }} />
            </div>
            
            <div style={{ marginBottom: 'var(--space-sm)' }}>
              <div style={{
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'white',
                marginBottom: '4px'
              }}>
                {formatCurrency(currentTrip?.budget || 0)}
              </div>
              <div style={{
                fontSize: 'var(--text-xs)',
                color: 'rgba(255, 255, 255, 0.8)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Reisekosten
              </div>
            </div>

            <div style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.2)',
              paddingTop: 'var(--space-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  fontSize: 'var(--text-xs)',
                  color: 'rgba(255, 255, 255, 0.9)'
                }}>
                  Destinations
                </span>
                <span style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'white'
                }}>
                  {formatCurrency(destinationCosts)}
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  fontSize: 'var(--text-xs)',
                  color: 'rgba(255, 255, 255, 0.9)'
                }}>
                  Fahrtkosten
                </span>
                <span style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'white'
                }}>
                  {formatCurrency(travelCosts)}
                </span>
              </div>
              
              <div style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                paddingTop: '4px',
                marginTop: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'white'
                }}>
                  Gesamt
                </span>
                <span style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'white'
                }}>
                  {formatCurrency(stats.totalCost)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="mb-6" style={{ 
          background: 'var(--color-neutral-mist)',
          textAlign: 'center' 
        }}>
          <div style={{
            padding: 'var(--space-lg)',
            color: 'var(--color-text-secondary)'
          }}>
            <Plane size={32} style={{ 
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-md)',
              display: 'block',
              margin: '0 auto var(--space-md) auto'
            }} />
            <p style={{
              fontSize: 'var(--text-sm)',
              margin: 0,
              marginBottom: 'var(--space-md)'
            }}>
              Keine aktive Reise
            </p>
            <ModernButton 
              variant="filled" 
              size="default"
              onClick={handleShowTripForm}
              leftIcon={<Plus size={16} />}
            >
              Neue Reise planen
            </ModernButton>
          </div>
        </Card>
      )}

      {/* Trip Form Modal */}
      {showTripForm && (
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
          padding: 'var(--space-lg)'
        }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <TripForm isOpen={true} onClose={handleCloseTripForm} />
          </div>
        </div>
      )}

      {/* Edit Trip Form Modal */}
      {showEditTripForm && currentTrip && (
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
          padding: 'var(--space-lg)'
        }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <TripForm 
              isOpen={true}
              trip={currentTrip}
              onClose={handleCloseEditTripForm} 
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {tripToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-lg)'
        }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-xl)',
            maxWidth: '400px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-md)',
              marginBottom: 'var(--space-lg)'
            }}>
              <div style={{
                background: 'var(--color-error-light)',
                padding: 'var(--space-md)',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Trash2 size={24} style={{ color: 'var(--color-error)' }} />
              </div>
              <div>
                <h3 style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: 'var(--font-weight-semibold)',
                  margin: 0,
                  marginBottom: '4px',
                  color: 'var(--color-text-primary)'
                }}>
                  Reise löschen
                </h3>
                <p style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                  margin: 0
                }}>
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
              </div>
            </div>

            <p style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-lg)',
              lineHeight: 1.5
            }}>
              Sind Sie sicher, dass Sie die Reise <strong>"{trips.find(t => t.id === tripToDelete)?.name}"</strong> und alle zugehörigen Ziele löschen möchten?
            </p>

            <div style={{
              display: 'flex',
              gap: 'var(--space-md)',
              justifyContent: 'flex-end'
            }}>
              <ModernButton
                variant="outlined"
                onClick={() => setTripToDelete(null)}
              >
                Abbrechen
              </ModernButton>
              <ModernButton
                variant="filled"
                onClick={() => handleDeleteTrip(tripToDelete)}
                style={{
                  backgroundColor: 'var(--color-error)',
                  borderColor: 'var(--color-error)'
                }}
              >
                Löschen
              </ModernButton>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default Sidebar;