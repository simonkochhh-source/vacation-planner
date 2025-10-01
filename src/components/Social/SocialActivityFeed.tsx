import React, { useState, useEffect } from 'react';
import { Users, MapPin, Heart, Plane, Star, User, Clock, Camera, Image, X, Download, Trash2, MessageCircle, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { ActivityFeedItem, ActivityType } from '../../types';
import { socialService } from '../../services/socialService';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import AvatarUpload from '../User/AvatarUpload';
import { formatDate } from '../../utils';
import ModernButton from '../UI/ModernButton';

interface SocialActivityFeedProps {
  maxItems?: number;
  showHeader?: boolean;
  compact?: boolean;
}

const SocialActivityFeed: React.FC<SocialActivityFeedProps> = ({
  maxItems = 10,
  showHeader = true,
  compact = false
}) => {
  const { user } = useAuth();
  const { updateUIState } = useSupabaseApp();
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoActivity, setSelectedPhotoActivity] = useState<ActivityFeedItem | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadActivityFeed();
    }
  }, [user, maxItems]);

  const loadActivityFeed = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load both activity feed and photo shares
      const [feedData, photoShares] = await Promise.all([
        socialService.getActivityFeed(maxItems).catch(() => []),
        socialService.getPhotoShares(maxItems).catch(() => [])
      ]);
      
      // Convert photo shares to activity items
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
          user_liked: photo.user_liked
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
      
      // Combine and sort by creation date
      const allActivities = [...feedData, ...photoActivities]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, maxItems);
      
      setActivities(allActivities);
    } catch (error) {
      console.error('Failed to load activity feed:', error);
      setError('Feed konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  // Filter out destination/planning activities and focus on sharing
  const filteredActivities = activities.filter(activity => {
    const shareableTypes = [
      ActivityType.TRIP_PUBLISHED,
      ActivityType.TRIP_SHARED, 
      ActivityType.TRIP_COMPLETED,
      ActivityType.PHOTO_UPLOADED,
      ActivityType.PHOTO_SHARED,
      ActivityType.USER_FOLLOWED
    ];
    return shareableTypes.includes(activity.activity_type as ActivityType);
  });

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case ActivityType.TRIP_PUBLISHED:
        return <Plane size={16} style={{ color: '#10b981' }} />;
      case ActivityType.TRIP_SHARED:
        return <Users size={16} style={{ color: '#3b82f6' }} />;
      case ActivityType.TRIP_COMPLETED:
        return <Star size={16} style={{ color: '#f59e0b' }} />;
      case ActivityType.PHOTO_UPLOADED:
        return <MapPin size={16} style={{ color: '#ef4444' }} />;
      case ActivityType.PHOTO_SHARED:
        return <Camera size={16} style={{ color: '#06b6d4' }} />;
      case ActivityType.PHOTO_LIKED:
        return <Heart size={16} style={{ color: '#ef4444' }} />;
      case ActivityType.USER_FOLLOWED:
        return <Users size={16} style={{ color: '#8b5cf6' }} />;
      default:
        return <User size={16} style={{ color: 'var(--color-text-secondary)' }} />;
    }
  };

  const getActivityText = (activity: ActivityFeedItem) => {
    const userName = activity.user_nickname || 'Ein Nutzer';
    const tripName = activity.trip_name || activity.related_data?.tripName || 'eine Reise';
    
    switch (activity.activity_type) {
      case ActivityType.TRIP_PUBLISHED:
        return (
          <span>
            <strong>{userName}</strong> hat die Reise <strong>"{tripName}"</strong> öffentlich gemacht
          </span>
        );
      case ActivityType.TRIP_SHARED:
        return (
          <span>
            <strong>{userName}</strong> hat die Reise <strong>"{tripName}"</strong> mit Kontakten geteilt
          </span>
        );
      case ActivityType.TRIP_COMPLETED:
        return (
          <span>
            <strong>{userName}</strong> hat die Reise <strong>"{tripName}"</strong> abgeschlossen
          </span>
        );
      case ActivityType.PHOTO_UPLOADED:
        return (
          <span>
            <strong>{userName}</strong> hat Fotos von <strong>"{tripName}"</strong> hochgeladen
          </span>
        );
      case ActivityType.PHOTO_SHARED:
        const destinationName = activity.destination_name || activity.related_data?.destinationName;
        const location = activity.destination_location || activity.related_data?.location;
        
        if (destinationName) {
          return (
            <span>
              <strong>{userName}</strong> hat ein Foto von <strong>"{destinationName}"</strong>
              {location && ` in ${location}`} geteilt
            </span>
          );
        } else if (tripName) {
          return (
            <span>
              <strong>{userName}</strong> hat ein Foto von der Reise <strong>"{tripName}"</strong> geteilt
            </span>
          );
        } else {
          return (
            <span>
              <strong>{userName}</strong> hat ein Foto geteilt
            </span>
          );
        }
      case ActivityType.PHOTO_LIKED:
        const photoOwner = activity.related_data?.targetUserName;
        return (
          <span>
            <strong>{userName}</strong> gefällt {photoOwner ? `${photoOwner}s` : 'ein'} Foto
          </span>
        );
      case ActivityType.USER_FOLLOWED:
        return (
          <span>
            <strong>{userName}</strong> folgt jetzt <strong>{activity.related_data?.targetUserName}</strong>
          </span>
        );
      default:
        return <span><strong>{userName}</strong> hat eine Aktivität</span>;
    }
  };

  const getTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'gerade eben';
    if (diffInSeconds < 3600) return `vor ${Math.floor(diffInSeconds / 60)} Min`;
    if (diffInSeconds < 86400) return `vor ${Math.floor(diffInSeconds / 3600)} Std`;
    if (diffInSeconds < 604800) return `vor ${Math.floor(diffInSeconds / 86400)} Tagen`;
    return `vor ${Math.floor(diffInSeconds / 604800)} Wochen`;
  };

  const handleActivityClick = (activity: ActivityFeedItem) => {
    // Navigate based on activity type
    if (activity.activity_type === ActivityType.USER_FOLLOWED && activity.user_id) {
      updateUIState({
        currentView: 'user-profile',
        activeView: 'user-profile',
        selectedUserId: activity.user_id
      });
    } else if (activity.activity_type === ActivityType.PHOTO_SHARED || activity.activity_type === ActivityType.PHOTO_LIKED) {
      // For photo activities, navigate to destination or trip
      if (activity.related_data?.destinationId) {
        updateUIState({
          currentView: 'timeline',
          activeView: 'timeline',
          activeDestination: activity.related_data.destinationId
        });
      } else if (activity.related_data?.tripId) {
        updateUIState({
          currentView: 'search',
          activeView: 'search',
          selectedTripId: activity.related_data.tripId,
          showTripDetails: true
        });
      }
    } else if (activity.related_data?.tripId) {
      updateUIState({
        currentView: 'search',
        activeView: 'search',
        selectedTripId: activity.related_data.tripId,
        showTripDetails: true
      });
    } else if (activity.related_data?.destinationId) {
      updateUIState({
        currentView: 'timeline',
        activeView: 'timeline',
        activeDestination: activity.related_data.destinationId
      });
    }
  };

  const handleUserClick = (userId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    updateUIState({
      currentView: 'user-profile',
      activeView: 'user-profile',
      selectedUserId: userId
    });
  };

  const handlePhotoClick = async (activity: ActivityFeedItem, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedPhotoActivity(activity);
    setCurrentPhotoIndex(0); // Reset to first photo
    
    // Load photo share data if available
    if (activity.metadata?.photo_share_id) {
      setIsLiked(activity.metadata.user_liked || false);
      setLikeCount(activity.metadata.like_count || 0);
      setComments([]);
    }
  };

  const handleLikePhoto = async () => {
    if (!selectedPhotoActivity?.metadata?.photo_share_id) return;

    try {
      if (isLiked) {
        await socialService.unlikePhoto(selectedPhotoActivity.metadata.photo_share_id);
        setIsLiked(false);
        setLikeCount(prev => prev - 1);
      } else {
        await socialService.likePhoto(selectedPhotoActivity.metadata.photo_share_id);
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
      }
      
      // Update the activity in the list
      setActivities(prev => prev.map(activity => 
        activity.id === selectedPhotoActivity.id 
          ? { 
              ...activity, 
              metadata: { 
                ...activity.metadata, 
                user_liked: !isLiked,
                like_count: isLiked ? (activity.metadata?.like_count || 1) - 1 : (activity.metadata?.like_count || 0) + 1
              }
            }
          : activity
      ));
    } catch (error) {
      console.error('Error toggling like:', error);
      alert('Fehler beim Liken des Fotos');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedPhotoActivity?.metadata?.photo_share_id) return;

    try {
      // Note: This would require a comments table and service method
      alert('Kommentar-Funktion wird in Kürze verfügbar sein!');
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Fehler beim Hinzufügen des Kommentars');
    }
  };

  const closePhotoModal = () => {
    setSelectedPhotoActivity(null);
    setCurrentPhotoIndex(0);
    setIsLiked(false);
    setLikeCount(0);
    setNewComment('');
    setComments([]);
  };

  const nextPhoto = () => {
    if (selectedPhotoActivity?.metadata?.photos) {
      setCurrentPhotoIndex(prev => (prev + 1) % selectedPhotoActivity.metadata.photos.length);
    }
  };

  const prevPhoto = () => {
    if (selectedPhotoActivity?.metadata?.photos) {
      setCurrentPhotoIndex(prev => 
        (prev - 1 + selectedPhotoActivity.metadata.photos.length) % selectedPhotoActivity.metadata.photos.length
      );
    }
  };

  if (!user) {
    return (
      <div style={{
        padding: compact ? 'var(--space-md)' : 'var(--space-lg)',
        textAlign: 'center',
        color: 'var(--color-text-secondary)',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)'
      }}>
        <Users size={32} style={{ 
          margin: '0 auto var(--space-md)',
          display: 'block',
          opacity: 0.5
        }} />
        <p>Melde dich an, um Aktivitäten von anderen Nutzern zu sehen</p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
      overflow: 'hidden'
    }}>
      {showHeader && (
        <div style={{
          padding: compact ? 'var(--space-md)' : 'var(--space-lg)',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-neutral-mist)'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: compact ? 'var(--text-lg)' : 'var(--text-xl)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)'
          }}>
            <Users size={compact ? 18 : 20} style={{ color: 'var(--color-primary-ocean)' }} />
            Geteilte Reisen
          </h3>
          <p style={{
            margin: 'var(--space-xs) 0 0 0',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)'
          }}>
            Entdecke veröffentlichte Reisen aus deinem Netzwerk
          </p>
        </div>
      )}

      <div style={{
        maxHeight: compact ? '400px' : '600px',
        overflowY: 'auto'
      }}>
        {loading ? (
          <div style={{
            padding: compact ? 'var(--space-lg)' : 'var(--space-2xl)',
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
            <p>Lade Aktivitäten...</p>
          </div>
        ) : error ? (
          <div style={{
            padding: compact ? 'var(--space-lg)' : 'var(--space-2xl)',
            textAlign: 'center',
            color: 'var(--color-error)'
          }}>
            <p>{error}</p>
            <button
              onClick={loadActivityFeed}
              style={{
                background: 'var(--color-primary-ocean)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-sm) var(--space-md)',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                marginTop: 'var(--space-sm)'
              }}
            >
              Erneut versuchen
            </button>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div style={{
            padding: compact ? 'var(--space-lg)' : 'var(--space-2xl)',
            textAlign: 'center',
            color: 'var(--color-text-secondary)'
          }}>
            <Heart size={32} style={{ 
              margin: '0 auto var(--space-md)',
              display: 'block',
              opacity: 0.5
            }} />
            <p>Noch keine geteilten Reisen verfügbar</p>
            <p style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-xs)' }}>
              Folge anderen Nutzern, um ihre veröffentlichten Reisen zu sehen
            </p>
          </div>
        ) : (
          <div>
            {filteredActivities.map((activity, index) => (
              <div
                key={`${activity.id}-${index}`}
                onClick={() => handleActivityClick(activity)}
                style={{
                  padding: compact ? 'var(--space-md)' : 'var(--space-lg)',
                  borderBottom: index < activities.length - 1 ? '1px solid var(--color-border)' : 'none',
                  cursor: 'pointer',
                  transition: 'background-color var(--transition-normal)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-md)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-neutral-mist)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {/* User Avatar */}
                <div 
                  style={{ flexShrink: 0, cursor: 'pointer' }}
                  onClick={(e) => handleUserClick(activity.user_id, e)}
                >
                  <AvatarUpload
                    currentAvatarUrl={activity.user_avatar_url}
                    size={compact ? "small" : "medium"}
                    editable={false}
                  />
                </div>

                {/* Activity Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-sm)',
                    marginBottom: 'var(--space-xs)'
                  }}>
                    <div style={{ flexShrink: 0, paddingTop: '2px' }}>
                      {getActivityIcon(activity.activity_type)}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <p style={{
                        margin: 0,
                        fontSize: compact ? 'var(--text-sm)' : 'var(--text-base)',
                        color: 'var(--color-text-primary)',
                        lineHeight: 1.4
                      }}>
                        {getActivityText(activity)}
                      </p>

                      {/* Photo Preview for Photo Activities */}
                      {(activity.activity_type === ActivityType.PHOTO_SHARED || activity.activity_type === ActivityType.PHOTO_LIKED) && 
                       activity.metadata?.photo_url && (
                        <div style={{
                          marginTop: 'var(--space-md)',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid var(--color-border)'
                        }}>
                          <img
                            src={activity.metadata.photo_url}
                            alt="Geteiltes Foto"
                            onClick={(e) => handlePhotoClick(activity, e)}
                            style={{
                              width: '100%',
                              maxWidth: compact ? '300px' : '500px',
                              height: 'auto',
                              maxHeight: compact ? '150px' : '250px',
                              objectFit: 'contain',
                              cursor: 'pointer',
                              transition: 'opacity var(--transition-normal)',
                              borderRadius: '8px',
                              display: 'block'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = '0.8';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = '1';
                            }}
                          />
                          {(activity.metadata?.caption || activity.destination_location || activity.related_data?.location) && (
                            <div style={{
                              padding: 'var(--space-sm)',
                              background: 'var(--color-bg-secondary)',
                              fontSize: 'var(--text-sm)',
                              color: 'var(--color-text-primary)'
                            }}>
                              {activity.metadata?.caption && (
                                <div style={{ marginBottom: activity.destination_location || activity.related_data?.location ? 'var(--space-xs)' : 0 }}>
                                  {activity.metadata.caption}
                                </div>
                              )}
                              {(activity.destination_location || activity.related_data?.location) && (
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 'var(--space-xs)',
                                  fontSize: 'var(--text-xs)',
                                  color: 'var(--color-text-secondary)'
                                }}>
                                  <MapPin size={12} />
                                  <span>{activity.destination_location || activity.related_data?.location}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                        marginTop: 'var(--space-xs)'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-xs)'
                        }}>
                          <Clock size={12} style={{ color: 'var(--color-text-secondary)' }} />
                          <span style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-secondary)'
                          }}>
                            {getTimeAgo(activity.created_at)}
                          </span>
                        </div>
                        
                        {/* Activity metadata */}
                        {(activity.related_data?.location || activity.destination_location) && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-xs)'
                          }}>
                            <MapPin size={12} style={{ color: 'var(--color-text-secondary)' }} />
                            <span style={{
                              fontSize: 'var(--text-xs)',
                              color: 'var(--color-text-secondary)'
                            }}>
                              {activity.related_data?.location || activity.destination_location}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Load More Button */}
      {activities.length >= maxItems && !loading && (
        <div style={{
          padding: 'var(--space-md)',
          borderTop: '1px solid var(--color-border)',
          textAlign: 'center'
        }}>
          <button
            onClick={() => loadActivityFeed()}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-primary-ocean)',
              color: 'var(--color-primary-ocean)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-sm) var(--space-md)',
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
              transition: 'all var(--transition-normal)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-ocean)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--color-primary-ocean)';
            }}
          >
            Mehr anzeigen
          </button>
        </div>
      )}

      {/* Photo Detail Modal */}
      {selectedPhotoActivity && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-lg)'
        }}>
          <div style={{
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Close Button */}
            <ModernButton
              variant="text"
              size="sm"
              onClick={closePhotoModal}
              style={{
                position: 'absolute',
                top: '-50px',
                right: 0,
                color: 'white',
                zIndex: 1001
              }}
              leftIcon={<X size={20} />}
            >
              Schließen
            </ModernButton>

            {/* Image Carousel */}
            <div style={{ position: 'relative' }}>
              <img
                src={
                  selectedPhotoActivity.metadata?.photos && selectedPhotoActivity.metadata.photos.length > 0
                    ? selectedPhotoActivity.metadata.photos[currentPhotoIndex]?.url
                    : selectedPhotoActivity.metadata?.photo_url
                }
                alt={selectedPhotoActivity.metadata?.caption || 'Geteiltes Foto'}
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: 'var(--radius-md)'
                }}
              />

              {/* Navigation arrows for multi-photo */}
              {selectedPhotoActivity.metadata?.photos && selectedPhotoActivity.metadata.photos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    style={{
                      position: 'absolute',
                      left: 'var(--space-md)',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(0, 0, 0, 0.7)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '48px',
                      height: '48px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'white',
                      transition: 'all var(--transition-normal)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
                    }}
                  >
                    <ChevronLeft size={24} />
                  </button>
                  
                  <button
                    onClick={nextPhoto}
                    style={{
                      position: 'absolute',
                      right: 'var(--space-md)',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(0, 0, 0, 0.7)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '48px',
                      height: '48px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'white',
                      transition: 'all var(--transition-normal)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
                    }}
                  >
                    <ChevronRight size={24} />
                  </button>

                  {/* Photo counter */}
                  <div style={{
                    position: 'absolute',
                    top: 'var(--space-md)',
                    right: 'var(--space-md)',
                    background: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    padding: 'var(--space-xs) var(--space-sm)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-weight-medium)'
                  }}>
                    {currentPhotoIndex + 1} / {selectedPhotoActivity.metadata.photos.length}
                  </div>
                </>
              )}
            </div>

            {/* Photo Info */}
            <div style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-lg)',
              marginTop: 'var(--space-md)',
              maxWidth: '500px'
            }}>
              <h3 style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                margin: 0,
                marginBottom: 'var(--space-md)',
                color: 'var(--color-text-primary)'
              }}>
                {selectedPhotoActivity.metadata?.caption || 'Geteiltes Foto'}
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: 'var(--space-sm) var(--space-md)',
                fontSize: 'var(--text-sm)',
                marginBottom: 'var(--space-lg)'
              }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Von:</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{selectedPhotoActivity.user_nickname}</span>
                
                {selectedPhotoActivity.destination_name && (
                  <>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Ziel:</span>
                    <span style={{ color: 'var(--color-text-primary)' }}>{selectedPhotoActivity.destination_name}</span>
                  </>
                )}
                
                {(selectedPhotoActivity.destination_location || selectedPhotoActivity.related_data?.location) && (
                  <>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Ort:</span>
                    <span style={{ color: 'var(--color-text-primary)' }}>
                      {selectedPhotoActivity.destination_location || selectedPhotoActivity.related_data?.location}
                    </span>
                  </>
                )}
                
                <span style={{ color: 'var(--color-text-secondary)' }}>Geteilt:</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{formatDate(selectedPhotoActivity.created_at)}</span>
              </div>

              {/* Prominent Location Display */}
              {(selectedPhotoActivity.destination_location || selectedPhotoActivity.related_data?.location) && (
                <div style={{
                  background: 'var(--color-neutral-mist)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-md)',
                  marginBottom: 'var(--space-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)'
                }}>
                  <MapPin size={20} style={{ color: 'var(--color-primary-ocean)' }} />
                  <div>
                    <div style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      marginBottom: '2px'
                    }}>
                      📍 Aufgenommen in
                    </div>
                    <div style={{
                      fontSize: 'var(--text-base)',
                      color: 'var(--color-text-primary)',
                      fontWeight: 'var(--font-weight-semibold)'
                    }}>
                      {selectedPhotoActivity.destination_location || selectedPhotoActivity.related_data?.location}
                    </div>
                  </div>
                </div>
              )}

              {/* Photo Reactions Section */}
              <div style={{
                borderTop: '1px solid var(--color-border)',
                paddingTop: 'var(--space-lg)',
                marginBottom: 'var(--space-lg)'
              }}>
                {/* Like and Comment Buttons */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-lg)',
                  marginBottom: 'var(--space-md)'
                }}>
                  <ModernButton
                    variant="text"
                    size="sm"
                    onClick={handleLikePhoto}
                    leftIcon={
                      <Heart 
                        size={20} 
                        style={{ 
                          color: isLiked ? 'var(--color-error)' : 'var(--color-text-secondary)',
                          fill: isLiked ? 'var(--color-error)' : 'none'
                        }} 
                      />
                    }
                    style={{
                      color: isLiked ? 'var(--color-error)' : 'var(--color-text-secondary)',
                      fontWeight: isLiked ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)'
                    }}
                  >
                    {likeCount > 0 ? `${likeCount} Like${likeCount === 1 ? '' : 's'}` : 'Like'}
                  </ModernButton>

                  <ModernButton
                    variant="text"
                    size="sm"
                    leftIcon={<MessageCircle size={20} />}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {comments.length > 0 ? `${comments.length} Kommentar${comments.length === 1 ? '' : 'e'}` : 'Kommentieren'}
                  </ModernButton>
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
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddComment();
                      }
                    }}
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
                  <ModernButton
                    variant="text"
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    leftIcon={<ArrowUp size={16} />}
                    style={{
                      minWidth: 'auto',
                      padding: 'var(--space-sm)',
                      color: newComment.trim() ? 'var(--color-primary-ocean)' : 'var(--color-text-secondary)'
                    }}
                  >
                    Senden
                  </ModernButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialActivityFeed;