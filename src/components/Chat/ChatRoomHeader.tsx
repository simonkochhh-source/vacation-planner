import React from 'react';
import { Users, Settings, Phone, Video, MoreHorizontal } from 'lucide-react';
import { ChatRoom } from '../../services/chatService';
import { UserWithStatus } from '../../services/userStatusService';
import UserStatusIndicator from './UserStatusIndicator';

interface ChatRoomHeaderProps {
  room: ChatRoom;
  participants?: UserWithStatus[];
  onSettingsClick?: () => void;
  onCallClick?: () => void;
  onVideoClick?: () => void;
  onMenuClick?: () => void;
  avatarSize?: 'sm' | 'md' | 'lg';
}

const ChatRoomHeader: React.FC<ChatRoomHeaderProps> = ({
  room,
  participants = [],
  onSettingsClick,
  onCallClick,
  onVideoClick,
  onMenuClick,
  avatarSize = 'md'
}) => {
  // Avatar size configuration
  const avatarSizes = {
    sm: { size: 24, className: 'w-6 h-6', iconSize: 'w-3 h-3', textSize: 'text-xs' },
    md: { size: 32, className: 'w-8 h-8', iconSize: 'w-3.5 h-3.5', textSize: 'text-xs' },
    lg: { size: 40, className: 'w-10 h-10', iconSize: 'w-5 h-5', textSize: 'text-sm' }
  };
  
  const currentAvatarSize = avatarSizes[avatarSize];

  const getRoomDisplayName = (): string => {
    if (room.name) {
      return room.name;
    }

    if (room.type === 'direct' && participants.length > 0) {
      const otherParticipant = participants[0];
      return otherParticipant.nickname || otherParticipant.display_name || 'Unbekannter Benutzer';
    }

    switch (room.type) {
      case 'group':
        return 'Gruppenchat';
      case 'trip':
        return 'Reisechat';
      default:
        return 'Chat';
    }
  };

  const getRoomSubtitle = (): string => {
    if (room.type === 'direct' && participants.length > 0) {
      const participant = participants[0];
      if (participant.status === 'online') {
        return 'Online';
      } else if (participant.status === 'away') {
        return 'Abwesend';
      } else if (participant.last_seen_at) {
        return `Zuletzt online ${new Date(participant.last_seen_at).toLocaleDateString('de-DE')}`;
      }
      return 'Offline';
    }

    const onlineCount = participants.filter(p => p.status === 'online').length;
    const totalCount = participants.length;

    if (onlineCount > 0) {
      return `${onlineCount} von ${totalCount} online`;
    }
    
    return `${totalCount} Teilnehmer`;
  };

  const getAvatarUrl = (): string | undefined => {
    if (room.type === 'direct' && participants.length > 0) {
      return participants[0].avatar_url;
    }
    return undefined;
  };

  return (
    <div style={{
      background: 'var(--chat-header-bg, #ffffff)',
      borderBottom: '1px solid var(--chat-border-light, #e5e7eb)',
      padding: '12px 16px'
    }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Avatar or Icon */}
          <div className="relative" style={{ width: `${currentAvatarSize.size}px`, height: `${currentAvatarSize.size}px`, flexShrink: 0 }}>
            {getAvatarUrl() ? (
              <img
                src={getAvatarUrl()}
                alt={getRoomDisplayName()}
                className={`${currentAvatarSize.className} rounded-full object-cover`}
                style={{
                  width: `${currentAvatarSize.size}px`,
                  height: `${currentAvatarSize.size}px`,
                  minWidth: `${currentAvatarSize.size}px`,
                  minHeight: `${currentAvatarSize.size}px`,
                  maxWidth: `${currentAvatarSize.size}px`,
                  maxHeight: `${currentAvatarSize.size}px`
                }}
              />
            ) : (
              <div 
              className={`${currentAvatarSize.className} rounded-full flex items-center justify-center`}
              style={{ 
                backgroundColor: 'var(--color-primary-ocean, #4A90A4)',
                width: `${currentAvatarSize.size}px`,
                height: `${currentAvatarSize.size}px`,
                minWidth: `${currentAvatarSize.size}px`,
                minHeight: `${currentAvatarSize.size}px`,
                maxWidth: `${currentAvatarSize.size}px`,
                maxHeight: `${currentAvatarSize.size}px`
              }}
            >
                {room.type === 'direct' ? (
                  <span 
                    className={`font-semibold ${currentAvatarSize.textSize}`}
                    style={{ color: 'var(--color-surface, #FFFFFF)' }}
                  >
                    {getRoomDisplayName().charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <Users 
                    className={currentAvatarSize.iconSize} 
                    style={{ color: 'var(--color-surface, #FFFFFF)' }}
                  />
                )}
              </div>
            )}
            
            {/* Status indicator for direct messages */}
            {room.type === 'direct' && participants.length > 0 && (
              <div className="absolute -bottom-1 -right-1">
                <UserStatusIndicator 
                  status={participants[0].status} 
                  size="sm"
                  lastSeenAt={participants[0].last_seen_at}
                />
              </div>
            )}
          </div>

          {/* Room Info */}
          <div>
            <h3 style={{
              fontWeight: '600',
              color: 'var(--chat-text-primary, #111827)',
              fontSize: '16px',
              margin: 0
            }}>
              {getRoomDisplayName()}
            </h3>
            <p style={{
              fontSize: '14px',
              color: 'var(--chat-text-secondary, #6b7280)',
              margin: 0
            }}>
              {getRoomSubtitle()}
            </p>
            {room.description && (
              <p style={{
                fontSize: '12px',
                color: 'var(--chat-text-secondary, #9ca3af)',
                marginTop: '4px',
                margin: 0
              }}>
                {room.description}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Call button for direct messages */}
          {room.type === 'direct' && onCallClick && (
            <button
              onClick={onCallClick}
              style={{
                padding: '8px',
                background: 'var(--chat-button-bg, #f3f4f6)',
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--chat-button-text, #6b7280)',
                transition: 'all 0.2s ease-out'
              }}
              aria-label="Anrufen"
              title="Anrufen"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--chat-button-hover-bg, #e5e7eb)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--chat-button-bg, #f3f4f6)';
              }}
            >
              <Phone className="w-5 h-5" />
            </button>
          )}

          {/* Video call button */}
          {onVideoClick && (
            <button
              onClick={onVideoClick}
              style={{
                padding: '8px',
                background: 'var(--chat-button-bg, #f3f4f6)',
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--chat-button-text, #6b7280)',
                transition: 'all 0.2s ease-out'
              }}
              aria-label="Videoanruf"
              title="Videoanruf"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--chat-button-hover-bg, #e5e7eb)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--chat-button-bg, #f3f4f6)';
              }}
            >
              <Video className="w-5 h-5" />
            </button>
          )}

          {/* Settings button */}
          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              style={{
                padding: '8px',
                background: 'var(--chat-button-bg, #f3f4f6)',
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--chat-button-text, #6b7280)',
                transition: 'all 0.2s ease-out'
              }}
              aria-label="Chat-Einstellungen"
              title="Einstellungen"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--chat-button-hover-bg, #e5e7eb)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--chat-button-bg, #f3f4f6)';
              }}
            >
              <Settings className="w-5 h-5" />
            </button>
          )}

          {/* More menu */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              style={{
                padding: '8px',
                background: 'var(--chat-button-bg, #f3f4f6)',
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--chat-button-text, #6b7280)',
                transition: 'all 0.2s ease-out'
              }}
              aria-label="Weitere Optionen"
              title="Mehr"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--chat-button-hover-bg, #e5e7eb)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--chat-button-bg, #f3f4f6)';
              }}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Group participants preview */}
      {room.type !== 'direct' && participants.length > 0 && (
        <div className="mt-3 flex items-center space-x-2">
          <div className="flex -space-x-2">
            {participants.slice(0, 5).map((participant, index) => (
              <div key={participant.id} className="relative">
                {participant.avatar_url ? (
                  <img
                    src={participant.avatar_url}
                    alt={participant.nickname || participant.display_name}
                    className="w-6 h-6 rounded-full border-2 object-cover"
                    style={{ 
                      borderColor: 'var(--color-surface, #FFFFFF)',
                      width: '24px',
                      height: '24px',
                      minWidth: '24px',
                      minHeight: '24px',
                      maxWidth: '24px',
                      maxHeight: '24px'
                    }}
                  />
                ) : (
                  <div 
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                    style={{ 
                      borderColor: 'var(--color-surface, #FFFFFF)',
                      backgroundColor: 'var(--color-neutral-stone, #8B8680)',
                      width: '24px',
                      height: '24px',
                      minWidth: '24px',
                      minHeight: '24px',
                      maxWidth: '24px',
                      maxHeight: '24px'
                    }}
                  >
                    <span 
                      className="text-xs font-semibold"
                      style={{ color: 'var(--color-surface, #FFFFFF)' }}
                    >
                      {(participant.nickname || participant.display_name || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5">
                  <UserStatusIndicator 
                    status={participant.status} 
                    size="sm"
                    showTooltip={false}
                  />
                </div>
              </div>
            ))}
            {participants.length > 5 && (
              <div 
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                style={{ 
                  borderColor: 'var(--color-surface, #FFFFFF)',
                  backgroundColor: 'var(--color-neutral-mist, #E6E4E1)',
                  width: '24px',
                  height: '24px',
                  minWidth: '24px',
                  minHeight: '24px',
                  maxWidth: '24px',
                  maxHeight: '24px'
                }}
              >
                <span 
                  className="text-xs font-semibold"
                  style={{ color: 'var(--color-text-secondary, #8B8680)' }}
                >
                  +{participants.length - 5}
                </span>
              </div>
            )}
          </div>
          <span 
            className="text-xs"
            style={{ color: 'var(--color-text-secondary, #8B8680)' }}
          >
            {participants.length} Teilnehmer
          </span>
        </div>
      )}
    </div>
  );
};

export default ChatRoomHeader;