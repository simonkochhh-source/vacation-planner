import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Users, 
  MapPin, 
  Calendar, 
  Globe, 
  Link,
  User,
  X,
  Check,
  Clock,
  Settings,
  MoreHorizontal,
  Star,
  Heart,
  Share
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  SocialUserProfile, 
  UUID, 
  FollowStatus, 
  ActivityFeedItem, 
  Trip,
  TripPrivacy,
  getSocialTripPermissions
} from '../../types';
import { socialService } from '../../services/socialService';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { formatDate } from '../../utils';
import AvatarUpload from '../User/AvatarUpload';

interface UserProfileViewProps {
  userId: UUID;
  onBack: () => void;
}

const UserProfileView: React.FC<UserProfileViewProps> = ({ userId, onBack }) => {
  const { user: currentUser } = useAuth();
  const { updateUIState } = useSupabaseApp();
  
  const [profile, setProfile] = useState<SocialUserProfile | null>(null);
  const [followStatus, setFollowStatus] = useState<FollowStatus | 'none'>('none');
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [userTrips, setUserTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'trips' | 'activity' | 'about'>('trips');

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      // Load user profile
      const userProfile = await socialService.getUserProfile(userId);
      setProfile(userProfile);

      // Load follow status if not own profile
      if (!isOwnProfile && currentUser) {
        const status = await socialService.getFollowStatus(userId);
        setFollowStatus(status);
      }

      // Load user activities
      const userActivities = await socialService.getUserActivityFeed(userId, 20);
      setActivities(userActivities);

      // TODO: Load user's public/contact trips based on privacy settings
      // This would require expanding the trip service to include privacy filtering
      
    } catch (error) {
      console.error('Failed to load user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowAction = async () => {
    if (!currentUser || isOwnProfile) return;

    try {
      setFollowLoading(true);
      
      if (followStatus === 'none') {
        await socialService.followUser(userId);
        setFollowStatus(FollowStatus.PENDING);
      } else if (followStatus === FollowStatus.ACCEPTED || followStatus === FollowStatus.PENDING) {
        await socialService.unfollowUser(userId);
        setFollowStatus('none');
      }
      
      // Reload profile to update follower count
      await loadUserProfile();
      
    } catch (error) {
      console.error('Follow action failed:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const getFollowButtonText = () => {
    switch (followStatus) {
      case 'none': return 'Folgen';
      case FollowStatus.PENDING: return 'Angefragt';
      case FollowStatus.ACCEPTED: return 'Entfolgen';
      default: return 'Folgen';
    }
  };

  const getFollowButtonIcon = () => {
    switch (followStatus) {
      case 'none': return <User size={16} />;
      case FollowStatus.PENDING: return <Clock size={16} />;
      case FollowStatus.ACCEPTED: return <Check size={16} />;
      default: return <User size={16} />;
    }
  };

  const handleTripClick = (tripId: UUID) => {
    updateUIState({
      currentView: 'search',
      selectedTripId: tripId,
      showTripDetails: true
    });
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #f3f4f6',
          borderTop: '3px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ fontSize: '3rem' }}>😕</div>
        <h2 style={{ margin: 0, color: '#6b7280' }}>Nutzer nicht gefunden</h2>
        <p style={{ margin: 0, color: '#9ca3af' }}>
          Dieser Nutzer existiert nicht oder ist privat.
        </p>
        <button
          onClick={onBack}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            cursor: 'pointer'
          }}
        >
          Zurück
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '24px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <button
              onClick={onBack}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ArrowLeft size={20} />
            </button>
            
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '700' }}>
              @{profile.nickname}
            </h1>
          </div>

          {/* Profile Info */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            {/* Avatar */}
            <div style={{ position: 'relative' }}>
              <AvatarUpload
                currentAvatarUrl={profile.avatar_url}
                size="large"
                editable={false}
              />
              {profile.is_verified && (
                <div style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  background: '#10b981',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid white'
                }}>
                  ✓
                </div>
              )}
            </div>

            {/* Profile Details */}
            <div style={{ flex: 1 }}>
              {profile.display_name && (
                <h2 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '1.5rem',
                  fontWeight: '600'
                }}>
                  {profile.display_name}
                </h2>
              )}
              
              {profile.bio && (
                <p style={{ 
                  margin: '0 0 16px 0', 
                  fontSize: '1rem',
                  opacity: 0.9,
                  lineHeight: 1.5
                }}>
                  {profile.bio}
                </p>
              )}

              {/* Stats */}
              <div style={{ 
                display: 'flex', 
                gap: '24px',
                marginBottom: '16px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                    {profile.trip_count}
                  </div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                    Reisen
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                    {profile.follower_count}
                  </div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                    Follower
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                    {profile.following_count}
                  </div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                    Folgt
                  </div>
                </div>
              </div>

              {/* Location & Website */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {profile.location && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    fontSize: '0.875rem',
                    opacity: 0.8
                  }}>
                    <MapPin size={14} />
                    {profile.location}
                  </div>
                )}
                {profile.website && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    fontSize: '0.875rem',
                    opacity: 0.8
                  }}>
                    <Link size={14} />
                    <a 
                      href={profile.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: 'white', textDecoration: 'underline' }}
                    >
                      {profile.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {!isOwnProfile && (
                <button
                  onClick={handleFollowAction}
                  disabled={followLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    background: followStatus === FollowStatus.ACCEPTED ? 
                      'rgba(255, 255, 255, 0.2)' : 'white',
                    color: followStatus === FollowStatus.ACCEPTED ? 'white' : '#3b82f6',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: followLoading ? 'not-allowed' : 'pointer',
                    opacity: followLoading ? 0.6 : 1
                  }}
                >
                  {getFollowButtonIcon()}
                  {getFollowButtonText()}
                </button>
              )}
              
              <button
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  color: 'white',
                  cursor: 'pointer'
                }}
                title="Teilen"
              >
                <Share size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '24px',
          borderBottom: '2px solid #e5e7eb',
          marginBottom: '32px'
        }}>
          {['trips', 'activity', 'about'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                padding: '12px 0',
                background: 'none',
                border: 'none',
                fontSize: '1rem',
                fontWeight: '600',
                color: activeTab === tab ? '#3b82f6' : '#6b7280',
                borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {tab === 'trips' && 'Reisen'}
              {tab === 'activity' && 'Aktivitäten'}
              {tab === 'about' && 'Über mich'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'trips' && (
          <div>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '1.25rem', fontWeight: '600' }}>
              Öffentliche Reisen
            </h3>
            
            {userTrips.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <Globe size={48} style={{ color: '#9ca3af', margin: '0 auto 16px' }} />
                <h3 style={{ margin: '0 0 8px 0', color: '#6b7280' }}>
                  Keine öffentlichen Reisen
                </h3>
                <p style={{ margin: 0, color: '#9ca3af' }}>
                  {isOwnProfile ? 'Du' : `@${profile.nickname}`} hat noch keine öffentlichen Reisen geteilt.
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '24px'
              }}>
                {userTrips.map(trip => (
                  <div
                    key={trip.id}
                    onClick={() => handleTripClick(trip.id)}
                    style={{
                      background: 'white',
                      borderRadius: '12px',
                      padding: '20px',
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1.125rem', fontWeight: '600' }}>
                      {trip.name}
                    </h4>
                    {trip.description && (
                      <p style={{ margin: '0 0 12px 0', color: '#6b7280', fontSize: '0.875rem' }}>
                        {trip.description}
                      </p>
                    )}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      fontSize: '0.75rem',
                      color: '#9ca3af'
                    }}>
                      <span>{formatDate(trip.startDate)} - {formatDate(trip.endDate)}</span>
                      <span>{trip.destinations?.length || 0} Ziele</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '1.25rem', fontWeight: '600' }}>
              Aktivitäten
            </h3>
            
            {activities.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <Calendar size={48} style={{ color: '#9ca3af', margin: '0 auto 16px' }} />
                <h3 style={{ margin: '0 0 8px 0', color: '#6b7280' }}>
                  Keine Aktivitäten
                </h3>
                <p style={{ margin: 0, color: '#9ca3af' }}>
                  {isOwnProfile ? 'Du hast' : `@${profile.nickname} hat`} noch keine Aktivitäten.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {activities.map(activity => (
                  <div
                    key={activity.activity_id}
                    style={{
                      background: 'white',
                      borderRadius: '12px',
                      padding: '20px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem'
                      }}>
                        {activity.activity_type === 'trip_created' && '🧳'}
                        {activity.activity_type === 'destination_visited' && '📍'}
                        {activity.activity_type === 'photo_uploaded' && '📸'}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: '600' }}>
                          {activity.title}
                        </h4>
                        {activity.description && (
                          <p style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '0.875rem' }}>
                            {activity.description}
                          </p>
                        )}
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          {formatDate(activity.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'about' && (
          <div>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '1.25rem', fontWeight: '600' }}>
              Über {isOwnProfile ? 'mich' : `@${profile.nickname}`}
            </h3>
            
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              {profile.bio ? (
                <p style={{ margin: '0 0 20px 0', lineHeight: 1.6 }}>
                  {profile.bio}
                </p>
              ) : (
                <p style={{ margin: '0 0 20px 0', color: '#9ca3af', fontStyle: 'italic' }}>
                  {isOwnProfile ? 'Du hast noch keine Bio hinzugefügt.' : 'Keine Bio verfügbar.'}
                </p>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} style={{ color: '#6b7280' }} />
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Mitglied seit {formatDate(profile.created_at)}
                  </span>
                </div>
                
                {profile.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={16} style={{ color: '#6b7280' }} />
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {profile.location}
                    </span>
                  </div>
                )}
                
                {profile.website && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link size={16} style={{ color: '#6b7280' }} />
                    <a 
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ 
                        fontSize: '0.875rem', 
                        color: '#3b82f6',
                        textDecoration: 'none'
                      }}
                    >
                      {profile.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfileView;