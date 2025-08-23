import { useState, useEffect, useCallback, useRef } from 'react';
import { Map } from 'leaflet';

interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  markerCount: number;
  viewportUpdates: number;
  lastUpdate: Date;
}

interface MapPerformanceOptions {
  enableMetrics?: boolean;
  targetFps?: number;
  maxMarkers?: number;
  debounceDelay?: number;
}

export const useMapPerformance = (
  map: Map | null,
  options: MapPerformanceOptions = {}
) => {
  const {
    enableMetrics = true,
    targetFps = 30,
    maxMarkers = 200,
    debounceDelay = 150
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    renderTime: 0,
    markerCount: 0,
    viewportUpdates: 0,
    lastUpdate: new Date()
  });

  const [isOptimizing, setIsOptimizing] = useState(false);
  const frameRef = useRef<number | undefined>(undefined);
  const lastFrameTime = useRef<number>(0);
  const frameCount = useRef<number>(0);
  const debounceTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const viewportUpdateCount = useRef<number>(0);

  // FPS monitoring
  useEffect(() => {
    if (!enableMetrics) return;

    const measureFPS = (timestamp: number) => {
      frameCount.current++;
      
      if (timestamp - lastFrameTime.current >= 1000) {
        const fps = Math.round((frameCount.current * 1000) / (timestamp - lastFrameTime.current));
        
        setMetrics(prev => ({
          ...prev,
          fps,
          lastUpdate: new Date()
        }));

        frameCount.current = 0;
        lastFrameTime.current = timestamp;

        // Auto-optimization based on FPS
        if (fps < targetFps && !isOptimizing) {
          setIsOptimizing(true);
        } else if (fps >= targetFps && isOptimizing) {
          setIsOptimizing(false);
        }
      }

      frameRef.current = requestAnimationFrame(measureFPS);
    };

    frameRef.current = requestAnimationFrame(measureFPS);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [enableMetrics, targetFps, isOptimizing]);

  // Debounced event handler creator
  const createDebouncedHandler = useCallback(<T extends any[]>(
    key: string,
    handler: (...args: T) => void,
    delay: number = debounceDelay
  ) => {
    return (...args: T) => {
      // Clear existing timeout
      const existingTimeout = debounceTimeouts.current[key];
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new timeout
      const timeout = setTimeout(() => {
        handler(...args);
        delete debounceTimeouts.current[key];
      }, delay);

      debounceTimeouts.current[key] = timeout;
    };
  }, [debounceDelay]);

  // Optimized viewport change handler
  const handleViewportChange = useCallback(
    createDebouncedHandler(
      'viewport',
      () => {
        viewportUpdateCount.current++;
        setMetrics(prev => ({
          ...prev,
          viewportUpdates: viewportUpdateCount.current
        }));
      },
      100
    ),
    [createDebouncedHandler]
  );

  // Map event listeners for performance monitoring
  useEffect(() => {
    if (!map || !enableMetrics) return;

    const onMove = () => handleViewportChange();
    const onZoom = () => handleViewportChange();
    const onResize = () => handleViewportChange();

    map.on('move', onMove);
    map.on('zoom', onZoom);
    map.on('resize', onResize);

    return () => {
      map.off('move', onMove);
      map.off('zoom', onZoom);
      map.off('resize', onResize);
    };
  }, [map, enableMetrics, handleViewportChange]);

  // Performance optimization recommendations
  const getOptimizationRecommendations = useCallback((): string[] => {
    const recommendations: string[] = [];
    
    if (metrics.fps < targetFps) {
      recommendations.push('Consider reducing marker count or enabling clustering');
    }
    
    if (metrics.markerCount > maxMarkers) {
      recommendations.push('Too many markers visible - enable clustering or viewport filtering');
    }
    
    if (metrics.viewportUpdates > 100) {
      recommendations.push('High viewport update frequency - consider increasing debounce delay');
    }

    return recommendations;
  }, [metrics, targetFps, maxMarkers]);

  // Adaptive quality settings based on performance
  const getAdaptiveSettings = useCallback(() => {
    const settings = {
      enableAnimations: metrics.fps >= targetFps,
      clusteringEnabled: metrics.markerCount > maxMarkers || metrics.fps < targetFps,
      maxVisibleMarkers: metrics.fps < targetFps ? Math.floor(maxMarkers * 0.5) : maxMarkers,
      debounceDelay: metrics.fps < targetFps ? debounceDelay * 1.5 : debounceDelay,
      useSimplifiedPopups: metrics.fps < 20,
      enableMarkerCaching: true
    };

    return settings;
  }, [metrics, targetFps, maxMarkers, debounceDelay]);

  // Performance-optimized timer
  const usePerformanceTimer = useCallback(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      setMetrics(prev => ({
        ...prev,
        renderTime
      }));
      
      return renderTime;
    };
  }, []);

  // Cleanup function
  useEffect(() => {
    return () => {
      // Clear all debounce timeouts
      Object.values(debounceTimeouts.current).forEach(timeout => clearTimeout(timeout));
      debounceTimeouts.current = {};
      
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return {
    metrics,
    isOptimizing,
    createDebouncedHandler,
    getOptimizationRecommendations,
    getAdaptiveSettings,
    usePerformanceTimer,
    updateMarkerCount: useCallback((count: number) => {
      setMetrics(prev => ({ ...prev, markerCount: count }));
    }, [])
  };
};