import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, User, Camera, Plane, Clock } from 'lucide-react';
import { socialService } from '../../services/socialService';
import { useAuth } from '../../contexts/AuthContext';
import AvatarUpload from '../User/AvatarUpload';

interface ActivityNotificationsProps {
  compact?: boolean;
}

const ActivityNotifications: React.FC<ActivityNotificationsProps> = ({ compact = false }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await socialService.getActivityNotifications(10);
      setNotifications(data);
    } catch (error) {
      console.error('❌ ActivityNotifications: Error loading notifications:', error);
    } finally {
      setLoading(false);
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

  const getNotificationIcon = (notification: any) => {
    if (notification.type === 'like') {
      return <Heart size={14} style={{ color: 'var(--color-error)', fill: 'var(--color-error)' }} />;
    } else {
      return <MessageCircle size={14} style={{ color: 'var(--color-primary-ocean)' }} />;
    }
  };

  const getActivityTypeIcon = (notification: any) => {
    if (notification.isPhoto) {
      return <Camera size={12} style={{ color: 'var(--color-text-secondary)' }} />;
    } else if (notification.isTrip) {
      return <Plane size={12} style={{ color: 'var(--color-text-secondary)' }} />;
    } else {
      return <User size={12} style={{ color: 'var(--color-text-secondary)' }} />;
    }
  };

  const getNotificationText = (notification: any) => {
    const userName = notification.userName;
    const isLike = notification.type === 'like';
    
    if (notification.isPhoto) {
      return isLike 
        ? `${userName} gefällt dein Foto`
        : `${userName} hat dein Foto kommentiert`;
    } else if (notification.isTrip) {
      return isLike 
        ? `${userName} gefällt deine Reise`
        : `${userName} hat deine Reise kommentiert`;
    } else {
      return isLike 
        ? `${userName} gefällt dein Beitrag`
        : `${userName} hat deinen Beitrag kommentiert`;
    }
  };

  if (!user) {
    return null;
  }

  const displayNotifications = isExpanded ? notifications : notifications.slice(0, 3);

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: compact ? 'var(--space-md)' : 'var(--space-lg)',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-neutral-mist)',
        cursor: 'pointer'
      }}
      onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: compact ? 'var(--text-base)' : 'var(--text-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)'
          }}>
            <Heart size={compact ? 16 : 18} style={{ color: 'var(--color-error)' }} />
            Aktivitäten
          </h3>
          {notifications.length > 0 && (
            <div style={{
              background: 'var(--color-error)',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-weight-semibold)'
            }}>
              {notifications.length > 9 ? '9+' : notifications.length}
            </div>
          )}
        </div>
        <p style={{
          margin: 'var(--space-xs) 0 0 0',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)'
        }}>
          {notifications.length === 0 
            ? 'Keine neuen Aktivitäten'
            : `${notifications.length} neue Aktivität${notifications.length === 1 ? '' : 'en'}`
          }
        </p>
      </div>

      {/* Notifications List */}
      <div style={{
        maxHeight: isExpanded ? '400px' : '200px',
        overflowY: 'auto'
      }}>
        {loading ? (
          <div style={{
            padding: 'var(--space-lg)',
            textAlign: 'center',
            color: 'var(--color-text-secondary)'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderTop: '2px solid var(--color-primary-ocean)',
              borderLeft: '2px solid var(--color-border)',
              borderRight: '2px solid var(--color-border)',
              borderBottom: '2px solid var(--color-border)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto var(--space-sm)'
            }} />
            <p>Lade Aktivitäten...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{
            padding: 'var(--space-lg)',
            textAlign: 'center',
            color: 'var(--color-text-secondary)'
          }}>
            <Heart size={32} style={{ 
              margin: '0 auto var(--space-sm)',
              display: 'block',
              opacity: 0.5
            }} />
            <p>Noch keine Aktivitäten</p>
            <p style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-xs)' }}>
              Deine Likes und Kommentare erscheinen hier
            </p>
          </div>
        ) : (
          <div>
            {displayNotifications.map((notification, index) => (
              <div
                key={notification.id}
                style={{
                  padding: 'var(--space-md)',
                  borderBottom: index < displayNotifications.length - 1 ? '1px solid var(--color-border)' : 'none',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-sm)',
                  transition: 'background-color var(--transition-normal)',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-neutral-mist)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {/* User Avatar */}
                <div style={{ flexShrink: 0 }}>
                  <AvatarUpload
                    currentAvatarUrl={notification.userAvatar}
                    size="small"
                    editable={false}
                  />
                </div>

                {/* Notification Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-xs)',
                    marginBottom: 'var(--space-xs)'
                  }}>
                    <div style={{ flexShrink: 0, paddingTop: '2px' }}>
                      {getNotificationIcon(notification)}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <p style={{
                        margin: 0,
                        fontSize: 'var(--text-sm)',
                        color: 'var(--color-text-primary)',
                        lineHeight: 1.4
                      }}>
                        {getNotificationText(notification)}
                      </p>

                      {/* Comment content if it's a comment notification */}
                      {notification.type === 'comment' && notification.content && (
                        <div style={{
                          marginTop: 'var(--space-xs)',
                          padding: 'var(--space-xs) var(--space-sm)',
                          background: 'var(--color-neutral-mist)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 'var(--text-sm)',
                          color: 'var(--color-text-secondary)',
                          fontStyle: 'italic'
                        }}>
                          "{notification.content}"
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
                          {getActivityTypeIcon(notification)}
                          <span style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-secondary)'
                          }}>
                            {notification.isPhoto ? 'Foto' : notification.isTrip ? 'Reise' : 'Beitrag'}
                          </span>
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-xs)'
                        }}>
                          <Clock size={10} style={{ color: 'var(--color-text-secondary)' }} />
                          <span style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-secondary)'
                          }}>
                            {getTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Show More Button */}
            {!isExpanded && notifications.length > 3 && (
              <div style={{
                padding: 'var(--space-sm)',
                textAlign: 'center',
                borderTop: '1px solid var(--color-border)'
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(true);
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--color-primary-ocean)',
                    color: 'var(--color-primary-ocean)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-xs) var(--space-sm)',
                    fontSize: 'var(--text-xs)',
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
                  {notifications.length - 3} weitere anzeigen
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityNotifications;