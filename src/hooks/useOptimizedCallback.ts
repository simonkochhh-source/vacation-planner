import { useCallback, useRef } from 'react';

// Performance-optimized callback hook with debouncing and memoization
export const useOptimizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  debugName?: string
): T => {
  const callbackRef = useRef(callback);
  const depsRef = useRef(deps);

  // Update callback reference if dependencies changed
  const depsChanged = deps.some((dep, index) => dep !== depsRef.current[index]);
  if (depsChanged) {
    callbackRef.current = callback;
    depsRef.current = deps;
  }

  return useCallback(
    ((...args: Parameters<T>) => {
      const startTime = performance.now();
      
      try {
        const result = callbackRef.current(...args);
        
        // Log slow operations for performance monitoring
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (duration > 16) { // Longer than one frame (60fps)
          console.warn(`Slow callback ${debugName || 'anonymous'}: ${duration.toFixed(2)}ms`);
        }
        
        return result;
      } catch (error) {
        console.error(`Error in callback ${debugName || 'anonymous'}:`, error);
        throw error;
      }
    }) as T,
    deps
  );
};