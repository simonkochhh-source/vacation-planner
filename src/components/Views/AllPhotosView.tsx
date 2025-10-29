import React, { useState, useEffect, useCallback } from 'react';
import { useTripContext } from '../../contexts/TripContext';
import { useDestinationContext } from '../../contexts/DestinationContext';
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
  Clock,
  Share,
  CheckCircle,
  Circle,
  Heart,
  MessageCircle,
  ArrowUp
} from 'lucide-react';
import { formatDate } from '../../utils';
import { PhotoService, TripPhoto } from '../../services/photoService';
import ModernButton from '../UI/ModernButton';
import ModernCard from '../UI/ModernCard';
import PhotoShareModal from '../Social/PhotoShareModal';
import { socialService } from '../../services/socialService';

// Global photo interface for all trips
interface GlobalPhoto extends TripPhoto {
  tripName?: string;
  destinationName?: string;
  tripId?: string;
  destinationId?: string;
  // Additional properties for compatibility
  uploadedAt?: string;
  size?: number;
  type?: string;
}

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'recent' | 'favorites';

const AllPhotosView: React.FC = () => {
  const { trips } = useTripContext();
  const { destinations } = useDestinationContext();
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
  const [showPhotoShareModal, setShowPhotoShareModal] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [photoShareData, setPhotoShareData] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);

  const loadAllPhotos = useCallback(async () => {
    console.log('AllPhotosView - loadAllPhotos called', { 
      user: !!user, 
      trips: trips?.length, 
      destinations: destinations?.length 
    });
    
    if (!user || !trips?.length) {
      console.log('AllPhotosView - No user or trips, stopping load');
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
              console.log(`Loading photos for destination: ${destination.name} (${destination.id}) in trip: ${trip.name}`);
              const destinationPhotos = await PhotoService.getPhotosForDestinationUnified(destination.id, trip.id);
              console.log(`Found ${destinationPhotos.length} photos for destination ${destination.name}:`, destinationPhotos);
              
              const photosWithContext: GlobalPhoto[] = destinationPhotos.map(photo => {
                // Handle both PhotoInfo and TripPhoto interfaces
                const isPhotoInfo = 'name' in photo && 'uploadedAt' in photo;
                const isTripPhoto = 'file_name' in photo && 'photo_url' in photo;
                
                if (isPhotoInfo) {
                  // PhotoInfo from localStorage
                  const photoInfo = photo as any;
                  return {
                    id: photoInfo.id,
                    trip_id: trip.id,
                    destination_id: destination.id,
                    user_id: user?.id || 'current-user',
                    file_name: photoInfo.name,
                    file_size: photoInfo.size,
                    file_type: photoInfo.type,
                    storage_path: '',
                    photo_url: photoInfo.url || '',
                    caption: photoInfo.caption,
                    location_name: undefined,
                    coordinates: photoInfo.location ? { lat: photoInfo.location.lat, lng: photoInfo.location.lng } : undefined,
                    taken_at: photoInfo.metadata?.dateTaken,
                    privacy: 'private' as const,
                    privacy_approved_at: undefined,
                    created_at: photoInfo.uploadedAt || new Date().toISOString(),
                    updated_at: photoInfo.uploadedAt || new Date().toISOString(),
                    url: photoInfo.url,
                    tripName: trip.name,
                    destinationName: destination.name,
                    tripId: trip.id,
                    destinationId: destination.id,
                    uploadedAt: photoInfo.uploadedAt,
                    size: photoInfo.size,
                    type: photoInfo.type
                  };
                } else if (isTripPhoto) {
                  // TripPhoto from Supabase
                  const tripPhoto = photo as any;
                  return {
                    ...tripPhoto,
                    tripName: trip.name,
                    destinationName: destination.name,
                    tripId: trip.id,
                    destinationId: destination.id,
                    uploadedAt: tripPhoto.created_at,
                    size: tripPhoto.file_size,
                    type: tripPhoto.file_type,
                    url: tripPhoto.photo_url
                  };
                } else {
                  // Fallback handling
                  console.warn('Unknown photo format:', photo);
                  return null;
                }
              }).filter(Boolean) as GlobalPhoto[];

              allPhotos.push(...photosWithContext);
            } catch (error) {
              console.error(`Error loading photos for destination ${destination.name}:`, error);
            }
          }
        }
      }

      console.log(`Total photos loaded: ${allPhotos.length}`, allPhotos);
      setPhotos(allPhotos);
    } catch (error) {
      console.error('Error loading all photos:', error);
    } finally {
      setLoading(false);
    }
  }, [user, trips, destinations]);

  // Load all photos from all trips
  useEffect(() => {
    loadAllPhotos();
  }, [loadAllPhotos]);

  // Filter photos based on search and filter type
  useEffect(() => {
    let filtered = [...photos];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(photo => 
        photo.caption?.toLowerCase().includes(query) ||
        photo.file_name.toLowerCase().includes(query) ||
        photo.tripName?.toLowerCase().includes(query) ||
        photo.destinationName?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    switch (filterType) {
      case 'recent':
        filtered = filtered.sort((a, b) => 
          new Date(b.uploadedAt || b.created_at || 0).getTime() - new Date(a.uploadedAt || a.created_at || 0).getTime()
        ).slice(0, 50);
        break;
      case 'favorites':
        // For now, show all photos. In future, could add favorite functionality
        break;
      default:
        // Sort by upload date (newest first)
        filtered = filtered.sort((a, b) => 
          new Date(b.uploadedAt || b.created_at || 0).getTime() - new Date(a.uploadedAt || a.created_at || 0).getTime()
        );
    }

    setFilteredPhotos(filtered);
  }, [photos, searchQuery, filterType]);

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedPhotos(new Set());
  };

  const togglePhotoSelection = (photoId: string) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  const selectAllPhotos = () => {
    if (selectedPhotos.size === filteredPhotos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(filteredPhotos.map(photo => photo.id)));
    }
  };

  const handlePhotoClick = async (photo: GlobalPhoto) => {
    if (selectionMode) {
      togglePhotoSelection(photo.id);
    } else {
      setSelectedPhoto(photo);
      await loadPhotoShareData(photo);
    }
  };

  const loadPhotoShareData = async (photo: GlobalPhoto) => {
    try {
      // Try to find existing photo share for this photo
      const photoShares = await socialService.getUserPhotoShares(user?.id || '', 100);
      const photoShare = photoShares.find(ps => 
        ps.photo_url === (photo.url || photo.photo_url) ||
        (ps.photos && ps.photos.some((p: any) => p.url === (photo.url || photo.photo_url)))
      );
      
      if (photoShare) {
        setPhotoShareData(photoShare);
        setIsLiked(photoShare.user_liked || false);
        setLikeCount(photoShare.like_count || 0);
        // Note: Comments would need to be loaded from a comments table if implemented
        setComments([]);
      } else {
        // Reset state for local photos
        setPhotoShareData(null);
        setIsLiked(false);
        setLikeCount(0);
        setComments([]);
      }
    } catch (error) {
      console.error('Error loading photo share data:', error);
      setPhotoShareData(null);
      setIsLiked(false);
      setLikeCount(0);
      setComments([]);
    }
  };

  const shareSelectedPhotos = () => {
    if (selectedPhotos.size === 0) {
      alert('Bitte wählen Sie mindestens ein Foto zum Teilen aus!');
      return;
    }
    setShowPhotoShareModal(true);
  };

  const handleLikePhoto = async () => {
    if (!photoShareData) {
      alert('Dieses Foto muss erst geteilt werden, bevor Sie es liken können!');
      return;
    }

    try {
      if (isLiked) {
        await socialService.unlikePhoto(photoShareData.id);
        setIsLiked(false);
        setLikeCount(prev => prev - 1);
      } else {
        await socialService.likePhoto(photoShareData.id);
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      alert('Fehler beim Liken des Fotos');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    if (!photoShareData) {
      alert('Dieses Foto muss erst geteilt werden, bevor Sie kommentieren können!');
      return;
    }

    try {
      // Note: This would require a comments table and service method
      // For now, just show a placeholder
      alert('Kommentar-Funktion wird in Kürze verfügbar sein!');
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Fehler beim Hinzufügen des Kommentars');
    }
  };

  const handleSharePhoto = async (photo: GlobalPhoto) => {
    if (photoShareData) {
      alert('Dieses Foto wurde bereits geteilt!');
      return;
    }

    try {
      const shareData = {
        photo_url: photo.url || photo.photo_url,
        caption: photo.caption || photo.file_name,
        trip_id: photo.tripId,
        destination_id: photo.destinationId,
        privacy: 'public' as const
      };

      const result = await socialService.sharePhoto(shareData);
      console.log('Photo shared successfully:', result);
      
      // Reload photo share data
      await loadPhotoShareData(photo);
      
      alert('Foto erfolgreich geteilt!');
    } catch (error) {
      console.error('Error sharing photo:', error);
      alert('Fehler beim Teilen des Fotos');
    }
  };

  const handleDeletePhoto = async (photo: GlobalPhoto) => {
    if (!window.confirm('Möchten Sie dieses Foto wirklich löschen?')) {
      return;
    }

    try {
      PhotoService.deletePhoto(photo.destination_id, photo.id);
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
      link.href = photo.url || photo.photo_url;
      link.download = photo.file_name;
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
    const totalSize = photos.reduce((sum, photo) => sum + (photo.size || photo.file_size || 0), 0);
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
          borderTop: '3px solid var(--color-primary-sage)',
          borderLeft: '3px solid var(--color-neutral-mist)',
          borderRight: '3px solid var(--color-neutral-mist)',
          borderBottom: '3px solid var(--color-neutral-mist)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: 'var(--color-text-secondary)' }}>Fotos werden geladen...</p>
      </div>
    );
  }

  return (
    <div style={{
      padding: isMobile ? 'var(--space-md)' : 'var(--space-xl)',
      background: 'var(--color-background)',
      minHeight: '100vh',
      // iPhone safe area support
      paddingLeft: isMobile ? 'max(var(--space-md), env(safe-area-inset-left))' : 'var(--space-xl)',
      paddingRight: isMobile ? 'max(var(--space-md), env(safe-area-inset-right))' : 'var(--space-xl)',
      paddingBottom: isMobile ? 'max(var(--space-md), env(safe-area-inset-bottom))' : 'var(--space-xl)'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: isMobile ? 'var(--space-lg)' : 'var(--space-xl)',
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 'var(--space-lg)' : 'var(--space-md)'
      }}>
        <div style={{ width: isMobile ? '100%' : 'auto' }}>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: isMobile ? 'var(--text-2xl)' : 'var(--text-3xl)',
            fontWeight: 'var(--font-weight-bold)',
            margin: 0,
            marginBottom: 'var(--space-sm)',
            color: 'var(--color-text-primary)'
          }}>
            {isMobile ? 'Meine Fotos' : 'Alle meine Fotos'}
          </h1>
          <p style={{
            fontSize: isMobile ? 'var(--text-sm)' : 'var(--text-base)',
            color: 'var(--color-text-secondary)',
            margin: 0
          }}>
            {stats.totalPhotos} Fotos{!isMobile && ` aus ${stats.uniqueTrips} Reisen`} • {stats.totalSize} MB
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: isMobile ? 'var(--space-sm)' : 'var(--space-md)',
          alignItems: 'center',
          flexWrap: 'wrap',
          width: isMobile ? '100%' : 'auto',
          justifyContent: isMobile ? 'stretch' : 'flex-start'
        }}>
          {!selectionMode ? (
            <>
              <ModernButton
                variant="filled"
                size={isMobile ? "sm" : "default"}
                onClick={() => setShowUploadModal(true)}
                leftIcon={<Plus size={isMobile ? 18 : 20} />}
                style={{
                  flex: isMobile ? '1' : 'none',
                  minHeight: isMobile ? '48px' : 'auto',
                  fontSize: isMobile ? '16px' : 'var(--text-sm)', // Prevent zoom on iOS
                  // iOS Safari optimizations
                  WebkitTapHighlightColor: 'transparent',
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none'
                }}
              >
                {isMobile ? 'Hinzufügen' : 'Fotos hinzufügen'}
              </ModernButton>
              
              <ModernButton
                variant="outlined"
                size={isMobile ? "sm" : "default"}
                onClick={toggleSelectionMode}
                leftIcon={<CheckCircle size={isMobile ? 18 : 20} />}
                disabled={filteredPhotos.length === 0}
                style={{
                  borderColor: filteredPhotos.length > 0 ? 'var(--color-primary-ocean)' : 'var(--color-border)',
                  color: filteredPhotos.length > 0 ? 'var(--color-primary-ocean)' : 'var(--color-text-secondary)',
                  opacity: filteredPhotos.length > 0 ? 1 : 0.6,
                  flex: isMobile ? '1' : 'none',
                  minHeight: isMobile ? '48px' : 'auto',
                  fontSize: isMobile ? '16px' : 'var(--text-sm)', // Prevent zoom on iOS
                  // iOS Safari optimizations
                  WebkitTapHighlightColor: 'transparent',
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none'
                }}
                title="Fotos zum Teilen auswählen"
              >
                {isMobile ? 'Auswählen' : 'Fotos auswählen'}
              </ModernButton>
            </>
          ) : (
            <>
              <ModernButton
                variant="outlined"
                size="default"
                onClick={toggleSelectionMode}
                leftIcon={<X size={20} />}
              >
                Abbrechen
              </ModernButton>
              
              <ModernButton
                variant="outlined"
                size="default"
                onClick={selectAllPhotos}
                leftIcon={selectedPhotos.size === filteredPhotos.length ? <Circle size={20} /> : <CheckCircle size={20} />}
              >
                {selectedPhotos.size === filteredPhotos.length ? 'Alle abwählen' : 'Alle auswählen'}
              </ModernButton>
              
              <ModernButton
                variant="filled"
                size="default"
                onClick={shareSelectedPhotos}
                leftIcon={<Share size={20} />}
                disabled={selectedPhotos.size === 0}
                style={{
                  backgroundColor: selectedPhotos.size > 0 ? 'var(--color-primary-ocean)' : 'var(--color-border)',
                  opacity: selectedPhotos.size > 0 ? 1 : 0.6
                }}
              >
                {selectedPhotos.size > 0 ? `${selectedPhotos.size} Foto${selectedPhotos.size === 1 ? '' : 's'} teilen` : 'Fotos teilen'}
              </ModernButton>
            </>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <div style={{
        marginBottom: isMobile ? 'var(--space-lg)' : 'var(--space-xl)',
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'center',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 'var(--space-md)' : 'var(--space-md)',
        flexWrap: isMobile ? 'nowrap' : 'wrap'
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
            placeholder={isMobile ? 'Suchen...' : 'Fotos durchsuchen...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: isMobile ? 'var(--space-md) var(--space-md) var(--space-md) 48px' : 'var(--space-md) var(--space-md) var(--space-md) 48px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: isMobile ? '16px' : 'var(--text-sm)', // Prevent zoom on iOS
              fontFamily: 'var(--font-family-system)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              minHeight: isMobile ? '48px' : 'auto',
              // iOS Safari optimizations
              WebkitTapHighlightColor: 'transparent',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'text'
            }}
          />
        </div>

        {/* Filter Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: 'var(--space-xs)',
          width: isMobile ? '100%' : 'auto',
          justifyContent: isMobile ? 'space-between' : 'flex-start'
        }}>
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
              style={{
                flex: isMobile ? '1' : 'none',
                minHeight: isMobile ? '48px' : 'auto',
                fontSize: isMobile ? '16px' : 'var(--text-sm)', // Prevent zoom on iOS
                // iOS Safari optimizations
                WebkitTapHighlightColor: 'transparent',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none'
              }}
            >
              {!isMobile && filter.label}
            </ModernButton>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div style={{ 
          display: 'flex', 
          gap: 'var(--space-xs)',
          width: isMobile ? '100%' : 'auto'
        }}>
          <ModernButton
            variant={viewMode === 'grid' ? "filled" : "outlined"}
            size="sm"
            onClick={() => setViewMode('grid')}
            leftIcon={<Grid3X3 size={16} />}
            style={{
              flex: isMobile ? '1' : 'none',
              minHeight: isMobile ? '48px' : 'auto',
              fontSize: isMobile ? '16px' : 'var(--text-sm)', // Prevent zoom on iOS
              // iOS Safari optimizations
              WebkitTapHighlightColor: 'transparent',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            {!isMobile && 'Grid'}
          </ModernButton>
          <ModernButton
            variant={viewMode === 'list' ? "filled" : "outlined"}
            size="sm"
            onClick={() => setViewMode('list')}
            leftIcon={<List size={16} />}
            style={{
              flex: isMobile ? '1' : 'none',
              minHeight: isMobile ? '48px' : 'auto',
              fontSize: isMobile ? '16px' : 'var(--text-sm)', // Prevent zoom on iOS
              // iOS Safari optimizations
              WebkitTapHighlightColor: 'transparent',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none'
            }}
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
              <div style={{
                display: 'flex',
                gap: 'var(--space-md)',
                alignItems: 'center',
                flexWrap: 'wrap',
                justifyContent: 'center'
              }}>
                <ModernButton
                  variant="filled"
                  size="default"
                  leftIcon={<Plus size={20} />}
                  onClick={() => setShowUploadModal(true)}
                >
                  Erste Fotos hochladen
                </ModernButton>
                
                <ModernButton
                  variant="outlined"
                  size="default"
                  leftIcon={<CheckCircle size={20} />}
                  disabled
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    opacity: 0.6
                  }}
                  title="Laden Sie zuerst Fotos hoch um sie auszuwählen und zu teilen"
                >
                  Fotos auswählen
                </ModernButton>
              </div>
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
              gap: isMobile ? 'var(--space-sm)' : 'var(--space-md)'
            }}>
              {filteredPhotos.map((photo) => (
                <ModernCard
                  key={photo.id}
                  interactive
                  onClick={() => handlePhotoClick(photo)}
                  className="photo-card"
                  style={{
                    cursor: 'pointer',
                    overflow: 'hidden',
                    background: 'var(--color-surface)',
                    border: selectionMode && selectedPhotos.has(photo.id) 
                      ? '3px solid var(--color-primary-ocean)' 
                      : '1px solid var(--color-border)',
                    transform: selectionMode && selectedPhotos.has(photo.id) ? 'scale(0.95)' : 'scale(1)',
                    transition: 'all var(--transition-normal)'
                  }}
                >
                  <div style={{ padding: 0 }}>
                    <div style={{
                      position: 'relative',
                      paddingBottom: '75%', // 4:3 aspect ratio
                      overflow: 'hidden'
                    }}>
                      <img
                        src={photo.url || photo.photo_url}
                        alt={photo.caption || photo.file_name}
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
                      
                      {/* Selection checkbox */}
                      {selectionMode && (
                        <div style={{
                          position: 'absolute',
                          top: 'var(--space-sm)',
                          right: 'var(--space-sm)',
                          background: 'rgba(255, 255, 255, 0.9)',
                          borderRadius: 'var(--radius-full)',
                          padding: 'var(--space-xs)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all var(--transition-normal)',
                          border: '2px solid var(--color-border)',
                          ...(selectedPhotos.has(photo.id) && {
                            background: 'var(--color-primary-ocean)',
                            borderColor: 'var(--color-primary-ocean)'
                          })
                        }}>
                          {selectedPhotos.has(photo.id) ? (
                            <CheckCircle size={20} style={{ color: 'white' }} />
                          ) : (
                            <Circle size={20} style={{ color: 'var(--color-text-secondary)' }} />
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ padding: isMobile ? 'var(--space-sm)' : 'var(--space-md)' }}>
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
                        {photo.caption || photo.file_name}
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
                        <span>{formatDate(photo.uploadedAt || photo.created_at)}</span>
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
                  onClick={() => handlePhotoClick(photo)}
                  style={{
                    cursor: 'pointer',
                    background: 'var(--color-surface)',
                    border: selectionMode && selectedPhotos.has(photo.id) 
                      ? '3px solid var(--color-primary-ocean)' 
                      : '1px solid var(--color-border)',
                    transform: selectionMode && selectedPhotos.has(photo.id) ? 'scale(0.98)' : 'scale(1)',
                    transition: 'all var(--transition-normal)'
                  }}
                >
                  <div style={{
                    padding: 'var(--space-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-lg)'
                  }}>
                    {/* Selection checkbox for list view */}
                    {selectionMode && (
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: 'var(--radius-full)',
                        padding: 'var(--space-xs)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all var(--transition-normal)',
                        border: '2px solid var(--color-border)',
                        flexShrink: 0,
                        ...(selectedPhotos.has(photo.id) && {
                          background: 'var(--color-primary-ocean)',
                          borderColor: 'var(--color-primary-ocean)'
                        })
                      }}>
                        {selectedPhotos.has(photo.id) ? (
                          <CheckCircle size={20} style={{ color: 'white' }} />
                        ) : (
                          <Circle size={20} style={{ color: 'var(--color-text-secondary)' }} />
                        )}
                      </div>
                    )}
                    
                    <img
                      src={photo.url || photo.photo_url}
                      alt={photo.caption || photo.file_name}
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
                        {photo.caption || photo.file_name}
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
                          <span>{formatDate(photo.uploadedAt || photo.created_at)}</span>
                        </div>
                      </div>
                      
                      <div style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-secondary)'
                      }}>
                        {((photo.size || photo.file_size || 0) / (1024 * 1024)).toFixed(1)} MB • {photo.type || photo.file_type}
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
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'center',
          padding: isMobile ? 'var(--space-md)' : 'var(--space-lg)',
          paddingTop: isMobile ? 'max(var(--space-lg), env(safe-area-inset-top))' : 'var(--space-lg)',
          paddingBottom: isMobile ? 'max(var(--space-lg), env(safe-area-inset-bottom))' : 'var(--space-lg)',
          overflow: isMobile ? 'auto' : 'hidden'
        }}>
          <div style={{
            position: 'relative',
            maxWidth: isMobile ? '100%' : '90vw',
            maxHeight: isMobile ? 'none' : '90vh',
            display: 'flex',
            flexDirection: 'column',
            width: isMobile ? '100%' : 'auto'
          }}>
            {/* Close Button */}
            <ModernButton
              variant="text"
              size={isMobile ? "default" : "sm"}
              onClick={() => {
                setSelectedPhoto(null);
                setPhotoShareData(null);
                setIsLiked(false);
                setLikeCount(0);
                setNewComment('');
                setComments([]);
              }}
              style={{
                position: 'absolute',
                top: isMobile ? '-60px' : '-50px',
                right: 0,
                color: 'white',
                zIndex: 1001,
                minHeight: isMobile ? '48px' : 'auto',
                fontSize: isMobile ? '16px' : 'var(--text-sm)', // Prevent zoom on iOS
                // iOS Safari optimizations
                WebkitTapHighlightColor: 'transparent',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none'
              }}
              leftIcon={<X size={isMobile ? 24 : 20} />}
            >
              {isMobile ? '' : 'Schließen'}
            </ModernButton>

            {/* Image */}
            <img
              src={selectedPhoto.url || selectedPhoto.photo_url}
              alt={selectedPhoto.caption || selectedPhoto.file_name}
              style={{
                maxWidth: '100%',
                maxHeight: isMobile ? '50vh' : '70vh',
                objectFit: 'contain',
                borderRadius: 'var(--radius-md)',
                // Mobile touch optimization
                touchAction: 'pan-x pan-y pinch-zoom',
                userSelect: 'none'
              }}
            />

            {/* Photo Info */}
            <div style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              padding: isMobile ? 'var(--space-md)' : 'var(--space-lg)',
              marginTop: 'var(--space-md)',
              maxWidth: isMobile ? '100%' : '500px',
              width: isMobile ? '100%' : 'auto'
            }}>
              <h3 style={{
                fontSize: isMobile ? 'var(--text-base)' : 'var(--text-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                margin: 0,
                marginBottom: isMobile ? 'var(--space-sm)' : 'var(--space-md)',
                color: 'var(--color-text-primary)'
              }}>
                {selectedPhoto.caption || selectedPhoto.file_name}
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr',
                gap: isMobile ? 'var(--space-xs)' : 'var(--space-sm) var(--space-md)',
                fontSize: 'var(--text-sm)',
                marginBottom: isMobile ? 'var(--space-md)' : 'var(--space-lg)'
              }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Reise:</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{selectedPhoto.tripName}</span>
                
                <span style={{ color: 'var(--color-text-secondary)' }}>Ziel:</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{selectedPhoto.destinationName}</span>
                
                <span style={{ color: 'var(--color-text-secondary)' }}>Datum:</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{formatDate(selectedPhoto.uploadedAt || selectedPhoto.created_at)}</span>
                
                <span style={{ color: 'var(--color-text-secondary)' }}>Größe:</span>
                <span style={{ color: 'var(--color-text-primary)' }}>
                  {((selectedPhoto.size || selectedPhoto.file_size || 0) / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>

              {/* Photo Reactions Section */}
              <div style={{
                borderTop: '1px solid var(--color-border)',
                paddingTop: 'var(--space-lg)',
                marginBottom: 'var(--space-lg)'
              }}>
                {/* Status and Share Button */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--space-md)'
                }}>
                  <div style={{
                    fontSize: 'var(--text-sm)',
                    color: photoShareData ? 'var(--color-success)' : 'var(--color-text-secondary)'
                  }}>
                    {photoShareData ? '✓ Öffentlich geteilt' : 'Nur lokal gespeichert'}
                  </div>
                  
                  {!photoShareData && (
                    <ModernButton
                      variant="outlined"
                      size="sm"
                      onClick={() => handleSharePhoto(selectedPhoto)}
                      leftIcon={<Share size={16} />}
                      style={{
                        borderColor: 'var(--color-primary-ocean)',
                        color: 'var(--color-primary-ocean)'
                      }}
                    >
                      Teilen
                    </ModernButton>
                  )}
                </div>

                {/* Like and Comment Buttons */}
                {photoShareData && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-lg)',
                    marginBottom: 'var(--space-md)'
                  }}>
                    <ModernButton
                      variant="text"
                      size="sm"
                      onClick={handleLikePhoto}
                      leftIcon={
                        <Heart 
                          size={20} 
                          style={{ 
                            color: isLiked ? 'var(--color-error)' : 'var(--color-text-secondary)',
                            fill: isLiked ? 'var(--color-error)' : 'none'
                          }} 
                        />
                      }
                      style={{
                        color: isLiked ? 'var(--color-error)' : 'var(--color-text-secondary)',
                        fontWeight: isLiked ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)'
                      }}
                    >
                      {likeCount > 0 ? `${likeCount} Like${likeCount === 1 ? '' : 's'}` : 'Like'}
                    </ModernButton>

                    <ModernButton
                      variant="text"
                      size="sm"
                      leftIcon={<MessageCircle size={20} />}
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {comments.length > 0 ? `${comments.length} Kommentar${comments.length === 1 ? '' : 'e'}` : 'Kommentieren'}
                    </ModernButton>
                  </div>
                )}

                {/* Comment Input */}
                {photoShareData && (
                  <div style={{
                    display: 'flex',
                    gap: 'var(--space-sm)',
                    alignItems: 'center'
                  }}>
                    <input
                      type="text"
                      placeholder="Kommentar hinzufügen..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddComment();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: isMobile ? 'var(--space-md)' : 'var(--space-sm) var(--space-md)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: isMobile ? '16px' : 'var(--text-sm)', // Prevent zoom on iOS
                        fontFamily: 'var(--font-family-system)',
                        background: 'var(--color-surface)',
                        color: 'var(--color-text-primary)',
                        minHeight: isMobile ? '48px' : 'auto',
                        // iOS Safari optimizations
                        WebkitTapHighlightColor: 'transparent',
                        WebkitTouchCallout: 'none',
                        WebkitUserSelect: 'text'
                      }}
                    />
                    <ModernButton
                      variant="text"
                      size={isMobile ? "default" : "sm"}
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      leftIcon={<ArrowUp size={isMobile ? 18 : 16} />}
                      style={{
                        minWidth: 'auto',
                        padding: isMobile ? 'var(--space-md)' : 'var(--space-sm)',
                        color: newComment.trim() ? 'var(--color-primary-ocean)' : 'var(--color-text-secondary)',
                        minHeight: isMobile ? '48px' : 'auto',
                        fontSize: isMobile ? '16px' : 'var(--text-sm)', // Prevent zoom on iOS
                        // iOS Safari optimizations
                        WebkitTapHighlightColor: 'transparent',
                        WebkitTouchCallout: 'none',
                        WebkitUserSelect: 'none'
                      }}
                    >
                      {isMobile ? '' : 'Senden'}
                    </ModernButton>
                  </div>
                )}
              </div>

              <div style={{
                display: 'flex',
                gap: isMobile ? 'var(--space-sm)' : 'var(--space-md)',
                justifyContent: isMobile ? 'space-between' : 'flex-end',
                flexWrap: isMobile ? 'wrap' : 'nowrap'
              }}>
                <ModernButton
                  variant="outlined"
                  size={isMobile ? "default" : "sm"}
                  onClick={() => handleDownloadPhoto(selectedPhoto)}
                  leftIcon={<Download size={isMobile ? 18 : 16} />}
                  style={{
                    flex: isMobile ? '1' : 'none',
                    minHeight: isMobile ? '48px' : 'auto',
                    fontSize: isMobile ? '16px' : 'var(--text-sm)', // Prevent zoom on iOS
                    // iOS Safari optimizations
                    WebkitTapHighlightColor: 'transparent',
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none'
                  }}
                >
                  Download
                </ModernButton>
                <ModernButton
                  variant="outlined"
                  size={isMobile ? "default" : "sm"}
                  onClick={() => handleDeletePhoto(selectedPhoto)}
                  leftIcon={<Trash2 size={isMobile ? 18 : 16} />}
                  style={{
                    borderColor: 'var(--color-error)',
                    color: 'var(--color-error)',
                    flex: isMobile ? '1' : 'none',
                    minHeight: isMobile ? '48px' : 'auto',
                    fontSize: isMobile ? '16px' : 'var(--text-sm)', // Prevent zoom on iOS
                    // iOS Safari optimizations
                    WebkitTapHighlightColor: 'transparent',
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none'
                  }}
                >
                  Löschen
                </ModernButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Share Modal */}
      {showPhotoShareModal && (
        <PhotoShareModal
          isOpen={showPhotoShareModal}
          onClose={() => setShowPhotoShareModal(false)}
          onShare={async (data) => {
            try {
              console.log('Sharing photos from AllPhotosView:', data);
              
              // Create photo share in Supabase
              const result = await socialService.sharePhoto(data);
              console.log('Photo share created successfully:', result);
              
              setShowPhotoShareModal(false);
              setSelectionMode(false);
              setSelectedPhotos(new Set());
              
              // Show success message
              alert('Fotos erfolgreich geteilt!');
            } catch (error) {
              console.error('Error sharing photos:', error);
              alert(`Fehler beim Teilen der Fotos: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
            }
          }}
          trip={undefined} // AllPhotosView spans multiple trips
          destination={undefined} // AllPhotosView spans multiple destinations
          initialPhotos={selectionMode && selectedPhotos.size > 0 
            ? filteredPhotos
                .filter(photo => selectedPhotos.has(photo.id))
                .map(photo => photo.url || photo.photo_url)
            : filteredPhotos.map(photo => photo.url || photo.photo_url)
          }
        />
      )}
    </div>
  );
};

export default AllPhotosView;