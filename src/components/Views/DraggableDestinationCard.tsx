import React from 'react';
import {
  useSortable
} from '@dnd-kit/sortable';
import {
  CSS
} from '@dnd-kit/utilities';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import StatusDropdown from '../UI/StatusDropdown';
import StatusBadge from '../UI/StatusBadge';
import { WeatherWidget } from '../Weather';
import PhotoPreview from '../Photos/PhotoPreview';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  Star, 
  DollarSign,
  Edit,
  Trash2,
  GripVertical,
  CheckSquare,
  Square,
  Camera
} from 'lucide-react';
import { 
  getCategoryIcon, 
  getCategoryLabel, 
  formatDate, 
  formatCurrency
} from '../../utils';
import { Destination, DestinationStatus } from '../../types';

interface DraggableDestinationCardProps {
  destination: Destination;
  onEdit: (destination: Destination) => void;
  onDelete: (destId: string) => void;
  batchMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (destId: string) => void;
  onWeatherClick?: (destination: Destination) => void;
  onPhotoUpload?: (destination: Destination) => void;
  onPhotoGallery?: (destination: Destination) => void;
}

export const DraggableDestinationCard: React.FC<DraggableDestinationCardProps> = ({
  destination,
  onEdit,
  onDelete,
  batchMode = false,
  isSelected = false,
  onToggleSelection,
  onWeatherClick,
  onPhotoUpload,
  onPhotoGallery
}) => {
  const { updateDestination } = useSupabaseApp();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: destination.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  const handleStatusChange = async (destId: string, newStatus: DestinationStatus) => {
    await updateDestination(destId, { status: newStatus });
  };

  const cardStyle = {
    ...style,
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: isDragging ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    transition: isDragging ? 'none' : 'all 0.2s',
    position: 'relative' as const
  };

  return (
    <div
      ref={setNodeRef}
      style={cardStyle}
      className="destination-card"
      onMouseOver={!isDragging ? (e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
        e.currentTarget.style.transform = e.currentTarget.style.transform + ' translateY(-1px)';
      } : undefined}
      onMouseOut={!isDragging ? (e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
        const transform = e.currentTarget.style.transform.replace(' translateY(-1px)', '');
        e.currentTarget.style.transform = transform;
      } : undefined}
    >
      {/* Batch Mode Checkbox */}
      {batchMode && onToggleSelection && (
        <div style={{
          position: 'absolute',
          top: '0.75rem',
          left: '0.75rem',
          zIndex: 10
        }}>
          <button
            onClick={() => onToggleSelection(destination.id)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              transition: 'all 0.2s'
            }}
          >
            {isSelected ? (
              <CheckSquare size={20} style={{ color: '#3b82f6' }} />
            ) : (
              <Square size={20} style={{ color: '#9ca3af' }} />
            )}
          </button>
        </div>
      )}

      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        style={{
          position: 'absolute',
          left: '0.5rem',
          top: '50%',
          transform: 'translateY(-50%)',
          cursor: 'grab',
          color: '#9ca3af',
          padding: '0.5rem',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.color = '#4b5563'}
        onMouseOut={(e) => e.currentTarget.style.color = '#9ca3af'}
        title="Ziehen zum Sortieren"
      >
        <GripVertical size={18} />
      </div>

      <div style={{ marginLeft: '2rem' }}>
        {/* Status Dropdown */}
        <div
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem'
          }}
        >
          <StatusDropdown 
            currentStatus={destination.status}
            onStatusChange={(newStatus) => handleStatusChange(destination.id, newStatus)}
            size="sm"
          />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: destination.color || '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              color: 'white',
              flexShrink: 0
            }}
          >
            {getCategoryIcon(destination.category)}
          </div>

          <div style={{ flex: 1, minWidth: 0, paddingRight: '3rem' }}>
            <h3 style={{
              margin: '0 0 0.25rem 0',
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              {destination.name}
            </h3>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#6b7280',
              fontSize: '0.875rem',
              marginBottom: '0.5rem'
            }}>
              <MapPin size={14} />
              <span>{destination.location}</span>
            </div>

            <div style={{
              display: 'inline-block',
              background: '#f3f4f6',
              color: '#374151',
              padding: '0.25rem 0.75rem',
              borderRadius: '16px',
              fontSize: '0.75rem',
              fontWeight: '500'
            }}>
              {getCategoryLabel(destination.category)}
            </div>
          </div>

          {/* Priority Stars */}
        </div>

        {/* Details */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          {/* Date & Time */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#6b7280',
              fontSize: '0.875rem',
              marginBottom: '0.25rem'
            }}>
              <Calendar size={14} />
              <span>Datum</span>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#1f2937' }}>
              {formatDate(destination.startDate)}
              {destination.startDate !== destination.endDate && 
                ` - ${formatDate(destination.endDate)}`
              }
            </div>
          </div>

          {/* Budget */}
          {(destination.budget || destination.actualCost) && (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#6b7280',
                fontSize: '0.875rem',
                marginBottom: '0.25rem'
              }}>
                <DollarSign size={14} />
                <span>Budget</span>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                {destination.budget && `Geplant: ${formatCurrency(destination.budget)}`}
              </div>
              {destination.actualCost && (
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
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
                gap: '0.5rem',
                color: '#6b7280',
                fontSize: '0.875rem',
                marginBottom: '0.25rem'
              }}>
                <span>Wetter</span>
              </div>
              <div 
                onClick={() => onWeatherClick && onWeatherClick(destination)}
                style={{ cursor: onWeatherClick ? 'pointer' : 'default' }}
                title={onWeatherClick ? "Klicken für detaillierte Wettervorhersage" : undefined}
              >
                <WeatherWidget
                  coordinates={destination.coordinates}
                  date={destination.startDate}
                  size="sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        {destination.notes && (
          <div style={{
            background: '#f9fafb',
            borderRadius: '8px',
            padding: '0.75rem',
            marginBottom: '1rem'
          }}>
            <div style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '0.25rem'
            }}>
              Notizen
            </div>
            <div style={{
              fontSize: '0.875rem',
              color: '#374151',
              lineHeight: '1.5'
            }}>
              {destination.notes}
            </div>
          </div>
        )}

        {/* Tags */}
        {destination.tags.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            {destination.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  background: '#e0f2fe',
                  color: '#0891b2',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Photo Preview Section */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#6b7280',
            fontSize: '0.875rem',
            marginBottom: '0.75rem'
          }}>
            <Camera size={14} />
            <span>Fotos</span>
          </div>
          <PhotoPreview
            destinationId={destination.id}
            maxPreview={3}
            size="md"
            onViewAll={() => onPhotoGallery && onPhotoGallery(destination)}
            onUpload={() => onPhotoUpload && onPhotoUpload(destination)}
            className=""
          />
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '1rem',
          borderTop: '1px solid #f3f4f6'
        }}>
          {/* Status Badge */}
          <StatusBadge status={destination.status} size="md" />

          {/* Edit & Delete */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => onEdit(destination)}
              style={{
                background: 'transparent',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '0.5rem',
                cursor: 'pointer',
                color: '#6b7280'
              }}
              title="Bearbeiten"
            >
              <Edit size={14} />
            </button>
            
            <button
              onClick={() => onDelete(destination.id)}
              style={{
                background: 'transparent',
                border: '1px solid #fca5a5',
                borderRadius: '6px',
                padding: '0.5rem',
                cursor: 'pointer',
                color: '#ef4444'
              }}
              title="Löschen"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};