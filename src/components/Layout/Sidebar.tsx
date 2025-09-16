import React, { useState } from 'react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import TripForm from '../Forms/TripForm';
import Button from '../Common/Button';
import Card from '../Common/Card';
import { 
  Plus,
  Plane,
  ChevronDown,
  ChevronRight,
  X,
  Edit3,
  Calendar,
  DollarSign,
  MapPin,
  Compass
} from 'lucide-react';
import { DestinationStatus } from '../../types';
import { formatCurrency, calculateTravelCosts } from '../../utils';

interface SidebarProps {
  isOpen: boolean;
  isMobile?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, isMobile = false, onClose }) => {
  const { 
    currentTrip, 
    destinations, 
    trips, 
    setCurrentTrip,
    settings 
  } = useSupabaseApp();

  const [showTrips, setShowTrips] = useState(true);
  const [showTripForm, setShowTripForm] = useState(false);
  const [showEditTripForm, setShowEditTripForm] = useState(false);

  // Get current trip destinations
  const currentDestinations = currentTrip && destinations && Array.isArray(destinations)
    ? destinations.filter(dest => currentTrip.destinations?.includes(dest.id))
    : [];

  // Calculate stats
  const destinationCosts = currentDestinations.reduce((sum, d) => sum + (d.actualCost || 0), 0);
  const travelCosts = calculateTravelCosts(
    currentDestinations,
    settings?.fuelConsumption || 9.0,
    1.65
  );
  
  const stats = {
    totalDestinations: currentDestinations.length,
    completedDestinations: currentDestinations.filter(d => d.status === DestinationStatus.VISITED).length,
    totalCost: destinationCosts + travelCosts,
    plannedCost: currentDestinations.reduce((sum, d) => sum + (d.budget || 0), 0) + travelCosts
  };

  // Calculate budget progress (actual costs vs trip budget)
  const budgetProgress = (currentTrip?.budget && currentTrip.budget > 0) 
    ? (stats.totalCost / currentTrip.budget) * 100 
    : 0;

  // Calculate trip duration in days
  const tripDays = currentTrip ? 
    Math.ceil((new Date(currentTrip.endDate).getTime() - new Date(currentTrip.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: isMobile ? 'fixed' : 'sticky',
        top: isMobile ? 0 : 'var(--header-height)',
        left: 0,
        height: isMobile ? '100vh' : 'calc(100vh - var(--header-height))',
        width: isMobile ? '100vw' : 'var(--sidebar-width)',
        background: 'var(--color-background)',
        borderRight: isMobile ? 'none' : '1px solid var(--color-border)',
        overflowY: 'auto',
        zIndex: isMobile ? 40 : 10,
        padding: 'var(--space-lg)',
        boxShadow: isMobile ? 'var(--shadow-lg)' : 'none'
      }}
    >
      {/* Mobile Header */}
      {isMobile && onClose && (
        <div className="flex items-center justify-between mb-6">
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-xl)',
            fontWeight: 'var(--font-weight-semibold)',
            margin: 0,
            color: 'var(--color-text-primary)'
          }}>
            🏕️ Freedom Trail
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>
      )}

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
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowEditTripForm(true)}
              title="Reise bearbeiten"
            >
              <Edit3 size={16} />
            </Button>
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

          {/* Progress Bar */}
          <div style={{
            background: 'var(--color-neutral-mist)',
            borderRadius: 'var(--radius-full)',
            height: '8px',
            overflow: 'hidden',
            marginBottom: 'var(--space-md)'
          }}>
            <div style={{
              background: budgetProgress > 100 
                ? 'linear-gradient(90deg, var(--color-secondary-sunset) 0%, #dc2626 100%)'
                : 'linear-gradient(90deg, var(--color-primary-sage) 0%, var(--color-secondary-forest) 100%)',
              height: '100%',
              width: `${Math.min(budgetProgress, 100)}%`,
              borderRadius: 'var(--radius-full)',
              transition: 'width var(--transition-normal)'
            }} />
          </div>

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
              color: 'var(--color-neutral-stone)',
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
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => setShowTripForm(true)}
              leftIcon={<Plus size={16} />}
            >
              Neue Reise planen
            </Button>
          </div>
        </Card>
      )}

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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowTripForm(true)}
              leftIcon={<Plus size={16} />}
              style={{ 
                width: '100%',
                marginBottom: 'var(--space-md)',
                justifyContent: 'flex-start'
              }}
            >
              Neue Reise erstellen
            </Button>

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
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

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
            <TripForm isOpen={true} onClose={() => setShowTripForm(false)} />
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
              onClose={() => setShowEditTripForm(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;