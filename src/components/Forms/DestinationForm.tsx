import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { destinationSchema, type DestinationFormData } from '../../schemas/validationSchemas';
import { useDestinationContext } from '../../contexts/DestinationContext';
import { useTripContext } from '../../contexts/TripContext';
import { useResponsive } from '../../hooks/useResponsive';
import { 
  DestinationCategory, 
  Destination,
  DestinationStatus 
} from '../../types';
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
  DollarSign, 
  FileText,
  Tag,
  Palette,
  Coffee,
  CheckCircle,
  Mountain,
  Compass,
  AlertCircle
} from 'lucide-react';
import EnhancedPlaceSearch from '../Search/EnhancedPlaceSearch';
import MapSelectionModal from '../UI/MapSelectionModal';
import Button from '../Common/Button';
import Card from '../Common/Card';
import { Coordinates } from '../../types';

interface DestinationFormProps {
  isOpen: boolean;
  onClose: () => void;
  destination?: Destination; // For editing
}

const predefinedColors = [
  'var(--color-primary-sage)', 'var(--color-primary-ocean)', 'var(--color-secondary-sunset)', 
  'var(--color-secondary-forest)', 'var(--color-accent-campfire)', 'var(--color-accent-moss)',
  'var(--color-error)', '#f59e0b', '#8b5cf6', '#ec4899'
];

// Helper function to get status labels
const getStatusLabel = (status: DestinationStatus): string => {
  const labels: Record<DestinationStatus, string> = {
    [DestinationStatus.PLANNED]: 'Geplant',
    [DestinationStatus.VISITED]: 'Besucht',
    [DestinationStatus.SKIPPED]: 'Übersprungen',
    [DestinationStatus.IN_PROGRESS]: 'In Bearbeitung'
  };
  return labels[status];
};

// Helper function to get status icon
const getStatusIcon = (status: DestinationStatus): string => {
  const icons: Record<DestinationStatus, string> = {
    [DestinationStatus.PLANNED]: '📋',
    [DestinationStatus.VISITED]: '✅',
    [DestinationStatus.SKIPPED]: '⏭️',
    [DestinationStatus.IN_PROGRESS]: '🔄'
  };
  return icons[status];
};

const DestinationForm: React.FC<DestinationFormProps> = ({ 
  isOpen, 
  onClose, 
  destination 
}) => {
  const { createDestination, updateDestination } = useDestinationContext();
  const { currentTrip } = useTripContext();
  
  // Mobile responsiveness
  const { isMobile } = useResponsive();
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
    resolver: zodResolver(destinationSchema),
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
        const newDestination = await createDestination(currentTrip?.id || '', formData);
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
      alignItems: isMobile ? 'flex-end' : 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: isMobile ? 0 : 'var(--space-lg)'
    }}>
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: isMobile ? 'var(--radius-xl) var(--radius-xl) 0 0' : 'var(--radius-xl)',
        width: '100%',
        maxWidth: isMobile ? '100%' : '700px',
        maxHeight: isMobile ? '85vh' : '95vh',
        overflow: 'auto',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--color-border)'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--color-primary-sage) 0%, var(--color-primary-ocean) 100%)',
          color: 'white',
          padding: isMobile ? 'var(--space-lg)' : 'var(--space-xl)',
          borderRadius: isMobile ? 'var(--radius-xl) var(--radius-xl) 0 0' : 'var(--radius-xl) var(--radius-xl) 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 'var(--space-md)' : 0
        }}>
          <div className="flex items-center gap-3">
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: 'var(--space-sm)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {destination ? <Mountain size={24} /> : <Compass size={24} />}
            </div>
            <div>
              <h2 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: isMobile ? 'var(--text-xl)' : 'var(--text-2xl)',
                fontWeight: 'var(--font-weight-semibold)',
                margin: 0,
                lineHeight: 1.2,
                textAlign: isMobile ? 'center' : 'left'
              }}>
                {destination ? 'Ziel bearbeiten' : 'Neues Ziel hinzufügen'}
              </h2>
              <p style={{
                fontSize: 'var(--text-sm)',
                margin: 0,
                opacity: 0.8,
                fontWeight: 'var(--font-weight-normal)',
                textAlign: isMobile ? 'center' : 'left'
              }}>
                {destination ? 'Aktualisiere deine Destination' : 'Plane dein nächstes Abenteuer'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              color: 'white',
              minWidth: 'auto',
              padding: 'var(--space-sm)'
            }}
          >
            <X size={20} />
          </Button>
        </div>

        {/* Form */}
        <form 
          onSubmit={handleSubmit(onSubmit)} 
          style={{ padding: isMobile ? '1rem' : '2rem' }}
        >
          {/* Basic Info */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{
              margin: '0 0 1rem 0',
              fontSize: '1.125rem',
              fontWeight: '600',
              color: 'var(--color-text-primary)',
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
                  color: 'var(--color-text-primary)',
                  marginBottom: '0.5rem'
                }}>
                  Name des Ziels *
                </label>
                <input
                  {...register('name')}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${errors.name ? 'var(--color-error)' : 'var(--color-neutral-mist)'}`,
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  placeholder="z.B. Brandenburger Tor"
                />
                {errors.name && (
                  <div className="form-error">
                    <AlertCircle size={14} />
                    {errors.name.message}
                  </div>
                )}
              </div>

              {/* Location */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'var(--color-text-primary)',
                  marginBottom: '0.5rem'
                }}>
                  Standort *
                </label>
                <EnhancedPlaceSearch
                  value={watch('location') || ''}
                  onChange={(location) => setValue('location', location)}
                  onPlaceSelect={(place) => {
                    setValue('location', place.structured_formatting?.main_text || place.display_name);
                    if (place.coordinates) {
                      setCoordinates(place.coordinates);
                    }
                  }}
                  placeholder="z.B. Pariser Platz, 10117 Berlin"
                  showCategories={true}
                />
                {errors.location && (
                  <div className="form-error">
                    <AlertCircle size={14} />
                    {errors.location.message}
                  </div>
                )}
                
                {/* Map Selection Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMapSelection(true)}
                  leftIcon={<MapPin size={16} />}
                  style={{
                    marginTop: 'var(--space-sm)',
                    fontSize: 'var(--text-sm)',
                    justifyContent: 'flex-start'
                  }}
                >
                  Auf Karte auswählen
                </Button>
                
                {/* Current Coordinates Display */}
                {coordinates && (
                  <div style={{
                    marginTop: 'var(--space-sm)',
                    padding: 'var(--space-sm)',
                    background: 'var(--color-accent-moss)',
                    color: 'white',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--font-weight-medium)'
                  }}>
                    📍 Koordinaten: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                  </div>
                )}
              </div>

              {/* Category */}
              <div>
                <label style={{
                  display: 'block',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--space-sm)'
                }}>
                  Kategorie *
                </label>
                <select
                  {...register('category', { required: 'Kategorie ist erforderlich' })}
                  onChange={(e) => handleCategoryChange(e.target.value as DestinationCategory)}
                  className="input"
                  style={{
                    width: '100%',
                    border: `2px solid ${errors.category ? 'var(--color-error)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-base)',
                    padding: 'var(--space-md)',
                    fontFamily: 'var(--font-body)',
                    backgroundColor: 'var(--color-surface)'
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
                    marginTop: 'var(--space-sm)',
                    padding: 'var(--space-md)',
                    background: 'var(--color-secondary-sky)',
                    color: 'white',
                    border: `2px solid rgba(255, 255, 255, 0.3)`,
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-weight-medium)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
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
              color: 'var(--color-text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Calendar size={18} />
              Datum
            </h3>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: selectedCategory === DestinationCategory.HOTEL 
                ? (isMobile ? '1fr' : '1fr 1fr') 
                : '1fr', 
              gap: isMobile ? '0.75rem' : '1rem' 
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'var(--color-text-primary)',
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
                    border: `1px solid ${errors.startDate ? 'var(--color-error)' : 'var(--color-neutral-mist)'}`,
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
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-primary)',
                    marginBottom: 'var(--space-sm)'
                  }}>
                    Abreisedatum *
                  </label>
                  <input
                    type="date"
                    {...register('endDate', { 
                      required: selectedCategory === DestinationCategory.HOTEL ? 'Abreisedatum ist bei Hotels erforderlich' : false
                    })}
                    className="input"
                    style={{
                      width: '100%',
                      border: `2px solid ${errors.endDate ? 'var(--color-error)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-base)',
                      padding: 'var(--space-md)',
                      fontFamily: 'var(--font-body)'
                    }}
                  />
                  {errors.endDate && (
                    <p style={{ color: 'var(--color-error)', fontSize: 'var(--text-xs)', margin: 'var(--space-xs) 0 0 0' }}>
                      {errors.endDate.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Budget & Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
            
            {/* Budget */}
            <Card>
              <div style={{
                background: 'linear-gradient(135deg, var(--color-accent-campfire) 0%, var(--color-secondary-sunset) 100%)',
                color: 'white',
                padding: 'var(--space-md)',
                margin: '-var(--space-lg) -var(--space-lg) var(--space-lg) -var(--space-lg)',
                borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)'
              }}>
                <DollarSign size={20} />
                <h3 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'var(--text-lg)',
                  fontWeight: 'var(--font-weight-medium)',
                  margin: 0
                }}>
                  Budget
                </h3>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--space-sm)'
                }}>
                  Budget (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('budget', { valueAsNumber: true })}
                  className="input"
                  style={{
                    width: '100%',
                    border: '2px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-base)',
                    padding: 'var(--space-md)',
                    fontFamily: 'var(--font-body)'
                  }}
                  placeholder="0.00"
                />
              </div>
            </Card>

            {/* Status */}
            <Card>
              <div style={{
                background: 'linear-gradient(135deg, var(--color-accent-moss) 0%, var(--color-secondary-forest) 100%)',
                color: 'white',
                padding: 'var(--space-md)',
                margin: '-var(--space-lg) -var(--space-lg) var(--space-lg) -var(--space-lg)',
                borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)'
              }}>
                <CheckCircle size={20} />
                <h3 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'var(--text-lg)',
                  fontWeight: 'var(--font-weight-medium)',
                  margin: 0
                }}>
                  Status
                </h3>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--space-sm)'
                }}>
                  Aktueller Status
                </label>
                <select
                  {...register('status', { required: 'Status ist erforderlich' })}
                  className="input"
                  style={{
                    width: '100%',
                    border: `2px solid ${errors.status ? 'var(--color-error)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-base)',
                    padding: 'var(--space-md)',
                    fontFamily: 'var(--font-body)',
                    backgroundColor: 'var(--color-surface)'
                  }}
                >
                  {Object.values(DestinationStatus).map((status) => (
                    <option key={status} value={status}>
                      {getStatusIcon(status)} {getStatusLabel(status)}
                    </option>
                  ))}
                </select>
                {errors.status && (
                  <p style={{ color: 'var(--color-error)', fontSize: 'var(--text-xs)', margin: 'var(--space-xs) 0 0 0' }}>
                    {errors.status.message}
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* Color Selection */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{
              margin: '0 0 1rem 0',
              fontSize: '1.125rem',
              fontWeight: '600',
              color: 'var(--color-text-primary)',
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
                    border: selectedColor === color ? '3px solid var(--color-neutral-charcoal)' : '1px solid var(--color-neutral-mist)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Tags */}
          <Card className="mb-6">
            <div style={{
              background: 'linear-gradient(135deg, var(--color-secondary-sky) 0%, var(--color-primary-ocean) 100%)',
              color: 'white',
              padding: 'var(--space-md)',
              margin: '-var(--space-lg) -var(--space-lg) var(--space-lg) -var(--space-lg)',
              borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)'
            }}>
              <Tag size={20} />
              <h3 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-weight-medium)',
                margin: 0
              }}>
                Tags
              </h3>
            </div>

            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="input"
                  style={{
                    flex: 1,
                    border: '2px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-base)',
                    padding: 'var(--space-md)',
                    fontFamily: 'var(--font-body)'
                  }}
                  placeholder="Tag hinzufügen..."
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={addTag}
                  style={{
                    minWidth: 'auto',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Hinzufügen
                </Button>
              </div>
            </div>

            {tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      background: 'var(--color-secondary-sky)',
                      color: 'white',
                      padding: 'var(--space-xs) var(--space-md)',
                      borderRadius: 'var(--radius-full)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'white',
                        padding: '2px',
                        borderRadius: 'var(--radius-full)',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'background-color var(--transition-fast)'
                      }}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* Notes */}
          <Card className="mb-6">
            <div style={{
              background: 'linear-gradient(135deg, var(--color-neutral-stone) 0%, var(--color-neutral-charcoal) 100%)',
              color: 'white',
              padding: 'var(--space-md)',
              margin: '-var(--space-lg) -var(--space-lg) var(--space-lg) -var(--space-lg)',
              borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)'
            }}>
              <FileText size={20} />
              <h3 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-weight-medium)',
                margin: 0
              }}>
                Notizen
              </h3>
            </div>
            
            <textarea
              {...register('notes')}
              rows={4}
              className="textarea"
              style={{
                width: '100%',
                border: '2px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-base)',
                padding: 'var(--space-md)',
                fontFamily: 'var(--font-body)',
                resize: 'vertical',
                minHeight: '120px'
              }}
              placeholder="Zusätzliche Informationen, Öffnungszeiten, etc..."
            />
          </Card>

          {/* Form Actions */}
          <div style={{
            display: 'flex',
            gap: 'var(--space-md)',
            justifyContent: isMobile ? 'stretch' : 'flex-end',
            paddingTop: 'var(--space-lg)',
            borderTop: `2px solid var(--color-border)`,
            flexDirection: isMobile ? 'column' : 'row'
          }}>
            <Button
              variant="secondary"
              onClick={onClose}
              style={{
                minWidth: isMobile ? 'auto' : '120px',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              Abbrechen
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={isSubmitting}
              onClick={() => console.log('Submit button clicked!')}
              style={{
                minWidth: isMobile ? 'auto' : '140px',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              {destination ? 'Aktualisieren' : 'Hinzufügen'}
            </Button>
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