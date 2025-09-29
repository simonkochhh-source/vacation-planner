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
}

const ChatRoomHeader: React.FC<ChatRoomHeaderProps> = ({
  room,
  participants = [],
  onSettingsClick,
  onCallClick,
  onVideoClick,
  onMenuClick
}) => {
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
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Avatar or Icon */}
          <div className="relative">
            {getAvatarUrl() ? (
              <img
                src={getAvatarUrl()}
                alt={getRoomDisplayName()}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                {room.type === 'direct' ? (
                  <span className="text-white font-semibold text-sm">
                    {getRoomDisplayName().charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <Users className="w-5 h-5 text-white" />
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
            <h3 className="font-semibold text-gray-900">
              {getRoomDisplayName()}
            </h3>
            <p className="text-sm text-gray-500">
              {getRoomSubtitle()}
            </p>
            {room.description && (
              <p className="text-xs text-gray-400 mt-1">
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
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Anrufen"
              title="Anrufen"
            >
              <Phone className="w-5 h-5 text-gray-600" />
            </button>
          )}

          {/* Video call button */}
          {onVideoClick && (
            <button
              onClick={onVideoClick}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Videoanruf"
              title="Videoanruf"
            >
              <Video className="w-5 h-5 text-gray-600" />
            </button>
          )}

          {/* Settings button */}
          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Chat-Einstellungen"
              title="Einstellungen"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          )}

          {/* More menu */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Weitere Optionen"
              title="Mehr"
            >
              <MoreHorizontal className="w-5 h-5 text-gray-600" />
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
                    className="w-6 h-6 rounded-full border-2 border-white object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-400 flex items-center justify-center">
                    <span className="text-xs font-semibold text-white">
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
              <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center">
                <span className="text-xs font-semibold text-gray-600">
                  +{participants.length - 5}
                </span>
              </div>
            )}
          </div>
          <span className="text-xs text-gray-500">
            {participants.length} Teilnehmer
          </span>
        </div>
      )}
    </div>
  );
};

export default ChatRoomHeader;