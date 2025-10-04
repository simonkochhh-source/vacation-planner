import React, { useState, useEffect } from 'react';
import { User, Check, Clock, X } from 'lucide-react';
import { UUID, FollowStatus } from '../../types';
import { socialService } from '../../services/socialService';
import { useAuth } from '../../contexts/AuthContext';

interface FollowButtonProps {
  targetUserId: UUID;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact';
  onFollowChange?: (status: FollowStatus | 'none') => void;
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
  const [friendshipStatus, setFriendshipStatus] = useState<'friends' | 'none'>('none');
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
      
      let newStatus: 'friends' | 'none';
      
      if (friendshipStatus === 'none') {
        await socialService.connectWithUser(targetUserId);
        newStatus = 'friends';
      } else {
        await socialService.removeFriend(targetUserId);
        newStatus = 'none';
      }
      
      setFriendshipStatus(newStatus);
      onFollowChange?.(newStatus as any); // Legacy callback
      
    } catch (error: any) {
      console.error('Connect action failed:', error);
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
      case 'friends': return 'Connected';
      default: return 'Connect';
    }
  };

  const getButtonIcon = () => {
    const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;
    
    switch (friendshipStatus) {
      case 'none': return <User size={iconSize} />;
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

  return (
    <button
      onClick={handleConnectAction}
      disabled={loading}
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