import React, { useState, useEffect } from 'react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { useAuth } from '../../contexts/AuthContext';
import { Destination } from '../../types';
import { 
  Camera, 
  Upload, 
  Image, 
  Calendar, 
  MapPin,
  Plus,
  X,
  Download,
  Trash2,
  Eye,
  ChevronRight,
  FolderOpen,
  Lock,
  Unlock,
  Check,
  Filter,
  Shield,
  CheckCircle
} from 'lucide-react';
import { formatDate, getCategoryIcon, getCategoryLabel } from '../../utils';
import { PhotoService, TripPhoto, PhotoInfo, PhotoUploadOptions } from '../../services/photoService';
import '../../utils/testPrivacyUpdate'; // Import test utility

// Unified photo interface for display
interface DisplayPhoto {
  id: string;
  fileName: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
  caption?: string;
  privacy: 'private' | 'public';
  privacyApprovedAt?: string;
}

interface DestinationWithPhotos extends Omit<Destination, 'photos'> {
  photoCount?: number;
  photos?: DisplayPhoto[];
}

const PhotosView: React.FC = () => {
  const { currentTrip, destinations } = useSupabaseApp();
  
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [photos, setPhotos] = useState<DisplayPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<DisplayPhoto | null>(null);
  const [selectedPhotosForPrivacy, setSelectedPhotosForPrivacy] = useState<Set<string>>(new Set());
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'private' | 'public'>('all');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Get destinations for current trip, sorted chronologically
  const tripDestinations: DestinationWithPhotos[] = React.useMemo(() => {
    if (!currentTrip) return [];
    
    return currentTrip.destinations
      .map(id => destinations.find(dest => dest.id === id))
      .filter((dest): dest is Destination => dest !== undefined)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .map(dest => ({
        ...dest,
        photoCount: 0, // Will be populated when we load photos
        photos: []
      }));
  }, [currentTrip, destinations]);

  // Helper function to convert photo types to DisplayPhoto
  const convertToDisplayPhoto = (photo: TripPhoto | PhotoInfo): DisplayPhoto => {
    // Handle TripPhoto type (Supabase)
    if ('trip_id' in photo) {
      return {
        id: photo.id,
        fileName: photo.file_name,
        url: photo.url || '',
        size: photo.file_size,
        type: photo.file_type,
        uploadedAt: photo.created_at,
        caption: photo.caption,
        privacy: photo.privacy || 'private',
        privacyApprovedAt: photo.privacy_approved_at
      };
    } 
    // Handle PhotoInfo type (localStorage)
    else {
      return {
        id: photo.id,
        fileName: photo.name,
        url: photo.url,
        size: photo.size,
        type: photo.type,
        uploadedAt: photo.uploadedAt,
        caption: photo.caption,
        privacy: 'private', // localStorage photos are always private
        privacyApprovedAt: undefined
      };
    }
  };

  // Load photos for destination using PhotoService
  const loadPhotosForDestination = async (destinationId: string) => {
    setLoading(true);
    try {
      const loadedPhotos = await PhotoService.getPhotosForDestinationUnified(
        destinationId, 
        currentTrip?.id
      );
      
      // Convert to DisplayPhoto format
      const displayPhotos = loadedPhotos.map(convertToDisplayPhoto);
      setPhotos(displayPhotos);
    } catch (error) {
      console.error('Error loading photos:', error);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDestinationSelect = (destinationId: string) => {
    setSelectedDestination(destinationId);
    loadPhotosForDestination(destinationId);
  };

  const handlePhotoUpload = async (files: FileList) => {
    if (!selectedDestination || !currentTrip) return;
    
    setUploading(true);
    try {
      const uploadedPhotos = await PhotoService.uploadPhotosUnified(
        files,
        selectedDestination,
        currentTrip.id
      );
      
      // Convert to DisplayPhoto format and add to state
      const displayPhotos = uploadedPhotos.map(convertToDisplayPhoto);
      setPhotos(prev => [...prev, ...displayPhotos]);
      
      console.log(`Successfully uploaded ${uploadedPhotos.length} photos`);
    } catch (error) {
      console.error('Failed to upload photos:', error);
    } finally {
      setUploading(false);
    }
  };

  // Privacy management functions
  const handlePhotoSelect = (photoId: string, selected: boolean) => {
    const newSelected = new Set(selectedPhotosForPrivacy);
    if (selected) {
      newSelected.add(photoId);
    } else {
      newSelected.delete(photoId);
    }
    setSelectedPhotosForPrivacy(newSelected);
  };

  const handleSelectAll = () => {
    const allPhotoIds = new Set(photos.map(photo => photo.id));
    setSelectedPhotosForPrivacy(allPhotoIds);
  };

  const handleDeselectAll = () => {
    setSelectedPhotosForPrivacy(new Set());
  };

  const handlePrivacyUpdate = async (privacy: 'private' | 'public') => {
    if (selectedPhotosForPrivacy.size === 0) {
      console.warn('⚠️ No photos selected for privacy update');
      return;
    }

    console.log(`🔄 Starting privacy update to ${privacy} for ${selectedPhotosForPrivacy.size} photos`);
    console.log('📸 Selected photo IDs:', Array.from(selectedPhotosForPrivacy));

    try {
      // Call PhotoService to update privacy
      await PhotoService.updatePhotosPrivacy(Array.from(selectedPhotosForPrivacy), privacy);
      
      // Update local state
      setPhotos(prev => prev.map(photo => {
        if (selectedPhotosForPrivacy.has(photo.id)) {
          console.log(`📝 Updating photo ${photo.id} privacy to ${privacy}`);
          return { 
            ...photo, 
            privacy, 
            privacyApprovedAt: privacy === 'public' ? new Date().toISOString() : photo.privacyApprovedAt 
          };
        }
        return photo;
      }));
      
      setSelectedPhotosForPrivacy(new Set());
      setShowPrivacyModal(false);
      
      console.log(`✅ Successfully updated privacy for ${selectedPhotosForPrivacy.size} photos to ${privacy}`);
      
      // Force reload to verify changes
      if (selectedDestination) {
        console.log('🔄 Reloading photos to verify changes...');
        await loadPhotosForDestination(selectedDestination);
      }
      
    } catch (error) {
      console.error('❌ Failed to update photo privacy:', error);
      alert(`Fehler beim Aktualisieren der Privacy-Einstellungen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  // Delete photos functions
  const handleDeletePhotos = async () => {
    if (selectedPhotosForPrivacy.size === 0) {
      console.warn('⚠️ No photos selected for deletion');
      return;
    }

    setDeleting(true);
    console.log(`🗑️ Starting deletion of ${selectedPhotosForPrivacy.size} photos`);
    console.log('📸 Photos to delete:', Array.from(selectedPhotosForPrivacy));

    try {
      const photoIds = Array.from(selectedPhotosForPrivacy);
      
      // Delete each photo individually for better error handling
      const deletionResults = await Promise.allSettled(
        photoIds.map(async (photoId) => {
          try {
            await PhotoService.deleteSupabasePhoto(photoId);
            console.log(`✅ Deleted photo ${photoId}`);
            return { photoId, success: true };
          } catch (error) {
            console.error(`❌ Failed to delete photo ${photoId}:`, error);
            return { photoId, success: false, error };
          }
        })
      );

      // Count successful deletions
      const successful = deletionResults.filter(
        (result): result is PromiseFulfilledResult<{ photoId: string; success: true }> => 
          result.status === 'fulfilled' && result.value.success
      );

      const failed = deletionResults.length - successful.length;

      // Update local state - remove successfully deleted photos
      const successfulIds = new Set(successful.map(r => r.value.photoId));
      setPhotos(prev => prev.filter(photo => !successfulIds.has(photo.id)));

      // Clear selection
      setSelectedPhotosForPrivacy(new Set());
      setShowDeleteConfirmation(false);

      // Show results
      if (failed > 0) {
        alert(`${successful.length} Fotos gelöscht, ${failed} Fehler aufgetreten.`);
      } else {
        console.log(`✅ Successfully deleted ${successful.length} photos`);
      }

      // Reload to ensure consistency
      if (selectedDestination) {
        console.log('🔄 Reloading photos after deletion...');
        await loadPhotosForDestination(selectedDestination);
      }

    } catch (error) {
      console.error('💥 Delete operation failed:', error);
      alert(`Fehler beim Löschen der Fotos: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleSinglePhotoDelete = async (photoId: string) => {
    console.log(`🗑️ Deleting single photo: ${photoId}`);
    
    try {
      await PhotoService.deleteSupabasePhoto(photoId);
      
      // Remove from local state
      setPhotos(prev => prev.filter(photo => photo.id !== photoId));
      
      // Close modal if this photo was open
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(null);
      }
      
      console.log(`✅ Successfully deleted photo ${photoId}`);
      
    } catch (error) {
      console.error(`❌ Failed to delete photo ${photoId}:`, error);
      alert(`Fehler beim Löschen des Fotos: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  // Filter photos based on privacy filter
  const filteredPhotos = React.useMemo(() => {
    if (privacyFilter === 'all') return photos;
    return photos.filter(photo => photo.privacy === privacyFilter);
  }, [photos, privacyFilter]);

  if (!currentTrip) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
        padding: '3rem',
        color: 'var(--color-text-secondary)'
      }}>
        <Camera size={48} style={{ opacity: 0.5 }} />
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Keine Reise ausgewählt</h2>
        <p style={{ margin: 0, textAlign: 'center' }}>
          Wählen Sie eine Reise aus, um Fotos zu verwalten.
        </p>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '1.5rem',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '2rem'
      }}>
        <h1 style={{
          margin: '0 0 0.5rem 0',
          fontSize: '2rem',
          fontWeight: 'bold',
          color: 'var(--color-text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <Camera size={32} style={{ color: 'var(--color-primary-ocean)' }} />
          Reise-Fotos
        </h1>
        <p style={{
          margin: 0,
          color: 'var(--color-text-secondary)',
          fontSize: '1rem'
        }}>
          {currentTrip.name} • {formatDate(currentTrip.startDate)} - {formatDate(currentTrip.endDate)}
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedDestination ? '300px 1fr' : '1fr',
        gap: '2rem',
        minHeight: '600px'
      }}>
        {/* Destinations List */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '1rem',
          height: 'fit-content'
        }}>
          <h3 style={{
            margin: '0 0 1rem 0',
            fontSize: '1.125rem',
            fontWeight: '600',
            color: 'var(--color-text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <FolderOpen size={20} />
            Ziele ({tripDestinations.length})
          </h3>
          
          {tripDestinations.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem 1rem',
              color: 'var(--color-text-secondary)'
            }}>
              <Calendar size={32} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
              <p style={{ margin: 0, fontSize: '0.875rem' }}>
                Keine Ziele in dieser Reise
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {tripDestinations.map((destination) => (
                <button
                  key={destination.id}
                  onClick={() => handleDestinationSelect(destination.id)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: selectedDestination === destination.id ? 'var(--color-primary-ocean)' : 'var(--color-neutral-cream)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    color: selectedDestination === destination.id ? 'white' : 'var(--color-text-primary)'
                  }}
                  onMouseOver={(e) => {
                    if (selectedDestination !== destination.id) {
                      e.currentTarget.style.background = 'var(--color-neutral-mist)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedDestination !== destination.id) {
                      e.currentTarget.style.background = 'var(--color-neutral-cream)';
                    }
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <div style={{ fontSize: '1.25rem' }}>
                      {getCategoryIcon(destination.category)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: '600',
                        fontSize: '0.875rem',
                        marginBottom: '0.25rem'
                      }}>
                        {destination.name}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        opacity: 0.8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <Calendar size={12} />
                        {formatDate(destination.startDate)}
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <Camera size={14} />
                      <span style={{ fontSize: '0.75rem' }}>
                        {destination.photoCount || 0}
                      </span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Photos Section */}
        {selectedDestination && (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '1.125rem',
                fontWeight: '600',
                color: 'var(--color-text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Image size={20} />
                Fotos ({photos.length})
              </h3>
              
              {/* Upload Button */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'var(--color-primary-ocean)',
                color: 'white',
                borderRadius: '8px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                opacity: uploading ? 0.6 : 1
              }}>
                {uploading ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Lädt hoch...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Fotos hinzufügen
                  </>
                )}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files && handlePhotoUpload(e.target.files)}
                  disabled={uploading}
                />
              </label>
            </div>

            {/* Photos Grid */}
            {loading ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem',
                color: 'var(--color-text-secondary)'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid var(--color-border)',
                  borderTop: '3px solid var(--color-primary-ocean)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginRight: '1rem'
                }} />
                Lade Fotos...
              </div>
            ) : photos.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: 'var(--color-text-secondary)'
              }}>
                <Camera size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>
                  Noch keine Fotos
                </h4>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                  Laden Sie Ihre ersten Fotos für dieses Ziel hoch
                </p>
              </div>
            ) : (
              <>
                {/* Privacy Controls */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  background: 'var(--color-neutral-cream)',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                      onClick={handleSelectAll}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-primary-ocean)',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        textDecoration: 'underline'
                      }}
                    >
                      Alle auswählen
                    </button>
                    <button
                      onClick={handleDeselectAll}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        textDecoration: 'underline'
                      }}
                    >
                      Auswahl aufheben
                    </button>
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                      {selectedPhotosForPrivacy.size} ausgewählt
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handlePrivacyUpdate('private')}
                      disabled={selectedPhotosForPrivacy.size === 0}
                      style={{
                        background: selectedPhotosForPrivacy.size > 0 ? 'var(--color-warning)' : 'var(--color-neutral-200)',
                        color: selectedPhotosForPrivacy.size > 0 ? 'white' : 'var(--color-text-secondary)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        cursor: selectedPhotosForPrivacy.size > 0 ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <Lock size={14} />
                      Privat setzen
                    </button>
                    <button
                      onClick={() => handlePrivacyUpdate('public')}
                      disabled={selectedPhotosForPrivacy.size === 0}
                      style={{
                        background: selectedPhotosForPrivacy.size > 0 ? 'var(--color-success)' : 'var(--color-neutral-200)',
                        color: selectedPhotosForPrivacy.size > 0 ? 'white' : 'var(--color-text-secondary)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        cursor: selectedPhotosForPrivacy.size > 0 ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <Unlock size={14} />
                      Öffentlich freigeben
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirmation(true)}
                      disabled={selectedPhotosForPrivacy.size === 0}
                      style={{
                        background: selectedPhotosForPrivacy.size > 0 ? 'var(--color-error)' : 'var(--color-neutral-200)',
                        color: selectedPhotosForPrivacy.size > 0 ? 'white' : 'var(--color-text-secondary)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        cursor: selectedPhotosForPrivacy.size > 0 ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <Trash2 size={14} />
                      Löschen ({selectedPhotosForPrivacy.size})
                    </button>
                  </div>
                </div>

                {/* Filter Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  {(['all', 'private', 'public'] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setPrivacyFilter(filter)}
                      style={{
                        background: privacyFilter === filter ? 'var(--color-primary-ocean)' : 'var(--color-neutral-200)',
                        color: privacyFilter === filter ? 'white' : 'var(--color-text-primary)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      {filter === 'all' && <Filter size={14} />}
                      {filter === 'private' && <Lock size={14} />}
                      {filter === 'public' && <Unlock size={14} />}
                      {filter === 'all' ? 'Alle' : filter === 'private' ? 'Privat' : 'Öffentlich'}
                    </button>
                  ))}
                </div>

                {/* Photos Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '1rem'
                }}>
                  {filteredPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      style={{
                        background: 'var(--color-neutral-cream)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: selectedPhotosForPrivacy.has(photo.id) ? '2px solid var(--color-primary-ocean)' : '1px solid var(--color-border)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      {/* Privacy Selection Checkbox */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '0.5rem',
                          left: '0.5rem',
                          zIndex: 10,
                          background: 'rgba(0,0,0,0.7)',
                          borderRadius: '4px',
                          padding: '0.25rem'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePhotoSelect(photo.id, !selectedPhotosForPrivacy.has(photo.id));
                        }}
                      >
                        <CheckCircle 
                          size={16} 
                          style={{
                            color: selectedPhotosForPrivacy.has(photo.id) ? 'var(--color-success)' : 'rgba(255,255,255,0.6)'
                          }}
                        />
                      </div>

                      {/* Privacy Status Indicator */}
                      <div style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        display: 'flex',
                        gap: '0.25rem'
                      }}>
                        <div style={{
                          background: photo.privacy === 'public' ? 'var(--color-success)' : 'var(--color-warning)',
                          color: 'white',
                          borderRadius: '4px',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          {photo.privacy === 'public' ? <Unlock size={12} /> : <Lock size={12} />}
                          {photo.privacy === 'public' ? 'Öffentlich' : 'Privat'}
                        </div>
                        
                        {/* Single Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Foto "${photo.fileName}" wirklich löschen?`)) {
                              handleSinglePhotoDelete(photo.id);
                            }
                          }}
                          style={{
                            background: 'var(--color-error)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.25rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '0.75rem'
                          }}
                          title="Foto löschen"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <div 
                        style={{
                          aspectRatio: '4/3',
                          background: `url(${photo.url}) center/cover`,
                          position: 'relative'
                        }}
                        onClick={() => setSelectedPhoto(photo)}
                      >
                      </div>
                      
                      <div style={{ padding: '0.75rem' }} onClick={() => setSelectedPhoto(photo)}>
                        <div style={{
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: 'var(--color-text-primary)',
                          marginBottom: '0.25rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {photo.fileName}
                        </div>
                        {photo.caption && (
                          <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--color-text-secondary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {photo.caption}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '2rem'
        }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center'
          }}>
            <div style={{
              background: 'var(--color-error)',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto'
            }}>
              <Trash2 size={24} style={{ color: 'white' }} />
            </div>
            
            <h3 style={{
              margin: '0 0 1rem 0',
              fontSize: '1.25rem',
              fontWeight: '600',
              color: 'var(--color-text-primary)'
            }}>
              Fotos löschen?
            </h3>
            
            <p style={{
              margin: '0 0 2rem 0',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5
            }}>
              Möchten Sie wirklich <strong>{selectedPhotosForPrivacy.size} Foto{selectedPhotosForPrivacy.size !== 1 ? 's' : ''}</strong> löschen? 
              Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                disabled={deleting}
                style={{
                  background: 'var(--color-neutral-200)',
                  color: 'var(--color-text-primary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.875rem',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.6 : 1
                }}
              >
                Abbrechen
              </button>
              
              <button
                onClick={handleDeletePhotos}
                disabled={deleting}
                style={{
                  background: 'var(--color-error)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.875rem',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  opacity: deleting ? 0.6 : 1
                }}
              >
                {deleting ? (
                  <>
                    <div style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Lösche...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Löschen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '2rem'
        }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '12px',
            overflow: 'hidden',
            maxWidth: '90vw',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              borderBottom: '1px solid var(--color-border)'
            }}>
              <h4 style={{
                margin: 0,
                fontSize: '1.125rem',
                fontWeight: '600'
              }}>
                {selectedPhoto.fileName}
              </h4>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    if (window.confirm(`Foto "${selectedPhoto.fileName}" wirklich löschen?`)) {
                      handleSinglePhotoDelete(selectedPhoto.id);
                    }
                  }}
                  style={{
                    background: 'var(--color-error)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Foto löschen"
                >
                  <Trash2 size={16} />
                </button>
                
                <button
                  onClick={() => setSelectedPhoto(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.fileName}
              style={{
                maxWidth: '80vw',
                maxHeight: '70vh',
                objectFit: 'contain'
              }}
            />
            {selectedPhoto.caption && (
              <div style={{
                padding: '1rem',
                borderTop: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}>
                {selectedPhoto.caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotosView;