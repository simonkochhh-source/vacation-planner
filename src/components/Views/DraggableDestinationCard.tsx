import React, { useState } from 'react';
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
  Camera,
  Mountain,
  Info,
  Download
} from 'lucide-react';
import { 
  getCategoryIcon, 
  getCategoryLabel, 
  formatDate, 
  formatCurrency
} from '../../utils';
import { Destination, DestinationStatus } from '../../types';
import Button from '../Common/Button';
import Card from '../Common/Card';
import DestinationDetailModal from '../Destinations/DestinationDetailModal';

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
  showImportButton?: boolean;
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
  onPhotoGallery,
  showImportButton = false
}) => {
  const { updateDestination } = useSupabaseApp();
  const [showDetailModal, setShowDetailModal] = useState(false);
  
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
    background: 'var(--color-surface)',
    border: `2px solid ${isSelected ? 'var(--color-primary-sage)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-xl)',
    padding: 'var(--space-xl)',
    boxShadow: isDragging ? 'var(--shadow-lg)' : 'var(--shadow-md)',
    transition: isDragging ? 'none' : 'all var(--transition-normal)',
    position: 'relative' as const
  };

  return (
    <div
      ref={setNodeRef}
      style={cardStyle}
      className="destination-card"
      onMouseOver={!isDragging ? (e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
        e.currentTarget.style.transform = e.currentTarget.style.transform + ' translateY(-2px)';
      } : undefined}
      onMouseOut={!isDragging ? (e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        const transform = e.currentTarget.style.transform.replace(' translateY(-2px)', '');
        e.currentTarget.style.transform = transform;
      } : undefined}
    >
      {/* Batch Mode Checkbox */}
      {batchMode && onToggleSelection && (
        <div style={{
          position: 'absolute',
          top: 'var(--space-md)',
          left: 'var(--space-md)',
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
              <CheckSquare size={20} style={{ color: 'var(--color-primary-sage)' }} />
            ) : (
              <Square size={20} style={{ color: 'var(--color-text-secondary)' }} />
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
          left: 'var(--space-sm)',
          top: '50%',
          transform: 'translateY(-50%)',
          cursor: 'grab',
          color: 'var(--color-text-secondary)',
          padding: 'var(--space-sm)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color var(--transition-fast)',
          background: 'var(--color-neutral-mist)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.color = 'var(--color-text-primary)';
          e.currentTarget.style.backgroundColor = 'var(--color-primary-sage)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.color = 'var(--color-text-secondary)';
          e.currentTarget.style.backgroundColor = 'var(--color-neutral-mist)';
        }}
        title="Ziehen zum Sortieren"
      >
        <GripVertical size={18} />
      </div>

      <div style={{ marginLeft: 'var(--space-2xl)' }}>
        {/* Status Dropdown */}
        <div
          style={{
            position: 'absolute',
            top: 'var(--space-lg)',
            right: 'var(--space-lg)'
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
          gap: 'var(--space-lg)',
          marginBottom: 'var(--space-lg)'
        }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-lg)',
              background: `linear-gradient(135deg, ${destination.color || 'var(--color-primary-sage)'} 0%, var(--color-secondary-forest) 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--text-xl)',
              color: 'white',
              flexShrink: 0,
              boxShadow: 'var(--shadow-sm)',
              border: '2px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            {getCategoryIcon(destination.category)}
          </div>

          <div style={{ flex: 1, minWidth: 0, paddingRight: 'var(--space-3xl)' }}>
            <h3 style={{
              margin: '0 0 var(--space-xs) 0',
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              lineHeight: 1.3
            }}>
              {destination.name}
            </h3>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-sm)',
              marginBottom: 'var(--space-sm)',
              fontFamily: 'var(--font-body)'
            }}>
              <MapPin size={16} style={{ color: 'var(--color-primary-ocean)' }} />
              <span>{destination.location}</span>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-xs)',
              background: 'var(--color-primary-sage)',
              color: 'white',
              padding: 'var(--space-xs) var(--space-md)',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-weight-medium)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <Mountain size={12} />
              {getCategoryLabel(destination.category)}
            </div>
          </div>

          {/* Priority Stars */}
        </div>

        {/* Details */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-lg)',
          marginBottom: 'var(--space-lg)'
        }}>
          {/* Date & Time */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-medium)',
              marginBottom: 'var(--space-sm)'
            }}>
              <Calendar size={16} style={{ color: 'var(--color-primary-ocean)' }} />
              <span>Datum</span>
            </div>
            <div style={{ 
              fontSize: 'var(--text-sm)', 
              color: 'var(--color-text-primary)',
              fontWeight: 'var(--font-weight-medium)'
            }}>
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
                gap: 'var(--space-sm)',
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: 'var(--space-sm)'
              }}>
                <DollarSign size={16} style={{ color: 'var(--color-accent-campfire)' }} />
                <span>Budget</span>
              </div>
              <div style={{ 
                fontSize: 'var(--text-sm)', 
                color: 'var(--color-text-primary)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: 'var(--space-xs)'
              }}>
                {destination.budget && `Geplant: ${formatCurrency(destination.budget)}`}
              </div>
              {destination.actualCost && (
                <div style={{ 
                  fontSize: 'var(--text-sm)', 
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
                marginBottom: 'var(--space-sm)'
              }}>
                <span>🌤️ Wetter</span>
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
            background: 'var(--color-neutral-mist)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)',
            marginBottom: 'var(--space-lg)',
            border: '2px solid rgba(135, 169, 107, 0.1)'
          }}>
            <div style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-secondary)',
              fontWeight: 'var(--font-weight-medium)',
              marginBottom: 'var(--space-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-xs)'
            }}>
              📝 Notizen
            </div>
            <div style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-primary)',
              lineHeight: 1.5,
              fontFamily: 'var(--font-body)'
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
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-lg)'
          }}>
            {destination.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  background: 'var(--color-secondary-sky)',
                  color: 'white',
                  padding: 'var(--space-xs) var(--space-md)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  boxShadow: 'var(--shadow-sm)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
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
            gap: 'var(--space-sm)',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-medium)',
            marginBottom: 'var(--space-md)'
          }}>
            <Camera size={16} style={{ color: 'var(--color-accent-campfire)' }} />
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
          paddingTop: 'var(--space-lg)',
          borderTop: '2px solid var(--color-border)'
        }}>
          {/* Status Badge */}
          <StatusBadge status={destination.status} size="md" />

          {/* Detail, Edit & Delete */}
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetailModal(true)}
              leftIcon={<Info size={16} />}
              title="Details anzeigen"
            >
              Details
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEdit(destination)}
              leftIcon={<Edit size={16} />}
              title="Bearbeiten"
            >
              Bearbeiten
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(destination.id)}
              leftIcon={<Trash2 size={16} />}
              style={{
                color: 'var(--color-error)',
                borderColor: 'var(--color-error)'
              }}
              title="Löschen"
            >
              Löschen
            </Button>
          </div>
        </div>
      </div>
      
      {/* Detail Modal */}
      <DestinationDetailModal
        destination={destination}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onEdit={onEdit}
        onDelete={onDelete}
        onPhotoUpload={onPhotoUpload}
        onPhotoGallery={onPhotoGallery}
        showImportButton={showImportButton}
        canEdit={true}
        canDelete={true}
      />
    </div>
  );
};