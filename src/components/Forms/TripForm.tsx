import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useApp } from '../../stores/AppContext';
import { Trip } from '../../types';
import { tripSchema, TripFormData } from '../../schemas/validationSchemas';
import { getCurrentDateString, addDaysToDate } from '../../utils';
import { 
  X, 
  Plane, 
  Calendar, 
  Users, 
  FileText,
  Tag
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
  const { createTrip, updateTrip, setCurrentTrip } = useApp();
  const [participants, setParticipants] = useState<string[]>(trip?.participants || []);
  const [newParticipant, setNewParticipant] = useState('');
  const [tags, setTags] = useState<string[]>(trip?.tags || []);
  const [newTag, setNewTag] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch
  } = useForm<TripFormData>({
    resolver: zodResolver(tripSchema),
    defaultValues: trip ? {
      name: trip.name,
      description: trip.description,
      startDate: trip.startDate,
      endDate: trip.endDate,
      budget: trip.budget,
      participants: trip.participants,
      tags: trip.tags
    } : {
      name: '',
      description: '',
      startDate: getCurrentDateString(),
      endDate: addDaysToDate(getCurrentDateString(), 7),
      budget: undefined,
      participants: [],
      tags: []
    }
  });

  const startDate = watch('startDate');

  const onSubmit = async (data: TripFormData) => {
    try {
      const formData = {
        ...data,
        participants,
        tags
      };

      if (trip) {
        await updateTrip(trip.id, formData);
      } else {
        const newTrip = await createTrip(formData);
        // Auto-select the newly created trip
        setCurrentTrip(newTrip.id);
      }
      
      onClose();
      reset();
      setParticipants([]);
      setTags([]);
      setNewParticipant('');
      setNewTag('');
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

  const removeParticipant = (participantToRemove: string) => {
    setParticipants(participants.filter(p => p !== participantToRemove));
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.5rem 2rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#1f2937',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Plane size={24} />
            {trip ? 'Reise bearbeiten' : 'Neue Reise erstellen'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '8px',
              color: '#6b7280'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} style={{ padding: '2rem' }}>
          {/* Basic Info */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{
              margin: '0 0 1rem 0',
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FileText size={18} />
              Grundinformationen
            </h3>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* Trip Name */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Name der Reise *
                </label>
                <input
                  {...register('name', { required: 'Name ist erforderlich' })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${errors.name ? '#ef4444' : '#d1d5db'}`,
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  placeholder="z.B. Berlin Städtetrip"
                />
                {errors.name && (
                  <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Beschreibung
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  placeholder="Kurze Beschreibung der Reise..."
                />
              </div>
            </div>
          </div>

          {/* Dates & Budget */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{
              margin: '0 0 1rem 0',
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Calendar size={18} />
              Reisedaten & Budget
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Startdatum *
                </label>
                <input
                  type="date"
                  {...register('startDate', { required: 'Startdatum ist erforderlich' })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${errors.startDate ? '#ef4444' : '#d1d5db'}`,
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
                {errors.startDate && (
                  <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                    {errors.startDate.message}
                  </p>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Enddatum *
                </label>
                <input
                  type="date"
                  {...register('endDate', { 
                    required: 'Enddatum ist erforderlich',
                    validate: (value) => {
                      if (startDate && value < startDate) {
                        return 'Enddatum muss nach dem Startdatum liegen';
                      }
                      return true;
                    }
                  })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${errors.endDate ? '#ef4444' : '#d1d5db'}`,
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
                {errors.endDate && (
                  <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                    {errors.endDate.message}
                  </p>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Budget (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('budget', { valueAsNumber: true })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Participants */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{
              margin: '0 0 1rem 0',
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Users size={18} />
              Reisende
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  value={newParticipant}
                  onChange={(e) => setNewParticipant(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  placeholder="Name des Reisenden..."
                />
                <button
                  type="button"
                  onClick={addParticipant}
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Hinzufügen
                </button>
              </div>
            </div>

            {participants.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {participants.map((participant) => (
                  <span
                    key={participant}
                    style={{
                      background: '#f3f4f6',
                      color: '#374151',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '16px',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    👤 {participant}
                    <button
                      type="button"
                      onClick={() => removeParticipant(participant)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#6b7280',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{
              margin: '0 0 1rem 0',
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Tag size={18} />
              Tags
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  placeholder="Tag hinzufügen..."
                />
                <button
                  type="button"
                  onClick={addTag}
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Hinzufügen
                </button>
              </div>
            </div>

            {tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      background: '#e0f2fe',
                      color: '#0891b2',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '16px',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#0891b2',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end',
            paddingTop: '1rem',
            borderTop: '1px solid #e5e7eb'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151'
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                background: isSubmitting ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              {isSubmitting ? 'Speichern...' : trip ? 'Aktualisieren' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TripForm;