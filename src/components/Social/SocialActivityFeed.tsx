import React, { useState, useEffect } from 'react';
import { Users, MapPin, Calendar, Heart, MessageCircle, Plane, Star, Clock, User } from 'lucide-react';
import { ActivityFeedItem, ActivityType } from '../../types';
import { socialService } from '../../services/socialService';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import AvatarUpload from '../User/AvatarUpload';
import { formatDate } from '../../utils';

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

  useEffect(() => {
    if (user) {
      loadActivityFeed();
    }
  }, [user, maxItems]);

  const loadActivityFeed = async () => {
    try {
      setLoading(true);
      setError(null);
      const feedData = await socialService.getActivityFeed(maxItems);
      setActivities(feedData);
    } catch (error) {
      console.error('Failed to load activity feed:', error);
      setError('Feed konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case ActivityType.TRIP_PLANNED:
        return <Calendar size={16} style={{ color: '#3b82f6' }} />;
      case ActivityType.TRIP_STARTED:
        return <Plane size={16} style={{ color: '#10b981' }} />;
      case ActivityType.TRIP_COMPLETED:
        return <Star size={16} style={{ color: '#f59e0b' }} />;
      case ActivityType.DESTINATION_VISITED:
        return <MapPin size={16} style={{ color: '#ef4444' }} />;
      case ActivityType.DESTINATION_PLANNED:
        return <MapPin size={16} style={{ color: '#6b7280' }} />;
      case ActivityType.USER_FOLLOWED:
        return <Users size={16} style={{ color: '#8b5cf6' }} />;
      default:
        return <User size={16} style={{ color: '#6b7280' }} />;
    }
  };

  const getActivityText = (activity: ActivityFeedItem) => {
    const userName = activity.user_nickname || 'Ein Nutzer';
    
    switch (activity.activity_type) {
      case ActivityType.TRIP_PLANNED:
        return (
          <span>
            <strong>{userName}</strong> plant eine Reise nach <strong>{activity.related_data?.tripName || 'unbekanntes Ziel'}</strong>
          </span>
        );
      case ActivityType.TRIP_STARTED:
        return (
          <span>
            <strong>{userName}</strong> hat die Reise nach <strong>{activity.related_data?.tripName}</strong> begonnen
          </span>
        );
      case ActivityType.TRIP_COMPLETED:
        return (
          <span>
            <strong>{userName}</strong> hat die Reise nach <strong>{activity.related_data?.tripName}</strong> abgeschlossen
          </span>
        );
      case ActivityType.DESTINATION_VISITED:
        return (
          <span>
            <strong>{userName}</strong> war in <strong>{activity.related_data?.destinationName}</strong>
          </span>
        );
      case ActivityType.DESTINATION_PLANNED:
        return (
          <span>
            <strong>{userName}</strong> möchte <strong>{activity.related_data?.destinationName}</strong> besuchen
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
            Community Aktivitäten
          </h3>
          <p style={{
            margin: 'var(--space-xs) 0 0 0',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)'
          }}>
            Entdecke, was deine Community gerade plant und erlebt
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
        ) : activities.length === 0 ? (
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
            <p>Noch keine Aktivitäten verfügbar</p>
            <p style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-xs)' }}>
              Folge anderen Nutzern, um ihre Reiseaktivitäten zu sehen
            </p>
          </div>
        ) : (
          <div>
            {activities.map((activity, index) => (
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
                        {activity.related_data?.location && (
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
                              {activity.related_data.location}
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
    </div>
  );
};

export default SocialActivityFeed;