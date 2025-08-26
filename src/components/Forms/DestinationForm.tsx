import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useApp } from '../../stores/AppContext';
import { 
  DestinationCategory, 
  Destination,
  DestinationStatus 
} from '../../types';
import { destinationSchema, DestinationFormData } from '../../schemas/validationSchemas';
import { 
  getCategoryIcon, 
  getCategoryLabel, 
  getCategoryColor,
  getCurrentDateString,
} from '../../utils';
import { 
  X, 
  MapPin, 
  Calendar, 
  Star, 
  FileText,
  Tag,
  Palette
} from 'lucide-react';
import LocationSearch from '../UI/LocationSearch';
import MapSelectionModal from '../UI/MapSelectionModal';
import { Coordinates } from '../../types';

interface DestinationFormProps {
  isOpen: boolean;
  onClose: () => void;
  destination?: Destination; // For editing
}

const predefinedColors = [
  '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6b7280'
];

// Helper function to get status labels
const getStatusLabel = (status: DestinationStatus): string => {
  const labels: Record<DestinationStatus, string> = {
    [DestinationStatus.PLANNED]: 'Geplant',
    [DestinationStatus.VISITED]: 'Besucht',
    [DestinationStatus.SKIPPED]: 'Übersprungen'
  };
  return labels[status];
};

// Helper function to get status icon
const getStatusIcon = (status: DestinationStatus): string => {
  const icons: Record<DestinationStatus, string> = {
    [DestinationStatus.PLANNED]: '📋',
    [DestinationStatus.VISITED]: '✅',
    [DestinationStatus.SKIPPED]: '⏭️'
  };
  return icons[status];
};

const DestinationForm: React.FC<DestinationFormProps> = ({ 
  isOpen, 
  onClose, 
  destination 
}) => {
  const { createDestination, updateDestination } = useApp();
  const [tags, setTags] = useState<string[]>(destination?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [selectedColor, setSelectedColor] = useState(
    destination?.color || getCategoryColor(DestinationCategory.ATTRACTION)
  );
  const [coordinates, setCoordinates] = useState<Coordinates | undefined>(destination?.coordinates);
  const [showMapSelection, setShowMapSelection] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    reset,
    watch,
    setValue
  } = useForm({
    // resolver: zodResolver(destinationSchema),
    defaultValues: destination ? {
      name: destination.name,
      location: destination.location,
      startDate: destination.startDate,
      endDate: destination.endDate,
      category: destination.category,
      budget: destination.budget,
      status: destination.status,
      notes: destination.notes,
      tags: destination.tags,
      color: destination.color
    } : {
      name: '',
      location: '',
      startDate: getCurrentDateString(),
      endDate: getCurrentDateString(),
      category: DestinationCategory.ATTRACTION,
      budget: undefined,
      status: DestinationStatus.PLANNED,
      notes: '',
      tags: [],
      color: getCategoryColor(DestinationCategory.ATTRACTION)
    }
  });

  // Watch category to show/hide end date field for hotels
  const selectedCategory = watch('category');

  // Initialize form when destination changes
  useEffect(() => {
    if (destination) {
      setTags(destination.tags);
      setSelectedColor(destination.color || getCategoryColor(destination.category));
      setCoordinates(destination.coordinates);
      reset({
        name: destination.name,
        location: destination.location,
        startDate: destination.startDate,
        endDate: destination.endDate,
        category: destination.category,
          budget: destination.budget,
        status: destination.status,
        notes: destination.notes || '',
        color: destination.color || getCategoryColor(destination.category)
      });
    } else {
      // Reset for new destination
      setTags([]);
      setSelectedColor(getCategoryColor(DestinationCategory.ATTRACTION));
      setCoordinates(undefined);
    }
  }, [destination, reset]); // Depend on destination and reset function

  // Handle category color changes manually (no useEffect)
  const handleCategoryChange = useCallback((newCategory: DestinationCategory) => {
    if (!destination) { // Only for new destinations
      const newColor = getCategoryColor(newCategory);
      setSelectedColor(newColor);
      setValue('color', newColor);
    }
    setValue('category', newCategory);

    // For non-hotel destinations, set endDate to startDate
    if (newCategory !== DestinationCategory.HOTEL) {
      const startDate = watch('startDate');
      if (startDate) {
        setValue('endDate', startDate);
      }
    }
  }, [destination, setValue, watch]);

  // Handle start date changes for non-hotel destinations
  const handleStartDateChange = useCallback((startDate: string) => {
    setValue('startDate', startDate);
    
    // For non-hotel destinations, sync endDate with startDate
    if (selectedCategory !== DestinationCategory.HOTEL) {
      setValue('endDate', startDate);
    }
  }, [setValue, selectedCategory]);

  const onSubmit = useCallback(async (data: any) => {
    try {
      console.log('Form submission started:', data);
      const formData = {
        ...data,
        tags,
        color: selectedColor,
        coordinates,
        images: [] // Add missing field to prevent TypeScript errors
      };
      console.log('Form data prepared:', formData);

      if (destination) {
        console.log('Updating existing destination:', destination.id);
        await updateDestination(destination.id, formData);
        console.log('Destination updated successfully');
      } else {
        console.log('Creating new destination...');
        const newDestination = await createDestination(formData);
        console.log('Destination created successfully:', newDestination);
      }
      
      onClose();
      reset();
      setTags([]);
      setNewTag('');
      console.log('Form submitted and closed');
    } catch (error) {
      console.error('Error saving destination:', error);
      alert('Fehler beim Speichern des Ziels: ' + (error instanceof Error ? error.message : String(error)));
    }
  }, [destination, tags, selectedColor, coordinates, updateDestination, createDestination, onClose, reset]);

  const addTag = useCallback(() => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  }, [newTag, tags]);

  const removeTag = useCallback((tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  }, [tags]);

  if (!isOpen) {
    return null;
  }

  // Debug form state
  console.log('Form errors:', errors);
  console.log('Form isValid:', isValid);
  console.log('Form isSubmitting:', isSubmitting);
  
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
            color: '#1f2937'
          }}>
            {destination ? 'Ziel bearbeiten' : 'Neues Ziel hinzufügen'}
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
        <form 
          onSubmit={handleSubmit(onSubmit)} 
          style={{ padding: '2rem' }}
        >
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
              <MapPin size={18} />
              Grundinformationen
            </h3>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* Name */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Name des Ziels *
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
                  placeholder="z.B. Brandenburger Tor"
                />
                {errors.name && (
                  <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Location */}
              <div>
                <LocationSearch
                  label="Standort *"
                  value={watch('location') || ''}
                  onChange={(location, coords) => {
                    setValue('location', location);
                    if (coords) {
                      setCoordinates(coords);
                    }
                  }}
                  placeholder="z.B. Pariser Platz, 10117 Berlin"
                  error={errors.location?.message}
                  required
                />
                
                {/* Map Selection Button */}
                <button
                  type="button"
                  onClick={() => setShowMapSelection(true)}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    color: '#374151',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#e5e7eb'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#f3f4f6'}
                >
                  <MapPin size={12} />
                  Auf Karte auswählen
                </button>
                
                {/* Current Coordinates Display */}
                {coordinates && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem',
                    background: '#f0f9ff',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    color: '#0891b2'
                  }}>
                    📍 Koordinaten: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                  </div>
                )}
              </div>

              {/* Category */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Kategorie *
                </label>
                <select
                  {...register('category', { required: 'Kategorie ist erforderlich' })}
                  onChange={(e) => handleCategoryChange(e.target.value as DestinationCategory)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${errors.category ? '#ef4444' : '#d1d5db'}`,
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    outline: 'none',
                    background: 'white'
                  }}
                >
                  {Object.values(DestinationCategory).map((category) => (
                    <option key={category} value={category}>
                      {getCategoryIcon(category)} {getCategoryLabel(category)}
                    </option>
                  ))}
                </select>
                {selectedCategory === DestinationCategory.HOTEL && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    color: '#0891b2'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>🏨</span>
                      <span>Bei Unterkünften ist ein Abreisedatum erforderlich</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Date Range */}
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
              Datum
            </h3>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: selectedCategory === DestinationCategory.HOTEL ? '1fr 1fr' : '1fr', 
              gap: '1rem' 
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  {selectedCategory === DestinationCategory.HOTEL ? 'Anreisedatum *' : 'Datum *'}
                </label>
                <input
                  type="date"
                  {...register('startDate', { required: 'Startdatum ist erforderlich' })}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${errors.startDate ? '#ef4444' : '#d1d5db'}`,
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>

              {selectedCategory === DestinationCategory.HOTEL && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Abreisedatum *
                  </label>
                  <input
                    type="date"
                    {...register('endDate', { 
                      required: selectedCategory === DestinationCategory.HOTEL ? 'Abreisedatum ist bei Hotels erforderlich' : false
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
              )}
            </div>
          </div>

          {/* Budget */}
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
              <Star size={18} />
              Budget
            </h3>

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

          {/* Status Selection */}
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
              <Star size={18} />
              Status
            </h3>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Aktueller Status
              </label>
              <select
                {...register('status', { required: 'Status ist erforderlich' })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: `1px solid ${errors.status ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  background: 'white'
                }}
              >
                {Object.values(DestinationStatus).map((status) => (
                  <option key={status} value={status}>
                    {getStatusIcon(status)} {getStatusLabel(status)}
                  </option>
                ))}
              </select>
              {errors.status && (
                <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                  {errors.status.message}
                </p>
              )}
            </div>
          </div>

          {/* Color Selection */}
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
              <Palette size={18} />
              Farbe für Karte
            </h3>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {predefinedColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setSelectedColor(color);
                    setValue('color', color);
                  }}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    background: color,
                    border: selectedColor === color ? '3px solid #1f2937' : '1px solid #d1d5db',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                />
              ))}
            </div>
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

          {/* Notes */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '1rem'
            }}>
              <FileText size={18} />
              Notizen
            </label>
            <textarea
              {...register('notes')}
              rows={4}
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
              placeholder="Zusätzliche Informationen, Öffnungszeiten, etc..."
            />
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
              onClick={() => console.log('Submit button clicked!')}
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
              {isSubmitting ? 'Speichern...' : destination ? 'Aktualisieren' : 'Hinzufügen'}
            </button>
          </div>
        </form>
      </div>

      {/* Map Selection Modal */}
      <MapSelectionModal
        isOpen={showMapSelection}
        onClose={() => setShowMapSelection(false)}
        onLocationSelect={(location, coords) => {
          setValue('location', location);
          setCoordinates(coords);
          setShowMapSelection(false);
        }}
        initialCoordinates={coordinates}
        initialLocation={watch('location') || ''}
      />
    </div>
  );
};

export default React.memo(DestinationForm);