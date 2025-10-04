import React, { useState, useEffect } from 'react';
import { User, Check, Clock, X } from 'lucide-react';
import { UUID } from '../../types';
import { socialService } from '../../services/socialService';
import { useAuth } from '../../contexts/AuthContext';

type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends';

interface FollowButtonProps {
  targetUserId: UUID;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact';
  onFollowChange?: (status: FriendshipStatus) => void;
  className?: string;
  style?: React.CSSProperties;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  targetUserId,
  size = 'md',
  variant = 'default',
  onFollowChange,
  className,
  style
}) => {
  const { user } = useAuth();
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Don't show follow button for own profile
  if (!user || user.id === targetUserId) {
    return null;
  }

  useEffect(() => {
    loadFriendshipStatus();
  }, [targetUserId]);

  const loadFriendshipStatus = async () => {
    try {
      const status = await socialService.getFriendshipStatus(targetUserId);
      setFriendshipStatus(status);
    } catch (error) {
      console.error('Failed to load friendship status:', error);
      setError('Status konnte nicht geladen werden');
    }
  };

  const handleConnectAction = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let newStatus: FriendshipStatus;
      
      switch (friendshipStatus) {
        case 'none':
          // Send friendship request
          await socialService.sendFriendshipRequest(targetUserId);
          newStatus = 'pending_sent';
          break;
        case 'pending_received':
          // Accept friendship request
          await socialService.acceptFriendshipRequest(targetUserId);
          newStatus = 'friends';
          break;
        case 'friends':
          // Remove friendship
          await socialService.removeFriend(targetUserId);
          newStatus = 'none';
          break;
        case 'pending_sent':
          // Can't do anything for sent requests
          return;
        default:
          return;
      }
      
      setFriendshipStatus(newStatus);
      onFollowChange?.(newStatus);
      
    } catch (error: any) {
      console.error('Connect action failed:', error);
      setError(error.message || 'Aktion fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineRequest = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await socialService.declineFriendshipRequest(targetUserId);
      setFriendshipStatus('none');
      onFollowChange?.('none');
      
    } catch (error: any) {
      console.error('Decline action failed:', error);
      setError(error.message || 'Aktion fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (variant === 'compact') {
      return '';
    }

    switch (friendshipStatus) {
      case 'none': return 'Connect';
      case 'pending_sent': return 'Request Sent';
      case 'pending_received': return 'Accept';
      case 'friends': return 'Connected';
      default: return 'Connect';
    }
  };

  const getButtonIcon = () => {
    const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;
    
    switch (friendshipStatus) {
      case 'none': return <User size={iconSize} />;
      case 'pending_sent': return <Clock size={iconSize} />;
      case 'pending_received': return <Check size={iconSize} />;
      case 'friends': return <Check size={iconSize} />;
      default: return <User size={iconSize} />;
    }
  };

  const getButtonStyle = () => {
    const baseStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: variant === 'compact' ? '0' : '8px',
      border: 'none',
      borderRadius: size === 'sm' ? '4px' : '6px',
      fontSize: size === 'sm' ? '0.75rem' : size === 'lg' ? '1rem' : '0.875rem',
      fontWeight: '600',
      cursor: loading ? 'not-allowed' : 'pointer',
      opacity: loading ? 0.6 : 1,
      transition: 'all 0.2s',
      minWidth: variant === 'compact' ? 'auto' : size === 'sm' ? '80px' : '100px',
      ...style
    };

    // Size-specific padding
    if (variant === 'compact') {
      baseStyle.padding = size === 'sm' ? '4px' : size === 'lg' ? '8px' : '6px';
      baseStyle.width = size === 'sm' ? '28px' : size === 'lg' ? '36px' : '32px';
      baseStyle.height = size === 'sm' ? '28px' : size === 'lg' ? '36px' : '32px';
    } else {
      baseStyle.padding = size === 'sm' ? '6px 12px' : size === 'lg' ? '12px 20px' : '8px 16px';
    }

    // Status-specific colors
    switch (friendshipStatus) {
      case 'none':
        baseStyle.background = '#3b82f6';
        baseStyle.color = 'white';
        break;
      case 'pending_sent':
        baseStyle.background = '#6b7280';
        baseStyle.color = 'white';
        baseStyle.cursor = 'not-allowed';
        break;
      case 'pending_received':
        baseStyle.background = '#f59e0b';
        baseStyle.color = 'white';
        break;
      case 'friends':
        baseStyle.background = '#10b981';
        baseStyle.color = 'white';
        break;
      default:
        baseStyle.background = '#3b82f6';
        baseStyle.color = 'white';
    }

    return baseStyle;
  };

  const getTooltipText = () => {
    switch (friendshipStatus) {
      case 'none': return 'Mit diesem Nutzer vernetzen';
      case 'pending_sent': return 'Freundschaftsanfrage gesendet';
      case 'pending_received': return 'Freundschaftsanfrage annehmen';
      case 'friends': return 'Verbindung trennen';
      default: return 'Connect';
    }
  };

  if (error) {
    return (
      <div style={{
        fontSize: size === 'sm' ? '0.75rem' : '0.875rem',
        color: '#ef4444',
        padding: '4px 8px',
        background: '#fef2f2',
        borderRadius: '4px',
        border: '1px solid #fecaca'
      }}>
        {error}
      </div>
    );
  }

  // Handle pending_received status with Accept/Decline buttons
  if (friendshipStatus === 'pending_received') {
    return (
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={handleConnectAction}
          disabled={loading}
          className={className}
          style={{
            ...getButtonStyle(),
            background: '#10b981',
            minWidth: variant === 'compact' ? 'auto' : size === 'sm' ? '60px' : '70px'
          }}
          title="Freundschaftsanfrage annehmen"
        >
          {loading ? (
            <div style={{
              width: size === 'sm' ? '14px' : '16px',
              height: size === 'sm' ? '14px' : '16px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderTop: '2px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          ) : (
            <>
              <Check size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
              {variant !== 'compact' && <span>Accept</span>}
            </>
          )}
        </button>
        <button
          onClick={handleDeclineRequest}
          disabled={loading}
          className={className}
          style={{
            ...getButtonStyle(),
            background: '#ef4444',
            minWidth: variant === 'compact' ? 'auto' : size === 'sm' ? '60px' : '70px'
          }}
          title="Freundschaftsanfrage ablehnen"
        >
          {loading ? (
            <div style={{
              width: size === 'sm' ? '14px' : '16px',
              height: size === 'sm' ? '14px' : '16px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderTop: '2px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          ) : (
            <>
              <X size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
              {variant !== 'compact' && <span>Decline</span>}
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnectAction}
      disabled={loading || friendshipStatus === 'pending_sent'}
      className={className}
      style={getButtonStyle()}
      title={getTooltipText()}
      onMouseOver={(e) => {
        if (!loading && friendshipStatus === 'friends') {
          e.currentTarget.style.background = '#ef4444';
        }
      }}
      onMouseOut={(e) => {
        if (!loading && friendshipStatus === 'friends') {
          e.currentTarget.style.background = '#10b981';
        }
      }}
    >
      {loading ? (
        <div style={{
          width: size === 'sm' ? '14px' : '16px',
          height: size === 'sm' ? '14px' : '16px',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          borderTop: '2px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      ) : (
        <>
          {getButtonIcon()}
          {variant !== 'compact' && <span>{getButtonText()}</span>}
        </>
      )}
    </button>
  );
};

export default FollowButton;