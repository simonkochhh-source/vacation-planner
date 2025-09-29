import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { useSwipeGestures, SwipeDirection } from '../../hooks/useSwipeGestures';
import { useResponsive } from '../../hooks/useResponsive';

interface MobileSwipeContainerProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  showSwipeIndicators?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const MobileSwipeContainer: React.FC<MobileSwipeContainerProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  showSwipeIndicators = true,
  className = '',
  style = {}
}) => {
  const { isMobile } = useResponsive();
  const [showIndicators, setShowIndicators] = useState(false);
  const [activeSwipe, setActiveSwipe] = useState<SwipeDirection | null>(null);

  // Only enable swipe gestures on mobile
  const swipeEnabled = isMobile;

  const { ref, isSwiping, swipeDirection } = useSwipeGestures({
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipeStart: () => {
      if (showSwipeIndicators) {
        setShowIndicators(true);
      }
    },
    onSwipeMove: (direction) => {
      setActiveSwipe(direction);
    },
    onSwipeEnd: () => {
      setShowIndicators(false);
      setActiveSwipe(null);
    }
  }, {
    threshold: 50,
    velocityThreshold: 0.3,
    directionalOffsetThreshold: 80
  });

  // Auto-hide indicators after a delay
  useEffect(() => {
    if (showIndicators) {
      const timer = setTimeout(() => {
        setShowIndicators(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showIndicators]);

  // Don't show swipe functionality on desktop
  if (!swipeEnabled) {
    return <div className={className} style={style}>{children}</div>;
  }

  const getSwipeIndicatorOpacity = (direction: 'left' | 'right' | 'up' | 'down') => {
    if (!showIndicators && !isSwiping) return 0;
    if (isSwiping && activeSwipe?.direction === direction) {
      // Show stronger indicator when actively swiping in that direction
      const progress = Math.min(Math.abs(activeSwipe.distance) / 100, 1);
      return 0.3 + (progress * 0.7);
    }
    return showIndicators ? 0.4 : 0;
  };

  const getSwipeIndicatorTransform = (direction: 'left' | 'right' | 'up' | 'down') => {
    if (!isSwiping || !activeSwipe) return '';
    
    const distance = activeSwipe.distance;
    const maxTransform = 20;
    
    switch (direction) {
      case 'left':
        if (activeSwipe.direction === 'left' && onSwipeLeft) {
          return `translateX(${Math.min(Math.abs(distance) / 5, maxTransform)}px)`;
        }
        break;
      case 'right':
        if (activeSwipe.direction === 'right' && onSwipeRight) {
          return `translateX(-${Math.min(Math.abs(distance) / 5, maxTransform)}px)`;
        }
        break;
      case 'up':
        if (activeSwipe.direction === 'up' && onSwipeUp) {
          return `translateY(${Math.min(Math.abs(distance) / 5, maxTransform)}px)`;
        }
        break;
      case 'down':
        if (activeSwipe.direction === 'down' && onSwipeDown) {
          return `translateY(-${Math.min(Math.abs(distance) / 5, maxTransform)}px)`;
        }
        break;
    }
    return '';
  };

  return (
    <div
      ref={ref}
      className={`mobile-swipe-container ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
    >
      {children}

      {/* Swipe Indicators */}
      {showSwipeIndicators && (
        <>
          {/* Left Swipe Indicator */}
          {onSwipeLeft && (
            <div
              className="mobile-swipe-indicator left"
              style={{
                position: 'absolute',
                left: 'var(--space-4)',
                top: '50%',
                transform: `translateY(-50%) ${getSwipeIndicatorTransform('left')}`,
                opacity: getSwipeIndicatorOpacity('left'),
                transition: isSwiping ? 'none' : 'all var(--motion-duration-short)',
                color: 'var(--color-on-surface-variant)',
                background: 'var(--color-surface)',
                borderRadius: '50%',
                padding: 'var(--space-2)',
                boxShadow: 'var(--elevation-2)',
                pointerEvents: 'none',
                zIndex: 10
              }}
            >
              <ChevronLeft size={20} />
            </div>
          )}

          {/* Right Swipe Indicator */}
          {onSwipeRight && (
            <div
              className="mobile-swipe-indicator right"
              style={{
                position: 'absolute',
                right: 'var(--space-4)',
                top: '50%',
                transform: `translateY(-50%) ${getSwipeIndicatorTransform('right')}`,
                opacity: getSwipeIndicatorOpacity('right'),
                transition: isSwiping ? 'none' : 'all var(--motion-duration-short)',
                color: 'var(--color-on-surface-variant)',
                background: 'var(--color-surface)',
                borderRadius: '50%',
                padding: 'var(--space-2)',
                boxShadow: 'var(--elevation-2)',
                pointerEvents: 'none',
                zIndex: 10
              }}
            >
              <ChevronRight size={20} />
            </div>
          )}

          {/* Up Swipe Indicator */}
          {onSwipeUp && (
            <div
              className="mobile-swipe-indicator up"
              style={{
                position: 'absolute',
                top: 'var(--space-4)',
                left: '50%',
                transform: `translateX(-50%) ${getSwipeIndicatorTransform('up')}`,
                opacity: getSwipeIndicatorOpacity('up'),
                transition: isSwiping ? 'none' : 'all var(--motion-duration-short)',
                color: 'var(--color-on-surface-variant)',
                background: 'var(--color-surface)',
                borderRadius: '50%',
                padding: 'var(--space-2)',
                boxShadow: 'var(--elevation-2)',
                pointerEvents: 'none',
                zIndex: 10
              }}
            >
              <ArrowUp size={20} />
            </div>
          )}

          {/* Down Swipe Indicator */}
          {onSwipeDown && (
            <div
              className="mobile-swipe-indicator down"
              style={{
                position: 'absolute',
                bottom: 'var(--space-4)',
                left: '50%',
                transform: `translateX(-50%) ${getSwipeIndicatorTransform('down')}`,
                opacity: getSwipeIndicatorOpacity('down'),
                transition: isSwiping ? 'none' : 'all var(--motion-duration-short)',
                color: 'var(--color-on-surface-variant)',
                background: 'var(--color-surface)',
                borderRadius: '50%',
                padding: 'var(--space-2)',
                boxShadow: 'var(--elevation-2)',
                pointerEvents: 'none',
                zIndex: 10
              }}
            >
              <ArrowDown size={20} />
            </div>
          )}
        </>
      )}

      {/* Active Swipe Visual Feedback */}
      {isSwiping && activeSwipe && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'color-mix(in srgb, var(--color-primary) 5%, transparent)',
            pointerEvents: 'none',
            zIndex: 5,
            transition: 'none'
          }}
        />
      )}
    </div>
  );
};

export default MobileSwipeContainer;