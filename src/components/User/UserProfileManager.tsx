import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { userService, UserProfile, UpdateUserProfileData } from '../../services/userService';
import { isOAuthUser, getOAuthProvider, getProviderDisplayName } from '../../utils/authUtils';
import { User, Edit2, Check, X, Eye, EyeOff, Users, Mail, Globe, Settings, Camera, Shield } from 'lucide-react';
import MigrationButton from '../Debug/MigrationButton';
import AvatarUpload from './AvatarUpload';

interface UserProfileManagerProps {
  onProfileUpdate?: (profile: UserProfile) => void;
}

const UserProfileManager: React.FC<UserProfileManagerProps> = ({ onProfileUpdate }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    nickname: '',
    display_name: '',
    avatar_url: '',
    language: 'de' as 'de' | 'en',
    timezone: 'Europe/Berlin',
    is_profile_public: false,
    allow_friend_requests: true,
    allow_trip_invitations: true
  });

  // Load user profile
  useEffect(() => {
    loadUserProfile();
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userProfile = await userService.getCurrentUserProfile();
      
      if (userProfile) {
        setProfile(userProfile);
        setFormData({
          nickname: userProfile.nickname,
          display_name: userProfile.display_name || '',
          avatar_url: userProfile.avatar_url || '',
          language: userProfile.language,
          timezone: userProfile.timezone,
          is_profile_public: userProfile.is_profile_public,
          allow_friend_requests: userProfile.allow_friend_requests,
          allow_trip_invitations: userProfile.allow_trip_invitations
        });
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      setError('Profil konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Validate nickname
      if (!formData.nickname.trim()) {
        setError('Nickname ist erforderlich');
        return;
      }

      if (formData.nickname.length < 3) {
        setError('Nickname muss mindestens 3 Zeichen lang sein');
        return;
      }

      if (!/^[a-zA-Z0-9_]+$/.test(formData.nickname)) {
        setError('Nickname darf nur Buchstaben, Zahlen und Unterstriche enthalten');
        return;
      }

      const updates: UpdateUserProfileData = {
        nickname: formData.nickname.trim(),
        display_name: formData.display_name.trim() || undefined,
        avatar_url: formData.avatar_url.trim() || undefined,
        language: formData.language,
        timezone: formData.timezone,
        is_profile_public: formData.is_profile_public,
        allow_friend_requests: formData.allow_friend_requests,
        allow_trip_invitations: formData.allow_trip_invitations
      };

      const updatedProfile = await userService.updateUserProfile(updates);
      
      if (updatedProfile) {
        setProfile(updatedProfile);
        setIsEditing(false);
        setSuccess('Profil erfolgreich aktualisiert');
        onProfileUpdate?.(updatedProfile);
      }
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      setError(error.message || 'Fehler beim Speichern des Profils');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        nickname: profile.nickname,
        display_name: profile.display_name || '',
        avatar_url: profile.avatar_url || '',
        language: profile.language,
        timezone: profile.timezone,
        is_profile_public: profile.is_profile_public,
        allow_friend_requests: profile.allow_friend_requests,
        allow_trip_invitations: profile.allow_trip_invitations
      });
    }
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        color: 'var(--color-text-secondary)'
      }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" 
             style={{ borderColor: 'var(--color-primary-ocean)' }}></div>
        <span style={{ marginLeft: '0.5rem' }}>Profil wird geladen...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div>
        {/* Migration Button for existing OAuth users */}
        {user && <MigrationButton />}
        
        <div style={{
          background: 'var(--color-error)',
          color: 'white',
          padding: '1rem',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <User size={24} style={{ margin: '0 auto 0.5rem auto' }} />
          <p>Profil konnte nicht geladen werden</p>
          <button 
            onClick={loadUserProfile}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              marginTop: '0.5rem'
            }}
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: '12px',
      padding: '1.5rem',
      border: '1px solid var(--color-border)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={24} style={{ color: 'var(--color-primary-ocean)' }} />
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            margin: 0,
            color: 'var(--color-text-primary)'
          }}>
            Benutzer-Profil
          </h3>
        </div>
        
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'var(--color-primary-ocean)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            <Edit2 size={16} />
            Bearbeiten
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div style={{
          background: 'var(--color-error)',
          color: 'white',
          padding: '0.75rem',
          borderRadius: '6px',
          marginBottom: '1rem',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          background: 'var(--color-success)',
          color: 'white',
          padding: '0.75rem',
          borderRadius: '6px',
          marginBottom: '1rem',
          fontSize: '0.875rem'
        }}>
          {success}
        </div>
      )}

      {/* Profile Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Avatar Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <AvatarUpload 
            currentAvatarUrl={profile.avatar_url}
            size="large"
            editable={true}
            onAvatarUpdate={(newAvatarUrl) => {
              // Update local profile state immediately for better UX
              setProfile(prev => prev ? { ...prev, avatar_url: newAvatarUrl } : null);
              setFormData(prev => ({ ...prev, avatar_url: newAvatarUrl }));
            }}
          />
          
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: 'var(--color-text-primary)',
              marginBottom: '0.25rem'
            }}>
              @{profile.nickname}
              {profile.is_verified && (
                <span style={{
                  background: 'var(--color-success)',
                  color: 'white',
                  fontSize: '0.75rem',
                  padding: '0.125rem 0.375rem',
                  borderRadius: '4px',
                  marginLeft: '0.5rem'
                }}>
                  ✓ Verifiziert
                </span>
              )}
              {isOAuthUser(user) && (
                <span style={{
                  background: 'var(--color-primary-ocean)',
                  color: 'white',
                  fontSize: '0.75rem',
                  padding: '0.125rem 0.375rem',
                  borderRadius: '4px',
                  marginLeft: '0.5rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <Shield size={10} />
                  {getProviderDisplayName(getOAuthProvider(user))}
                </span>
              )}
            </div>
            
            {profile.display_name && (
              <div style={{
                color: 'var(--color-text-secondary)',
                marginBottom: '0.25rem'
              }}>
                {profile.display_name}
              </div>
            )}
            
            <div style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Mail size={14} />
              {profile.email}
              {!isOAuthUser(user) && !profile.is_verified && (
                <span style={{
                  background: 'var(--color-warning)',
                  color: 'white',
                  fontSize: '0.625rem',
                  padding: '0.125rem 0.25rem',
                  borderRadius: '3px'
                }}>
                  Nicht verifiziert
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Nickname */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'var(--color-text-primary)',
              marginBottom: '0.5rem'
            }}>
              Nickname
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)'
                }}
                placeholder="nickname"
              />
            ) : (
              <div style={{
                padding: '0.5rem',
                background: 'var(--color-background)',
                borderRadius: '6px',
                color: 'var(--color-text-primary)'
              }}>
                @{profile.nickname}
              </div>
            )}
          </div>

          {/* Display Name */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'var(--color-text-primary)',
              marginBottom: '0.5rem'
            }}>
              Anzeigename (optional)
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)'
                }}
                placeholder="Ihr Name"
              />
            ) : (
              <div style={{
                padding: '0.5rem',
                background: 'var(--color-background)',
                borderRadius: '6px',
                color: 'var(--color-text-primary)'
              }}>
                {profile.display_name || 'Nicht gesetzt'}
              </div>
            )}
          </div>

          {/* Language */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'var(--color-text-primary)',
              marginBottom: '0.5rem'
            }}>
              Sprache
            </label>
            {isEditing ? (
              <select
                value={formData.language}
                onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value as 'de' | 'en' }))}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)'
                }}
              >
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            ) : (
              <div style={{
                padding: '0.5rem',
                background: 'var(--color-background)',
                borderRadius: '6px',
                color: 'var(--color-text-primary)'
              }}>
                {profile.language === 'de' ? 'Deutsch' : 'English'}
              </div>
            )}
          </div>

          {/* Privacy Status */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'var(--color-text-primary)',
              marginBottom: '0.5rem'
            }}>
              Profil-Sichtbarkeit
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              background: 'var(--color-background)',
              borderRadius: '6px'
            }}>
              {profile.is_profile_public ? (
                <>
                  <Eye size={16} style={{ color: 'var(--color-success)' }} />
                  <span style={{ color: 'var(--color-text-primary)' }}>Öffentlich</span>
                </>
              ) : (
                <>
                  <EyeOff size={16} style={{ color: 'var(--color-text-secondary)' }} />
                  <span style={{ color: 'var(--color-text-primary)' }}>Privat</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* OAuth User Info */}
        {isOAuthUser(user) && (
          <div style={{
            background: 'rgba(74, 144, 164, 0.1)',
            border: '1px solid var(--color-primary-ocean)',
            borderRadius: '8px',
            padding: '1rem',
            marginTop: '1rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <Shield size={16} style={{ color: 'var(--color-primary-ocean)' }} />
              <h4 style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                margin: 0,
                color: 'var(--color-primary-ocean)'
              }}>
                {getProviderDisplayName(getOAuthProvider(user))}-Account
              </h4>
            </div>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              margin: 0,
              lineHeight: 1.4
            }}>
              Ihr Account ist über {getProviderDisplayName(getOAuthProvider(user))} gesichert. 
              Sie benötigen kein separates Passwort und sind automatisch verifiziert.
            </p>
          </div>
        )}

        {/* Privacy Settings (only in edit mode) */}
        {isEditing && (
          <div style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: '1rem'
          }}>
            <h4 style={{
              fontSize: '1rem',
              fontWeight: '600',
              margin: '0 0 1rem 0',
              color: 'var(--color-text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Settings size={18} />
              Datenschutz-Einstellungen
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={formData.is_profile_public}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_profile_public: e.target.checked }))}
                  style={{ width: '16px', height: '16px' }}
                />
                <Eye size={16} />
                <span style={{ color: 'var(--color-text-primary)' }}>
                  Profil öffentlich sichtbar machen
                </span>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={formData.allow_friend_requests}
                  onChange={(e) => setFormData(prev => ({ ...prev, allow_friend_requests: e.target.checked }))}
                  style={{ width: '16px', height: '16px' }}
                />
                <Users size={16} />
                <span style={{ color: 'var(--color-text-primary)' }}>
                  Freundschaftsanfragen erlauben
                </span>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={formData.allow_trip_invitations}
                  onChange={(e) => setFormData(prev => ({ ...prev, allow_trip_invitations: e.target.checked }))}
                  style={{ width: '16px', height: '16px' }}
                />
                <Mail size={16} />
                <span style={{ color: 'var(--color-text-primary)' }}>
                  Reise-Einladungen erlauben
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {isEditing && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            borderTop: '1px solid var(--color-border)',
            paddingTop: '1rem'
          }}>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'var(--color-text-secondary)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                opacity: isSaving ? 0.6 : 1
              }}
            >
              <X size={16} />
              Abbrechen
            </button>
            
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'var(--color-success)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                opacity: isSaving ? 0.6 : 1
              }}
            >
              <Check size={16} />
              {isSaving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfileManager;