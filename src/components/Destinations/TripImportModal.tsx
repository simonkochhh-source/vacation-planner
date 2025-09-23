import React, { useState, useMemo } from 'react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { useAuth } from '../../contexts/AuthContext';
import { Trip, Destination } from '../../types';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import Card from '../Common/Card';
import TripDateRangeCalendar from './TripDateRangeCalendar';
import {
  Search,
  MapPin,
  Calendar,
  Users,
  Globe,
  Lock,
  ChevronRight,
  Plus,
  ArrowLeft,
  Download,
  AlertTriangle
} from 'lucide-react';
import { formatDate } from '../../utils';

interface TripImportModalProps {
  destination: Destination;
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (targetTrip: Trip, selectedDate: string) => void;
}

type ImportStep = 'select-trip' | 'select-date' | 'confirm';

const TripImportModal: React.FC<TripImportModalProps> = ({
  destination,
  isOpen,
  onClose,
  onImportComplete
}) => {
  const { trips, currentTrip } = useSupabaseApp();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<ImportStep>('select-trip');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [isDateValid, setIsDateValid] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Filter trips based on user ownership and current trip exclusion
  const availableTrips = useMemo(() => {
    if (!user) return [];
    
    return trips.filter(trip => {
      // Only show user's own trips for importing
      if (trip.ownerId !== user.id) return false;
      
      // Exclude current trip
      if (currentTrip && trip.id === currentTrip.id) {
        return false;
      }
      
      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          trip.name.toLowerCase().includes(query) ||
          trip.description?.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [trips, user, currentTrip, searchQuery]);

  const handleTripSelect = (trip: Trip) => {
    setSelectedTrip(trip);
    // Set default date to trip start date
    setSelectedDate(trip.startDate);
    setCurrentStep('select-date');
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  const handleDateValidationChange = (isValid: boolean) => {
    setIsDateValid(isValid);
  };

  const handleConfirmImport = async () => {
    if (!selectedTrip || !selectedDate || !isDateValid) return;

    setIsImporting(true);
    try {
      await onImportComplete(selectedTrip, selectedDate);
      onClose();
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 'select-date') {
      setCurrentStep('select-trip');
      setSelectedDate('');
    } else if (currentStep === 'confirm') {
      setCurrentStep('select-date');
    }
  };

  const handleClose = () => {
    setCurrentStep('select-trip');
    setSelectedTrip(null);
    setSelectedDate('');
    setSearchQuery('');
    onClose();
  };

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

  const getStepTitle = () => {
    switch (currentStep) {
      case 'select-trip':
        return 'Ziel-Reise auswählen';
      case 'select-date':
        return 'Reisetag auswählen';
      case 'confirm':
        return 'Import bestätigen';
      default:
        return 'Ziel importieren';
    }
  };

  const getStepSubtitle = () => {
    switch (currentStep) {
      case 'select-trip':
        return `Wählen Sie eine Reise aus, in die "${destination.name}" importiert werden soll.`;
      case 'select-date':
        return `Wählen Sie einen Tag aus dem Reisezeitraum von "${selectedTrip?.name}" aus.`;
      case 'confirm':
        return `Bestätigen Sie den Import von "${destination.name}".`;
      default:
        return '';
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'select-trip':
        return (
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
                    onClick={() => handleTripSelect(trip)}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      gap: 'var(--space-md)'
                    }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ 
                          margin: '0 0 var(--space-sm) 0',
                          fontSize: 'var(--text-lg)',
                          fontWeight: 'var(--font-weight-semibold)',
                          color: 'var(--color-text-primary)'
                        }}>
                          {trip.name}
                        </h3>

                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: 'var(--space-xs)',
                          marginBottom: 'var(--space-sm)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                            <Calendar size={14} style={{ color: 'var(--color-text-secondary)' }} />
                            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                              {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                            {getPrivacyIcon(trip.privacy)}
                            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                              {trip.privacy === 'public' ? 'Öffentlich' : trip.privacy === 'contacts' ? 'Kontakte' : 'Privat'}
                            </span>
                          </div>
                        </div>

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
        );

      case 'select-date':
        return selectedTrip ? (
          <TripDateRangeCalendar
            selectedTrip={selectedTrip}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onValidationChange={handleDateValidationChange}
          />
        ) : null;

      case 'confirm':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {/* Confirmation Summary */}
            <Card>
              <h3 style={{ margin: '0 0 var(--space-md) 0', fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-semibold)' }}>
                Import-Zusammenfassung
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div>
                  <strong>Ziel:</strong> {destination.name}
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                    <MapPin size={14} style={{ display: 'inline', marginRight: 'var(--space-xs)' }} />
                    {destination.location}
                  </div>
                </div>
                
                <div>
                  <strong>Ziel-Reise:</strong> {selectedTrip?.name}
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                    <Calendar size={14} style={{ display: 'inline', marginRight: 'var(--space-xs)' }} />
                    {selectedTrip && `${formatDate(selectedTrip.startDate)} - ${formatDate(selectedTrip.endDate)}`}
                  </div>
                </div>
                
                <div>
                  <strong>Gewählter Reisetag:</strong> {formatDate(selectedDate)}
                </div>
              </div>
            </Card>

            {/* Warning about copy behavior */}
            <Card style={{ backgroundColor: 'var(--color-warning-bg)', border: '1px solid var(--color-warning)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
                <AlertTriangle size={20} style={{ color: 'var(--color-warning)', marginTop: '2px' }} />
                <div>
                  <h4 style={{ margin: '0 0 var(--space-xs) 0', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                    Hinweis zum Import
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: 'var(--space-lg)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                    <li>Das Ziel wird als <strong>Kopie</strong> importiert</li>
                    <li>Name und Details bleiben identisch</li>
                    <li><strong>Fotos werden NICHT kopiert</strong> (bleiben beim Original)</li>
                    <li>Referenz zum Original wird beibehalten</li>
                    <li>Startdatum wird auf den gewählten Tag gesetzt</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const getFooterButtons = () => {
    const backButton = currentStep !== 'select-trip' ? (
      <Button variant="secondary" onClick={handleBack}>
        <ArrowLeft size={16} style={{ marginRight: 'var(--space-xs)' }} />
        Zurück
      </Button>
    ) : null;

    const cancelButton = (
      <Button variant="ghost" onClick={handleClose}>
        Abbrechen
      </Button>
    );

    const nextButton = (() => {
      switch (currentStep) {
        case 'select-trip':
          return null; // Trips are selected by clicking
        case 'select-date':
          return (
            <Button 
              variant="primary" 
              onClick={() => setCurrentStep('confirm')}
              disabled={!isDateValid}
            >
              Weiter
              <ChevronRight size={16} style={{ marginLeft: 'var(--space-xs)' }} />
            </Button>
          );
        case 'confirm':
          return (
            <Button 
              variant="primary" 
              onClick={handleConfirmImport}
              disabled={isImporting}
            >
              <Download size={16} style={{ marginRight: 'var(--space-xs)' }} />
              {isImporting ? 'Importiere...' : 'Importieren'}
            </Button>
          );
        default:
          return null;
      }
    })();

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {backButton}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {cancelButton}
          {nextButton}
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={getStepTitle()}
      subtitle={getStepSubtitle()}
      size="lg"
      footer={getFooterButtons()}
    >
      {renderStepContent()}
    </Modal>
  );
};

export default TripImportModal;