import { useState, useEffect, useCallback, useMemo } from 'react';

interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // Number of items to render outside visible area
  scrollThreshold?: number; // Threshold to trigger scroll events
}

interface VirtualScrollReturn<T> {
  virtualItems: Array<{
    index: number;
    item: T;
    style: React.CSSProperties;
  }>;
  totalHeight: number;
  scrollElementProps: {
    onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
    style: React.CSSProperties;
  };
  containerProps: {
    style: React.CSSProperties;
  };
}

/**
 * Virtual scrolling hook for large lists performance optimization
 */
export function useVirtualScroll<T>(
  items: T[],
  config: VirtualScrollConfig
): VirtualScrollReturn<T> {
  const {
    itemHeight,
    containerHeight,
    overscan = 5,
    scrollThreshold = 10
  } = config;

  const [scrollTop, setScrollTop] = useState(0);

  // Memoized calculations
  const { startIndex, endIndex, totalHeight } = useMemo(() => {
    const visibleStartIndex = Math.floor(scrollTop / itemHeight);
    const visibleEndIndex = Math.min(
      visibleStartIndex + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    return {
      startIndex: Math.max(0, visibleStartIndex - overscan),
      endIndex: Math.min(items.length - 1, visibleEndIndex + overscan),
      totalHeight: items.length * itemHeight
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Virtual items to render
  const virtualItems = useMemo(() => {
    const items_to_render = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items_to_render.push({
        index: i,
        item: items[i],
        style: {
          position: 'absolute' as const,
          top: i * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight,
        }
      });
    }
    return items_to_render;
  }, [startIndex, endIndex, items, itemHeight]);

  // Throttled scroll handler
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    
    // Only update if scroll difference exceeds threshold
    if (Math.abs(newScrollTop - scrollTop) > scrollThreshold) {
      setScrollTop(newScrollTop);
    }
  }, [scrollTop, scrollThreshold]);

  const scrollElementProps = {
    onScroll: handleScroll,
    style: {
      height: containerHeight,
      overflow: 'auto' as const,
      position: 'relative' as const,
    }
  };

  const containerProps = {
    style: {
      height: totalHeight,
      position: 'relative' as const,
    }
  };

  return {
    virtualItems,
    totalHeight,
    scrollElementProps,
    containerProps,
  };
}

/**
 * Grid virtual scrolling for 2D layouts
 */
interface GridVirtualScrollConfig {
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  overscan?: number;
  gap?: number;
}

interface GridVirtualScrollReturn<T> {
  virtualItems: Array<{
    index: number;
    item: T;
    style: React.CSSProperties;
    row: number;
    col: number;
  }>;
  totalHeight: number;
  scrollElementProps: {
    onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
    style: React.CSSProperties;
  };
  containerProps: {
    style: React.CSSProperties;
  };
}

export function useGridVirtualScroll<T>(
  items: T[],
  config: GridVirtualScrollConfig
): GridVirtualScrollReturn<T> {
  const {
    itemWidth,
    itemHeight,
    containerWidth,
    containerHeight,
    overscan = 2,
    gap = 0
  } = config;

  const [scrollTop, setScrollTop] = useState(0);

  // Calculate columns that fit in container
  const columnsCount = Math.floor((containerWidth + gap) / (itemWidth + gap));
  const rowsCount = Math.ceil(items.length / columnsCount);

  // Visible range calculations
  const { startRow, endRow, totalHeight } = useMemo(() => {
    const effectiveItemHeight = itemHeight + gap;
    const visibleStartRow = Math.floor(scrollTop / effectiveItemHeight);
    const visibleEndRow = Math.min(
      visibleStartRow + Math.ceil(containerHeight / effectiveItemHeight),
      rowsCount - 1
    );

    return {
      startRow: Math.max(0, visibleStartRow - overscan),
      endRow: Math.min(rowsCount - 1, visibleEndRow + overscan),
      totalHeight: rowsCount * effectiveItemHeight - gap
    };
  }, [scrollTop, itemHeight, containerHeight, rowsCount, gap, overscan]);

  // Virtual items to render
  const virtualItems = useMemo(() => {
    const items_to_render = [];
    
    for (let row = startRow; row <= endRow; row++) {
      for (let col = 0; col < columnsCount; col++) {
        const index = row * columnsCount + col;
        if (index >= items.length) break;

        items_to_render.push({
          index,
          item: items[index],
          row,
          col,
          style: {
            position: 'absolute' as const,
            top: row * (itemHeight + gap),
            left: col * (itemWidth + gap),
            width: itemWidth,
            height: itemHeight,
          }
        });
      }
    }
    
    return items_to_render;
  }, [startRow, endRow, columnsCount, items, itemWidth, itemHeight, gap]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  const scrollElementProps = {
    onScroll: handleScroll,
    style: {
      height: containerHeight,
      overflow: 'auto' as const,
      position: 'relative' as const,
    }
  };

  const containerProps = {
    style: {
      height: totalHeight,
      position: 'relative' as const,
    }
  };

  return {
    virtualItems,
    totalHeight,
    scrollElementProps,
    containerProps,
  };
}

/**
 * Dynamic height virtual scrolling for items with variable heights
 */
interface DynamicVirtualScrollConfig {
  estimatedItemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function useDynamicVirtualScroll<T>(
  items: T[],
  config: DynamicVirtualScrollConfig
) {
  const { estimatedItemHeight, containerHeight, overscan = 5 } = config;
  
  const [scrollTop, setScrollTop] = useState(0);
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map());

  // Calculate item positions
  const itemPositions = useMemo(() => {
    const positions: number[] = [];
    let accumulatedHeight = 0;
    
    for (let i = 0; i < items.length; i++) {
      positions[i] = accumulatedHeight;
      const height = itemHeights.get(i) ?? estimatedItemHeight;
      accumulatedHeight += height;
    }
    
    return positions;
  }, [items.length, itemHeights, estimatedItemHeight]);

  const totalHeight = useMemo(() => {
    if (itemPositions.length === 0) return 0;
    const lastIndex = items.length - 1;
    const lastHeight = itemHeights.get(lastIndex) ?? estimatedItemHeight;
    return itemPositions[lastIndex] + lastHeight;
  }, [itemPositions, itemHeights, items.length, estimatedItemHeight]);

  // Find visible range using binary search
  const { startIndex, endIndex } = useMemo(() => {
    if (itemPositions.length === 0) return { startIndex: 0, endIndex: 0 };
    
    let start = 0;
    let end = itemPositions.length - 1;
    
    // Binary search for start index
    while (start < end) {
      const mid = Math.floor((start + end) / 2);
      if (itemPositions[mid] < scrollTop) {
        start = mid + 1;
      } else {
        end = mid;
      }
    }
    
    const visibleStart = Math.max(0, start - overscan);
    const visibleBottom = scrollTop + containerHeight;
    
    // Find end index
    let visibleEnd = visibleStart;
    while (visibleEnd < itemPositions.length && itemPositions[visibleEnd] < visibleBottom) {
      visibleEnd++;
    }
    
    return {
      startIndex: visibleStart,
      endIndex: Math.min(items.length - 1, visibleEnd + overscan)
    };
  }, [scrollTop, containerHeight, itemPositions, items.length, overscan]);

  const virtualItems = useMemo(() => {
    const items_to_render = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const height = itemHeights.get(i) ?? estimatedItemHeight;
      items_to_render.push({
        index: i,
        item: items[i],
        style: {
          position: 'absolute' as const,
          top: itemPositions[i],
          left: 0,
          right: 0,
          height,
        }
      });
    }
    return items_to_render;
  }, [startIndex, endIndex, items, itemHeights, estimatedItemHeight, itemPositions]);

  const measureItem = useCallback((index: number, height: number) => {
    setItemHeights(prev => {
      if (prev.get(index) === height) return prev;
      const newMap = new Map(prev);
      newMap.set(index, height);
      return newMap;
    });
  }, []);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    virtualItems,
    totalHeight,
    measureItem,
    scrollElementProps: {
      onScroll: handleScroll,
      style: {
        height: containerHeight,
        overflow: 'auto' as const,
        position: 'relative' as const,
      }
    },
    containerProps: {
      style: {
        height: totalHeight,
        position: 'relative' as const,
      }
    },
  };
}