import React, { useState, useRef } from 'react';
import { Camera, Upload, User, X } from 'lucide-react';
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
      console.warn('No file selected');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.warn('File too large:', file.size);
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
      // Starting upload

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
      
      console.log('✅ Avatar updated successfully');
      setPreviewUrl(null); // Clear preview since it's now saved
      
      // Notify parent component
      if (onAvatarUpdate) {
        onAvatarUpdate(avatarUrl);
      }

    } catch (error: any) {
      console.error('❌ Avatar: Upload failed:', error);
      console.error('Upload failed:', error.message);
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
      // Starting removal

      await userService.updateUserProfile({ avatar_url: null });
      await refreshUserProfile();

      console.log('✅ Avatar removed successfully');
      setPreviewUrl(null);

      if (onAvatarUpdate) {
        onAvatarUpdate('');
      }

    } catch (error: any) {
      console.error('❌ Avatar: Remove failed:', error);
      console.error('Failed to remove avatar:', error);
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

    </div>
  );
};

export default AvatarUpload;