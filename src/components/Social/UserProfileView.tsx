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
  ActivityType,
  Trip,
  TripPrivacy,
  getSocialTripPermissions
} from '../../types';
import { socialService } from '../../services/socialService';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { formatDate } from '../../utils';
import AvatarUpload from '../User/AvatarUpload';
import SocialActivityFeed from './SocialActivityFeed';

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
  const [userPosts, setUserPosts] = useState<ActivityFeedItem[]>([]);
  const [userTrips, setUserTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  
  const isOwnProfile = currentUser?.id === userId;
  const [activeTab, setActiveTab] = useState<'posts' | 'trips' | 'activity' | 'about'>('trips');

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  useEffect(() => {
    // Set default tab based on profile type
    setActiveTab(isOwnProfile ? 'posts' : 'trips');
  }, [isOwnProfile]);

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

      // Load user posts (photo shares and other posts) - chronological
      if (isOwnProfile || followStatus === FollowStatus.ACCEPTED) {
        try {
          // Load photo shares
          const photoShares = await socialService.getUserPhotoShares(userId, 50);
          
          // Convert photo shares to activity format for posts feed
          const photoActivities: ActivityFeedItem[] = photoShares.map(photo => ({
            id: photo.id,
            activity_id: photo.id,
            user_id: photo.user_id,
            user_nickname: photo.user_nickname,
            user_avatar_url: photo.user_avatar_url,
            activity_type: ActivityType.PHOTO_SHARED,
            title: photo.caption || 'Foto geteilt',
            trip_name: photo.trip_name,
            destination_name: photo.destination_name,
            destination_location: photo.destination_location,
            metadata: {
              photo_url: photo.photo_url,
              photos: photo.photos,
              photo_count: photo.photo_count,
              caption: photo.caption,
              privacy: photo.privacy,
              like_count: photo.like_count,
              user_liked: photo.user_liked,
              photo_share_id: photo.id
            },
            related_data: {
              tripId: photo.trip_id,
              tripName: photo.trip_name,
              destinationId: photo.destination_id,
              destinationName: photo.destination_name,
              location: photo.destination_location
            },
            created_at: photo.created_at
          }));
          
          // Combine with other activities and sort chronologically
          const allPosts = [...photoActivities, ...userActivities]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
          setUserPosts(allPosts);
        } catch (error) {
          console.error('Failed to load user posts:', error);
          setUserPosts([]);
        }
      }

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
      case 'none': return 'Connect';
      case FollowStatus.PENDING: return 'Angefragt';
      case FollowStatus.ACCEPTED: return 'Connected';
      default: return 'Connect';
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
        <h2 style={{ margin: 0, color: 'var(--color-text-secondary)' }}>Nutzer nicht gefunden</h2>
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
          {(isOwnProfile ? ['posts', 'trips', 'activity', 'about'] : ['trips', 'activity', 'about']).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                padding: '12px 0',
                background: 'none',
                border: 'none',
                fontSize: '1rem',
                fontWeight: '600',
                color: activeTab === tab ? '#2563eb' : 'var(--color-text-secondary)',
                borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {tab === 'posts' && 'Meine Posts'}
              {tab === 'trips' && 'Reisen'}
              {tab === 'activity' && 'Aktivitäten'}
              {tab === 'about' && 'Über mich'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'posts' && (
          <div>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '1.25rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              Meine Posts
            </h3>
            
            {userPosts.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <Heart size={48} style={{ color: '#9ca3af', margin: '0 auto 16px' }} />
                <h3 style={{ margin: '0 0 8px 0', color: 'var(--color-text-secondary)' }}>
                  Noch keine Posts
                </h3>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                  Du hast noch keine Fotos oder Reise-Updates geteilt.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {userPosts.map(post => (
                  <div
                    key={`${post.activity_type}-${post.activity_id}`}
                    style={{
                      background: 'white',
                      borderRadius: '12px',
                      padding: '24px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                      <AvatarUpload
                        currentAvatarUrl={post.user_avatar_url}
                        size="small"
                        editable={false}
                      />
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                            {post.user_nickname || 'Du'}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                            {formatDate(post.created_at)}
                          </span>
                        </div>
                        
                        <p style={{ margin: '4px 0', color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>
                          {post.title}
                        </p>
                        
                        {post.destination_name && (
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            fontSize: '0.75rem',
                            color: 'var(--color-text-secondary)',
                            marginTop: '4px'
                          }}>
                            <MapPin size={12} />
                            {post.destination_location ? 
                              `${post.destination_name}, ${post.destination_location}` : 
                              post.destination_name
                            }
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Photo Display for Photo Posts */}
                    {post.activity_type === ActivityType.PHOTO_SHARED && post.metadata?.photo_url && (
                      <div style={{
                        marginBottom: '16px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid var(--color-border)'
                      }}>
                        <img
                          src={post.metadata.photo_url}
                          alt={post.metadata?.caption || 'Geteiltes Foto'}
                          style={{
                            width: '100%',
                            maxWidth: '400px',
                            height: '200px',
                            objectFit: 'cover',
                            cursor: 'pointer',
                            display: 'block',
                            borderRadius: 'var(--radius-md)'
                          }}
                          onClick={() => {
                            // TODO: Open photo modal similar to SocialActivityFeed
                            console.log('Open photo modal for:', post);
                          }}
                        />
                        
                        {post.metadata?.caption && (
                          <div style={{
                            padding: 'var(--space-sm)',
                            background: 'var(--color-bg-secondary)',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--color-text-primary)'
                          }}>
                            {post.metadata.caption}
                          </div>
                        )}
                        
                        {post.metadata.photo_count && post.metadata.photo_count > 1 && (
                          <div style={{
                            padding: 'var(--space-xs) var(--space-sm)',
                            background: 'var(--color-bg-secondary)',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-secondary)',
                            borderTop: '1px solid var(--color-border)'
                          }}>
                            📸 {post.metadata.photo_count} Fotos
                          </div>
                        )}
                      </div>
                    )}

                    {/* Engagement Stats */}
                    {post.metadata?.like_count !== undefined && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-secondary)',
                        borderTop: '1px solid #e5e7eb',
                        paddingTop: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Heart size={12} style={{ color: '#ef4444' }} />
                          {post.metadata.like_count} Like{post.metadata.like_count === 1 ? '' : 's'}
                        </div>
                        
                        {post.trip_name && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} />
                            {post.trip_name}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'trips' && (
          <div>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '1.25rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
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
                <h3 style={{ margin: '0 0 8px 0', color: 'var(--color-text-secondary)' }}>
                  Keine öffentlichen Reisen
                </h3>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
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
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1.125rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                      {trip.name}
                    </h4>
                    {trip.description && (
                      <p style={{ margin: '0 0 12px 0', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                        {trip.description}
                      </p>
                    )}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      fontSize: '0.75rem',
                      color: 'var(--color-text-secondary)'
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
            <h3 style={{ margin: '0 0 24px 0', fontSize: '1.25rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
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
                <h3 style={{ margin: '0 0 8px 0', color: 'var(--color-text-secondary)' }}>
                  Keine Aktivitäten
                </h3>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
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
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                          {activity.title}
                        </h4>
                        {activity.description && (
                          <p style={{ margin: '0 0 8px 0', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                            {activity.description}
                          </p>
                        )}
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
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
            <h3 style={{ margin: '0 0 24px 0', fontSize: '1.25rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
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
                <p style={{ margin: '0 0 20px 0', lineHeight: 1.6, color: 'var(--color-text-primary)' }}>
                  {profile.bio}
                </p>
              ) : (
                <p style={{ margin: '0 0 20px 0', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                  {isOwnProfile ? 'Du hast noch keine Bio hinzugefügt.' : 'Keine Bio verfügbar.'}
                </p>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} style={{ color: 'var(--color-text-secondary)' }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                    Mitglied seit {formatDate(profile.created_at)}
                  </span>
                </div>
                
                {profile.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={16} style={{ color: 'var(--color-text-secondary)' }} />
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                      {profile.location}
                    </span>
                  </div>
                )}
                
                {profile.website && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link size={16} style={{ color: 'var(--color-text-secondary)' }} />
                    <a 
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ 
                        fontSize: '0.875rem', 
                        color: '#2563eb',
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