import React, { useState, useEffect } from 'react';
import { PhotoService, PhotoInfo } from '../../services/photoService';
import {
  X,
  Edit3,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Move3D,
  Search,
  Camera
} from 'lucide-react';

interface PhotoGalleryProps {
  destinationId: string;
  photos: PhotoInfo[];
  onPhotosChange: () => void;
  isOpen: boolean;
  onClose: () => void;
  initialPhotoIndex?: number;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  destinationId,
  photos,
  onPhotosChange,
  isOpen,
  onClose,
  initialPhotoIndex = 0
}) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(initialPhotoIndex);
  const [viewMode, setViewMode] = useState<'grid' | 'slideshow'>('slideshow');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPhoto, setEditingPhoto] = useState<PhotoInfo | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editTags, setEditTags] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCurrentPhotoIndex(initialPhotoIndex);
    }
  }, [isOpen, initialPhotoIndex]);

  const filteredPhotos = photos.filter(photo =>
    photo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    photo.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    photo.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const currentPhoto = filteredPhotos[currentPhotoIndex];

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % filteredPhotos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + filteredPhotos.length) % filteredPhotos.length);
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (window.confirm('Möchten Sie dieses Foto wirklich löschen?')) {
      PhotoService.deletePhoto(destinationId, photoId);
      onPhotosChange();
      
      // Adjust current index if needed
      if (currentPhotoIndex >= filteredPhotos.length - 1) {
        setCurrentPhotoIndex(Math.max(0, filteredPhotos.length - 2));
      }
    }
  };

  const handleEditPhoto = (photo: PhotoInfo) => {
    setEditingPhoto(photo);
    setEditCaption(photo.caption || '');
    setEditTags(photo.tags?.join(', ') || '');
  };

  const handleSaveEdit = () => {
    if (editingPhoto) {
      const tags = editTags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      PhotoService.updatePhoto(destinationId, editingPhoto.id, {
        caption: editCaption,
        tags
      });

      setEditingPhoto(null);
      setEditCaption('');
      setEditTags('');
      onPhotosChange();
    }
  };

  const handleDownloadPhoto = (photo: PhotoInfo) => {
    if (photo.url) {
      const link = document.createElement('a');
      link.href = photo.url;
      link.download = photo.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    
    switch (e.key) {
      case 'ArrowLeft':
        prevPhoto();
        break;
      case 'ArrowRight':
        nextPhoto();
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column'
      }}
      onKeyDown={handleKeyPress}
      tabIndex={0}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 2rem',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{
            margin: 0,
            color: 'white',
            fontSize: '1.25rem',
            fontWeight: '600'
          }}>
            {filteredPhotos.length > 0 ? `${currentPhotoIndex + 1} von ${filteredPhotos.length}` : 'Keine Fotos'}
          </h2>
          
          {filteredPhotos.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '0.5rem'
            }}>
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'slideshow' : 'grid')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '4px'
                }}
                title={viewMode === 'grid' ? 'Slideshow' : 'Raster'}
              >
                {viewMode === 'grid' ? <Move3D size={16} /> : <Grid3X3 size={16} />}
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Search */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={16} style={{
              position: 'absolute',
              left: '0.75rem',
              color: '#9ca3af'
            }} />
            <input
              type="text"
              placeholder="Fotos suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '0.5rem 0.5rem 0.5rem 2.5rem',
                color: 'white',
                fontSize: '0.875rem',
                width: '200px'
              }}
            />
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem',
              color: 'white',
              cursor: 'pointer'
            }}
            title="Schließen"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      {filteredPhotos.length === 0 ? (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '1rem',
          color: 'white'
        }}>
          <Camera size={64} style={{ opacity: 0.5 }} />
          <h3 style={{ margin: 0, fontSize: '1.5rem' }}>
            {searchQuery ? 'Keine Fotos gefunden' : 'Keine Fotos vorhanden'}
          </h3>
          <p style={{ margin: 0, opacity: 0.7 }}>
            {searchQuery ? `Keine Treffer für "${searchQuery}"` : 'Laden Sie Ihre ersten Fotos hoch'}
          </p>
        </div>
      ) : viewMode === 'slideshow' ? (
        /* Slideshow View */
        <div style={{
          flex: 1,
          display: 'flex',
          position: 'relative'
        }}>
          {/* Navigation Buttons */}
          {filteredPhotos.length > 1 && (
            <>
              <button
                onClick={prevPhoto}
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  color: 'white',
                  cursor: 'pointer',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ChevronLeft size={24} />
              </button>

              <button
                onClick={nextPhoto}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  color: 'white',
                  cursor: 'pointer',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {/* Main Image */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}>
            {currentPhoto && (
              <img
                src={currentPhoto.url}
                alt={currentPhoto.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: '8px'
                }}
              />
            )}
          </div>

          {/* Photo Info Sidebar */}
          {currentPhoto && (
            <div style={{
              width: '320px',
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(10px)',
              padding: '2rem',
              overflowY: 'auto',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{
                  margin: 0,
                  color: 'white',
                  fontSize: '1.125rem',
                  fontWeight: '600'
                }}>
                  {currentPhoto.name}
                </h3>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleEditPhoto(currentPhoto)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.5rem',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                    title="Bearbeiten"
                  >
                    <Edit3 size={14} />
                  </button>
                  
                  <button
                    onClick={() => handleDownloadPhoto(currentPhoto)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.5rem',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                    title="Herunterladen"
                  >
                    <Download size={14} />
                  </button>
                  
                  <button
                    onClick={() => handleDeletePhoto(currentPhoto.id)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.5rem',
                      color: '#fca5a5',
                      cursor: 'pointer'
                    }}
                    title="Löschen"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Photo Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {currentPhoto.caption && (
                  <div>
                    <h4 style={{
                      margin: '0 0 0.5rem 0',
                      color: '#d1d5db',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      Beschreibung
                    </h4>
                    <p style={{
                      margin: 0,
                      color: 'white',
                      fontSize: '0.875rem',
                      lineHeight: '1.5'
                    }}>
                      {currentPhoto.caption}
                    </p>
                  </div>
                )}

                {currentPhoto.tags && currentPhoto.tags.length > 0 && (
                  <div>
                    <h4 style={{
                      margin: '0 0 0.5rem 0',
                      color: '#d1d5db',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      Tags
                    </h4>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}>
                      {currentPhoto.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            background: 'rgba(59, 130, 246, 0.2)',
                            color: '#93c5fd',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem'
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 style={{
                    margin: '0 0 0.5rem 0',
                    color: '#d1d5db',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    Details
                  </h4>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    fontSize: '0.75rem',
                    color: '#9ca3af'
                  }}>
                    <div>Größe: {PhotoService.formatFileSize(currentPhoto.size)}</div>
                    <div>Typ: {currentPhoto.type}</div>
                    {currentPhoto.metadata?.width && currentPhoto.metadata?.height && (
                      <div>Auflösung: {currentPhoto.metadata.width} × {currentPhoto.metadata.height}</div>
                    )}
                    <div>Hochgeladen: {new Date(currentPhoto.uploadedAt).toLocaleDateString('de-DE')}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Grid View */
        <div style={{
          flex: 1,
          padding: '2rem',
          overflowY: 'auto'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            {filteredPhotos.map((photo, index) => (
              <div
                key={photo.id}
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.2s'
                }}
                onClick={() => {
                  setCurrentPhotoIndex(index);
                  setViewMode('slideshow');
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <img
                  src={photo.url}
                  alt={photo.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                
                {/* Overlay */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.7))',
                  padding: '1rem 0.75rem 0.75rem',
                  color: 'white'
                }}>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    marginBottom: '0.25rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {photo.name}
                  </div>
                  
                  {photo.caption && (
                    <div style={{
                      fontSize: '0.75rem',
                      opacity: 0.8,
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
        </div>
      )}

      {/* Edit Modal */}
      {editingPhoto && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{
              margin: '0 0 1.5rem 0',
              fontSize: '1.25rem',
              fontWeight: '600'
            }}>
              Foto bearbeiten
            </h3>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  marginBottom: '0.5rem'
                }}>
                  Beschreibung
                </label>
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  placeholder="Beschreibung hinzufügen..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    resize: 'vertical',
                    minHeight: '80px'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  marginBottom: '0.5rem'
                }}>
                  Tags (durch Komma getrennt)
                </label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="strand, urlaub, sonne"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px'
                  }}
                />
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '2rem'
            }}>
              <button
                onClick={() => setEditingPhoto(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  padding: '0.75rem 1.5rem',
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
              
              <button
                onClick={handleSaveEdit}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.75rem 1.5rem',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;