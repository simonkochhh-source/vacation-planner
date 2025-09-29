import React from 'react';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Euro, 
  Clock,
  ChevronRight,
  Camera,
  Route
} from 'lucide-react';
import { Trip, TripStatus } from '../../types';
import { useResponsive } from '../../hooks/useResponsive';

interface MobileTripCardProps {
  trip: Trip;
  onClick?: () => void;
  className?: string;
}

const MobileTripCard: React.FC<MobileTripCardProps> = ({ 
  trip, 
  onClick,
  className = ''
}) => {
  const { isMobile } = useResponsive();

  // Don't render on desktop - use regular trip card
  if (!isMobile) return null;

  const getStatusColor = (status: TripStatus) => {
    switch (status) {
      case 'completed':
        return 'var(--color-success-50)';
      case 'active':
        return 'var(--color-primary)';
      case 'cancelled':
        return 'var(--color-error-50)';
      default:
        return 'var(--color-warning-50)';
    }
  };

  const getStatusText = (status: TripStatus) => {
    switch (status) {
      case 'completed':
        return 'Abgeschlossen';
      case 'active':
        return 'Aktiv';
      case 'cancelled':
        return 'Storniert';
      default:
        return 'Geplant';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const destinationCount = trip.destinations?.length || 0;
  const budget = trip.budget || 0;
  const actualCost = trip.actualCost || 0;
  const participants = trip.participants?.length || 1;

  return (
    <div
      className={`mobile-trip-card ${className}`}
      onClick={onClick}
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        boxShadow: 'var(--elevation-2)',
        marginBottom: 'var(--space-4)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all var(--motion-duration-short)',
        border: '1px solid var(--color-outline-variant)'
      }}
    >
      {/* Header with gradient background */}
      <div
        className="mobile-trip-card-header"
        style={{
          background: trip.coverImage 
            ? `linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.7)), url(${trip.coverImage})`
            : 'linear-gradient(135deg, var(--color-primary-container), var(--color-primary))',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: 'var(--space-4)',
          color: 'white',
          minHeight: '120px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: 'var(--mobile-text-lg)',
              fontWeight: 'var(--font-weight-bold)',
              marginBottom: 'var(--space-1)',
              lineHeight: 'var(--line-height-tight)'
            }}>
              {trip.name}
            </h3>
            {trip.description && (
              <p style={{
                fontSize: 'var(--mobile-text-sm)',
                opacity: 0.9,
                lineHeight: 'var(--line-height-normal)',
                marginBottom: 'var(--space-2)'
              }}>
                {trip.description.length > 60 
                  ? `${trip.description.substring(0, 60)}...` 
                  : trip.description
                }
              </p>
            )}
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 'var(--radius-full)',
            padding: 'var(--space-1) var(--space-2)',
            backdropFilter: 'blur(10px)'
          }}>
            <span style={{
              fontSize: 'var(--mobile-text-xs)',
              fontWeight: 'var(--font-weight-semibold)'
            }}>
              {getStatusText(trip.status)}
            </span>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{
          display: 'flex',
          gap: 'var(--space-4)',
          alignItems: 'center'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)'
          }}>
            <MapPin size={16} />
            <span style={{ fontSize: 'var(--mobile-text-sm)' }}>
              {destinationCount} Ziele
            </span>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)'
          }}>
            <Users size={16} />
            <span style={{ fontSize: 'var(--mobile-text-sm)' }}>
              {participants} Person{participants > 1 ? 'en' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Content section */}
      <div
        className="mobile-trip-card-content"
        style={{
          padding: 'var(--space-4)'
        }}
      >
        {/* Date range */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-3)',
          padding: 'var(--space-2)',
          background: 'var(--color-surface-container)',
          borderRadius: 'var(--radius-md)'
        }}>
          <Calendar size={16} style={{ color: 'var(--color-primary)' }} />
          <div>
            <div style={{
              fontSize: 'var(--mobile-text-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-on-surface)'
            }}>
              {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
            </div>
            <div style={{
              fontSize: 'var(--mobile-text-xs)',
              color: 'var(--color-on-surface-variant)'
            }}>
              {Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24))} Tage
            </div>
          </div>
        </div>

        {/* Budget information */}
        {budget > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-3)',
            padding: 'var(--space-2)',
            background: actualCost > budget 
              ? 'var(--color-error-90)' 
              : 'var(--color-success-90)',
            borderRadius: 'var(--radius-md)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)'
            }}>
              <Euro size={16} style={{ 
                color: actualCost > budget 
                  ? 'var(--color-error-50)' 
                  : 'var(--color-success-50)' 
              }} />
              <div>
                <div style={{
                  fontSize: 'var(--mobile-text-sm)',
                  fontWeight: 'var(--font-weight-medium)'
                }}>
                  {actualCost > 0 ? `${actualCost}€ / ${budget}€` : `Budget: ${budget}€`}
                </div>
                <div style={{
                  fontSize: 'var(--mobile-text-xs)',
                  color: 'var(--color-on-surface-variant)'
                }}>
                  {actualCost > 0 
                    ? actualCost > budget 
                      ? `+${actualCost - budget}€ über Budget`
                      : `${budget - actualCost}€ unter Budget`
                    : 'Noch nicht ausgegeben'
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        {trip.tags && trip.tags.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-1)',
            marginBottom: 'var(--space-3)'
          }}>
            {trip.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                style={{
                  background: 'var(--color-primary-container)',
                  color: 'var(--color-on-primary-container)',
                  padding: 'var(--space-1) var(--space-2)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--mobile-text-xs)',
                  fontWeight: 'var(--font-weight-medium)'
                }}
              >
                {tag}
              </span>
            ))}
            {trip.tags.length > 3 && (
              <span style={{
                color: 'var(--color-on-surface-variant)',
                fontSize: 'var(--mobile-text-xs)'
              }}>
                +{trip.tags.length - 3} weitere
              </span>
            )}
          </div>
        )}

        {/* Action row */}
        {onClick && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 'var(--space-2)',
            borderTop: '1px solid var(--color-outline-variant)'
          }}>
            <div style={{
              display: 'flex',
              gap: 'var(--space-4)',
              alignItems: 'center'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                color: 'var(--color-on-surface-variant)'
              }}>
                <Route size={14} />
                <span style={{ fontSize: 'var(--mobile-text-xs)' }}>
                  Route
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                color: 'var(--color-on-surface-variant)'
              }}>
                <Camera size={14} />
                <span style={{ fontSize: 'var(--mobile-text-xs)' }}>
                  Fotos
                </span>
              </div>
            </div>
            
            <ChevronRight 
              size={18} 
              style={{ color: 'var(--color-primary)' }} 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileTripCard;