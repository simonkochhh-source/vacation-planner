import React, { useState, useEffect } from 'react';
import { PhotoService, PhotoInfo } from '../../services/photoService';
import {
  Camera,
  Plus,
  Image as ImageIcon,
  MoreHorizontal
} from 'lucide-react';

interface PhotoPreviewProps {
  destinationId: string;
  maxPreview?: number;
  size?: 'sm' | 'md' | 'lg';
  onViewAll?: () => void;
  onUpload?: () => void;
  className?: string;
}

const PhotoPreview: React.FC<PhotoPreviewProps> = ({
  destinationId,
  maxPreview = 4,
  size = 'md',
  onViewAll,
  onUpload,
  className = ''
}) => {
  const [photos, setPhotos] = useState<PhotoInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPhotos = () => {
      try {
        const loadedPhotos = PhotoService.getPhotosForDestination(destinationId);
        setPhotos(loadedPhotos);
      } catch (error) {
        console.error('Failed to load photos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPhotos();
  }, [destinationId]);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'h-16',
          photo: 'w-14 h-14',
          addButton: 'w-14 h-14 text-xs',
          moreButton: 'w-14 h-14 text-xs',
          gap: 'gap-1'
        };
      case 'lg':
        return {
          container: 'h-24',
          photo: 'w-20 h-20',
          addButton: 'w-20 h-20 text-sm',
          moreButton: 'w-20 h-20 text-sm',
          gap: 'gap-2'
        };
      default:
        return {
          container: 'h-20',
          photo: 'w-16 h-16',
          addButton: 'w-16 h-16 text-sm',
          moreButton: 'w-16 h-16 text-sm',
          gap: 'gap-1.5'
        };
    }
  };

  const sizeClasses = getSizeClasses();
  const displayPhotos = photos.slice(0, maxPreview - 1);
  const remainingCount = photos.length - displayPhotos.length;

  if (isLoading) {
    return (
      <div className={`${className} ${sizeClasses.container}`} style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          border: '2px solid #e5e7eb',
          borderTop: '2px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className={`${className} ${sizeClasses.container}`} style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
        borderRadius: '8px',
        border: '2px dashed #d1d5db',
        cursor: onUpload ? 'pointer' : 'default',
        transition: 'all 0.2s'
      }}
      onClick={onUpload}
      onMouseOver={(e) => {
        if (onUpload) {
          e.currentTarget.style.borderColor = '#3b82f6';
          e.currentTarget.style.background = '#dbeafe';
        }
      }}
      onMouseOut={(e) => {
        if (onUpload) {
          e.currentTarget.style.borderColor = '#d1d5db';
          e.currentTarget.style.background = '#f9fafb';
        }
      }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.25rem',
          color: '#6b7280'
        }}>
          <Camera size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
          <span style={{
            fontSize: size === 'sm' ? '0.75rem' : '0.875rem',
            fontWeight: '500'
          }}>
            Fotos hinzufügen
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} ${sizeClasses.container}`} style={{
      display: 'flex',
      alignItems: 'center',
      gap: sizeClasses.gap.includes('gap-1.5') ? '0.375rem' : sizeClasses.gap.includes('gap-2') ? '0.5rem' : '0.25rem'
    }}>
      {/* Photo Thumbnails */}
      {displayPhotos.map((photo, index) => (
        <div
          key={photo.id}
          className={sizeClasses.photo}
          style={{
            borderRadius: '8px',
            overflow: 'hidden',
            cursor: onViewAll ? 'pointer' : 'default',
            transition: 'transform 0.2s',
            border: '1px solid #e5e7eb',
            flexShrink: 0
          }}
          onClick={() => onViewAll && onViewAll()}
          onMouseOver={(e) => {
            if (onViewAll) {
              e.currentTarget.style.transform = 'scale(1.05)';
            }
          }}
          onMouseOut={(e) => {
            if (onViewAll) {
              e.currentTarget.style.transform = 'scale(1)';
            }
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
        </div>
      ))}

      {/* More Photos Button */}
      {remainingCount > 0 && (
        <button
          className={sizeClasses.moreButton}
          onClick={onViewAll}
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.125rem',
            fontWeight: '600',
            transition: 'all 0.2s',
            flexShrink: 0
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title={`${remainingCount} weitere Fotos anzeigen`}
        >
          <MoreHorizontal size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
          <span style={{
            fontSize: size === 'sm' ? '0.625rem' : size === 'lg' ? '0.75rem' : '0.6875rem',
            lineHeight: '1'
          }}>
            +{remainingCount}
          </span>
        </button>
      )}

      {/* Add Photos Button */}
      {onUpload && photos.length < 20 && (
        <button
          className={sizeClasses.addButton}
          onClick={onUpload}
          style={{
            background: '#f9fafb',
            border: '2px dashed #d1d5db',
            borderRadius: '8px',
            color: '#6b7280',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.125rem',
            transition: 'all 0.2s',
            flexShrink: 0
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = '#3b82f6';
            e.currentTarget.style.background = '#dbeafe';
            e.currentTarget.style.color = '#3b82f6';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = '#d1d5db';
            e.currentTarget.style.background = '#f9fafb';
            e.currentTarget.style.color = '#6b7280';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Weitere Fotos hinzufügen"
        >
          <Plus size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
          {size !== 'sm' && (
            <span style={{
              fontSize: '0.625rem',
              lineHeight: '1',
              fontWeight: '500'
            }}>
              Foto
            </span>
          )}
        </button>
      )}

      {/* Photo Count Badge */}
      {photos.length > 0 && (
        <div style={{
          background: '#e0f2fe',
          color: '#0891b2',
          padding: size === 'sm' ? '0.125rem 0.375rem' : '0.25rem 0.5rem',
          borderRadius: '12px',
          fontSize: size === 'sm' ? '0.625rem' : '0.75rem',
          fontWeight: '600',
          marginLeft: 'auto',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem'
        }}>
          <ImageIcon size={size === 'sm' ? 10 : 12} />
          {photos.length}
        </div>
      )}
    </div>
  );
};

export default PhotoPreview;