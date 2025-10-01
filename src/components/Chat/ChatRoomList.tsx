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
        <div style={{
          width: '40px',
          height: '40px',
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          border: '2px solid #ffffff',
          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
        }}>
          <MessageCircle className="w-5 h-5 text-white" />
          {/* Status indicator would go here for direct messages */}
        </div>
      );
    }

    const getAvatarGradient = () => {
      switch (room.type) {
        case 'trip':
          return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        case 'group':
          return 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
        default:
          return 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
      }
    };

    return (
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: getAvatarGradient(),
        border: '2px solid #ffffff',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
      }}>
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
    <div style={{
      width: '320px',
      background: 'var(--chat-bg, linear-gradient(135deg, #ffffff 0%, #f8fafc 100%))',
      borderRight: '1px solid var(--chat-border, #e5e7eb)',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
    }}>
      {/* Modern Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid var(--chat-border, #e5e7eb)',
        background: 'var(--chat-header-bg, linear-gradient(135deg, #ffffff 0%, #f8fafc 100%))'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: 'var(--chat-text-primary, #111827)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ color: '#2563eb', fontSize: '24px' }}>💬</span>
            Chats
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {onNewChat && (
              <button
                onClick={onNewChat}
                style={{
                  padding: '10px',
                  border: 'none',
                  background: '#f3f4f6',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  color: 'var(--chat-button-text, #6b7280)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '40px',
                  minHeight: '40px',
                  transition: 'all 0.2s ease-out'
                }}
                title="Neuer Chat"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--chat-button-hover-bg, #e5e7eb)';
                  e.currentTarget.style.color = 'var(--chat-button-hover-text, #374151)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--chat-button-bg, #f3f4f6)';
                  e.currentTarget.style.color = 'var(--chat-button-text, #6b7280)';
                }}
              >
                <MessageCircle className="w-5 h-5" />
              </button>
            )}
            {onNewGroup && (
              <button
                onClick={onNewGroup}
                style={{
                  padding: '10px',
                  border: 'none',
                  background: '#dbeafe',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '40px',
                  minHeight: '40px',
                  transition: 'all 0.2s ease-out'
                }}
                title="Neue Gruppe"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#bfdbfe';
                  e.currentTarget.style.color = '#1d4ed8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#dbeafe';
                  e.currentTarget.style.color = '#2563eb';
                }}
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Modern Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="🔍 Chats durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '40px',
              paddingRight: '16px',
              paddingTop: '12px',
              paddingBottom: '12px',
              border: '2px solid #e5e7eb',
              borderRadius: '16px',
              fontSize: '14px',
              background: '#ffffff',
              transition: 'all 0.2s ease-out',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#2563eb';
              e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Modern Filter tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: '16px',
          background: '#f3f4f6',
          padding: '4px',
          borderRadius: '12px'
        }}>
          {[
            { key: 'all', label: '📋 Alle' },
            { key: 'direct', label: '👤 Direkt' },
            { key: 'group', label: '👥 Gruppen' },
            { key: 'trip', label: '✈️ Reisen' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as typeof filter)}
              style={{
                padding: '8px 12px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease-out',
                background: filter === tab.key 
                  ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                  : 'transparent',
                color: filter === tab.key ? '#ffffff' : '#6b7280',
                boxShadow: filter === tab.key ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (filter !== tab.key) {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.color = '#374151';
                }
              }}
              onMouseLeave={(e) => {
                if (filter !== tab.key) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Modern Room list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px'
      }}>
        {loading ? (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '8px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                borderRadius: '50%',
                animation: 'pulse 1.5s ease-in-out infinite'
              }} />
              <span>Lade Chats...</span>
            </div>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            {searchQuery ? (
              <div>
                <div style={{ fontSize: '16px', marginBottom: '8px' }}>🔍</div>
                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Keine Ergebnisse gefunden</div>
                <div style={{ fontSize: '12px' }}>Versuchen Sie einen anderen Suchbegriff</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>💬</div>
                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Keine Chats vorhanden</div>
                <div style={{ fontSize: '12px' }}>Starten Sie eine Unterhaltung!</div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filteredRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => onRoomSelect(room.id)}
                style={{
                  width: '100%',
                  padding: '16px',
                  textAlign: 'left',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-out',
                  background: activeRoomId === room.id 
                    ? 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)'
                    : '#ffffff',
                  borderLeft: activeRoomId === room.id ? '4px solid #2563eb' : '4px solid transparent',
                  boxShadow: activeRoomId === room.id 
                    ? '0 4px 12px rgba(37, 99, 235, 0.15)'
                    : '0 2px 4px rgba(0, 0, 0, 0.05)'
                }}
                onMouseEnter={(e) => {
                  if (activeRoomId !== room.id) {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeRoomId !== room.id) {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  {/* Modern Avatar */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {getRoomAvatar(room)}
                    
                    {/* Modern Trip indicator */}
                    {room.type === 'trip' && (
                      <div style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-2px',
                        width: '20px',
                        height: '20px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #ffffff',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                      }}>
                        <Plane className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Modern Room info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h3 style={{
                        fontWeight: '600',
                        fontSize: '14px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: room.unread_count > 0 ? '#111827' : '#374151'
                      }}>
                        {getRoomDisplayName(room)}
                      </h3>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {/* Modern Timestamp */}
                        {room.latest_message_at && (
                          <span style={{
                            fontSize: '11px',
                            color: '#9ca3af',
                            fontWeight: '500'
                          }}>
                            {formatLatestMessageTime(room.latest_message_at)}
                          </span>
                        )}
                        
                        {/* Modern Unread badge */}
                        {room.unread_count > 0 && (
                          <span style={{
                            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: '600',
                            borderRadius: '12px',
                            padding: '2px 8px',
                            minWidth: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)'
                          }}>
                            {room.unread_count > 99 ? '99+' : room.unread_count}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Modern Latest message preview */}
                    {room.latest_message && (
                      <p style={{
                        fontSize: '13px',
                        marginTop: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: room.unread_count > 0 ? '500' : 'normal',
                        color: room.unread_count > 0 ? '#374151' : '#6b7280'
                      }}>
                        {room.latest_message}
                      </p>
                    )}

                    {/* Modern Room meta info */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Modern Room type indicator */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          color: '#9ca3af',
                          fontWeight: '500'
                        }}>
                          {getRoomIcon(room)}
                          <span>
                            {room.type === 'direct' ? 'Direkt' : 
                             room.type === 'group' ? 'Gruppe' : 
                             room.type === 'trip' ? 'Reise' : room.type}
                          </span>
                        </div>

                        {/* Modern Participant count for groups/trips */}
                        {(room.type === 'group' || room.type === 'trip') && (
                          <span style={{
                            fontSize: '11px',
                            color: '#9ca3af',
                            fontWeight: '500'
                          }}>
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

      {/* Modern Footer with stats */}
      {!loading && filteredRooms.length > 0 && (
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
        }}>
          <div style={{
            fontSize: '11px',
            color: '#6b7280',
            textAlign: 'center',
            fontWeight: '500'
          }}>
            📊 {filteredRooms.length} von {rooms.length} Chats
            {rooms.reduce((sum, room) => sum + room.unread_count, 0) > 0 && (
              <span style={{ marginLeft: '8px' }}>
                · {rooms.reduce((sum, room) => sum + room.unread_count, 0)} 🔴 ungelesen
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatRoomList;