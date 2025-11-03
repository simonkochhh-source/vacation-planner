import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Heart, MessageCircle, Share, Bookmark, MoreHorizontal, MapPin, Calendar, Users } from 'lucide-react';
import { useResponsive } from '../../hooks/useResponsive';

interface FeedPost {
  id: string;
  user: {
    name: string;
    avatar: string;
    verified?: boolean;
  };
  trip: {
    title: string;
    location: string;
    duration: string;
    image: string;
    budget?: string;
  };
  content: string;
  images: string[];
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
  isLiked: boolean;
  isSaved: boolean;
}

interface SocialMediaFeedProps {
  posts: FeedPost[];
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onSave: (postId: string) => void;
  onUserClick: (userId: string) => void;
  onTripClick: (tripId: string) => void;
}

const SocialMediaFeed: React.FC<SocialMediaFeedProps> = ({
  posts,
  onLike,
  onComment,
  onShare,
  onSave,
  onUserClick,
  onTripClick
}) => {
  const { isMobile } = useResponsive();
  const [visiblePosts, setVisiblePosts] = useState<string[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer for infinite scroll and view tracking
  const setupIntersectionObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const postId = entry.target.getAttribute('data-post-id');
          if (!postId) return;

          if (entry.isIntersecting) {
            setVisiblePosts(prev => {
              if (prev.includes(postId)) return prev;
              return [...prev, postId];
            });
          }
        });
      },
      {
        threshold: 0.5, // Track when 50% of post is visible
        rootMargin: '0px 0px -10% 0px'
      }
    );
  }, []);

  useEffect(() => {
    setupIntersectionObserver();
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [setupIntersectionObserver]);

  const feedContainerStyle = {
    width: '100%',
    maxWidth: isMobile ? '100%' : '600px',
    margin: '0 auto',
    background: 'var(--color-background)',
    minHeight: '100vh'
  };

  const postStyle = {
    background: 'var(--color-surface)',
    marginBottom: 'var(--space-2)',
    borderRadius: isMobile ? 0 : 'var(--radius-lg)',
    overflow: 'hidden',
    border: isMobile ? 'none' : '1px solid var(--color-outline-variant)',
    borderTop: isMobile ? '1px solid var(--color-outline-variant)' : undefined,
    borderBottom: isMobile ? '1px solid var(--color-outline-variant)' : undefined
  };

  const postHeaderStyle = {
    padding: 'var(--space-3) var(--space-4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  };

  const userInfoStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    flex: 1,
    cursor: 'pointer'
  };

  const avatarStyle = {
    width: isMobile ? '40px' : '36px',
    height: isMobile ? '40px' : '36px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
    border: '2px solid var(--color-primary-container)'
  };

  const imageContainerStyle = {
    position: 'relative' as const,
    width: '100%',
    paddingBottom: '75%', // 4:3 aspect ratio
    overflow: 'hidden',
    background: 'var(--color-surface-variant)'
  };

  const postImageStyle = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    cursor: 'pointer'
  };

  const actionsStyle = {
    padding: 'var(--space-3) var(--space-4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  };

  const actionButtonStyle = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 'var(--space-2)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all var(--motion-duration-short)',
    minWidth: isMobile ? '44px' : '36px',
    minHeight: isMobile ? '44px' : '36px',
    WebkitTapHighlightColor: 'transparent'
  };

  const tripCardStyle = {
    background: 'linear-gradient(135deg, var(--color-primary-container), var(--color-secondary-container))',
    margin: 'var(--space-3) var(--space-4)',
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-lg)',
    cursor: 'pointer',
    transition: 'transform var(--motion-duration-short)'
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'gerade eben';
    if (diffInMinutes < 60) return `${diffInMinutes}min`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  const handleDoubleTap = (postId: string) => {
    // Double tap to like (Instagram style)
    onLike(postId);
  };

  return (
    <div style={feedContainerStyle}>
      {posts.map((post) => (
        <article
          key={post.id}
          style={postStyle}
          data-post-id={post.id}
          ref={(el) => {
            if (el && observerRef.current) {
              observerRef.current.observe(el);
            }
          }}
        >
          {/* Post Header */}
          <header style={postHeaderStyle}>
            <div style={userInfoStyle} onClick={() => onUserClick(post.user.name)}>
              <img
                src={post.user.avatar}
                alt={post.user.name}
                style={avatarStyle}
              />
              <div>
                <div style={{
                  fontWeight: '600',
                  fontSize: isMobile ? '14px' : '13px',
                  color: 'var(--color-on-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-1)'
                }}>
                  {post.user.name}
                  {post.user.verified && (
                    <span style={{
                      color: 'var(--color-primary)',
                      fontSize: '12px'
                    }}>
                      ✓
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--color-on-surface-variant)',
                  marginTop: '2px'
                }}>
                  {getTimeAgo(post.timestamp)}
                </div>
              </div>
            </div>
            
            <button style={actionButtonStyle}>
              <MoreHorizontal size={20} color="var(--color-on-surface-variant)" />
            </button>
          </header>

          {/* Trip Info Card */}
          <div 
            style={tripCardStyle}
            onClick={() => onTripClick(post.id)}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              marginBottom: 'var(--space-2)'
            }}>
              <MapPin size={16} color="var(--color-on-primary-container)" />
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--color-on-primary-container)'
              }}>
                {post.trip.title}
              </span>
            </div>
            
            <div style={{
              display: 'flex',
              gap: 'var(--space-4)',
              fontSize: '12px',
              color: 'var(--color-on-primary-container)',
              opacity: 0.8
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                <MapPin size={12} />
                {post.trip.location}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                <Calendar size={12} />
                {post.trip.duration}
              </div>
              {post.trip.budget && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  💰 {post.trip.budget}
                </div>
              )}
            </div>
          </div>

          {/* Post Content */}
          {post.content && (
            <div style={{
              padding: '0 var(--space-4) var(--space-3)',
              fontSize: isMobile ? '14px' : '13px',
              lineHeight: '1.4',
              color: 'var(--color-on-surface)'
            }}>
              {post.content}
            </div>
          )}

          {/* Post Images */}
          {post.images.length > 0 && (
            <div style={imageContainerStyle}>
              <img
                src={post.images[0]}
                alt="Trip photo"
                style={postImageStyle}
                onDoubleClick={() => handleDoubleTap(post.id)}
                onTouchStart={(e) => {
                  let touchTime = Date.now();
                  const handleTouchEnd = () => {
                    if (Date.now() - touchTime < 300) {
                      // Fast tap, could be double tap
                      setTimeout(() => handleDoubleTap(post.id), 100);
                    }
                    e.target?.removeEventListener('touchend', handleTouchEnd);
                  };
                  e.target.addEventListener('touchend', handleTouchEnd);
                }}
              />
              
              {/* Image Counter */}
              {post.images.length > 1 && (
                <div style={{
                  position: 'absolute',
                  top: 'var(--space-3)',
                  right: 'var(--space-3)',
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  padding: 'var(--space-1) var(--space-2)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  1/{post.images.length}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={actionsStyle}>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                style={{
                  ...actionButtonStyle,
                  color: post.isLiked ? 'var(--color-error)' : 'var(--color-on-surface-variant)'
                }}
                onClick={() => onLike(post.id)}
              >
                <Heart 
                  size={isMobile ? 24 : 20} 
                  fill={post.isLiked ? 'currentColor' : 'none'}
                />
              </button>
              
              <button
                style={actionButtonStyle}
                onClick={() => onComment(post.id)}
              >
                <MessageCircle size={isMobile ? 24 : 20} color="var(--color-on-surface-variant)" />
              </button>
              
              <button
                style={actionButtonStyle}
                onClick={() => onShare(post.id)}
              >
                <Share size={isMobile ? 24 : 20} color="var(--color-on-surface-variant)" />
              </button>
            </div>
            
            <button
              style={{
                ...actionButtonStyle,
                color: post.isSaved ? 'var(--color-primary)' : 'var(--color-on-surface-variant)'
              }}
              onClick={() => onSave(post.id)}
            >
              <Bookmark 
                size={isMobile ? 24 : 20} 
                fill={post.isSaved ? 'currentColor' : 'none'}
              />
            </button>
          </div>

          {/* Engagement Stats */}
          <div style={{
            padding: '0 var(--space-4) var(--space-3)',
            fontSize: '13px',
            color: 'var(--color-on-surface-variant)'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
              {formatNumber(post.likes)} Gefällt mir
            </div>
            {post.comments > 0 && (
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'var(--color-on-surface-variant)',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
                onClick={() => onComment(post.id)}
              >
                Alle {formatNumber(post.comments)} Kommentare ansehen
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
};

export default SocialMediaFeed;