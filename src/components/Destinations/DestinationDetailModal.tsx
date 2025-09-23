import React, { useState } from 'react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { useAuth } from '../../contexts/AuthContext';
import { Destination, Trip } from '../../types';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import Card from '../Common/Card';
import StatusBadge from '../UI/StatusBadge';
import PhotoPreview from '../Photos/PhotoPreview';
import TripImportModal from './TripImportModal';
import {
  MapPin,
  Calendar,
  Clock,
  Star,
  DollarSign,
  Camera,
  Download,
  Edit,
  Trash2,
  Globe,
  Phone,
  Share,
  Copy,
  Info
} from 'lucide-react';
import {
  formatDate,
  formatCurrency,
  getCategoryIcon,
  getCategoryLabel
} from '../../utils';

interface DestinationDetailModalProps {
  destination: Destination;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (destination: Destination) => void;
  onDelete?: (destinationId: string) => void;
  onPhotoUpload?: (destination: Destination) => void;
  onPhotoGallery?: (destination: Destination) => void;
  showImportButton?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

const DestinationDetailModal: React.FC<DestinationDetailModalProps> = ({
  destination,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onPhotoUpload,
  onPhotoGallery,
  showImportButton = true,
  canEdit = true,
  canDelete = true
}) => {
  const { trips, destinations } = useSupabaseApp();
  const { user } = useAuth();
  const [showTripImport, setShowTripImport] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const categoryIcon = getCategoryIcon(destination.category);

  const handleImportComplete = async (targetTrip: Trip, selectedDate: string) => {
    if (!user) {
      console.error('User not available');
      return;
    }

    setIsImporting(true);
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
      
      // Close modals
      setShowTripImport(false);
      onClose();
      
      // Show success message (you could replace this with a toast notification)
      alert(`Ziel "${destination.name}" wurde erfolgreich in die Reise "${targetTrip.name}" für den ${selectedDate} importiert!`);
    } catch (error) {
      console.error('Failed to import destination:', error);
      alert('Fehler beim Importieren des Ziels. Bitte versuchen Sie es erneut.');
      throw error; // Re-throw to handle in the modal
    } finally {
      setIsImporting(false);
    }
  };

  const handleCopyToClipboard = () => {
    const destinationInfo = `${destination.name}\n${destination.location}\n${destination.notes || ''}`;
    navigator.clipboard.writeText(destinationInfo);
    alert('Zielinformationen in die Zwischenablage kopiert!');
  };

  const actionButtons = (
    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
      {canEdit && onEdit && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onEdit(destination)}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}
        >
          <Edit size={16} />
          Bearbeiten
        </Button>
      )}
      
      {showImportButton && (
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowTripImport(true)}
          disabled={isImporting}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}
        >
          <Download size={16} />
          {isImporting ? 'Importiere...' : 'In Reise importieren'}
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopyToClipboard}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}
      >
        <Copy size={16} />
        Kopieren
      </Button>

      {canDelete && onDelete && (
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            if (confirm(`Sind Sie sicher, dass Sie "${destination.name}" löschen möchten?`)) {
              onDelete(destination.id);
              onClose();
            }
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}
        >
          <Trash2 size={16} />
          Löschen
        </Button>
      )}
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={destination.name}
        size="lg"
        footer={actionButtons}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Header Information */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <span style={{ 
                fontSize: '24px',
                color: destination.color || 'var(--color-primary)'
              }}>
                {categoryIcon}
              </span>
              <span style={{ 
                fontSize: 'var(--text-sm)', 
                color: 'var(--color-text-secondary)',
                fontWeight: 'var(--font-weight-medium)'
              }}>
                {getCategoryLabel(destination.category)}
              </span>
            </div>
            <StatusBadge status={destination.status} />
            {destination.priority && destination.priority > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <Star size={16} style={{ color: 'var(--color-warning)' }} />
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                  Priorität {destination.priority}
                </span>
              </div>
            )}
          </div>

          {/* Location and Time */}
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <MapPin size={18} style={{ color: 'var(--color-text-secondary)' }} />
                <span>{destination.location}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <Calendar size={18} style={{ color: 'var(--color-text-secondary)' }} />
                <span>
                  {formatDate(destination.startDate)}
                  {destination.endDate && destination.endDate !== destination.startDate && 
                    ` - ${formatDate(destination.endDate)}`
                  }
                </span>
              </div>

              {(destination.startTime || destination.endTime) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <Clock size={18} style={{ color: 'var(--color-text-secondary)' }} />
                  <span>
                    {destination.startTime || 'Ganztägig'}
                    {destination.endTime && ` - ${destination.endTime}`}
                  </span>
                </div>
              )}

              {(destination.budget || destination.actualCost) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <DollarSign size={18} style={{ color: 'var(--color-text-secondary)' }} />
                  <span>
                    {destination.budget && `Budget: ${formatCurrency(destination.budget)}`}
                    {destination.actualCost && ` | Tatsächlich: ${formatCurrency(destination.actualCost)}`}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Notes */}
          {destination.notes && (
            <Card>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
                <Info size={18} style={{ color: 'var(--color-text-secondary)', marginTop: '2px' }} />
                <div>
                  <h4 style={{ margin: '0 0 var(--space-xs) 0', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                    Notizen
                  </h4>
                  <p style={{ margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {destination.notes}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Photos */}
          {destination.photos && destination.photos.length > 0 && (
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                <Camera size={18} style={{ color: 'var(--color-text-secondary)' }} />
                <h4 style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                  Fotos ({destination.photos.length})
                </h4>
              </div>
              <PhotoPreview
                photos={destination.photos}
                onUpload={onPhotoUpload ? () => onPhotoUpload(destination) : undefined}
                onViewGallery={onPhotoGallery ? () => onPhotoGallery(destination) : undefined}
              />
            </Card>
          )}

          {/* Additional Information */}
          {(destination.bookingInfo || destination.website || destination.phoneNumber) && (
            <Card>
              <h4 style={{ margin: '0 0 var(--space-md) 0', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                Zusätzliche Informationen
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {destination.bookingInfo && (
                  <div>
                    <strong>Buchungsinformationen:</strong> {destination.bookingInfo}
                  </div>
                )}
                {destination.website && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <Globe size={16} style={{ color: 'var(--color-text-secondary)' }} />
                    <a 
                      href={destination.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
                    >
                      Website besuchen
                    </a>
                  </div>
                )}
                {destination.phoneNumber && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <Phone size={16} style={{ color: 'var(--color-text-secondary)' }} />
                    <a 
                      href={`tel:${destination.phoneNumber}`}
                      style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
                    >
                      {destination.phoneNumber}
                    </a>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Tags */}
          {destination.tags && destination.tags.length > 0 && (
            <Card>
              <h4 style={{ margin: '0 0 var(--space-md) 0', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                Tags
              </h4>
              <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                {destination.tags.map((tag, index) => (
                  <span
                    key={index}
                    style={{
                      padding: 'var(--space-xs) var(--space-sm)',
                      backgroundColor: 'var(--color-background-alt)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Card>
          )}
        </div>
      </Modal>

      {/* Trip Import Modal */}
      <TripImportModal
        destination={destination}
        isOpen={showTripImport}
        onClose={() => setShowTripImport(false)}
        onImportComplete={handleImportComplete}
      />
    </>
  );
};

export default DestinationDetailModal;