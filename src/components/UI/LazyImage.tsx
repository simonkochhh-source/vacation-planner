import React, { useState, useRef, useEffect, useCallback } from 'react';
import { performanceMonitor } from '../../utils/performance';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  webpSrc?: string;
  avifSrc?: string;
  sizes?: string;
  srcSet?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
  fallback?: string;
  aspectRatio?: string; // e.g., '16/9', '4/3'
  blur?: boolean; // Apply blur to placeholder
  fade?: boolean; // Fade in animation
  priority?: boolean; // Load image with high priority
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  style = {},
  placeholder,
  webpSrc,
  avifSrc,
  sizes,
  srcSet,
  loading = 'lazy',
  onLoad,
  onError,
  fallback,
  aspectRatio,
  blur = true,
  fade = true,
  priority = false,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholder || '');
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Create intersection observer for lazy loading
  useEffect(() => {
    if (loading === 'eager' || priority) {
      loadImage();
      return;
    }

    const img = imgRef.current;
    if (!img || !('IntersectionObserver' in window)) {
      loadImage();
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          loadImage();
          if (observerRef.current) {
            observerRef.current.unobserve(img);
          }
        }
      },
      {
        rootMargin: '50px 0px', // Load images 50px before they enter viewport
        threshold: 0.1,
      }
    );

    observerRef.current.observe(img);

    return () => {
      if (observerRef.current && img) {
        observerRef.current.unobserve(img);
      }
    };
  }, [src, loading, priority]);

  const loadImage = useCallback(() => {
    const startTime = performance.now();
    const img = new Image();
    
    img.onload = () => {
      const loadTime = performance.now() - startTime;
      performanceMonitor.recordMetric('image.loadTime', loadTime);
      
      setCurrentSrc(src);
      setIsLoaded(true);
      setIsError(false);
      onLoad?.();
    };

    img.onerror = () => {
      setIsError(true);
      if (fallback) {
        setCurrentSrc(fallback);
        setIsLoaded(true);
      }
      onError?.();
    };

    // Use modern formats if available and supported
    if (supportsWebP() && webpSrc) {
      img.src = webpSrc;
    } else if (supportsAvif() && avifSrc) {
      img.src = avifSrc;
    } else {
      img.src = src;
    }

    // Set srcset if provided
    if (srcSet) {
      img.srcset = srcSet;
    }
    if (sizes) {
      img.sizes = sizes;
    }
  }, [src, webpSrc, avifSrc, srcSet, sizes, fallback, onLoad, onError]);

  // Preload critical images
  useEffect(() => {
    if (priority) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = webpSrc && supportsWebP() ? webpSrc : src;
      if (srcSet) link.setAttribute('imagesrcset', srcSet);
      if (sizes) link.setAttribute('imagesizes', sizes);
      document.head.appendChild(link);

      return () => {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      };
    }
  }, [priority, src, webpSrc, srcSet, sizes]);

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const imageStyle: React.CSSProperties = {
    ...style,
    transition: fade ? 'opacity 0.3s ease-in-out' : undefined,
    opacity: isLoaded ? 1 : 0,
    filter: (!isLoaded && blur && placeholder) ? 'blur(5px)' : undefined,
    aspectRatio: aspectRatio,
    objectFit: style.objectFit || 'cover',
    width: style.width || '100%',
    height: style.height || (aspectRatio ? 'auto' : '200px'),
  };

  const placeholderStyle: React.CSSProperties = {
    ...imageStyle,
    opacity: isLoaded ? 0 : 1,
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: !placeholder ? '#f0f0f0' : undefined,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#999',
    fontSize: '14px',
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    display: 'inline-block',
    width: imageStyle.width,
    height: imageStyle.height,
  };

  return (
    <div style={containerStyle} className={className}>
      {/* Placeholder */}
      {!isLoaded && (
        <div style={placeholderStyle}>
          {placeholder ? (
            <img
              src={placeholder}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: blur ? 'blur(5px)' : undefined,
              }}
            />
          ) : (
            <span>Loading...</span>
          )}
        </div>
      )}

      {/* Main image with modern format support */}
      <picture>
        {avifSrc && <source srcSet={avifSrc} type="image/avif" />}
        {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
        <img
          ref={imgRef}
          src={currentSrc || src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          style={imageStyle}
          loading={loading}
          decoding="async"
          onLoad={() => {
            setIsLoaded(true);
            onLoad?.();
          }}
          onError={() => {
            setIsError(true);
            if (fallback) {
              setCurrentSrc(fallback);
              setIsLoaded(true);
            }
            onError?.();
          }}
        />
      </picture>

      {/* Error state */}
      {isError && !fallback && (
        <div style={placeholderStyle}>
          <span>Failed to load image</span>
        </div>
      )}
    </div>
  );
};

// Format support detection with caching
let webpSupport: boolean | null = null;
let avifSupport: boolean | null = null;

function supportsWebP(): boolean {
  if (webpSupport !== null) return webpSupport;
  
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    webpSupport = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    return webpSupport;
  } catch {
    webpSupport = false;
    return false;
  }
}

function supportsAvif(): boolean {
  if (avifSupport !== null) return avifSupport;
  
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    avifSupport = canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
    return avifSupport;
  } catch {
    avifSupport = false;
    return false;
  }
}

export default React.memo(LazyImage);