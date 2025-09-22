import React, { useState, useRef } from 'react';
import { Camera, Upload, User, X, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  onAvatarUpdate?: (newAvatarUrl: string) => void;
  size?: 'small' | 'medium' | 'large';
  editable?: boolean;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatarUrl,
  onAvatarUpdate,
  size = 'medium',
  editable = true
}) => {
  const { userProfile, refreshUserProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarUrl = previewUrl || currentAvatarUrl || userProfile?.avatar_url;

  // Size configurations
  const sizeConfig = {
    small: { 
      container: '40px', 
      icon: 16, 
      uploadIcon: 12,
      fontSize: '0.75rem'
    },
    medium: { 
      container: '80px', 
      icon: 32, 
      uploadIcon: 16,
      fontSize: '0.875rem'
    },
    large: { 
      container: '120px', 
      icon: 48, 
      uploadIcon: 20,
      fontSize: '1rem'
    }
  };

  const config = sizeConfig[size];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Bitte wählen Sie eine Bilddatei aus');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Bild ist zu groß. Maximum 5MB erlaubt');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      console.log('📷 Avatar: Starting upload...', file.name, file.size);

      // Upload to Supabase storage
      const avatarUrl = await userService.uploadAvatar(file);
      
      if (!avatarUrl) {
        throw new Error('Upload fehlgeschlagen');
      }

      console.log('✅ Avatar: Upload successful:', avatarUrl);

      // Update user profile
      await userService.updateUserProfile({ avatar_url: avatarUrl });
      
      // Refresh user profile to get updated data
      await refreshUserProfile();
      
      setSuccess('Profilbild erfolgreich aktualisiert!');
      setPreviewUrl(null); // Clear preview since it's now saved
      
      // Notify parent component
      if (onAvatarUpdate) {
        onAvatarUpdate(avatarUrl);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);

    } catch (error: any) {
      console.error('❌ Avatar: Upload failed:', error);
      setError(error.message || 'Upload fehlgeschlagen');
      setPreviewUrl(null); // Clear preview on error
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAvatarClick = () => {
    if (editable && !uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setUploading(true);
      setError(null);

      await userService.updateUserProfile({ avatar_url: null });
      await refreshUserProfile();

      setSuccess('Profilbild entfernt');
      setPreviewUrl(null);

      if (onAvatarUpdate) {
        onAvatarUpdate('');
      }

      setTimeout(() => setSuccess(null), 3000);

    } catch (error: any) {
      console.error('❌ Avatar: Remove failed:', error);
      setError('Fehler beim Entfernen des Profilbilds');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Avatar Container */}
      <div
        onClick={handleAvatarClick}
        style={{
          width: config.container,
          height: config.container,
          borderRadius: '50%',
          background: avatarUrl 
            ? `url(${avatarUrl}) center/cover`
            : 'var(--color-neutral-mist)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: uploading 
            ? '3px solid var(--color-primary-ocean)' 
            : '2px solid var(--color-border)',
          cursor: editable && !uploading ? 'pointer' : 'default',
          position: 'relative',
          transition: 'all var(--transition-normal)',
          opacity: uploading ? 0.7 : 1
        }}
        onMouseEnter={(e) => {
          if (editable && !uploading) {
            e.currentTarget.style.borderColor = 'var(--color-primary-ocean)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }
        }}
        onMouseLeave={(e) => {
          if (editable && !uploading) {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.transform = 'scale(1)';
          }
        }}
      >
        {!avatarUrl && (
          <User 
            size={config.icon} 
            style={{ color: 'var(--color-text-secondary)' }} 
          />
        )}

        {/* Upload Overlay */}
        {editable && !uploading && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary-ocean)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--color-surface)'
          }}>
            <Camera size={config.uploadIcon} style={{ color: 'white' }} />
          </div>
        )}

        {/* Upload Indicator */}
        {uploading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div 
              className="animate-spin rounded-full border-b-2 border-white"
              style={{ width: '20px', height: '20px' }}
            />
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={!editable || uploading}
      />

      {/* Remove Button */}
      {editable && avatarUrl && !uploading && size !== 'small' && (
        <button
          onClick={handleRemoveAvatar}
          style={{
            position: 'absolute',
            top: '-4px',
            left: '-4px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-error)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px'
          }}
          title="Profilbild entfernen"
        >
          <X size={12} />
        </button>
      )}

      {/* Status Messages */}
      {(error || success) && size !== 'small' && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: '0.5rem',
          minWidth: '200px',
          textAlign: 'center'
        }}>
          {error && (
            <div style={{
              background: 'var(--color-error)',
              color: 'white',
              padding: '0.5rem',
              borderRadius: '6px',
              fontSize: config.fontSize,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem'
            }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}
          
          {success && (
            <div style={{
              background: 'var(--color-success)',
              color: 'white',
              padding: '0.5rem',
              borderRadius: '6px',
              fontSize: config.fontSize,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem'
            }}>
              <Check size={14} />
              {success}
            </div>
          )}
        </div>
      )}

      {/* Upload Instructions */}
      {editable && !avatarUrl && !uploading && size === 'large' && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: '0.5rem',
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
          fontSize: '0.75rem'
        }}>
          Klicken zum Hochladen
        </div>
      )}
    </div>
  );
};

export default AvatarUpload;