import React, { useState } from 'react';
import { X, Camera, Globe, Users, Lock, Upload, Image as ImageIcon, Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { CreatePhotoShareData, Trip, Destination, PhotoObject } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface PhotoShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (data: CreatePhotoShareData) => Promise<void>;
  trip?: Trip;
  destination?: Destination;
  initialPhoto?: string; // Pre-selected photo URL
  initialPhotos?: string[]; // Pre-selected multiple photos
}

const PhotoShareModal: React.FC<PhotoShareModalProps> = ({
  isOpen,
  onClose,
  onShare,
  trip,
  destination,
  initialPhoto,
  initialPhotos
}) => {
  const { user } = useAuth();
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoObject[]>(
    initialPhotos ? initialPhotos.map((url: string, index: number) => ({ url, order: index })) :
    initialPhoto ? [{ url: initialPhoto, order: 0 }] : []
  );
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [caption, setCaption] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'contacts' | 'private'>('public');
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  if (!isOpen) return null;

  const handlePhotoUpload = async (files: FileList) => {
    const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length === 0) {
      alert('Bitte wählen Sie gültige Bilddateien aus.');
      return;
    }

    setIsUploading(true);
    
    try {
      const newPhotos: PhotoObject[] = [];
      
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        // In a real app, this would upload to your storage service
        const photoUrl = URL.createObjectURL(file);
        
        newPhotos.push({
          url: photoUrl,
          order: selectedPhotos.length + i,
          caption: file.name
        });
      }
      
      // Sort chronologically (by file.lastModified if available)
      const sortedPhotos = [...selectedPhotos, ...newPhotos].sort((a, b) => {
        // If we have file metadata, sort by that, otherwise by order
        return a.order - b.order;
      });
      
      setSelectedPhotos(sortedPhotos);
      
      console.log('Photos uploaded:', sortedPhotos);
    } catch (error) {
      console.error('Photo upload failed:', error);
      alert('Foto-Upload fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handlePhotoUpload(files);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      handlePhotoUpload(files);
    }
  };
  
  const removePhoto = (index: number) => {
    const newPhotos = selectedPhotos.filter((_, i) => i !== index);
    setSelectedPhotos(newPhotos.map((photo, i) => ({ ...photo, order: i })));
    if (currentPhotoIndex >= newPhotos.length) {
      setCurrentPhotoIndex(Math.max(0, newPhotos.length - 1));
    }
  };
  
  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % selectedPhotos.length);
  };
  
  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + selectedPhotos.length) % selectedPhotos.length);
  };

  const handleShare = async () => {
    if (selectedPhotos.length === 0) {
      alert('Bitte wählen Sie mindestens ein Foto aus.');
      return;
    }

    try {
      setIsUploading(true);
      
      const shareData: CreatePhotoShareData = {
        photos: selectedPhotos,
        photo_url: selectedPhotos[0]?.url, // Backward compatibility
        caption: caption.trim() || undefined,
        privacy,
        trip_id: trip?.id,
        destination_id: destination?.id
      };

      await onShare(shareData);
      
      // Reset form
      setSelectedPhotos(
        initialPhotos ? initialPhotos.map((url: string, index: number) => ({ url, order: index })) :
        initialPhoto ? [{ url: initialPhoto, order: 0 }] : []
      );
      setCurrentPhotoIndex(0);
      setCaption('');
      setPrivacy('public');
      onClose();
      
    } catch (error) {
      console.error('Photo sharing failed:', error);
      alert('Foto konnte nicht geteilt werden. Bitte versuchen Sie es erneut.');
    } finally {
      setIsUploading(false);
    }
  };

  const privacyOptions = [
    { value: 'public', label: 'Öffentlich', icon: Globe, description: 'Jeder kann dieses Foto sehen' },
    { value: 'contacts', label: 'Kontakte', icon: Users, description: 'Nur Ihre Freunde können dieses Foto sehen' },
    { value: 'private', label: 'Privat', icon: Lock, description: 'Nur Sie können dieses Foto sehen' }
  ];

  const currentPhoto = selectedPhotos[currentPhotoIndex];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.5rem 1.5rem 1rem 1.5rem',
          borderBottom: '1px solid var(--color-border)'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            margin: 0,
            color: 'var(--color-text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Camera size={20} />
            {selectedPhotos.length > 1 ? `${selectedPhotos.length} Fotos teilen` : 'Foto teilen'}
          </h2>
          
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '6px',
              color: 'var(--color-text-secondary)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {/* Context Info */}
          {(trip || destination) && (
            <div style={{
              background: 'var(--color-bg-secondary)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div style={{
                background: 'var(--color-primary-sage)',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                {destination ? '📍' : '🎒'}
              </div>
              <div>
                <div style={{
                  fontWeight: '600',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.875rem'
                }}>
                  {destination ? destination.name : trip?.name}
                </div>
                <div style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.75rem'
                }}>
                  {destination ? destination.location : 
                   trip ? `${trip.destinations.length} Ziele` : ''}
                </div>
              </div>
            </div>
          )}

          {/* Photo Selection */}
          {selectedPhotos.length === 0 ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              style={{
                border: `2px dashed ${dragOver ? 'var(--color-primary-ocean)' : 'var(--color-border)'}`,
                borderRadius: '8px',
                padding: '2rem',
                textAlign: 'center',
                marginBottom: '1.5rem',
                background: dragOver ? 'var(--color-bg-secondary)' : 'var(--color-surface)',
                transition: 'all 0.2s'
              }}
            >
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <ImageIcon size={48} style={{ color: 'var(--color-text-secondary)' }} />
                <div>
                  <div style={{
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    color: 'var(--color-text-primary)'
                  }}>
                    Fotos hochladen
                  </div>
                  <div style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.875rem',
                    marginBottom: '1rem'
                  }}>
                    Ziehen Sie ein oder mehrere Fotos hierher oder klicken Sie zum Auswählen
                  </div>
                </div>
                
                <label style={{
                  background: 'var(--color-primary-ocean)',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  <Upload size={16} />
                  Fotos auswählen
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div style={{
              marginBottom: '1.5rem',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              {/* Photo Carousel */}
              <div style={{ position: 'relative' }}>
                {currentPhoto && (
                  <img
                    src={currentPhoto.url}
                    alt="Selected photo"
                    style={{
                      width: '100%',
                      height: '250px',
                      objectFit: 'cover'
                    }}
                  />
                )}

                {/* Navigation arrows for multi-photo */}
                {selectedPhotos.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      style={{
                        position: 'absolute',
                        left: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(0, 0, 0, 0.5)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'white'
                      }}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    
                    <button
                      onClick={nextPhoto}
                      style={{
                        position: 'absolute',
                        right: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(0, 0, 0, 0.5)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'white'
                      }}
                    >
                      <ChevronRight size={20} />
                    </button>

                    {/* Photo counter */}
                    <div style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      background: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem'
                    }}>
                      {currentPhotoIndex + 1} / {selectedPhotos.length}
                    </div>
                  </>
                )}
              </div>

              {/* Photo management */}
              <div style={{
                padding: '0.75rem',
                background: 'var(--color-bg-secondary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text-secondary)'
                }}>
                  {selectedPhotos.length === 1 ? '1 Foto ausgewählt' : `${selectedPhotos.length} Fotos ausgewählt`}
                </span>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <label style={{
                    background: 'var(--color-primary-ocean)',
                    color: 'white',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '0.75rem'
                  }}>
                    <Plus size={14} />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                  </label>
                  
                  {selectedPhotos.length > 0 && (
                    <button
                      onClick={() => removePhoto(currentPhotoIndex)}
                      style={{
                        background: 'var(--color-error)',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Caption */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontWeight: '500',
              marginBottom: '0.5rem',
              color: 'var(--color-text-primary)',
              fontSize: '0.875rem'
            }}>
              Beschreibung (optional)
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Erzählen Sie etwas über diese Fotos..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                resize: 'vertical',
                minHeight: '80px',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)'
              }}
            />
          </div>

          {/* Privacy Settings */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontWeight: '500',
              marginBottom: '0.75rem',
              color: 'var(--color-text-primary)',
              fontSize: '0.875rem'
            }}>
              Sichtbarkeit
            </label>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {privacyOptions.map(option => {
                const Icon = option.icon;
                const isSelected = privacy === option.value;
                
                return (
                  <button
                    key={option.value}
                    onClick={() => setPrivacy(option.value as any)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      border: `1px solid ${isSelected ? 'var(--color-primary-ocean)' : 'var(--color-border)'}`,
                      borderRadius: '8px',
                      background: isSelected ? 'var(--color-bg-secondary)' : 'var(--color-surface)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%'
                    }}
                  >
                    <Icon size={16} style={{ 
                      color: isSelected ? 'var(--color-primary-ocean)' : 'var(--color-text-secondary)'
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: '500',
                        color: isSelected ? 'var(--color-primary-ocean)' : 'var(--color-text-primary)',
                        fontSize: '0.875rem'
                      }}>
                        {option.label}
                      </div>
                      <div style={{
                        color: 'var(--color-text-secondary)',
                        fontSize: '0.75rem'
                      }}>
                        {option.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={onClose}
              disabled={isUploading}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                opacity: isUploading ? 0.6 : 1
              }}
            >
              Abbrechen
            </button>
            
            <button
              onClick={handleShare}
              disabled={selectedPhotos.length === 0 || isUploading}
              style={{
                background: (selectedPhotos.length === 0 || isUploading) ? 'var(--color-text-secondary)' : 'var(--color-primary-ocean)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: (selectedPhotos.length === 0 || isUploading) ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {isUploading ? 'Teilen...' : 
               selectedPhotos.length > 1 ? `${selectedPhotos.length} Fotos teilen` : 'Foto teilen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoShareModal;