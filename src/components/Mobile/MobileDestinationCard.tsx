import React from 'react';
import { 
  MapPin, 
  Clock, 
  Euro, 
  Star,
  Camera,
  CheckCircle,
  Circle,
  AlertCircle,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { Destination, DestinationStatus } from '../../types';
import { useResponsive } from '../../hooks/useResponsive';
import { getCategoryIcon, getCategoryLabel } from '../../utils';

interface MobileDestinationCardProps {
  destination: Destination;
  onClick?: () => void;
  onStatusChange?: (status: DestinationStatus) => void;
  showDragHandle?: boolean;
  className?: string;
}

const MobileDestinationCard: React.FC<MobileDestinationCardProps> = ({ 
  destination, 
  onClick,
  onStatusChange,
  showDragHandle = false,
  className = ''
}) => {
  const { isMobile } = useResponsive();

  // Don't render on desktop
  if (!isMobile) return null;

  const getStatusIcon = (status: DestinationStatus) => {
    switch (status) {
      case DestinationStatus.VISITED:
        return <CheckCircle size={20} style={{ color: 'var(--color-success-50)' }} />;
      case DestinationStatus.SKIPPED:
        return <AlertCircle size={20} style={{ color: 'var(--color-error-50)' }} />;
      default:
        return <Circle size={20} style={{ color: 'var(--color-outline)' }} />;
    }
  };

  const getStatusColor = (status: DestinationStatus) => {
    switch (status) {
      case DestinationStatus.VISITED:
        return 'var(--color-success-90)';
      case DestinationStatus.SKIPPED:
        return 'var(--color-error-90)';
      default:
        return 'var(--color-surface-container)';
    }
  };

  const CategoryIcon = getCategoryIcon(destination.category);
  const categoryLabel = getCategoryLabel(destination.category);

  const formatTime = (time?: string) => {
    if (!time) return '';
    try {
      return new Date(`2000-01-01T${time}`).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return time;
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short'
    });
  };

  const hasPhotos = destination.photos && destination.photos.length > 0;
  const photoCount = destination.photos?.length || 0;

  return (
    <div
      className={`mobile-card ${className}`}
      onClick={onClick}
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--mobile-card-padding)',
        marginBottom: 'var(--mobile-gap)',
        boxShadow: 'var(--elevation-1)',
        border: '1px solid var(--color-outline-variant)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all var(--motion-duration-short)',
        position: 'relative'
      }}
    >
      {/* Header with status and category */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-3)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          flex: 1
        }}>
          {/* Status indicator */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onStatusChange) {
                const newStatus = destination.status === DestinationStatus.VISITED ? DestinationStatus.PLANNED : DestinationStatus.VISITED;
                onStatusChange(newStatus);
              }
            }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 'var(--space-1)',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label={`Status ändern: ${destination.status}`}
          >
            {getStatusIcon(destination.status)}
          </button>

          {/* Category icon and name */}
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              marginBottom: 'var(--space-1)'
            }}>
              <CategoryIcon size={16} style={{ color: 'var(--color-primary)' }} />
              <span style={{
                fontSize: 'var(--mobile-text-xs)',
                color: 'var(--color-on-surface-variant)',
                fontWeight: 'var(--font-weight-medium)'
              }}>
                {categoryLabel}
              </span>
            </div>
            
            <h3 style={{
              fontSize: 'var(--mobile-text-base)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-on-surface)',
              lineHeight: 'var(--line-height-tight)',
              margin: 0
            }}>
              {destination.name}
            </h3>
          </div>
        </div>

        {/* Photos indicator */}
        {hasPhotos && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            background: 'var(--color-primary-container)',
            color: 'var(--color-on-primary-container)',
            padding: 'var(--space-1) var(--space-2)',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--mobile-text-xs)',
            fontWeight: 'var(--font-weight-medium)'
          }}>
            <Camera size={12} />
            <span>{photoCount}</span>
          </div>
        )}
      </div>

      {/* Location */}
      {destination.location && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-3)',
          color: 'var(--color-on-surface-variant)'
        }}>
          <MapPin size={14} />
          <span style={{
            fontSize: 'var(--mobile-text-sm)',
            lineHeight: 'var(--line-height-normal)'
          }}>
            {destination.location}
          </span>
        </div>
      )}

      {/* Time and date info */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-3)'
      }}>
        {destination.startTime && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            background: getStatusColor(destination.status),
            padding: 'var(--space-1) var(--space-2)',
            borderRadius: 'var(--radius-md)'
          }}>
            <Clock size={14} style={{ color: 'var(--color-on-surface-variant)' }} />
            <span style={{
              fontSize: 'var(--mobile-text-xs)',
              color: 'var(--color-on-surface-variant)'
            }}>
              {formatTime(destination.startTime)}
              {destination.endTime && ` - ${formatTime(destination.endTime)}`}
            </span>
          </div>
        )}

        {destination.visitDate && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            background: getStatusColor(destination.status),
            padding: 'var(--space-1) var(--space-2)',
            borderRadius: 'var(--radius-md)'
          }}>
            <Calendar size={14} style={{ color: 'var(--color-on-surface-variant)' }} />
            <span style={{
              fontSize: 'var(--mobile-text-xs)',
              color: 'var(--color-on-surface-variant)'
            }}>
              {formatDate(destination.visitDate)}
            </span>
          </div>
        )}
      </div>

      {/* Description */}
      {destination.description && (
        <p style={{
          fontSize: 'var(--mobile-text-sm)',
          color: 'var(--color-on-surface-variant)',
          lineHeight: 'var(--line-height-normal)',
          marginBottom: 'var(--space-3)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {destination.description}
        </p>
      )}

      {/* Bottom row with budget and rating */}
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
          {/* Budget */}
          {destination.budget && destination.budget > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)'
            }}>
              <Euro size={14} style={{ color: 'var(--color-on-surface-variant)' }} />
              <span style={{
                fontSize: 'var(--mobile-text-xs)',
                color: 'var(--color-on-surface-variant)'
              }}>
                {destination.actualCost && destination.actualCost > 0 
                  ? `${destination.actualCost}€`
                  : `${destination.budget}€`
                }
              </span>
            </div>
          )}

          {/* Rating */}
          {destination.rating && destination.rating > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)'
            }}>
              <Star size={14} style={{ color: 'var(--color-warning-50)' }} />
              <span style={{
                fontSize: 'var(--mobile-text-xs)',
                color: 'var(--color-on-surface-variant)'
              }}>
                {destination.rating}/5
              </span>
            </div>
          )}
        </div>

        {/* Chevron for clickable cards */}
        {onClick && (
          <ChevronRight 
            size={16} 
            style={{ color: 'var(--color-primary)' }} 
          />
        )}
      </div>

      {/* Drag handle */}
      {showDragHandle && (
        <div style={{
          position: 'absolute',
          right: 'var(--space-2)',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'var(--color-surface-container)',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-1)',
          cursor: 'grab'
        }}>
          <div style={{
            width: '4px',
            height: '16px',
            background: 'var(--color-outline)',
            borderRadius: '2px',
            margin: '0 2px',
            display: 'inline-block'
          }} />
          <div style={{
            width: '4px',
            height: '16px',
            background: 'var(--color-outline)',
            borderRadius: '2px',
            margin: '0 2px',
            display: 'inline-block'
          }} />
        </div>
      )}
    </div>
  );
};

export default MobileDestinationCard;