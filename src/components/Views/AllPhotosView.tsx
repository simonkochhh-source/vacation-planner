import React, { useState, useEffect } from 'react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { useAuth } from '../../contexts/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';
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
  Filter,
  Grid3X3,
  List,
  Search,
  Tag,
  Clock
} from 'lucide-react';
import { formatDate } from '../../utils';
import { PhotoService, TripPhoto } from '../../services/photoService';
import ModernButton from '../UI/ModernButton';
import ModernCard from '../UI/ModernCard';

// Global photo interface for all trips
interface GlobalPhoto extends TripPhoto {
  tripName?: string;
  destinationName?: string;
  tripId?: string;
  destinationId?: string;
}

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'recent' | 'favorites';

const AllPhotosView: React.FC = () => {
  const { trips, destinations } = useSupabaseApp();
  const { user } = useAuth();
  const { isMobile } = useResponsive();
  
  const [photos, setPhotos] = useState<GlobalPhoto[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<GlobalPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<GlobalPhoto | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Load all photos from all trips
  useEffect(() => {
    loadAllPhotos();
  }, [trips, destinations, user]);

  // Filter photos based on search and filter type
  useEffect(() => {
    let filtered = [...photos];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(photo => 
        photo.caption?.toLowerCase().includes(query) ||
        photo.fileName.toLowerCase().includes(query) ||
        photo.tripName?.toLowerCase().includes(query) ||
        photo.destinationName?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    switch (filterType) {
      case 'recent':
        filtered = filtered.sort((a, b) => 
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        ).slice(0, 50);
        break;
      case 'favorites':
        // For now, show all photos. In future, could add favorite functionality
        break;
      default:
        // Sort by upload date (newest first)
        filtered = filtered.sort((a, b) => 
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );
    }

    setFilteredPhotos(filtered);
  }, [photos, searchQuery, filterType]);

  const loadAllPhotos = async () => {
    if (!user || !trips?.length) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const allPhotos: GlobalPhoto[] = [];

      // Load photos from all trips and destinations
      for (const trip of trips) {
        if (trip.destinations && destinations) {
          const tripDestinations = destinations.filter(dest => 
            trip.destinations!.includes(dest.id)
          );

          for (const destination of tripDestinations) {
            try {
              const destinationPhotos = await PhotoService.getPhotosForDestination(destination.id);
              
              const photosWithContext: GlobalPhoto[] = destinationPhotos.map(photo => ({
                ...photo,
                tripName: trip.name,
                destinationName: destination.name,
                tripId: trip.id,
                destinationId: destination.id
              }));

              allPhotos.push(...photosWithContext);
            } catch (error) {
              console.error(`Error loading photos for destination ${destination.name}:`, error);
            }
          }
        }
      }

      setPhotos(allPhotos);
    } catch (error) {
      console.error('Error loading all photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = async (photo: GlobalPhoto) => {
    if (!window.confirm('Möchten Sie dieses Foto wirklich löschen?')) {
      return;
    }

    try {
      await PhotoService.deletePhoto(photo.id);
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      setSelectedPhoto(null);
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Fehler beim Löschen des Fotos');
    }
  };

  const handleDownloadPhoto = async (photo: GlobalPhoto) => {
    try {
      const link = document.createElement('a');
      link.href = photo.url;
      link.download = photo.fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading photo:', error);
    }
  };

  const getPhotoStats = () => {
    const totalPhotos = photos.length;
    const totalSize = photos.reduce((sum, photo) => sum + (photo.size || 0), 0);
    const uniqueTrips = new Set(photos.map(p => p.tripId)).size;
    const uniqueDestinations = new Set(photos.map(p => p.destinationId)).size;

    return {
      totalPhotos,
      totalSize: (totalSize / (1024 * 1024)).toFixed(1), // MB
      uniqueTrips,
      uniqueDestinations
    };
  };

  const stats = getPhotoStats();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '50vh',
        flexDirection: 'column',
        gap: 'var(--space-md)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--color-neutral-mist)',
          borderTop: '3px solid var(--color-primary-sage)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: 'var(--color-text-secondary)' }}>Fotos werden geladen...</p>
      </div>
    );
  }

  return (
    <div style={{
      padding: isMobile ? 'var(--space-lg)' : 'var(--space-xl)',
      background: 'var(--color-background)',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: 'var(--space-xl)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-md)'
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-3xl)',
            fontWeight: 'var(--font-weight-bold)',
            margin: 0,
            marginBottom: 'var(--space-sm)',
            color: 'var(--color-text-primary)'
          }}>
            Alle meine Fotos
          </h1>
          <p style={{
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-secondary)',
            margin: 0
          }}>
            {stats.totalPhotos} Fotos aus {stats.uniqueTrips} Reisen • {stats.totalSize} MB
          </p>
        </div>

        <ModernButton
          variant="filled"
          size="default"
          onClick={() => setShowUploadModal(true)}
          leftIcon={<Plus size={20} />}
        >
          Fotos hinzufügen
        </ModernButton>
      </div>

      {/* Filters and Search */}
      <div style={{
        marginBottom: 'var(--space-xl)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        flexWrap: 'wrap'
      }}>
        {/* Search */}
        <div style={{
          position: 'relative',
          flex: isMobile ? '1 1 100%' : '1 1 300px',
          maxWidth: isMobile ? '100%' : '400px'
        }}>
          <Search size={20} style={{
            position: 'absolute',
            left: 'var(--space-md)',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-secondary)'
          }} />
          <input
            type="text"
            placeholder="Fotos durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: 'var(--space-md) var(--space-md) var(--space-md) 48px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-family-system)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)'
            }}
          />
        </div>

        {/* Filter Buttons */}
        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
          {[
            { key: 'all' as FilterType, label: 'Alle', icon: <Image size={16} /> },
            { key: 'recent' as FilterType, label: 'Neueste', icon: <Clock size={16} /> },
            { key: 'favorites' as FilterType, label: 'Favoriten', icon: <Tag size={16} /> }
          ].map(filter => (
            <ModernButton
              key={filter.key}
              variant={filterType === filter.key ? "filled" : "outlined"}
              size="sm"
              onClick={() => setFilterType(filter.key)}
              leftIcon={filter.icon}
            >
              {!isMobile && filter.label}
            </ModernButton>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
          <ModernButton
            variant={viewMode === 'grid' ? "filled" : "outlined"}
            size="sm"
            onClick={() => setViewMode('grid')}
            leftIcon={<Grid3X3 size={16} />}
          >
            {!isMobile && 'Grid'}
          </ModernButton>
          <ModernButton
            variant={viewMode === 'list' ? "filled" : "outlined"}
            size="sm"
            onClick={() => setViewMode('list')}
            leftIcon={<List size={16} />}
          >
            {!isMobile && 'Liste'}
          </ModernButton>
        </div>
      </div>

      {/* Photos Display */}
      {filteredPhotos.length === 0 ? (
        <ModernCard className="text-center" style={{ padding: 'var(--space-xl)' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-lg)'
          }}>
            <div style={{
              background: 'var(--color-neutral-mist)',
              borderRadius: 'var(--radius-full)',
              padding: 'var(--space-xl)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Camera size={48} style={{ color: 'var(--color-text-secondary)' }} />
            </div>
            
            <div>
              <h3 style={{
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--font-weight-semibold)',
                margin: 0,
                marginBottom: 'var(--space-sm)',
                color: 'var(--color-text-primary)'
              }}>
                {searchQuery ? 'Keine Fotos gefunden' : 'Noch keine Fotos vorhanden'}
              </h3>
              <p style={{
                fontSize: 'var(--text-base)',
                color: 'var(--color-text-secondary)',
                margin: 0,
                maxWidth: '400px'
              }}>
                {searchQuery 
                  ? 'Versuchen Sie einen anderen Suchbegriff oder entfernen Sie die Filter.'
                  : 'Laden Sie Ihre ersten Reisefotos hoch und erstellen Sie unvergessliche Erinnerungen!'
                }
              </p>
            </div>

            {!searchQuery && (
              <ModernButton
                variant="filled"
                size="default"
                leftIcon={<Plus size={20} />}
                onClick={() => setShowUploadModal(true)}
              >
                Erste Fotos hinzufügen
              </ModernButton>
            )}
          </div>
        </ModernCard>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile 
                ? 'repeat(2, 1fr)' 
                : 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: 'var(--space-md)'
            }}>
              {filteredPhotos.map((photo) => (
                <ModernCard
                  key={photo.id}
                  interactive
                  onClick={() => setSelectedPhoto(photo)}
                  className="photo-card"
                  style={{
                    cursor: 'pointer',
                    overflow: 'hidden',
                    background: 'var(--color-surface)'
                  }}
                >
                  <div style={{ padding: 0 }}>
                    <div style={{
                      position: 'relative',
                      paddingBottom: '75%', // 4:3 aspect ratio
                      overflow: 'hidden'
                    }}>
                      <img
                        src={photo.url}
                        alt={photo.caption || photo.fileName}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        loading="lazy"
                      />
                    </div>
                    
                    <div style={{ padding: 'var(--space-md)' }}>
                      <h4 style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--font-weight-medium)',
                        margin: 0,
                        marginBottom: 'var(--space-xs)',
                        color: 'var(--color-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {photo.caption || photo.fileName}
                      </h4>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-xs)',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-secondary)',
                        marginBottom: 'var(--space-xs)'
                      }}>
                        <MapPin size={12} />
                        <span style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {photo.tripName} • {photo.destinationName}
                        </span>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-xs)',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-secondary)'
                      }}>
                        <Calendar size={12} />
                        <span>{formatDate(photo.uploadedAt)}</span>
                      </div>
                    </div>
                  </div>
                </ModernCard>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {filteredPhotos.map((photo) => (
                <ModernCard
                  key={photo.id}
                  interactive
                  onClick={() => setSelectedPhoto(photo)}
                  style={{
                    cursor: 'pointer',
                    background: 'var(--color-surface)'
                  }}
                >
                  <div style={{
                    padding: 'var(--space-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-lg)'
                  }}>
                    <img
                      src={photo.url}
                      alt={photo.caption || photo.fileName}
                      style={{
                        width: '80px',
                        height: '80px',
                        objectFit: 'cover',
                        borderRadius: 'var(--radius-md)',
                        flexShrink: 0
                      }}
                      loading="lazy"
                    />
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{
                        fontSize: 'var(--text-base)',
                        fontWeight: 'var(--font-weight-medium)',
                        margin: 0,
                        marginBottom: 'var(--space-xs)',
                        color: 'var(--color-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {photo.caption || photo.fileName}
                      </h4>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-md)',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--color-text-secondary)',
                        marginBottom: 'var(--space-xs)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                          <MapPin size={14} />
                          <span>{photo.tripName} • {photo.destinationName}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                          <Calendar size={14} />
                          <span>{formatDate(photo.uploadedAt)}</span>
                        </div>
                      </div>
                      
                      <div style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-secondary)'
                      }}>
                        {((photo.size || 0) / (1024 * 1024)).toFixed(1)} MB • {photo.type}
                      </div>
                    </div>
                    
                    <ChevronRight size={20} style={{ color: 'var(--color-text-secondary)' }} />
                  </div>
                </ModernCard>
              ))}
            </div>
          )}
        </>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-lg)'
        }}>
          <div style={{
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Close Button */}
            <ModernButton
              variant="text"
              size="sm"
              onClick={() => setSelectedPhoto(null)}
              style={{
                position: 'absolute',
                top: '-50px',
                right: 0,
                color: 'white',
                zIndex: 1001
              }}
              leftIcon={<X size={20} />}
            >
            </ModernButton>

            {/* Image */}
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.caption || selectedPhoto.fileName}
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: 'var(--radius-md)'
              }}
            />

            {/* Photo Info */}
            <div style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-lg)',
              marginTop: 'var(--space-md)',
              maxWidth: '500px'
            }}>
              <h3 style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                margin: 0,
                marginBottom: 'var(--space-md)',
                color: 'var(--color-text-primary)'
              }}>
                {selectedPhoto.caption || selectedPhoto.fileName}
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: 'var(--space-sm) var(--space-md)',
                fontSize: 'var(--text-sm)',
                marginBottom: 'var(--space-lg)'
              }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Reise:</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{selectedPhoto.tripName}</span>
                
                <span style={{ color: 'var(--color-text-secondary)' }}>Ziel:</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{selectedPhoto.destinationName}</span>
                
                <span style={{ color: 'var(--color-text-secondary)' }}>Datum:</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{formatDate(selectedPhoto.uploadedAt)}</span>
                
                <span style={{ color: 'var(--color-text-secondary)' }}>Größe:</span>
                <span style={{ color: 'var(--color-text-primary)' }}>
                  {((selectedPhoto.size || 0) / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>

              <div style={{
                display: 'flex',
                gap: 'var(--space-md)',
                justifyContent: 'flex-end'
              }}>
                <ModernButton
                  variant="outlined"
                  size="sm"
                  onClick={() => handleDownloadPhoto(selectedPhoto)}
                  leftIcon={<Download size={16} />}
                >
                  Download
                </ModernButton>
                <ModernButton
                  variant="outlined"
                  size="sm"
                  onClick={() => handleDeletePhoto(selectedPhoto)}
                  leftIcon={<Trash2 size={16} />}
                  style={{
                    borderColor: 'var(--color-error)',
                    color: 'var(--color-error)'
                  }}
                >
                  Löschen
                </ModernButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllPhotosView;