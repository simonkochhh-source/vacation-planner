import React, { useState } from 'react';
import { MessageCircle, Users, Plane, Search, Plus } from 'lucide-react';
import { ChatRoomWithInfo } from '../../services/chatService';

interface ChatRoomListProps {
  rooms: ChatRoomWithInfo[];
  activeRoomId?: string;
  onRoomSelect: (roomId: string) => void;
  onNewChat?: () => void;
  onNewGroup?: () => void;
  loading?: boolean;
}

const ChatRoomList: React.FC<ChatRoomListProps> = ({
  rooms,
  activeRoomId,
  onRoomSelect,
  onNewChat,
  onNewGroup,
  loading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'direct' | 'group' | 'trip'>('all');

  const filteredRooms = rooms.filter(room => {
    // Filter by type
    if (filter !== 'all' && room.type !== filter) {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const roomName = (room.name || getRoomDisplayName(room)).toLowerCase();
      const latestMessage = (room.latest_message || '').toLowerCase();
      
      return roomName.includes(query) || latestMessage.includes(query);
    }

    return true;
  });

  const getRoomDisplayName = (room: ChatRoomWithInfo): string => {
    if (room.name) {
      return room.name;
    }

    switch (room.type) {
      case 'direct':
        return 'Direktnachricht';
      case 'group':
        return 'Gruppenchat';
      case 'trip':
        return 'Reisechat';
      default:
        return 'Chat';
    }
  };

  const getRoomIcon = (room: ChatRoomWithInfo) => {
    switch (room.type) {
      case 'direct':
        return <MessageCircle className="w-5 h-5" />;
      case 'group':
        return <Users className="w-5 h-5" />;
      case 'trip':
        return <Plane className="w-5 h-5" />;
      default:
        return <MessageCircle className="w-5 h-5" />;
    }
  };

  const getRoomAvatar = (room: ChatRoomWithInfo): React.ReactElement => {
    if (room.type === 'direct') {
      // For direct messages, this would ideally show the other person's avatar
      // For now, we'll show a generic avatar
      return (
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center relative">
          <MessageCircle className="w-5 h-5 text-white" />
          {/* Status indicator would go here for direct messages */}
        </div>
      );
    }

    return (
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
        room.type === 'trip' ? 'bg-green-500' : 'bg-purple-500'
      }`}>
        {getRoomIcon(room)}
        <div className="text-white">
          {room.type === 'trip' ? (
            <Plane className="w-5 h-5" />
          ) : (
            <Users className="w-5 h-5" />
          )}
        </div>
      </div>
    );
  };

  const formatLatestMessageTime = (timestamp?: string): string => {
    if (!timestamp) return '';

    const messageDate = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return 'gerade eben';
    } else if (diffMins < 60) {
      return `${diffMins} Min.`;
    } else if (diffHours < 24) {
      return `${diffHours} Std.`;
    } else if (diffDays < 7) {
      return `${diffDays}d`;
    } else {
      return messageDate.toLocaleDateString('de-DE', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Chats</h2>
          <div className="flex space-x-1">
            {onNewChat && (
              <button
                onClick={onNewChat}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Neuer Chat"
              >
                <MessageCircle className="w-5 h-5 text-gray-600" />
              </button>
            )}
            {onNewGroup && (
              <button
                onClick={onNewGroup}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Neue Gruppe"
              >
                <Plus className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Chats durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex space-x-1 mt-3">
          {[
            { key: 'all', label: 'Alle' },
            { key: 'direct', label: 'Direkt' },
            { key: 'group', label: 'Gruppen' },
            { key: 'trip', label: 'Reisen' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as typeof filter)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">
            Lade Chats...
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery ? (
              <div>
                <div className="text-sm">Keine Ergebnisse gefunden</div>
                <div className="text-xs mt-1">Versuchen Sie einen anderen Suchbegriff</div>
              </div>
            ) : (
              <div>
                <div className="text-sm">Keine Chats vorhanden</div>
                <div className="text-xs mt-1">Starten Sie eine Unterhaltung!</div>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => onRoomSelect(room.id)}
                className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                  activeRoomId === room.id ? 'bg-blue-50 border-r-2 border-blue-600' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {getRoomAvatar(room)}
                    
                    {/* Trip indicator */}
                    {room.type === 'trip' && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <Plane className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Room info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-medium truncate ${
                        room.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {getRoomDisplayName(room)}
                      </h3>
                      
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {/* Timestamp */}
                        {room.latest_message_at && (
                          <span className="text-xs text-gray-500">
                            {formatLatestMessageTime(room.latest_message_at)}
                          </span>
                        )}
                        
                        {/* Unread badge */}
                        {room.unread_count > 0 && (
                          <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
                            {room.unread_count > 99 ? '99+' : room.unread_count}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Latest message preview */}
                    {room.latest_message && (
                      <p className={`text-sm mt-1 truncate ${
                        room.unread_count > 0 ? 'font-medium text-gray-900' : 'text-gray-500'
                      }`}>
                        {room.latest_message}
                      </p>
                    )}

                    {/* Room meta info */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2">
                        {/* Room type indicator */}
                        <div className="flex items-center space-x-1 text-xs text-gray-400">
                          {getRoomIcon(room)}
                          <span className="capitalize">
                            {room.type === 'direct' ? 'Direkt' : 
                             room.type === 'group' ? 'Gruppe' : 
                             room.type === 'trip' ? 'Reise' : room.type}
                          </span>
                        </div>

                        {/* Participant count for groups/trips */}
                        {(room.type === 'group' || room.type === 'trip') && (
                          <span className="text-xs text-gray-400">
                            · {room.participant_count} Teilnehmer
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer with stats */}
      {!loading && filteredRooms.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500 text-center">
            {filteredRooms.length} von {rooms.length} Chats
            {rooms.reduce((sum, room) => sum + room.unread_count, 0) > 0 && (
              <span className="ml-2">
                · {rooms.reduce((sum, room) => sum + room.unread_count, 0)} ungelesen
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatRoomList;