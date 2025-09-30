import { useEffect, useRef, useState } from 'react';

export interface SwipeDirection {
  x: number;
  y: number;
  direction: 'left' | 'right' | 'up' | 'down' | null;
  distance: number;
  velocity: number;
}

export interface SwipeCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeStart?: (touch: Touch) => void;
  onSwipeMove?: (direction: SwipeDirection) => void;
  onSwipeEnd?: (direction: SwipeDirection) => void;
}

export interface SwipeOptions {
  threshold?: number; // Minimum distance for a swipe (default: 50px)
  velocityThreshold?: number; // Minimum velocity for a swipe (default: 0.3px/ms)
  directionalOffsetThreshold?: number; // Maximum perpendicular offset (default: 80px)
  preventDefaultTouchmoveEvent?: boolean;
  delta?: number; // Minimum delta for move detection (default: 10px)
}

export const useSwipeGestures = (
  callbacks: SwipeCallbacks,
  options: SwipeOptions = {}
) => {
  const {
    threshold = 50,
    velocityThreshold = 0.3,
    directionalOffsetThreshold = 80,
    preventDefaultTouchmoveEvent = false,
    delta = 10
  } = options;

  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection | null>(null);
  const touchStartRef = useRef<Touch | null>(null);
  const touchStartTimeRef = useRef<number>(0);
  const elementRef = useRef<HTMLDivElement | null>(null);

  const calculateDirection = (
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): 'left' | 'right' | 'up' | 'down' | null => {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Check if movement is significant enough
    if (Math.max(absDeltaX, absDeltaY) < delta) {
      return null;
    }

    // Determine primary direction
    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (absDeltaY > directionalOffsetThreshold) return null;
      return deltaX > 0 ? 'right' : 'left';
    } else {
      // Vertical swipe
      if (absDeltaX > directionalOffsetThreshold) return null;
      return deltaY > 0 ? 'down' : 'up';
    }
  };

  const calculateSwipeData = (
    startTouch: Touch,
    endTouch: Touch,
    startTime: number,
    endTime: number
  ): SwipeDirection => {
    const deltaX = endTouch.clientX - startTouch.clientX;
    const deltaY = endTouch.clientY - startTouch.clientY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = endTime - startTime;
    const velocity = duration > 0 ? distance / duration : 0;
    const direction = calculateDirection(
      startTouch.clientX,
      startTouch.clientY,
      endTouch.clientX,
      endTouch.clientY
    );

    return {
      x: deltaX,
      y: deltaY,
      direction,
      distance,
      velocity
    };
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    touchStartRef.current = touch;
    touchStartTimeRef.current = Date.now();
    setIsSwiping(true);
    
    callbacks.onSwipeStart?.(touch);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;

    if (preventDefaultTouchmoveEvent) {
      e.preventDefault();
    }

    const currentTouch = e.touches[0];
    const currentTime = Date.now();
    
    const swipeData = calculateSwipeData(
      touchStartRef.current,
      currentTouch,
      touchStartTimeRef.current,
      currentTime
    );

    setSwipeDirection(swipeData);
    callbacks.onSwipeMove?.(swipeData);
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStartRef.current || !isSwiping) return;

    const endTime = Date.now();
    const changedTouch = e.changedTouches[0];
    
    const swipeData = calculateSwipeData(
      touchStartRef.current,
      changedTouch,
      touchStartTimeRef.current,
      endTime
    );

    setIsSwiping(false);
    setSwipeDirection(null);
    
    callbacks.onSwipeEnd?.(swipeData);

    // Check if swipe meets criteria for action
    const { direction, distance, velocity } = swipeData;
    
    if (
      direction && 
      distance >= threshold && 
      velocity >= velocityThreshold
    ) {
      switch (direction) {
        case 'left':
          callbacks.onSwipeLeft?.();
          break;
        case 'right':
          callbacks.onSwipeRight?.();
          break;
        case 'up':
          callbacks.onSwipeUp?.();
          break;
        case 'down':
          callbacks.onSwipeDown?.();
          break;
      }
    }

    touchStartRef.current = null;
    touchStartTimeRef.current = 0;
  };

  const handleTouchCancel = () => {
    setIsSwiping(false);
    setSwipeDirection(null);
    touchStartRef.current = null;
    touchStartTimeRef.current = 0;
  };

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefaultTouchmoveEvent });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [callbacks, options]);

  return {
    ref: elementRef,
    isSwiping,
    swipeDirection,
    // Helper methods
    attachSwipeListeners: (element: HTMLDivElement) => {
      elementRef.current = element;
    },
    detachSwipeListeners: () => {
      elementRef.current = null;
    }
  };
};

// Helper hook for common navigation swipe patterns
export const useNavigationSwipes = (callbacks: {
  onSwipeLeftToRight?: () => void; // Usually "back" navigation
  onSwipeRightToLeft?: () => void; // Usually "forward" navigation
  onSwipeUpToDown?: () => void; // Usually "refresh" or "close"
  onSwipeDownToUp?: () => void; // Usually "open" or "show more"
}) => {
  return useSwipeGestures({
    onSwipeRight: callbacks.onSwipeLeftToRight,
    onSwipeLeft: callbacks.onSwipeRightToLeft,
    onSwipeDown: callbacks.onSwipeUpToDown,
    onSwipeUp: callbacks.onSwipeDownToUp
  }, {
    threshold: 60, // Slightly higher threshold for navigation
    velocityThreshold: 0.4,
    directionalOffsetThreshold: 100
  });
};

export default useSwipeGestures;