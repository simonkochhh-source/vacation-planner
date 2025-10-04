import React, { useState, useEffect, useRef } from 'react';
import { Users, Check, X, Bell } from 'lucide-react';
import { socialService } from '../../services/socialService';
import { useAuth } from '../../contexts/AuthContext';
import AvatarUpload from '../User/AvatarUpload';

interface FriendshipRequestsDropdownProps {
  onRequestUpdate?: () => void;
}

const FriendshipRequestsDropdown: React.FC<FriendshipRequestsDropdownProps> = ({
  onRequestUpdate
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadFriendshipRequests();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadFriendshipRequests = async () => {
    try {
      setLoading(true);
      const friendshipRequests = await socialService.getPendingFriendshipRequests();
      setRequests(friendshipRequests);
    } catch (error) {
      console.error('Failed to load friendship requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requesterId: string) => {
    try {
      setActionLoading(requesterId);
      await socialService.acceptFriendshipRequest(requesterId);
      
      // Remove from local state
      setRequests(prev => prev.filter(req => req.requester_id !== requesterId));
      onRequestUpdate?.();
      
    } catch (error) {
      console.error('Failed to accept friendship request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineRequest = async (requesterId: string) => {
    try {
      setActionLoading(requesterId);
      await socialService.declineFriendshipRequest(requesterId);
      
      // Remove from local state
      setRequests(prev => prev.filter(req => req.requester_id !== requesterId));
      onRequestUpdate?.();
      
    } catch (error) {
      console.error('Failed to decline friendship request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      loadFriendshipRequests(); // Refresh when opening
    }
  };

  if (!user) return null;

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Follow Requests Bell Button */}
      <button
        onClick={toggleDropdown}
        style={{
          position: 'relative',
          background: 'rgba(255, 255, 255, 0.2)',
          border: 'none',
          borderRadius: '8px',
          padding: '8px',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          transition: 'background 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
        title="Freundschaftsanfragen"
      >
        <Users size={18} />
        
        {/* Badge for pending requests */}
        {requests.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            background: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            fontSize: '0.75rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid white'
          }}>
            {requests.length > 9 ? '9+' : requests.length}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
          border: '1px solid #e5e7eb',
          minWidth: '320px',
          maxWidth: '400px',
          zIndex: 1000
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px 12px',
            borderBottom: '1px solid #f3f4f6'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: '600',
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Users size={16} />
              Freundschaftsanfragen
              {requests.length > 0 && (
                <span style={{
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  {requests.length}
                </span>
              )}
            </h3>
          </div>

          {/* Content */}
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {loading ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--color-text-secondary)'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  border: '2px solid #f3f4f6',
                  borderTop: '2px solid #3b82f6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 8px'
                }} />
                Lade Freundschaftsanfragen...
              </div>
            ) : requests.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--color-text-secondary)'
              }}>
                <Bell size={32} style={{ 
                  margin: '0 auto 12px',
                  display: 'block',
                  opacity: 0.5
                }} />
                <div style={{ fontSize: '0.875rem' }}>
                  Keine neuen Freundschaftsanfragen
                </div>
              </div>
            ) : (
              <div>
                {requests.map((request) => (
                  <div
                    key={request.requester_id}
                    style={{
                      padding: '16px 20px',
                      borderBottom: '1px solid #f9fafb',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    {/* Avatar */}
                    <div style={{ flexShrink: 0 }}>
                      <AvatarUpload
                        currentAvatarUrl={request.user_profiles?.avatar_url}
                        size="small"
                        editable={false}
                      />
                    </div>

                    {/* User Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: '600',
                        fontSize: '0.875rem',
                        color: '#1f2937',
                        marginBottom: '2px'
                      }}>
                        @{request.user_profiles?.nickname || 'Unbekannt'}
                      </div>
                      {request.user_profiles?.display_name && (
                        <div style={{
                          fontSize: '0.75rem',
                          color: 'var(--color-text-secondary)',
                          marginBottom: '4px'
                        }}>
                          {request.user_profiles?.display_name}
                        </div>
                      )}
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-text-secondary)'
                      }}>
                        vor {getTimeAgo(request.requested_at)}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      flexShrink: 0
                    }}>
                      <button
                        onClick={() => handleAcceptRequest(request.requester_id)}
                        disabled={actionLoading === request.requester_id}
                        style={{
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px',
                          cursor: actionLoading === request.requester_id ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: actionLoading === request.requester_id ? 0.6 : 1
                        }}
                        title="Akzeptieren"
                      >
                        <Check size={14} />
                      </button>
                      
                      <button
                        onClick={() => handleDeclineRequest(request.requester_id)}
                        disabled={actionLoading === request.requester_id}
                        style={{
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px',
                          cursor: actionLoading === request.requester_id ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: actionLoading === request.requester_id ? 0.6 : 1
                        }}
                        title="Ablehnen"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to format time ago
const getTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'wenigen Sekunden';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} Min`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} Std`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} Tagen`;
  return `${Math.floor(diffInSeconds / 604800)} Wochen`;
};

export default FriendshipRequestsDropdown;