import React, { useState, useEffect } from 'react';
import { useResponsive } from '../../hooks/useResponsive';
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
  TrendingUp,
  Trash2,
  X,
  MessageCircle,
  Search,
  Menu,
  ChevronRight,
  Target,
  CheckCircle,
  Clock,
  Heart,
  ArrowUp
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTripContext } from '../../contexts/TripContext';
import { useUIContext } from '../../contexts/UIContext';
import { socialService } from '../../services/socialService';
import { SocialUserProfile, Trip, TripPrivacy, ActivityFeedItem, ActivityType, TripStatus } from '../../types';
import AvatarUpload from '../User/AvatarUpload';
import { formatDate } from '../../utils';

const MyProfileView: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { updateUIState, settings } = useUIContext();
  const { trips } = useTripContext();
  const { isMobile } = useResponsive();
  const [socialProfile, setSocialProfile] = useState<SocialUserProfile | null>(null);
  const [friends, setFriends] = useState<SocialUserProfile[]>([]);
  const [myActivities, setMyActivities] = useState<ActivityFeedItem[]>([]);
  const [myPosts, setMyPosts] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [friendsSearchQuery, setFriendsSearchQuery] = useState('');
  
  // Activity interactions state
  const [activityLikes, setActivityLikes] = useState<Map<string, { isLiked: boolean; count: number }>>(new Map());
  const [activityComments, setActivityComments] = useState<Map<string, any[]>>(new Map());
  const [newActivityComments, setNewActivityComments] = useState<Map<string, string>>(new Map());

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
      
      // Load friends
      const friendsList = await socialService.getFriends();
      setFriends(friendsList);
      
      // Load my activities
      const activities = await socialService.getUserActivities(user.id, 20);
      setMyActivities(activities);
      
      // Load my posts (photo shares and other posts) - chronological
      try {
        // Load photo shares
        const photoShares = await socialService.getUserPhotoShares(user.id, 50);
        
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
        const allPosts = [...photoActivities, ...activities]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        setMyPosts(allPosts);
        
        // Load likes and comments for all posts
        await loadPostInteractions(allPosts);
      } catch (error) {
        console.error('Failed to load user posts:', error);
        setMyPosts([]);
      }
      
    } catch (error) {
      console.error('Failed to load profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPostInteractions = async (posts: ActivityFeedItem[]) => {
    if (!user || posts.length === 0) return;

    try {
      const activityIds = posts.map(post => post.id).filter(Boolean) as string[];
      
      if (activityIds.length > 0) {
        // Load likes
        const likes = await socialService.getActivityLikes(activityIds);
        const likesMap = new Map();
        likes.forEach(like => {
          likesMap.set(like.activity_id, {
            isLiked: like.user_liked,
            count: like.like_count
          });
        });
        setActivityLikes(likesMap);

        // Load comments
        const comments = await socialService.getActivityComments(activityIds);
        const commentsMap = new Map();
        activityIds.forEach(id => {
          commentsMap.set(id, comments.filter(comment => comment.activity_id === id));
        });
        setActivityComments(commentsMap);
      }
    } catch (error) {
      console.error('Failed to load post interactions:', error);
    }
  };

  const handleLikeActivity = async (activity: ActivityFeedItem) => {
    if (!activity.id) return;

    try {
      const currentData = activityLikes.get(activity.id) || { isLiked: false, count: 0 };
      const newIsLiked = !currentData.isLiked;
      const newCount = newIsLiked ? currentData.count + 1 : Math.max(0, currentData.count - 1);

      // Optimistic update
      setActivityLikes(prev => new Map(prev.set(activity.id!, {
        isLiked: newIsLiked,
        count: newCount
      })));

      // Call API
      if (newIsLiked) {
        await socialService.likeActivity(activity.id);
      } else {
        await socialService.unlikeActivity(activity.id);
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      // Revert optimistic update on error
      const currentData = activityLikes.get(activity.id!) || { isLiked: false, count: 0 };
      setActivityLikes(prev => new Map(prev.set(activity.id!, {
        isLiked: !currentData.isLiked,
        count: currentData.isLiked ? currentData.count - 1 : currentData.count + 1
      })));
    }
  };

  const handleAddActivityComment = async (activity: ActivityFeedItem) => {
    if (!activity.id) return;

    const commentText = newActivityComments.get(activity.id) || '';
    if (!commentText.trim()) return;

    try {
      const newComment = await socialService.addActivityComment(activity.id, commentText.trim());
      
      // Add to local state
      setActivityComments(prev => {
        const current = prev.get(activity.id!) || [];
        return new Map(prev.set(activity.id!, [...current, newComment]));
      });

      // Clear input
      setNewActivityComments(prev => new Map(prev.set(activity.id!, '')));
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleEditProfile = () => {
    updateUIState({ currentView: 'settings' });
  };

  const handleDeletePost = async (post: ActivityFeedItem) => {
    if (!user) return;
    
    try {
      setDeleting(post.activity_id);
      
      // Only delete photo shares for now, as other activities might be system-generated
      if (post.activity_type === ActivityType.PHOTO_SHARED && post.metadata?.photo_share_id) {
        await socialService.deletePhotoShare(post.metadata.photo_share_id);
        
        // Remove from local state
        setMyPosts(prev => prev.filter(p => p.activity_id !== post.activity_id));
        setMyActivities(prev => prev.filter(a => a.activity_id !== post.activity_id));
        
        // Close confirmation modal
        setDeleteConfirm(null);
      }
      
    } catch (error) {
      console.error('Failed to delete post:', error);
      // Could add toast notification here
    } finally {
      setDeleting(null);
    }
  };

  const confirmDelete = (post: ActivityFeedItem) => {
    setDeleteConfirm(post.activity_id);
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
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

  const getPlannedTrips = () => {
    return trips.filter(trip => trip.status === TripStatus.PLANNING);
  };

  const getActiveTrips = () => {
    return trips.filter(trip => trip.status === TripStatus.ACTIVE);
  };

  const getCompletedTrips = () => {
    return trips.filter(trip => trip.status === TripStatus.COMPLETED);
  };

  const getTripStatusIcon = (status: TripStatus) => {
    switch (status) {
      case TripStatus.PLANNING:
        return <Target size={14} style={{ color: 'var(--color-primary-ocean)' }} />;
      case TripStatus.ACTIVE:
        return <Clock size={14} style={{ color: 'var(--color-warning)' }} />;
      case TripStatus.COMPLETED:
        return <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />;
      default:
        return <Target size={14} style={{ color: 'var(--color-text-secondary)' }} />;
    }
  };

  const handleChatWithFriend = async (friend: SocialUserProfile) => {
    try {
      const roomId = await socialService.createFriendChatRoom(friend.id);
      console.log('Navigate to chat room:', roomId, 'with friend:', friend.nickname);
      // TODO: Integrate with chat interface
    } catch (error) {
      console.error('Failed to create chat with friend:', error);
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.nickname.toLowerCase().includes(friendsSearchQuery.toLowerCase()) ||
    friend.display_name?.toLowerCase().includes(friendsSearchQuery.toLowerCase())
  );


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
          borderTop: '3px solid var(--color-primary-ocean)',
          borderLeft: '3px solid var(--color-border)',
          borderRight: '3px solid var(--color-border)',
          borderBottom: '3px solid var(--color-border)',
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
    <div className="app-container" style={{ 
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      // iPhone safe area support
      paddingLeft: isMobile ? 'env(safe-area-inset-left)' : '0',
      paddingRight: isMobile ? 'env(safe-area-inset-right)' : '0',
      paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : '0'
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: isMobile ? 'var(--space-md)' : 'var(--space-lg)',
        flexShrink: 0
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {/* Mobile Menu Button */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 'var(--space-sm)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Menu size={24} />
            </button>
          )}

          {/* Avatar */}
          <div style={{ flexShrink: 0 }}>
            <AvatarUpload
              currentAvatarUrl={userProfile.avatar_url}
              size={isMobile ? "medium" : "large"}
              editable={false}
            />
          </div>

          {/* Profile Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              marginBottom: 'var(--space-xs)'
            }}>
              <h1 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: isMobile ? 'var(--text-lg)' : 'var(--text-xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-text-primary)',
                margin: 0
              }}>
                @{userProfile.nickname || 'user'}
              </h1>
            </div>

            {userProfile.display_name && (
              <p style={{
                fontSize: isMobile ? 'var(--text-sm)' : 'var(--text-base)',
                color: 'var(--color-text-primary)',
                margin: '0 0 var(--space-xs) 0',
                fontWeight: 'var(--font-weight-medium)'
              }}>
                {userProfile.display_name}
              </p>
            )}

            {socialProfile?.bio && (
              <p style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
                margin: 0,
                lineHeight: 1.4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: isMobile ? 'nowrap' : 'normal'
              }}>
                {socialProfile.bio}
              </p>
            )}
          </div>

          {/* Edit Button */}
          <button
            onClick={handleEditProfile}
            style={{
              background: 'var(--color-primary-ocean)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: isMobile ? 'var(--space-sm) var(--space-md)' : 'var(--space-sm) var(--space-lg)',
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-xs)',
              transition: 'background var(--transition-normal)',
              flexShrink: 0,
              // iOS Safari optimizations
              WebkitTapHighlightColor: 'transparent',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none'
            }}
            onMouseEnter={(e) => {
              if (!isMobile) {
                e.currentTarget.style.background = 'var(--color-secondary-forest)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isMobile) {
                e.currentTarget.style.background = 'var(--color-primary-ocean)';
              }
            }}
          >
            <Edit3 size={16} />
            {!isMobile && 'Bearbeiten'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%'
      }}>
        {/* Sidebar */}
        <div style={{
          width: isMobile ? (sidebarOpen ? '280px' : '0') : '300px',
          transition: 'width 0.3s ease',
          overflow: 'hidden',
          borderRight: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          display: 'flex',
          flexDirection: 'column',
          position: isMobile ? 'fixed' : 'relative',
          top: isMobile ? '0' : 'auto',
          left: isMobile ? '0' : 'auto',
          height: isMobile ? '100vh' : 'auto',
          zIndex: isMobile ? 1000 : 'auto',
          paddingTop: isMobile ? '80px' : '0' // Account for fixed header on mobile
        }}>
          {/* Friends Section */}
          <div style={{
            padding: 'var(--space-lg)',
            borderBottom: '1px solid var(--color-border)',
            flex: '0 0 auto'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              marginBottom: 'var(--space-md)'
            }}>
              <Users size={18} style={{ color: 'var(--color-primary-ocean)' }} />
              <h3 style={{
                margin: 0,
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)'
              }}>
                Freunde ({friends.length})
              </h3>
            </div>

            {/* Search Friends */}
            {friends.length > 0 && (
              <div style={{ position: 'relative', marginBottom: 'var(--space-md)' }}>
                <Search 
                  size={14} 
                  style={{
                    position: 'absolute',
                    left: 'var(--space-sm)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-secondary)'
                  }}
                />
                <input
                  type="text"
                  placeholder="Suchen..."
                  value={friendsSearchQuery}
                  onChange={(e) => setFriendsSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 'var(--space-sm) var(--space-sm) var(--space-sm) var(--space-xl)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-sm)',
                    background: 'var(--color-surface)',
                    outline: 'none'
                  }}
                />
              </div>
            )}

            {/* Friends List */}
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {filteredFriends.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: 'var(--space-lg)',
                  color: 'var(--color-text-secondary)'
                }}>
                  {friends.length === 0 ? (
                    <>
                      <Users size={24} style={{ margin: '0 auto var(--space-sm)', display: 'block', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>Noch keine Freunde</p>
                    </>
                  ) : (
                    <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>Keine Treffer</p>
                  )}
                </div>
              ) : (
                filteredFriends.slice(0, 5).map((friend) => (
                  <div
                    key={friend.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-sm)',
                      padding: 'var(--space-sm)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: 'var(--space-xs)',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-neutral-mist)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      {friend.avatar_url ? (
                        <img
                          src={friend.avatar_url}
                          alt={friend.nickname}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          background: 'var(--color-primary-ocean)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: 'var(--text-sm)',
                          fontWeight: 'bold'
                        }}>
                          {friend.nickname.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Friend Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: 0,
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--font-weight-medium)',
                        color: 'var(--color-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {friend.display_name || friend.nickname}
                      </p>
                    </div>

                    {/* Chat Button */}
                    <button
                      onClick={() => handleChatWithFriend(friend)}
                      style={{
                        background: 'var(--color-primary-ocean)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease',
                        flexShrink: 0
                      }}
                      title="Chat"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <MessageCircle size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {friends.length > 5 && (
              <button
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-sm)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  marginTop: 'var(--space-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-xs)'
                }}
              >
                Alle Freunde <ChevronRight size={14} />
              </button>
            )}
          </div>

          {/* Trips Section */}
          <div style={{
            padding: 'var(--space-lg)',
            flex: '1 1 auto',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              marginBottom: 'var(--space-md)'
            }}>
              <MapPin size={18} style={{ color: 'var(--color-primary-ocean)' }} />
              <h3 style={{
                margin: 0,
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)'
              }}>
                Reisen ({trips.length})
              </h3>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-md)',
              overflowY: 'auto',
              maxHeight: '300px'
            }}>
              {/* Planned Trips */}
              {getPlannedTrips().length > 0 && (
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-xs)',
                    marginBottom: 'var(--space-sm)'
                  }}>
                    <Target size={14} style={{ color: 'var(--color-primary-ocean)' }} />
                    <span style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text-secondary)'
                    }}>
                      Geplant ({getPlannedTrips().length})
                    </span>
                  </div>
                  {getPlannedTrips().slice(0, 3).map(trip => (
                    <div
                      key={trip.id}
                      style={{
                        padding: 'var(--space-sm)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-neutral-mist)',
                        marginBottom: 'var(--space-xs)',
                        cursor: 'pointer'
                      }}
                    >
                      <p style={{
                        margin: 0,
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--font-weight-medium)',
                        color: 'var(--color-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {trip.name}
                      </p>
                      <p style={{
                        margin: '2px 0 0',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-secondary)'
                      }}>
                        {trip.startDate}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Active Trips */}
              {getActiveTrips().length > 0 && (
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-xs)',
                    marginBottom: 'var(--space-sm)'
                  }}>
                    <Clock size={14} style={{ color: 'var(--color-warning)' }} />
                    <span style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text-secondary)'
                    }}>
                      Aktiv ({getActiveTrips().length})
                    </span>
                  </div>
                  {getActiveTrips().slice(0, 2).map(trip => (
                    <div
                      key={trip.id}
                      style={{
                        padding: 'var(--space-sm)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-warning)',
                        color: 'white',
                        marginBottom: 'var(--space-xs)',
                        cursor: 'pointer'
                      }}
                    >
                      <p style={{
                        margin: 0,
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--font-weight-medium)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {trip.name}
                      </p>
                      <p style={{
                        margin: '2px 0 0',
                        fontSize: 'var(--text-xs)',
                        opacity: 0.9
                      }}>
                        Läuft gerade
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Completed Trips */}
              {getCompletedTrips().length > 0 && (
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-xs)',
                    marginBottom: 'var(--space-sm)'
                  }}>
                    <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />
                    <span style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text-secondary)'
                    }}>
                      Beendet ({getCompletedTrips().length})
                    </span>
                  </div>
                  {getCompletedTrips().slice(0, 2).map(trip => (
                    <div
                      key={trip.id}
                      style={{
                        padding: 'var(--space-sm)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-neutral-mist)',
                        marginBottom: 'var(--space-xs)',
                        cursor: 'pointer',
                        opacity: 0.8
                      }}
                    >
                      <p style={{
                        margin: 0,
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--font-weight-medium)',
                        color: 'var(--color-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {trip.name}
                      </p>
                      <p style={{
                        margin: '2px 0 0',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-secondary)'
                      }}>
                        {trip.endDate}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {trips.length > 7 && (
              <button
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-sm)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  marginTop: 'var(--space-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-xs)'
                }}
              >
                Alle Reisen <ChevronRight size={14} />
              </button>
            )}
          </div>

          {/* Reise-Setup Section */}
          <div style={{
            padding: 'var(--space-lg)',
            borderTop: '1px solid var(--color-border)',
            flex: '0 0 auto'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              marginBottom: 'var(--space-md)'
            }}>
              <Settings size={18} style={{ color: 'var(--color-primary-ocean)' }} />
              <h3 style={{
                margin: 0,
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)'
              }}>
                Reise-Setup
              </h3>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-sm)'
            }}>
              {/* Homepoint */}
              <button
                onClick={() => updateUIState({ currentView: 'settings' })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 'var(--space-sm)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-neutral-mist)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)'
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: settings?.homePoint ? 'var(--color-success)' : 'var(--color-neutral-mist)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <MapPin size={14} style={{ 
                      color: settings?.homePoint ? 'white' : 'var(--color-text-secondary)' 
                    }} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{
                      margin: 0,
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text-primary)'
                    }}>
                      Homepoint
                    </p>
                    <p style={{
                      margin: 0,
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-text-secondary)'
                    }}>
                      {settings?.homePoint ? 
                        `📍 ${settings.homePoint.name}` : 
                        'Nicht gesetzt'
                      }
                    </p>
                  </div>
                </div>
                <ChevronRight size={14} style={{ color: 'var(--color-text-secondary)' }} />
              </button>

              {/* Fahrzeugconfig */}
              <button
                onClick={() => updateUIState({ currentView: 'settings' })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 'var(--space-sm)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-neutral-mist)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)'
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: settings?.fuelConsumption ? 'var(--color-success)' : 'var(--color-neutral-mist)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Activity size={14} style={{ 
                      color: settings?.fuelConsumption ? 'white' : 'var(--color-text-secondary)' 
                    }} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{
                      margin: 0,
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text-primary)'
                    }}>
                      Fahrzeug
                    </p>
                    <p style={{
                      margin: 0,
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-text-secondary)'
                    }}>
                      {settings?.fuelConsumption ? 
                        `🚗 ${settings.fuelConsumption}L/100km` : 
                        'Nicht konfiguriert'
                      }
                    </p>
                  </div>
                </div>
                <ChevronRight size={14} style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Feed Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: isMobile ? 'var(--space-md)' : 'var(--space-lg)',
          background: 'var(--color-background)'
        }}>
          {/* Feed Header */}
          <div style={{
            marginBottom: 'var(--space-lg)'
          }}>
            <h2 style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text-primary)',
              margin: '0 0 var(--space-sm) 0',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)'
            }}>
              <Share size={20} style={{ color: 'var(--color-primary-ocean)' }} />
              Mein Feed
            </h2>
            <p style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-secondary)',
              margin: 0
            }}>
              Deine Posts und Aktivitäten
            </p>
          </div>

          {/* Posts Feed */}
          {myPosts.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: 'var(--space-2xl)',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)'
            }}>
              <Share size={48} style={{ color: 'var(--color-text-secondary)', margin: '0 auto var(--space-md)', display: 'block', opacity: 0.5 }} />
              <h4 style={{ margin: '0 0 var(--space-sm) 0', color: 'var(--color-text-secondary)' }}>
                Noch keine Posts
              </h4>
              <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                Du hast noch keine Fotos oder Reise-Updates geteilt.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              {myPosts.map(post => (
                <div
                  key={`${post.activity_type}-${post.activity_id}`}
                  style={{
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-xl)',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                    <AvatarUpload
                      currentAvatarUrl={post.user_avatar_url}
                      size="medium"
                      editable={false}
                    />
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                          <h4 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                            {post.user_nickname || 'Du'}
                          </h4>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                            {formatDate(post.created_at)}
                          </span>
                        </div>
                        
                        {/* Delete button - only show for photo shares for now */}
                        {post.activity_type === ActivityType.PHOTO_SHARED && (
                          <button
                            onClick={() => confirmDelete(post)}
                            disabled={deleting === post.activity_id}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              padding: 'var(--space-xs)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--color-text-secondary)',
                              cursor: deleting === post.activity_id ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              opacity: deleting === post.activity_id ? 0.5 : 1,
                              transition: 'all var(--transition-normal)'
                            }}
                            onMouseEnter={(e) => {
                              if (deleting !== post.activity_id) {
                                e.currentTarget.style.background = 'var(--color-error)';
                                e.currentTarget.style.color = 'white';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = 'var(--color-text-secondary)';
                            }}
                            title="Post löschen"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      
                      <p style={{ margin: 'var(--space-xs) 0', color: 'var(--color-text-primary)', fontSize: 'var(--text-base)' }}>
                        {post.title}
                      </p>
                      
                      {post.destination_name && (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 'var(--space-xs)',
                          fontSize: 'var(--text-sm)',
                          color: 'var(--color-text-secondary)',
                          marginTop: 'var(--space-xs)'
                        }}>
                          <MapPin size={14} />
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
                      marginBottom: 'var(--space-md)',
                      borderRadius: 'var(--radius-lg)',
                      overflow: 'hidden',
                      border: '1px solid var(--color-border)'
                    }}>
                      <img
                        src={post.metadata.photo_url}
                        alt={post.metadata?.caption || 'Geteiltes Foto'}
                        style={{
                          width: '100%',
                          height: 'auto',
                          maxHeight: '400px',
                          objectFit: 'cover',
                          cursor: 'pointer',
                          display: 'block'
                        }}
                        onClick={() => {
                          // TODO: Open photo modal similar to SocialActivityFeed
                          console.log('Open photo modal for:', post);
                        }}
                      />
                      
                      {post.metadata?.caption && (
                        <div style={{
                          padding: 'var(--space-md)',
                          background: 'var(--color-neutral-mist)',
                          fontSize: 'var(--text-sm)',
                          color: 'var(--color-text-primary)'
                        }}>
                          {post.metadata.caption}
                        </div>
                      )}
                      
                      {post.metadata.photo_count && post.metadata.photo_count > 1 && (
                        <div style={{
                          padding: 'var(--space-sm) var(--space-md)',
                          background: 'var(--color-neutral-mist)',
                          fontSize: 'var(--text-xs)',
                          color: 'var(--color-text-secondary)',
                          borderTop: '1px solid var(--color-border)'
                        }}>
                          📸 {post.metadata.photo_count} Fotos
                        </div>
                      )}
                    </div>
                  )}

                  {/* Like and Comment Interaction Section */}
                  {(() => {
                    if (!post.id) return null;
                    
                    const likeData = activityLikes.get(post.id) || { isLiked: false, count: 0 };
                    const comments = activityComments.get(post.id) || [];
                    const commentText = newActivityComments.get(post.id) || '';

                    return (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-sm)',
                        marginTop: 'var(--space-md)',
                        paddingTop: 'var(--space-sm)',
                        borderTop: '1px solid var(--color-border)'
                      }}>
                        {/* Like and Comment Buttons */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-lg)'
                        }}>
                          {/* Like Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLikeActivity(post);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-xs)',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 'var(--space-xs) var(--space-sm)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: 'var(--text-sm)',
                              color: likeData.isLiked ? 'var(--color-error)' : 'var(--color-text-secondary)',
                              fontWeight: likeData.isLiked ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
                              transition: 'all var(--transition-fast)'
                            }}
                            onMouseEnter={(e) => {
                              if (!likeData.isLiked) {
                                e.currentTarget.style.backgroundColor = 'var(--color-neutral-mist)';
                                e.currentTarget.style.color = 'var(--color-error)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!likeData.isLiked) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = 'var(--color-text-secondary)';
                              }
                            }}
                          >
                            <Heart 
                              size={16} 
                              style={{ 
                                fill: likeData.isLiked ? 'currentColor' : 'none'
                              }} 
                            />
                            <span>{likeData.count > 0 ? `${likeData.count} Like${likeData.count === 1 ? '' : 's'}` : 'Like'}</span>
                          </button>

                          {/* Comment Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Focus comment input
                              const commentInput = e.currentTarget.parentElement?.parentElement?.querySelector('.comment-input') as HTMLInputElement;
                              if (commentInput) {
                                commentInput.focus();
                              }
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-xs)',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 'var(--space-xs) var(--space-sm)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: 'var(--text-sm)',
                              color: 'var(--color-text-secondary)',
                              transition: 'all var(--transition-fast)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--color-neutral-mist)';
                              e.currentTarget.style.color = 'var(--color-primary-ocean)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = 'var(--color-text-secondary)';
                            }}
                          >
                            <MessageCircle size={16} />
                            <span>{comments.length > 0 ? `${comments.length} Kommentar${comments.length === 1 ? '' : 'e'}` : 'Kommentieren'}</span>
                          </button>

                          {/* Trip Info */}
                          {post.trip_name && (
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 'var(--space-xs)',
                              fontSize: 'var(--text-sm)',
                              color: 'var(--color-text-secondary)',
                              marginLeft: 'auto'
                            }}>
                              <Calendar size={14} />
                              {post.trip_name}
                            </div>
                          )}
                        </div>

                        {/* Comment Input */}
                        <div style={{
                          display: 'flex',
                          gap: 'var(--space-sm)',
                          alignItems: 'center'
                        }}>
                          <input
                            type="text"
                            placeholder="Kommentar hinzufügen..."
                            className="comment-input"
                            value={commentText}
                            onChange={(e) => {
                              e.stopPropagation();
                              setNewActivityComments(prev => new Map(prev.set(post.id!, e.target.value)));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.stopPropagation();
                                handleAddActivityComment(post);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              flex: 1,
                              padding: 'var(--space-sm) var(--space-md)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-full)',
                              fontSize: 'var(--text-sm)',
                              fontFamily: 'var(--font-family-system)',
                              background: 'var(--color-surface)',
                              color: 'var(--color-text-primary)'
                            }}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddActivityComment(post);
                            }}
                            disabled={!commentText.trim()}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                              padding: 'var(--space-sm)',
                              borderRadius: 'var(--radius-md)',
                              color: commentText.trim() ? 'var(--color-primary-ocean)' : 'var(--color-text-secondary)',
                              transition: 'all var(--transition-fast)'
                            }}
                          >
                            <ArrowUp size={16} />
                          </button>
                        </div>

                        {/* Show Comments */}
                        {comments.length > 0 && (
                          <div style={{
                            paddingTop: 'var(--space-sm)',
                            borderTop: '1px solid var(--color-border)'
                          }}>
                            {comments.slice(0, 3).map((comment, idx) => (
                              <div key={comment.id || idx} style={{
                                display: 'flex',
                                gap: 'var(--space-sm)',
                                marginBottom: 'var(--space-sm)',
                                fontSize: 'var(--text-sm)'
                              }}>
                                <strong style={{ color: 'var(--color-text-primary)' }}>
                                  {comment.user_nickname || 'User'}:
                                </strong>
                                <span style={{ color: 'var(--color-text-primary)' }}>
                                  {comment.content}
                                </span>
                              </div>
                            ))}
                            {comments.length > 3 && (
                              <div style={{
                                fontSize: 'var(--text-xs)',
                                color: 'var(--color-text-secondary)',
                                marginTop: 'var(--space-xs)'
                              }}>
                                ... und {comments.length - 3} weitere Kommentare
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile Sidebar Overlay */}
        {isMobile && sidebarOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 999
            }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-xl)',
            maxWidth: '400px',
            width: '90%',
            border: '1px solid var(--color-border)',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-lg)'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)'
              }}>
                Post löschen
              </h3>
              <button
                onClick={cancelDelete}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 'var(--space-xs)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <p style={{
              margin: '0 0 var(--space-lg) 0',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5
            }}>
              Möchtest du diesen Post wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            
            <div style={{
              display: 'flex',
              gap: 'var(--space-md)',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={cancelDelete}
                style={{
                  background: 'var(--color-neutral-mist)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-sm) var(--space-lg)',
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-normal)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-border)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--color-neutral-mist)';
                }}
              >
                Abbrechen
              </button>
              
              <button
                onClick={() => {
                  const postToDelete = myPosts.find(p => p.activity_id === deleteConfirm);
                  if (postToDelete) {
                    handleDeletePost(postToDelete);
                  }
                }}
                disabled={deleting === deleteConfirm}
                style={{
                  background: 'var(--color-error)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-sm) var(--space-lg)',
                  fontSize: 'var(--text-sm)',
                  cursor: deleting === deleteConfirm ? 'not-allowed' : 'pointer',
                  opacity: deleting === deleteConfirm ? 0.6 : 1,
                  transition: 'all var(--transition-normal)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-xs)'
                }}
                onMouseEnter={(e) => {
                  if (deleting !== deleteConfirm) {
                    e.currentTarget.style.background = '#dc2626';
                  }
                }}
                onMouseLeave={(e) => {
                  if (deleting !== deleteConfirm) {
                    e.currentTarget.style.background = 'var(--color-error)';
                  }
                }}
              >
                <Trash2 size={16} />
                {deleting === deleteConfirm ? 'Lösche...' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProfileView;