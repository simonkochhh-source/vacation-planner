import React, { useState } from 'react';
import { Heart, MessageCircle, Share, MapPin, Calendar, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { PhotoShareWithDetails } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils';

interface PhotoCardProps {
  photoShare: PhotoShareWithDetails;
  onLike: (photoShareId: string) => Promise<void>;
  onUnlike: (photoShareId: string) => Promise<void>;
  onDestinationClick?: (destinationId: string) => void;
  onUserClick?: (userId: string) => void;
  onDelete?: (photoShareId: string) => Promise<void>;
  showActions?: boolean;
}

const PhotoCard: React.FC<PhotoCardProps> = ({
  photoShare,
  onLike,
  onUnlike,
  onDestinationClick,
  onUserClick,
  onDelete,
  showActions = true
}) => {
  const { user } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  // Get photos array or fallback to single photo
  const photos = photoShare.photos && photoShare.photos.length > 0 
    ? photoShare.photos 
    : [{ url: photoShare.photo_url, order: 0 }];
  
  const currentPhoto = photos[currentPhotoIndex];

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleLikeClick = async () => {
    if (isLiking) return;
    
    try {
      setIsLiking(true);
      if (photoShare.user_liked) {
        await onUnlike(photoShare.id);
      } else {
        await onLike(photoShare.id);
      }
    } catch (error) {
      console.error('Like action failed:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDestinationClick = () => {
    if (photoShare.destination_id && onDestinationClick) {
      onDestinationClick(photoShare.destination_id);
    }
  };

  const handleUserClick = () => {
    if (onUserClick) {
      onUserClick(photoShare.user_id);
    }
  };

  const handleDelete = async () => {
    if (onDelete && window.confirm('Möchten Sie dieses Foto wirklich löschen?')) {
      try {
        await onDelete(photoShare.id);
        setShowMenu(false);
      } catch (error) {
        console.error('Delete failed:', error);
        alert('Löschen fehlgeschlagen. Bitte versuchen Sie es erneut.');
      }
    }
  };

  const isOwnPhoto = user?.id === photoShare.user_id;

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: '12px',
      border: '1px solid var(--color-border)',
      overflow: 'hidden',
      marginBottom: '1rem'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          {/* User Avatar */}
          <button
            onClick={handleUserClick}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0
            }}
          >
            {photoShare.user_avatar_url ? (
              <img
                src={photoShare.user_avatar_url}
                alt={photoShare.user_nickname}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--color-primary-sage)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '600'
              }}>
                {photoShare.user_display_name?.[0] || photoShare.user_nickname[0]}
              </div>
            )}
          </button>

          {/* User Info */}
          <div>
            <button
              onClick={handleUserClick}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textAlign: 'left'
              }}
            >
              <div style={{
                fontWeight: '600',
                color: 'var(--color-text-primary)',
                fontSize: '0.875rem'
              }}>
                {photoShare.user_display_name || photoShare.user_nickname}
              </div>
            </button>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.75rem',
              color: 'var(--color-text-secondary)'
            }}>
              <Calendar size={12} />
              {formatDate(photoShare.created_at)}
            </div>
          </div>
        </div>

        {/* Menu Button */}
        {(isOwnPhoto || showActions) && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '6px',
                color: 'var(--color-text-secondary)'
              }}
            >
              <MoreHorizontal size={16} />
            </button>

            {showMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 10,
                minWidth: '120px'
              }}>
                {isOwnPhoto && onDelete && (
                  <button
                    onClick={handleDelete}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: 'none',
                      background: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: 'var(--color-error)',
                      fontSize: '0.875rem'
                    }}
                  >
                    Löschen
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Photo */}
      <div style={{ position: 'relative' }}>
        <img
          src={currentPhoto.url}
          alt={photoShare.caption || 'Geteiltes Foto'}
          style={{
            width: '100%',
            height: '300px',
            objectFit: 'cover'
          }}
        />
      </div>

      {/* Content */}
      <div style={{ padding: '1rem' }}>
        {/* Destination Info */}
        {photoShare.destination_name && (
          <button
            onClick={handleDestinationClick}
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '0.75rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left'
            }}
          >
            <MapPin size={16} style={{ color: 'var(--color-primary-ocean)' }} />
            <div>
              <div style={{
                fontWeight: '600',
                color: 'var(--color-text-primary)',
                fontSize: '0.875rem'
              }}>
                {photoShare.destination_name}
              </div>
              {photoShare.destination_location && (
                <div style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.75rem'
                }}>
                  {photoShare.destination_location}
                </div>
              )}
              {!photoShare.destination_location && photoShare.destination_coordinates && (
                <div style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.75rem'
                }}>
                  {photoShare.destination_coordinates.lat.toFixed(4)}, {photoShare.destination_coordinates.lng.toFixed(4)}
                </div>
              )}
            </div>
          </button>
        )}

        {/* Caption */}
        {photoShare.caption && (
          <div style={{
            color: 'var(--color-text-primary)',
            fontSize: '0.875rem',
            lineHeight: '1.4',
            marginBottom: '1rem'
          }}>
            {photoShare.caption}
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--color-border)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem'
            }}>
              {/* Like Button */}
              <button
                onClick={handleLikeClick}
                disabled={isLiking}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: isLiking ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: photoShare.user_liked ? 'var(--color-error)' : 'var(--color-text-secondary)',
                  transition: 'color 0.2s',
                  fontSize: '0.875rem'
                }}
              >
                <Heart 
                  size={18} 
                  fill={photoShare.user_liked ? 'currentColor' : 'none'}
                  style={{
                    transform: isLiking ? 'scale(1.1)' : 'scale(1)',
                    transition: 'transform 0.2s'
                  }}
                />
                {photoShare.like_count > 0 && photoShare.like_count}
              </button>

              {/* Comment Button (placeholder) */}
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.875rem'
                }}
              >
                <MessageCircle size={18} />
              </button>
            </div>

            {/* Share Button (placeholder) */}
            <button
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)'
              }}
            >
              <Share size={18} />
            </button>
          </div>
        )}

        {/* Like Count */}
        {photoShare.like_count > 0 && (
          <div style={{
            marginTop: '0.75rem',
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)'
          }}>
            {photoShare.like_count === 1 ? 
              '1 Person gefällt das' : 
              `${photoShare.like_count} Personen gefällt das`
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoCard;