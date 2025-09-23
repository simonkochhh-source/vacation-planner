import React, { useState, useMemo } from 'react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { useAuth } from '../../contexts/AuthContext';
import { Trip } from '../../types';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import Card from '../Common/Card';
import {
  Search,
  MapPin,
  Calendar,
  Users,
  Globe,
  Lock,
  ChevronRight,
  Plus
} from 'lucide-react';
import { formatDate } from '../../utils';

interface TripSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrip: (trip: Trip) => void;
  excludeCurrentTrip?: boolean;
  title?: string;
  subtitle?: string;
}

const TripSelectionModal: React.FC<TripSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectTrip,
  excludeCurrentTrip = false,
  title = "Reise auswählen",
  subtitle = "Wählen Sie eine Reise aus."
}) => {
  const { trips, currentTrip } = useSupabaseApp();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter trips based on user ownership and current trip exclusion
  const availableTrips = useMemo(() => {
    if (!user) return [];
    
    return trips.filter(trip => {
      // Only show user's own trips for importing
      if (trip.ownerId !== user.id) return false;
      
      // Optionally exclude current trip
      if (excludeCurrentTrip && currentTrip && trip.id === currentTrip.id) {
        return false;
      }
      
      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          trip.name.toLowerCase().includes(query) ||
          trip.description?.toLowerCase().includes(query) ||
          trip.destinations?.some(d => d.name.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  }, [trips, user, currentTrip, excludeCurrentTrip, searchQuery]);

  const getPrivacyIcon = (privacy: Trip['privacy']) => {
    switch (privacy) {
      case 'public':
        return <Globe size={16} style={{ color: 'var(--color-success)' }} />;
      case 'contacts':
        return <Users size={16} style={{ color: 'var(--color-warning)' }} />;
      default:
        return <Lock size={16} style={{ color: 'var(--color-text-secondary)' }} />;
    }
  };

  const getPrivacyLabel = (privacy: Trip['privacy']) => {
    switch (privacy) {
      case 'public':
        return 'Öffentlich';
      case 'contacts':
        return 'Kontakte';
      default:
        return 'Privat';
    }
  };

  const handleSelectTrip = (trip: Trip) => {
    onSelectTrip(trip);
  };

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
        {availableTrips.length} Reise{availableTrips.length !== 1 ? 'n' : ''} verfügbar
      </div>
      <Button variant="secondary" onClick={onClose}>
        Abbrechen
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size="lg"
      footer={footer}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search 
            size={20} 
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
            placeholder="Reise suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: 'var(--space-md) var(--space-md) var(--space-md) 3rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-base)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)'
            }}
          />
        </div>

        {/* Trip List */}
        <div style={{ 
          maxHeight: '400px', 
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-md)'
        }}>
          {availableTrips.length === 0 ? (
            <Card>
              <div style={{ 
                textAlign: 'center', 
                padding: 'var(--space-xl)',
                color: 'var(--color-text-secondary)' 
              }}>
                {searchQuery ? (
                  <>
                    <Search size={48} style={{ margin: '0 auto var(--space-md)', opacity: 0.5 }} />
                    <p>Keine Reisen gefunden für "{searchQuery}"</p>
                  </>
                ) : (
                  <>
                    <Plus size={48} style={{ margin: '0 auto var(--space-md)', opacity: 0.5 }} />
                    <p>Keine Reisen verfügbar</p>
                    <p style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-sm)' }}>
                      Erstellen Sie zuerst eine neue Reise, um Ziele zu importieren.
                    </p>
                  </>
                )}
              </div>
            </Card>
          ) : (
            availableTrips.map((trip) => (
              <Card 
                key={trip.id}
                style={{ 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => handleSelectTrip(trip)}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  gap: 'var(--space-md)'
                }}>
                  <div style={{ flex: 1 }}>
                    {/* Trip Name */}
                    <h3 style={{ 
                      margin: '0 0 var(--space-sm) 0',
                      fontSize: 'var(--text-lg)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-text-primary)'
                    }}>
                      {trip.name}
                    </h3>

                    {/* Trip Details */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 'var(--space-xs)',
                      marginBottom: 'var(--space-sm)'
                    }}>
                      {trip.destinations && trip.destinations.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                          <MapPin size={14} style={{ color: 'var(--color-text-secondary)' }} />
                          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                            {trip.destinations.length} Ziel{trip.destinations.length !== 1 ? 'e' : ''}
                          </span>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                        <Calendar size={14} style={{ color: 'var(--color-text-secondary)' }} />
                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                          {formatDate(trip.startDate)}
                          {trip.endDate && trip.endDate !== trip.startDate && 
                            ` - ${formatDate(trip.endDate)}`
                          }
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                        {getPrivacyIcon(trip.privacy)}
                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                          {getPrivacyLabel(trip.privacy)}
                        </span>
                      </div>
                    </div>

                    {/* Trip Description */}
                    {trip.description && (
                      <p style={{ 
                        margin: 0,
                        fontSize: 'var(--text-sm)',
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {trip.description}
                      </p>
                    )}
                  </div>

                  {/* Select Arrow */}
                  <ChevronRight 
                    size={20} 
                    style={{ 
                      color: 'var(--color-text-secondary)',
                      flexShrink: 0,
                      marginTop: 'var(--space-xs)'
                    }} 
                  />
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};

export default TripSelectionModal;