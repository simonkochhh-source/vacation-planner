import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { userService, UserSearchResult, PublicUserProfile } from '../../services/userService';
import UserSearchComponent from '../User/UserSearchComponent';
import AvatarUpload from '../User/AvatarUpload';
import { Trip, TripPrivacy } from '../../types';
import { 
  Users, 
  Plus, 
  Minus, 
  Lock, 
  Globe, 
  Award, 
  Check, 
  X,
  AlertTriangle 
} from 'lucide-react';

interface TripSharingManagerProps {
  trip: Trip;
  onTripUpdate: (updatedTrip: Trip) => void;
  onClose?: () => void;
}

const TripSharingManager: React.FC<TripSharingManagerProps> = ({
  trip,
  onTripUpdate,
  onClose
}) => {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [sharedUsers, setSharedUsers] = useState<PublicUserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  const [newPrivacy, setNewPrivacy] = useState<TripPrivacy>(trip.privacy);
  const [hasChanges, setHasChanges] = useState(false);

  // Load shared users
  useEffect(() => {
    loadSharedUsers();
  }, [trip.taggedUsers]);

  // Check for changes
  useEffect(() => {
    const privacyChanged = newPrivacy !== trip.privacy;
    setHasChanges(privacyChanged);
  }, [newPrivacy, trip.privacy]);

  const loadSharedUsers = async () => {
    if (trip.taggedUsers.length === 0) {
      setSharedUsers([]);
      setLoadingUsers(false);
      return;
    }

    try {
      setLoadingUsers(true);
      const users = await userService.getUsersByIds(trip.taggedUsers);
      setSharedUsers(users);
    } catch (error) {
      console.error('Failed to load shared users:', error);
      setError('Geteilte Benutzer konnten nicht geladen werden');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddUser = async (selectedUser: UserSearchResult) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is already shared
      if (trip.taggedUsers.includes(selectedUser.id)) {
        setError('Benutzer ist bereits zu dieser Reise hinzugefügt');
        return;
      }

      // Create updated trip
      const updatedTrip: Trip = {
        ...trip,
        taggedUsers: [...trip.taggedUsers, selectedUser.id],
        updatedAt: new Date().toISOString()
      };

      onTripUpdate(updatedTrip);
      setSuccess(`${selectedUser.nickname} wurde zur Reise hinzugefügt`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error) {
      console.error('Failed to add user:', error);
      setError('Benutzer konnte nicht hinzugefügt werden');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Create updated trip
      const updatedTrip: Trip = {
        ...trip,
        taggedUsers: trip.taggedUsers.filter(id => id !== userId),
        updatedAt: new Date().toISOString()
      };

      onTripUpdate(updatedTrip);
      setSuccess('Benutzer wurde von der Reise entfernt');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error) {
      console.error('Failed to remove user:', error);
      setError('Benutzer konnte nicht entfernt werden');
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacyChange = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedTrip: Trip = {
        ...trip,
        privacy: newPrivacy,
        updatedAt: new Date().toISOString()
      };

      onTripUpdate(updatedTrip);
      setSuccess('Datenschutz-Einstellungen wurden aktualisiert');
      setHasChanges(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error) {
      console.error('Failed to update privacy:', error);
      setError('Datenschutz-Einstellungen konnten nicht aktualisiert werden');
    } finally {
      setLoading(false);
    }
  };

  // Check if current user is the owner
  const isOwner = user?.id === trip.ownerId;

  if (!isOwner) {
    return (
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: '12px',
        padding: '2rem',
        border: '1px solid var(--color-border)',
        textAlign: 'center'
      }}>
        <Lock size={32} style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }} />
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          margin: '0 0 0.5rem 0',
          color: 'var(--color-text-primary)'
        }}>
          Zugriff verweigert
        </h3>
        <p style={{
          color: 'var(--color-text-secondary)',
          margin: 0
        }}>
          Nur der Ersteller der Reise kann die Freigabe-Einstellungen verwalten.
        </p>
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
          <Users size={24} style={{ color: 'var(--color-primary-ocean)' }} />
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            margin: 0,
            color: 'var(--color-text-primary)'
          }}>
            Reise teilen
          </h3>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              padding: '0.25rem'
            }}
          >
            <X size={20} />
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
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertTriangle size={16} />
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
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Check size={16} />
          {success}
        </div>
      )}

      {/* Privacy Settings */}
      <div style={{
        background: 'var(--color-background)',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1.5rem'
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
          <Globe size={18} />
          Datenschutz-Einstellungen
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '6px',
            border: `2px solid ${newPrivacy === TripPrivacy.PRIVATE ? 'var(--color-primary-ocean)' : 'var(--color-border)'}`,
            background: newPrivacy === TripPrivacy.PRIVATE ? 'rgba(74, 144, 164, 0.1)' : 'transparent'
          }}>
            <input
              type="radio"
              checked={newPrivacy === TripPrivacy.PRIVATE}
              onChange={() => setNewPrivacy(TripPrivacy.PRIVATE)}
              style={{ width: '16px', height: '16px' }}
            />
            <Lock size={16} />
            <div>
              <div style={{ fontWeight: '500', color: 'var(--color-text-primary)' }}>
                Privat
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                Nur Sie und eingeladene Benutzer können diese Reise sehen
              </div>
            </div>
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '6px',
            border: `2px solid ${newPrivacy === TripPrivacy.PUBLIC ? 'var(--color-primary-ocean)' : 'var(--color-border)'}`,
            background: newPrivacy === TripPrivacy.PUBLIC ? 'rgba(74, 144, 164, 0.1)' : 'transparent'
          }}>
            <input
              type="radio"
              checked={newPrivacy === TripPrivacy.PUBLIC}
              onChange={() => setNewPrivacy(TripPrivacy.PUBLIC)}
              style={{ width: '16px', height: '16px' }}
            />
            <Globe size={16} />
            <div>
              <div style={{ fontWeight: '500', color: 'var(--color-text-primary)' }}>
                Öffentlich
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                Jeder kann diese Reise sehen und entdecken
              </div>
            </div>
          </label>
        </div>

        {hasChanges && (
          <button
            onClick={handlePrivacyChange}
            disabled={loading}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: 'var(--color-success)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Speichern...' : 'Änderungen speichern'}
          </button>
        )}
      </div>

      {/* User Search */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{
          fontSize: '1rem',
          fontWeight: '600',
          margin: '0 0 0.75rem 0',
          color: 'var(--color-text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Plus size={18} />
          Benutzer hinzufügen
        </h4>
        
        <UserSearchComponent
          onUserSelect={handleAddUser}
          selectedUsers={sharedUsers}
          placeholder="Nach Benutzern suchen (Nickname oder Name)..."
          excludeUserIds={[trip.ownerId, ...trip.taggedUsers]}
          disabled={loading}
        />
      </div>

      {/* Current Owner */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{
          fontSize: '1rem',
          fontWeight: '600',
          margin: '0 0 0.75rem 0',
          color: 'var(--color-text-primary)'
        }}>
          Ersteller
        </h4>
        
        <div style={{
          background: 'var(--color-background)',
          borderRadius: '8px',
          padding: '1rem',
          border: '2px solid var(--color-success)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <AvatarUpload 
              currentAvatarUrl={userProfile?.avatar_url}
              size="small"
              editable={false}
            />
            
            <div style={{ flex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.125rem'
              }}>
                <span style={{
                  fontWeight: '600',
                  color: 'var(--color-text-primary)'
                }}>
                  @{userProfile?.nickname || 'Sie'}
                </span>
                <Award size={14} style={{ color: 'var(--color-success)' }} />
              </div>
              
              {userProfile?.display_name && (
                <div style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.875rem'
                }}>
                  {userProfile.display_name}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shared Users */}
      <div>
        <h4 style={{
          fontSize: '1rem',
          fontWeight: '600',
          margin: '0 0 0.75rem 0',
          color: 'var(--color-text-primary)'
        }}>
          Geteilte Benutzer ({trip.taggedUsers.length})
        </h4>
        
        {loadingUsers ? (
          <div style={{
            background: 'var(--color-background)',
            borderRadius: '8px',
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--color-text-secondary)'
          }}>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto mb-2" 
                 style={{ borderColor: 'var(--color-primary-ocean)' }}></div>
            Lade Benutzer...
          </div>
        ) : sharedUsers.length === 0 ? (
          <div style={{
            background: 'var(--color-background)',
            borderRadius: '8px',
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--color-text-secondary)'
          }}>
            <Users size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
            <p style={{ margin: 0 }}>
              Diese Reise wurde noch nicht geteilt.
            </p>
          </div>
        ) : (
          <div style={{
            background: 'var(--color-background)',
            borderRadius: '8px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            {sharedUsers.map(sharedUser => (
              <div
                key={sharedUser.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  background: 'var(--color-surface)',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)'
                }}
              >
                <AvatarUpload 
                  currentAvatarUrl={sharedUser.avatar_url}
                  size="small"
                  editable={false}
                />
                
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.125rem'
                  }}>
                    <span style={{
                      fontWeight: '600',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.875rem'
                    }}>
                      @{sharedUser.nickname}
                    </span>
                    
                    {sharedUser.is_verified && (
                      <span style={{
                        background: 'var(--color-success)',
                        color: 'white',
                        fontSize: '0.625rem',
                        padding: '0.125rem 0.25rem',
                        borderRadius: '3px'
                      }}>
                        ✓
                      </span>
                    )}
                  </div>
                  
                  {sharedUser.display_name && (
                    <div style={{
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.75rem'
                    }}>
                      {sharedUser.display_name}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => handleRemoveUser(sharedUser.id)}
                  disabled={loading}
                  style={{
                    background: 'var(--color-error)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.375rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Benutzer entfernen"
                >
                  <Minus size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TripSharingManager;