import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { useResponsive } from '../../hooks/useResponsive';
import { Trip, VehicleConfig, FuelType, CreateTripData, TripPrivacy } from '../../types';
import { tripSchema, TripFormData } from '../../schemas/validationSchemas';
import { getCurrentDateString, addDaysToDate, getCenterCoordinates } from '../../utils';
import VehicleConfigPanel from '../Trip/VehicleConfigPanel';
import Button from '../Common/Button';
import Card from '../Common/Card';
import { 
  X, 
  Plane, 
  Calendar, 
  Users, 
  FileText,
  Tag,
  Car,
  MapPin,
  Coffee,
  Mountain,
  Lock,
  Globe,
  Shield
} from 'lucide-react';

interface TripFormProps {
  isOpen: boolean;
  onClose: () => void;
  trip?: Trip; // For editing
}

const TripForm: React.FC<TripFormProps> = ({ 
  isOpen, 
  onClose, 
  trip 
}) => {
  const { createTrip, updateTrip, setCurrentTrip, destinations } = useSupabaseApp();
  
  // Mobile responsiveness
  const { isMobile } = useResponsive();
  const [participants, setParticipants] = useState<string[]>(trip?.participants || []);
  const [newParticipant, setNewParticipant] = useState('');
  const [tags, setTags] = useState<string[]>(trip?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [privacy, setPrivacy] = useState<TripPrivacy>(trip?.privacy || TripPrivacy.PRIVATE);
  const [taggedUsers, setTaggedUsers] = useState<string[]>(trip?.taggedUsers || []);
  const [newTaggedUser, setNewTaggedUser] = useState('');
  const [vehicleConfig, setVehicleConfig] = useState<VehicleConfig>(trip?.vehicleConfig || {
    fuelType: FuelType.DIESEL,
    fuelConsumption: 9.0,
    fuelPrice: 1.65
  });
  const [showVehicleConfig, setShowVehicleConfig] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch
  } = useForm<TripFormData>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      name: trip?.name || '',
      description: trip?.description || '',
      startDate: trip?.startDate || getCurrentDateString(),
      endDate: trip?.endDate || addDaysToDate(getCurrentDateString(), 7),
      budget: trip?.budget || 1000
    }
  });

  const watchedValues = watch();

  const onSubmit = async (data: TripFormData) => {
    try {
      const tripData: Partial<Trip> = {
        ...data,
        participants,
        tags,
        privacy,
        taggedUsers,
        vehicleConfig,
        destinations: trip?.destinations || [],
        createdAt: trip?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      let savedTrip: Trip;
      if (trip) {
        savedTrip = await updateTrip(trip.id, tripData);
      } else {
        const createData = tripData as CreateTripData;
        savedTrip = await createTrip(createData);
        setCurrentTrip(savedTrip.id);
      }

      reset();
      setParticipants([]);
      setTags([]);
      onClose();
    } catch (error) {
      console.error('Error saving trip:', error);
    }
  };

  const addParticipant = () => {
    if (newParticipant.trim() && !participants.includes(newParticipant.trim())) {
      setParticipants([...participants, newParticipant.trim()]);
      setNewParticipant('');
    }
  };

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const addTaggedUser = () => {
    if (newTaggedUser.trim() && !taggedUsers.includes(newTaggedUser.trim())) {
      setTaggedUsers([...taggedUsers, newTaggedUser.trim()]);
      setNewTaggedUser('');
    }
  };

  const removeTaggedUser = (index: number) => {
    setTaggedUsers(taggedUsers.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: isMobile ? 'flex-end' : 'center',
      justifyContent: 'center',
      padding: isMobile ? 0 : 'var(--space-lg)'
    }}>
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: isMobile ? 'var(--radius-xl) var(--radius-xl) 0 0' : 'var(--radius-xl)',
        maxWidth: isMobile ? '100%' : '600px',
        width: '100%',
        maxHeight: isMobile ? '85vh' : '90vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--color-border)'
      }}>
        {/* Header */}
        <div style={{
          padding: isMobile ? 'var(--space-lg)' : 'var(--space-xl)',
          borderBottom: '1px solid var(--color-border)',
          background: 'linear-gradient(135deg, var(--color-primary-sage) 0%, var(--color-secondary-forest) 100%)',
          color: 'white',
          borderRadius: isMobile ? 'var(--radius-xl) var(--radius-xl) 0 0' : 'var(--radius-xl) var(--radius-xl) 0 0',
          position: 'relative'
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: 'var(--space-sm)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {trip ? <Mountain size={24} /> : <MapPin size={24} />}
              </div>
              <div>
                <h2 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'var(--text-xl)',
                  fontWeight: 'var(--font-weight-semibold)',
                  margin: 0,
                  lineHeight: 1.2
                }}>
                  {trip ? 'Reise bearbeiten' : 'Neue Reise planen'}
                </h2>
                <p style={{
                  fontSize: 'var(--text-sm)',
                  margin: 0,
                  opacity: 0.9,
                  fontWeight: 'var(--font-weight-normal)'
                }}>
                  {trip ? 'Details deiner Reise anpassen' : 'Dein nächstes Abenteuer wartet'}
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                minWidth: 'auto',
                padding: 'var(--space-sm)'
              }}
            >
              <X size={20} />
            </Button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit(onSubmit as any)} style={{ padding: isMobile ? 'var(--space-lg)' : 'var(--space-xl)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {/* Basic Info Section */}
            <Card padding="md" style={{ background: 'var(--color-neutral-mist)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Coffee size={18} style={{ color: 'var(--color-primary-sage)' }} />
                <h3 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--font-weight-semibold)',
                  margin: 0,
                  color: 'var(--color-text-primary)'
                }}>
                  Grundinformationen
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {/* Trip Name */}
                <div>
                  <label style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-primary)',
                    marginBottom: 'var(--space-sm)',
                    display: 'block'
                  }}>
                    Reisename *
                  </label>
                  <input
                    {...register('name')}
                    className="input"
                    placeholder="z.B. Portugal Roadtrip 2024"
                    style={{
                      width: '100%',
                      fontSize: 'var(--text-base)'
                    }}
                  />
                  {errors.name && (
                    <p style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-error)',
                      margin: 'var(--space-xs) 0 0 0'
                    }}>
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-primary)',
                    marginBottom: 'var(--space-sm)',
                    display: 'block'
                  }}>
                    Beschreibung
                  </label>
                  <textarea
                    {...register('description')}
                    className="textarea"
                    placeholder="Erzähl uns von deinem geplanten Abenteuer..."
                    rows={3}
                    style={{
                      width: '100%',
                      resize: 'vertical',
                      minHeight: '80px'
                    }}
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--space-sm)',
                      display: 'block'
                    }}>
                      Startdatum *
                    </label>
                    <input
                      {...register('startDate')}
                      type="date"
                      className="input"
                      style={{ width: '100%' }}
                    />
                    {errors.startDate && (
                      <p style={{
                        fontSize: 'var(--text-sm)',
                        color: 'var(--color-error)',
                        margin: 'var(--space-xs) 0 0 0'
                      }}>
                        {errors.startDate.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--space-sm)',
                      display: 'block'
                    }}>
                      Enddatum *
                    </label>
                    <input
                      {...register('endDate')}
                      type="date"
                      className="input"
                      style={{ width: '100%' }}
                    />
                    {errors.endDate && (
                      <p style={{
                        fontSize: 'var(--text-sm)',
                        color: 'var(--color-error)',
                        margin: 'var(--space-xs) 0 0 0'
                      }}>
                        {errors.endDate.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Budget */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--space-sm)',
                      display: 'block'
                    }}>
                      Budget
                    </label>
                    <input
                      {...register('budget', { valueAsNumber: true })}
                      type="number"
                      className="input"
                      placeholder="1000"
                      min="0"
                      step="50"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--space-sm)',
                      display: 'block'
                    }}>
                      Währung
                    </label>
                    <select
                      className="select"
                      style={{ width: '100%' }}
                      defaultValue="EUR"
                      disabled
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CHF">CHF</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>

            {/* Participants Section */}
            <Card padding="md">
              <div className="flex items-center gap-2 mb-4">
                <Users size={18} style={{ color: 'var(--color-primary-ocean)' }} />
                <h3 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--font-weight-semibold)',
                  margin: 0,
                  color: 'var(--color-text-primary)'
                }}>
                  Reisebegleiter
                </h3>
              </div>

              <div style={{ marginBottom: 'var(--space-md)' }}>
                <div className="flex gap-2">
                  <input
                    value={newParticipant}
                    onChange={(e) => setNewParticipant(e.target.value)}
                    className="input"
                    placeholder="Name oder E-Mail"
                    style={{ flex: 1 }}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={addParticipant}
                    disabled={!newParticipant.trim()}
                  >
                    Hinzufügen
                  </Button>
                </div>
              </div>

              {participants.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                  {participants.map((participant, index) => (
                    <div
                      key={index}
                      style={{
                        background: 'var(--color-primary-ocean)',
                        color: 'white',
                        padding: 'var(--space-xs) var(--space-sm)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--text-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-xs)'
                      }}
                    >
                      {participant}
                      <button
                        type="button"
                        onClick={() => removeParticipant(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Tags Section */}
            <Card padding="md">
              <div className="flex items-center gap-2 mb-4">
                <Tag size={18} style={{ color: 'var(--color-secondary-sunset)' }} />
                <h3 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--font-weight-semibold)',
                  margin: 0,
                  color: 'var(--color-text-primary)'
                }}>
                  Tags & Kategorien
                </h3>
              </div>

              <div style={{ marginBottom: 'var(--space-md)' }}>
                <div className="flex gap-2">
                  <input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="input"
                    placeholder="z.B. Camping, Surfen, Roadtrip"
                    style={{ flex: 1 }}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={addTag}
                    disabled={!newTag.trim()}
                  >
                    Hinzufügen
                  </Button>
                </div>
              </div>

              {tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                  {tags.map((tag, index) => (
                    <div
                      key={index}
                      style={{
                        background: 'var(--color-secondary-sunset)',
                        color: 'white',
                        padding: 'var(--space-xs) var(--space-sm)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--text-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-xs)'
                      }}
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Privacy & Sharing Section */}
            <Card padding="md">
              <div className="flex items-center gap-2 mb-4">
                <Shield size={18} style={{ color: 'var(--color-primary-sage)' }} />
                <h3 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--font-weight-semibold)',
                  margin: 0,
                  color: 'var(--color-text-primary)'
                }}>
                  Datenschutz & Freigabe
                </h3>
              </div>

              {/* Privacy Setting */}
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <label style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--space-sm)',
                  display: 'block'
                }}>
                  Sichtbarkeit der Reise
                </label>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                  <button
                    type="button"
                    onClick={() => setPrivacy(TripPrivacy.PRIVATE)}
                    style={{
                      background: privacy === TripPrivacy.PRIVATE ? 'var(--color-primary-sage)' : 'var(--color-neutral-cream)',
                      border: privacy === TripPrivacy.PRIVATE ? '2px solid var(--color-primary-sage)' : '1px solid var(--color-neutral-mist)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-md)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-sm)',
                      color: privacy === TripPrivacy.PRIVATE ? 'white' : 'var(--color-text-primary)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      transition: 'all var(--transition-normal)'
                    }}
                  >
                    <Lock size={16} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>Privat</div>
                      <div style={{ fontSize: 'var(--text-xs)', opacity: 0.8 }}>Nur für dich und eingeladene Personen</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrivacy(TripPrivacy.PUBLIC)}
                    style={{
                      background: privacy === TripPrivacy.PUBLIC ? 'var(--color-primary-ocean)' : 'var(--color-neutral-cream)',
                      border: privacy === TripPrivacy.PUBLIC ? '2px solid var(--color-primary-ocean)' : '1px solid var(--color-neutral-mist)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-md)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-sm)',
                      color: privacy === TripPrivacy.PUBLIC ? 'white' : 'var(--color-text-primary)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      transition: 'all var(--transition-normal)'
                    }}
                  >
                    <Globe size={16} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>Öffentlich</div>
                      <div style={{ fontSize: 'var(--text-xs)', opacity: 0.8 }}>Für alle sichtbar, nur du kannst bearbeiten</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Tagged Users - only show for private trips */}
              {privacy === TripPrivacy.PRIVATE && (
                <div>
                  <label style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-primary)',
                    marginBottom: 'var(--space-sm)',
                    display: 'block'
                  }}>
                    Benutzer einladen (können Reise sehen und bearbeiten)
                  </label>

                  <div style={{ marginBottom: 'var(--space-md)' }}>
                    <div className="flex gap-2">
                      <input
                        value={newTaggedUser}
                        onChange={(e) => setNewTaggedUser(e.target.value)}
                        className="input"
                        placeholder="Benutzer-ID oder E-Mail"
                        style={{ flex: 1 }}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTaggedUser())}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={addTaggedUser}
                        disabled={!newTaggedUser.trim()}
                      >
                        Einladen
                      </Button>
                    </div>
                  </div>

                  {taggedUsers.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                      {taggedUsers.map((user, index) => (
                        <div
                          key={index}
                          style={{
                            background: 'var(--color-secondary-forest)',
                            color: 'white',
                            padding: 'var(--space-xs) var(--space-sm)',
                            borderRadius: 'var(--radius-full)',
                            fontSize: 'var(--text-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-xs)'
                          }}
                        >
                          {user}
                          <button
                            type="button"
                            onClick={() => removeTaggedUser(index)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'white',
                              cursor: 'pointer',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{
                    marginTop: 'var(--space-sm)',
                    padding: 'var(--space-sm)',
                    background: 'var(--color-neutral-cream)',
                    border: '1px solid var(--color-neutral-mist)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-secondary)'
                  }}>
                    💡 Eingeladene Benutzer können die Reise sehen, bearbeiten und weitere Ziele hinzufügen.
                  </div>
                </div>
              )}

              {privacy === TripPrivacy.PUBLIC && (
                <div style={{
                  padding: 'var(--space-sm)',
                  background: 'var(--color-secondary-sky)',
                  border: '1px solid var(--color-neutral-mist)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-secondary)'
                }}>
                  🌍 Öffentliche Reisen sind für alle Benutzer sichtbar und können in der Suche gefunden werden. Nur du kannst sie bearbeiten.
                </div>
              )}
            </Card>

            {/* Vehicle Config Toggle */}
            <Card padding="md">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setShowVehicleConfig(!showVehicleConfig)}
                style={{
                  padding: 'var(--space-sm)',
                  margin: '-var(--space-sm)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'background-color var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-neutral-mist)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div className="flex items-center gap-2">
                  <Car size={18} style={{ color: 'var(--color-accent-campfire)' }} />
                  <h3 style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 'var(--font-weight-semibold)',
                    margin: 0,
                    color: 'var(--color-text-primary)'
                  }}>
                    Fahrzeug-Konfiguration
                  </h3>
                </div>
                <span style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)'
                }}>
                  {showVehicleConfig ? 'Weniger' : 'Mehr'}
                </span>
              </div>

              {showVehicleConfig && (
                <div style={{ marginTop: 'var(--space-md)' }}>
                  <VehicleConfigPanel
                    vehicleConfig={vehicleConfig}
                    onChange={setVehicleConfig}
                  />
                </div>
              )}
            </Card>
          </div>

          {/* Footer Actions */}
          <div style={{
            marginTop: 'var(--space-xl)',
            padding: 'var(--space-lg) 0 0 0',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            gap: 'var(--space-md)',
            justifyContent: isMobile ? 'stretch' : 'flex-end',
            flexDirection: isMobile ? 'column' : 'row'
          }}>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              leftIcon={trip ? <Mountain size={18} /> : <Plane size={18} />}
            >
              {trip ? 'Reise aktualisieren' : 'Reise erstellen'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TripForm;