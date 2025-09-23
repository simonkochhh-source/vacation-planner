import React, { useState, useEffect } from 'react';
import { 
  User, 
  Settings, 
  Eye, 
  Lock, 
  Globe, 
  Users,
  MapPin,
  Calendar,
  Activity,
  Edit3,
  Shield,
  Share,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { socialService } from '../../services/socialService';
import { SocialUserProfile, Trip, TripPrivacy, ActivityFeedItem } from '../../types';
import AvatarUpload from '../User/AvatarUpload';
import { formatDate } from '../../utils';

const MyProfileView: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { updateUIState, trips } = useSupabaseApp();
  const [socialProfile, setSocialProfile] = useState<SocialUserProfile | null>(null);
  const [myActivities, setMyActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'trips' | 'activities' | 'privacy'>('overview');

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

  const loadProfileData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Load social profile
      const profile = await socialService.getUserProfile(user.id);
      setSocialProfile(profile);
      
      // Load my activities
      const activities = await socialService.getUserActivities(user.id, 20);
      setMyActivities(activities);
      
    } catch (error) {
      console.error('Failed to load profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    updateUIState({ currentView: 'settings' });
  };

  const getPublicTrips = () => {
    return trips.filter(trip => trip.privacy === TripPrivacy.PUBLIC);
  };

  const getContactsTrips = () => {
    return trips.filter(trip => trip.privacy === TripPrivacy.CONTACTS);
  };

  const getPrivateTrips = () => {
    return trips.filter(trip => trip.privacy === TripPrivacy.PRIVATE);
  };

  const getPrivacyIcon = (privacy: TripPrivacy) => {
    switch (privacy) {
      case TripPrivacy.PUBLIC:
        return <Globe size={14} style={{ color: '#10b981' }} />;
      case TripPrivacy.CONTACTS:
        return <Users size={14} style={{ color: '#f59e0b' }} />;
      case TripPrivacy.PRIVATE:
        return <Lock size={14} style={{ color: '#6b7280' }} />;
    }
  };

  const getPrivacyLabel = (privacy: TripPrivacy) => {
    switch (privacy) {
      case TripPrivacy.PUBLIC:
        return 'Öffentlich';
      case TripPrivacy.CONTACTS:
        return 'Nur Follower';
      case TripPrivacy.PRIVATE:
        return 'Privat';
    }
  };

  const getActivityIcon = (activity: ActivityFeedItem) => {
    // Reuse the same icons from SocialActivityFeed
    switch (activity.activity_type) {
      case 'trip_planned':
        return <Calendar size={16} style={{ color: '#3b82f6' }} />;
      case 'trip_started':
        return <MapPin size={16} style={{ color: '#10b981' }} />;
      case 'trip_completed':
        return <TrendingUp size={16} style={{ color: '#f59e0b' }} />;
      case 'destination_visited':
        return <MapPin size={16} style={{ color: '#ef4444' }} />;
      case 'destination_planned':
        return <MapPin size={16} style={{ color: '#6b7280' }} />;
      case 'user_followed':
        return <Users size={16} style={{ color: '#8b5cf6' }} />;
      default:
        return <Activity size={16} style={{ color: '#6b7280' }} />;
    }
  };

  if (loading) {
    return (
      <div style={{
        padding: 'var(--space-2xl)',
        textAlign: 'center',
        color: 'var(--color-text-secondary)'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid var(--color-border)',
          borderTop: '3px solid var(--color-primary-ocean)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto var(--space-md)'
        }} />
        <p>Lade dein Profil...</p>
      </div>
    );
  }

  if (!user || !userProfile) {
    return (
      <div style={{
        padding: 'var(--space-2xl)',
        textAlign: 'center',
        color: 'var(--color-text-secondary)'
      }}>
        <Shield size={48} style={{ margin: '0 auto var(--space-md)', display: 'block', opacity: 0.5 }} />
        <p>Du musst angemeldet sein, um dein Profil zu sehen.</p>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ padding: 'var(--space-lg)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-xl)',
        marginBottom: 'var(--space-lg)',
        border: '1px solid var(--color-border)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--space-lg)',
          marginBottom: 'var(--space-lg)'
        }}>
          {/* Avatar */}
          <div style={{ flexShrink: 0 }}>
            <AvatarUpload
              currentAvatarUrl={userProfile.avatar_url}
              size="large"
              editable={false}
            />
          </div>

          {/* Profile Info */}
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-md)',
              marginBottom: 'var(--space-sm)'
            }}>
              <h1 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--text-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-text-primary)',
                margin: 0
              }}>
                @{userProfile.nickname || 'user'}
              </h1>
              
              <button
                onClick={handleEditProfile}
                style={{
                  background: 'var(--color-primary-ocean)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-sm) var(--space-md)',
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-xs)',
                  transition: 'background var(--transition-normal)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-primary-forest)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--color-primary-ocean)';
                }}
              >
                <Edit3 size={14} />
                Profil bearbeiten
              </button>
            </div>

            {userProfile.display_name && (
              <p style={{
                fontSize: 'var(--text-lg)',
                color: 'var(--color-text-primary)',
                margin: '0 0 var(--space-sm) 0'
              }}>
                {userProfile.display_name}
              </p>
            )}

            {userProfile.bio && (
              <p style={{
                fontSize: 'var(--text-base)',
                color: 'var(--color-text-secondary)',
                margin: '0 0 var(--space-md) 0',
                lineHeight: 1.5
              }}>
                {userProfile.bio}
              </p>
            )}

            {/* Social Stats */}
            <div style={{
              display: 'flex',
              gap: 'var(--space-lg)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-secondary)'
            }}>
              <div>
                <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                  {socialProfile?.follower_count || 0}
                </span> Follower
              </div>
              <div>
                <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                  {socialProfile?.following_count || 0}
                </span> Folge ich
              </div>
              <div>
                <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                  {trips.length}
                </span> Reisen
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div style={{
          background: 'var(--color-neutral-mist)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)'
        }}>
          <Eye size={16} style={{ color: 'var(--color-primary-ocean)' }} />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            So sehen andere dein Profil. Nur öffentliche und Follower-Inhalte sind für andere sichtbar.
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden'
      }}>
        {/* Tab Headers */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-neutral-mist)'
        }}>
          {[
            { id: 'overview', label: 'Übersicht', icon: User },
            { id: 'trips', label: 'Meine Reisen', icon: MapPin },
            { id: 'activities', label: 'Aktivitäten', icon: Activity },
            { id: 'privacy', label: 'Privatsphäre', icon: Shield }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                background: activeTab === tab.id ? 'var(--color-surface)' : 'transparent',
                border: 'none',
                padding: 'var(--space-md) var(--space-lg)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: activeTab === tab.id ? 'var(--color-primary-ocean)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                transition: 'all var(--transition-normal)',
                borderBottom: activeTab === tab.id ? '2px solid var(--color-primary-ocean)' : '2px solid transparent'
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: 'var(--space-xl)' }}>
          {activeTab === 'overview' && (
            <div>
              <h3 style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                margin: '0 0 var(--space-lg) 0'
              }}>
                Dein öffentliches Profil
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Public Trips */}
                <div style={{
                  background: 'var(--color-neutral-cream)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-lg)',
                  textAlign: 'center'
                }}>
                  <Globe size={32} style={{ 
                    color: 'var(--color-primary-ocean)', 
                    margin: '0 auto var(--space-sm)', 
                    display: 'block' 
                  }} />
                  <div style={{
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: 'var(--color-text-primary)',
                    marginBottom: 'var(--space-xs)'
                  }}>
                    {getPublicTrips().length}
                  </div>
                  <div style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)'
                  }}>
                    Öffentliche Reisen
                  </div>
                </div>

                {/* Contacts Trips */}
                <div style={{
                  background: 'var(--color-neutral-cream)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-lg)',
                  textAlign: 'center'
                }}>
                  <Users size={32} style={{ 
                    color: 'var(--color-warning)', 
                    margin: '0 auto var(--space-sm)', 
                    display: 'block' 
                  }} />
                  <div style={{
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: 'var(--color-text-primary)',
                    marginBottom: 'var(--space-xs)'
                  }}>
                    {getContactsTrips().length}
                  </div>
                  <div style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)'
                  }}>
                    Nur für Follower
                  </div>
                </div>

                {/* Private Trips */}
                <div style={{
                  background: 'var(--color-neutral-cream)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-lg)',
                  textAlign: 'center'
                }}>
                  <Lock size={32} style={{ 
                    color: 'var(--color-text-secondary)', 
                    margin: '0 auto var(--space-sm)', 
                    display: 'block' 
                  }} />
                  <div style={{
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: 'var(--color-text-primary)',
                    marginBottom: 'var(--space-xs)'
                  }}>
                    {getPrivateTrips().length}
                  </div>
                  <div style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)'
                  }}>
                    Private Reisen
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trips' && (
            <div>
              <h3 style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                margin: '0 0 var(--space-lg) 0'
              }}>
                Deine Reisen nach Sichtbarkeit
              </h3>

              {/* Public Trips */}
              {getPublicTrips().length > 0 && (
                <div style={{ marginBottom: 'var(--space-xl)' }}>
                  <h4 style={{
                    fontSize: 'var(--text-md)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-primary)',
                    margin: '0 0 var(--space-md) 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)'
                  }}>
                    <Globe size={16} style={{ color: '#10b981' }} />
                    Öffentliche Reisen ({getPublicTrips().length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getPublicTrips().map(trip => (
                      <div
                        key={trip.id}
                        style={{
                          background: 'var(--color-neutral-mist)',
                          borderRadius: 'var(--radius-md)',
                          padding: 'var(--space-md)',
                          border: '1px solid var(--color-border)'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: 'var(--space-sm)'
                        }}>
                          <h5 style={{
                            fontSize: 'var(--text-base)',
                            fontWeight: 'var(--font-weight-semibold)',
                            color: 'var(--color-text-primary)',
                            margin: 0
                          }}>
                            {trip.name}
                          </h5>
                          {getPrivacyIcon(trip.privacy)}
                        </div>
                        
                        {trip.description && (
                          <p style={{
                            fontSize: 'var(--text-sm)',
                            color: 'var(--color-text-secondary)',
                            margin: '0 0 var(--space-sm) 0'
                          }}>
                            {trip.description}
                          </p>
                        )}
                        
                        <div style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--color-text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-xs)'
                        }}>
                          <Calendar size={12} />
                          {trip.startDate} - {trip.endDate}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contacts Trips */}
              {getContactsTrips().length > 0 && (
                <div style={{ marginBottom: 'var(--space-xl)' }}>
                  <h4 style={{
                    fontSize: 'var(--text-md)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-primary)',
                    margin: '0 0 var(--space-md) 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)'
                  }}>
                    <Users size={16} style={{ color: '#f59e0b' }} />
                    Nur für Follower ({getContactsTrips().length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getContactsTrips().map(trip => (
                      <div
                        key={trip.id}
                        style={{
                          background: 'var(--color-neutral-mist)',
                          borderRadius: 'var(--radius-md)',
                          padding: 'var(--space-md)',
                          border: '1px solid var(--color-border)'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: 'var(--space-sm)'
                        }}>
                          <h5 style={{
                            fontSize: 'var(--text-base)',
                            fontWeight: 'var(--font-weight-semibold)',
                            color: 'var(--color-text-primary)',
                            margin: 0
                          }}>
                            {trip.name}
                          </h5>
                          {getPrivacyIcon(trip.privacy)}
                        </div>
                        
                        {trip.description && (
                          <p style={{
                            fontSize: 'var(--text-sm)',
                            color: 'var(--color-text-secondary)',
                            margin: '0 0 var(--space-sm) 0'
                          }}>
                            {trip.description}
                          </p>
                        )}
                        
                        <div style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--color-text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-xs)'
                        }}>
                          <Calendar size={12} />
                          {trip.startDate} - {trip.endDate}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Private Trips */}
              {getPrivateTrips().length > 0 && (
                <div>
                  <h4 style={{
                    fontSize: 'var(--text-md)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-primary)',
                    margin: '0 0 var(--space-md) 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)'
                  }}>
                    <Lock size={16} style={{ color: '#6b7280' }} />
                    Private Reisen ({getPrivateTrips().length})
                  </h4>
                  <div style={{
                    background: 'var(--color-neutral-mist)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-lg)',
                    textAlign: 'center',
                    border: '1px solid var(--color-border)'
                  }}>
                    <Lock size={32} style={{ 
                      color: 'var(--color-text-secondary)', 
                      margin: '0 auto var(--space-sm)', 
                      display: 'block' 
                    }} />
                    <p style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text-secondary)',
                      margin: 0
                    }}>
                      Diese {getPrivateTrips().length} Reisen sind privat und nur für dich sichtbar.
                    </p>
                  </div>
                </div>
              )}

              {trips.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: 'var(--space-2xl)',
                  color: 'var(--color-text-secondary)'
                }}>
                  <MapPin size={48} style={{ 
                    margin: '0 auto var(--space-md)', 
                    display: 'block', 
                    opacity: 0.5 
                  }} />
                  <p>Du hast noch keine Reisen erstellt.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activities' && (
            <div>
              <h3 style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                margin: '0 0 var(--space-lg) 0'
              }}>
                Deine öffentlichen Aktivitäten
              </h3>

              {myActivities.length > 0 ? (
                <div>
                  {myActivities.map((activity, index) => (
                    <div
                      key={`${activity.id}-${index}`}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 'var(--space-md)',
                        padding: 'var(--space-md)',
                        borderBottom: index < myActivities.length - 1 ? '1px solid var(--color-border)' : 'none'
                      }}
                    >
                      <div style={{ flexShrink: 0, paddingTop: '2px' }}>
                        {getActivityIcon(activity)}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <p style={{
                          margin: 0,
                          fontSize: 'var(--text-base)',
                          color: 'var(--color-text-primary)',
                          lineHeight: 1.4
                        }}>
                          {activity.title}
                        </p>
                        
                        {activity.description && (
                          <p style={{
                            margin: 'var(--space-xs) 0 0 0',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--color-text-secondary)'
                          }}>
                            {activity.description}
                          </p>
                        )}
                        
                        <div style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--color-text-secondary)',
                          marginTop: 'var(--space-xs)'
                        }}>
                          {formatDate(activity.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: 'var(--space-2xl)',
                  color: 'var(--color-text-secondary)'
                }}>
                  <Activity size={48} style={{ 
                    margin: '0 auto var(--space-md)', 
                    display: 'block', 
                    opacity: 0.5 
                  }} />
                  <p>Du hast noch keine öffentlichen Aktivitäten.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'privacy' && (
            <div>
              <h3 style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                margin: '0 0 var(--space-lg) 0'
              }}>
                Privatsphäre-Einstellungen
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                {/* Privacy Levels Explanation */}
                <div style={{
                  background: 'var(--color-neutral-cream)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-lg)'
                }}>
                  <h4 style={{
                    fontSize: 'var(--text-md)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-primary)',
                    margin: '0 0 var(--space-md) 0'
                  }}>
                    Sichtbarkeits-Level
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <Globe size={16} style={{ color: '#10b981' }} />
                      <strong>Öffentlich:</strong> Für alle Nutzer sichtbar, auch ohne Anmeldung
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <Users size={16} style={{ color: '#f59e0b' }} />
                      <strong>Nur Follower:</strong> Nur für Nutzer sichtbar, die dir folgen
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <Lock size={16} style={{ color: '#6b7280' }} />
                      <strong>Privat:</strong> Nur für dich sichtbar
                    </div>
                  </div>
                </div>

                {/* Current Privacy Summary */}
                <div style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-lg)'
                }}>
                  <h4 style={{
                    fontSize: 'var(--text-md)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-primary)',
                    margin: '0 0 var(--space-md) 0'
                  }}>
                    Deine aktuelle Sichtbarkeit
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: 'var(--text-xl)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: '#10b981',
                        marginBottom: 'var(--space-xs)'
                      }}>
                        {getPublicTrips().length}
                      </div>
                      <div style={{
                        fontSize: 'var(--text-sm)',
                        color: 'var(--color-text-secondary)'
                      }}>
                        Öffentliche Reisen
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: 'var(--text-xl)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: '#f59e0b',
                        marginBottom: 'var(--space-xs)'
                      }}>
                        {getContactsTrips().length}
                      </div>
                      <div style={{
                        fontSize: 'var(--text-sm)',
                        color: 'var(--color-text-secondary)'
                      }}>
                        Follower-Reisen
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: 'var(--text-xl)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: '#6b7280',
                        marginBottom: 'var(--space-xs)'
                      }}>
                        {getPrivateTrips().length}
                      </div>
                      <div style={{
                        fontSize: 'var(--text-sm)',
                        color: 'var(--color-text-secondary)'
                      }}>
                        Private Reisen
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div style={{
                  display: 'flex',
                  gap: 'var(--space-md)',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => setActiveTab('trips')}
                    style={{
                      background: 'var(--color-primary-ocean)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-md) var(--space-lg)',
                      fontSize: 'var(--text-sm)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-sm)'
                    }}
                  >
                    <MapPin size={16} />
                    Reise-Sichtbarkeit verwalten
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyProfileView;