import React, { useState, useEffect } from 'react';
import { Users, MessageCircle, Plus, Search, User } from 'lucide-react';
import { SocialUserProfile } from '../../types';
import { socialService } from '../../services/socialService';
import { useAuth } from '../../contexts/AuthContext';

interface FriendsListProps {
  compact?: boolean;
}

const FriendsList: React.FC<FriendsListProps> = ({ compact = false }) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<SocialUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      loadFriends();
    }
  }, [user]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      setError(null);
      const friendsList = await socialService.getFriends();
      setFriends(friendsList);
    } catch (err) {
      console.error('Failed to load friends:', err);
      setError('Freunde konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleChatWithFriend = async (friend: SocialUserProfile) => {
    try {
      // Create or get existing chat room with friend
      const roomId = await socialService.createFriendChatRoom(friend.id);
      
      // Navigate to chat (you can customize this based on your routing)
      console.log('Navigate to chat room:', roomId, 'with friend:', friend.nickname);
      
      // Option 1: Use existing chat interface
      // You could emit an event or call a callback to open the chat
      
      // Option 2: Navigate to a chat route
      // window.location.href = `/chat/${roomId}`;
      
      // For now, just log - you can integrate with your existing chat UI
      alert(`Chat with ${friend.display_name || friend.nickname} would open here!\nRoom ID: ${roomId}`);
      
    } catch (error) {
      console.error('Failed to create chat with friend:', error);
      alert('Failed to start chat. Make sure you are friends with this user.');
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{
        padding: compact ? '1rem' : '2rem',
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
          margin: '0 auto 1rem'
        }} />
        <p>Lade Freunde...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: compact ? '1rem' : '2rem',
        textAlign: 'center',
        color: 'var(--color-error)'
      }}>
        <p>{error}</p>
        <button
          onClick={loadFriends}
          style={{
            background: 'var(--color-primary-ocean)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: compact ? 'var(--radius-md)' : 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: compact ? '1rem' : '1.5rem',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-neutral-mist)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: compact ? '0.75rem' : '1rem'
          }}>
            <Users size={compact ? 18 : 20} style={{ color: 'var(--color-primary-ocean)' }} />
            <h3 style={{
              margin: 0,
              fontSize: compact ? '1rem' : '1.125rem',
              fontWeight: '600',
              color: 'var(--color-text-primary)'
            }}>
              Meine Freunde ({friends.length})
            </h3>
          </div>

          {/* Search */}
          {!compact && friends.length > 0 && (
            <div style={{ position: 'relative' }}>
              <Search 
                size={16} 
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-secondary)'
                }}
              />
              <input
                type="text"
                placeholder="Freunde suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  background: 'var(--color-surface)',
                  outline: 'none'
                }}
              />
            </div>
          )}
        </div>

        {/* Friends List */}
        <div style={{
          maxHeight: compact ? '300px' : '400px',
          overflowY: 'auto'
        }}>
          {filteredFriends.length === 0 ? (
            <div style={{
              padding: compact ? '2rem 1rem' : '3rem 2rem',
              textAlign: 'center',
              color: 'var(--color-text-secondary)'
            }}>
              {friends.length === 0 ? (
                <>
                  <Plus size={32} style={{ 
                    margin: '0 auto 1rem',
                    display: 'block',
                    opacity: 0.5
                  }} />
                  <p style={{ margin: '0 0 0.5rem', fontWeight: '500' }}>Noch keine Freunde</p>
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>
                    Suche nach anderen Nutzern und sende Freundschaftsanfragen!
                  </p>
                </>
              ) : (
                <p>Keine Freunde gefunden für "{searchQuery}"</p>
              )}
            </div>
          ) : (
            filteredFriends.map((friend) => (
              <div
                key={friend.id}
                style={{
                  padding: compact ? '0.75rem 1rem' : '1rem 1.5rem',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
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
                  width: compact ? '40px' : '48px',
                  height: compact ? '40px' : '48px',
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
                      fontSize: compact ? '1rem' : '1.25rem',
                      fontWeight: 'bold'
                    }}>
                      {friend.nickname.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Friend Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{
                    margin: '0 0 0.25rem',
                    fontSize: compact ? '0.875rem' : '1rem',
                    fontWeight: '600',
                    color: 'var(--color-text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {friend.display_name || friend.nickname}
                  </h4>
                  <p style={{
                    margin: 0,
                    fontSize: compact ? '0.75rem' : '0.875rem',
                    color: 'var(--color-text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    @{friend.nickname}
                  </p>
                  {!compact && friend.bio && (
                    <p style={{
                      margin: '0.25rem 0 0',
                      fontSize: '0.75rem',
                      color: 'var(--color-text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {friend.bio}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div style={{
                  display: 'flex',
                  gap: '0.5rem'
                }}>
                  <button
                    onClick={() => handleChatWithFriend(friend)}
                    style={{
                      background: 'var(--color-primary-ocean)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: compact ? '36px' : '40px',
                      height: compact ? '36px' : '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease'
                    }}
                    title="Chat starten"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <MessageCircle size={compact ? 16 : 18} />
                  </button>
                  
                  {!compact && (
                    <button
                      onClick={() => console.log('View profile:', friend.id)}
                      style={{
                        background: 'var(--color-neutral-mist)',
                        color: 'var(--color-text-secondary)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease'
                      }}
                      title="Profil anzeigen"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-border)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-neutral-mist)';
                      }}
                    >
                      <User size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default FriendsList;