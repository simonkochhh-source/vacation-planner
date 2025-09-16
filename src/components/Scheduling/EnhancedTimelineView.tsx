import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { Destination, CreateDestinationData, DestinationStatus, DestinationCategory, TransportMode, Coordinates } from '../../types';
import OpenStreetMapAutocomplete from '../Forms/OpenStreetMapAutocomplete';
import { PlacePrediction } from '../../services/openStreetMapService';
import LeafletMapOnly from '../Maps/LeafletMapOnly';
import MapErrorBoundary from '../Maps/MapErrorBoundary';
import {
  Calendar,
  MapPin,
  Route,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  GripVertical,
  Plus,
  X,
  Check,
  Search,
  Car,
  Mountain,
  Bike,
  Edit,
  Save,
  Trash2,
  Home,
  RotateCcw
} from 'lucide-react';
import { 
  formatDate, 
  getCategoryIcon, 
  getCategoryLabel,
  calculateDistance,
  getDestinationBudget
} from '../../utils';

interface EnhancedTimelineViewProps {
  onDestinationClick?: (destination: Destination) => void;
  onEditDestination?: (destination: Destination) => void;
  onReorderDestinations?: (reorderedDestinations: Destination[]) => void;
}

interface TimelineDestination extends Destination {
  calculatedEndTime?: string;
}

interface TimelineDay {
  date: string;
  destinations: TimelineDestination[];
  dayStats: {
    totalDistance: number;
    totalTravelTime: number;
    totalCost: number;
    drivingDistance: number;
    walkingDistance: number;
    bikingDistance: number;
  };
}

interface DragState {
  isDragging: boolean;
  draggedItem: TimelineDestination | null;
  dragOverDay: string | null;
  dragOverIndex: number | null;
  dropTargetIndex?: number | null; // Store original index for drop handling
}

interface OverallStats {
  destinations: number;
  days: number;
  distance: number;
  travelTime: number;
  cost: number;
  drivingDistance: number;
  walkingDistance: number;
  bikingDistance: number;
  hasReferenceBudgets: boolean;
}

const EnhancedTimelineView: React.FC<EnhancedTimelineViewProps> = ({
  onDestinationClick,
  onEditDestination,
  onReorderDestinations
}) => {
  const { currentTrip, destinations, createDestination, updateDestination, deleteDestination, settings } = useSupabaseApp();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItem: null,
    dragOverDay: null,
    dragOverIndex: null,
    dropTargetIndex: null
  });

  const [isProcessingDrop, setIsProcessingDrop] = useState(false);
  const [creatingDestination, setCreatingDestination] = useState<{
    dayDate: string;
    position: 'before' | 'after' | 'initial';
    destinationIndex?: number;
  } | null>(null);
  const [editingDestination, setEditingDestination] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    location: string;
    coordinates?: Coordinates;
    category: DestinationCategory;
    transportMode: TransportMode;
    actualCost?: number;
    isPaid: boolean;
    returnDestinationId?: string;
  }>({
    name: '',
    location: '',
    coordinates: undefined,
    category: DestinationCategory.ATTRACTION,
    transportMode: TransportMode.DRIVING,
    actualCost: undefined,
    isPaid: false,
    returnDestinationId: undefined
  });
  const [newDestinationForm, setNewDestinationForm] = useState<{
    name: string;
    location: string;
    coordinates?: Coordinates;
    endDate: string;
    transportMode: TransportMode;
    category: DestinationCategory;
    actualCost?: number;
    isPaid: boolean;
    returnDestinationId?: string;
  }>({ 
    name: '', 
    location: '', 
    coordinates: undefined,
    endDate: '',
    transportMode: TransportMode.DRIVING,
    category: DestinationCategory.ATTRACTION,
    actualCost: undefined,
    isPaid: false,
    returnDestinationId: undefined
  });

  const [showMapPicker, setShowMapPicker] = useState(false);

  // Removed complex search functionality - now using simple OpenStreetMapAutocomplete
  
  // Pre-defined styles for better performance
  const dropZoneStyles = useMemo(() => ({
    base: {
      height: '8px',
      borderRadius: '4px',
      margin: '4px 0',
      cursor: 'copy',
      transition: 'all 0.2s ease'
    },
    active: {
      height: '12px',
      background: 'linear-gradient(45deg, #3b82f6, #60a5fa)',
      borderRadius: '6px',
      margin: '6px 0',
      cursor: 'copy',
      position: 'relative' as const,
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
      border: '2px solid #1d4ed8',
      transform: 'scale(1.05)'
    },
    inactive: {
      height: '6px',
      background: 'transparent',
      border: '1px dashed #d1d5db',
      borderRadius: '3px',
      margin: '3px 0',
      cursor: 'copy',
      opacity: 0.6,
      transition: 'all 0.2s ease'
    },
    lastActive: {
      height: '16px',
      background: 'linear-gradient(45deg, #10b981, #34d399)',
      borderRadius: '8px',
      margin: '10px 0',
      cursor: 'copy',
      position: 'relative' as const,
      boxShadow: '0 6px 16px rgba(16, 185, 129, 0.4)',
      border: '2px solid #047857',
      transform: 'scale(1.1)'
    },
    lastInactive: {
      height: '10px',
      background: 'transparent',
      border: '2px dashed #d1d5db',
      borderRadius: '5px',
      margin: '6px 0',
      cursor: 'copy',
      opacity: 0.5,
      transition: 'all 0.2s ease'
    }
  }), []);

  // Performance monitoring for drag & drop operations
  const dragPerformanceRef = useRef({
    startTime: 0,
    dragCount: 0,
    dropCount: 0,
    cancelCount: 0
  });

  const logDragPerformance = useCallback((operation: string, additionalData?: any) => {
    const now = performance.now();
    const duration = now - dragPerformanceRef.current.startTime;
    
    console.log(`🔍 Drag Performance [${operation}]:`, {
      operation,
      duration: `${duration.toFixed(2)}ms`,
      totalDrags: dragPerformanceRef.current.dragCount,
      totalDrops: dragPerformanceRef.current.dropCount,
      totalCancels: dragPerformanceRef.current.cancelCount,
      ...additionalData
    });
  }, []);

  // Error boundary for drag operations
  const handleDragError = useCallback((error: Error, context: string) => {
    console.error(`🚨 Drag & Drop Error [${context}]:`, error);
    
    // Reset drag state on error
    setDragState({
      isDragging: false,
      draggedItem: null,
      dragOverDay: null,
      dragOverIndex: null
    });
    
    // Cancel RAF calls
    if (dragOverRafId.current) {
      cancelAnimationFrame(dragOverRafId.current);
      dragOverRafId.current = null;
    }
    
    // Restore visual state
    document.querySelectorAll('[draggable="true"]').forEach(el => {
      (el as HTMLElement).style.opacity = '1';
    });
    
    dragPerformanceRef.current.cancelCount++;
  }, []);

  // Helper function to get transport-specific label
  const getTransportLabel = useCallback((transportMode: TransportMode): string => {
    switch (transportMode) {
      case TransportMode.WALKING:
        return 'Wanderung';
      case TransportMode.BICYCLE:
        return 'Radtour';
      case TransportMode.PUBLIC_TRANSPORT:
        return 'ÖPNV-Fahrt';
      case TransportMode.DRIVING:
      default:
        return 'Fahrt';
    }
  }, []);

  const calculateTravelTime = useCallback((from: Destination, to: Destination): number => {
    if (from.coordinates && to.coordinates) {
      const straightDistance = calculateDistance(from.coordinates, to.coordinates);
      
      // Special case: If current destination (from) is walking/biking with returnDestinationId,
      // use the transport mode from 'from' destination instead of 'to' destination
      let transportMode: TransportMode;
      
      if (from.returnDestinationId && from.transportToNext?.mode && 
          (from.transportToNext.mode === TransportMode.WALKING || from.transportToNext.mode === TransportMode.BICYCLE)) {
        // Use the transport mode from the current (from) destination for walking/biking return journeys
        transportMode = from.transportToNext.mode;
      } else {
        // Default behavior: Get transport mode from 'to' destination (how we get TO that destination)
        transportMode = to.transportToNext?.mode || TransportMode.DRIVING;
      }
      
      // Apply transport-specific distance and speed factors (similar to routeCalculationService)
      let distanceFactor: number;
      let averageSpeed: number;
      
      switch (transportMode) {
        case TransportMode.DRIVING:
          distanceFactor = 1.4; // Roads are typically 40% longer than straight line
          averageSpeed = straightDistance < 5 ? 30 : straightDistance < 50 ? 60 : straightDistance < 200 ? 80 : 90;
          break;
        case TransportMode.WALKING:
          distanceFactor = 1.2; // Walking paths are typically 20% longer
          averageSpeed = 4.5; // Average walking speed: 4.5 km/h
          break;
        case TransportMode.BICYCLE:
          distanceFactor = 1.3; // Bike paths are typically 30% longer
          averageSpeed = straightDistance < 5 ? 12 : straightDistance < 20 ? 15 : 18; // 12-18 km/h depending on distance
          break;
        case TransportMode.PUBLIC_TRANSPORT:
          distanceFactor = 1.6; // Public transport routes are typically 60% longer
          averageSpeed = straightDistance < 10 ? 20 : straightDistance < 50 ? 35 : 50; // Including waiting times
          break;
        default:
          distanceFactor = 1.4;
          averageSpeed = 50;
      }
      
      const actualDistance = straightDistance * distanceFactor;
      const timeInHours = actualDistance / averageSpeed;
      const duration = Math.round(timeInHours * 60);
      
      // Minimum durations based on transport mode
      const minDuration = transportMode === TransportMode.WALKING ? 5 : 10;
      return Math.max(minDuration, duration);
    }
    return 30;
  }, []);

  // Calculate auto travel time, skipping walking/biking destinations in between
  const calculateAutoTravelTime = useCallback((destinations: Destination[], currentIndex: number): { distance: number; time: number; fromDestination?: Destination } => {
    const currentDest = destinations[currentIndex];
    
    // Only for auto transport mode
    if (!currentDest || currentDest.transportToNext?.mode !== TransportMode.DRIVING) {
      return { distance: 0, time: 0 };
    }
    
    // Find the last destination with auto transport mode (working backwards)
    let lastAutoDestIndex = -1;
    for (let i = currentIndex - 1; i >= 0; i--) {
      const dest = destinations[i];
      // Check if this destination has auto transport OR is the starting point
      if (i === 0 || dest.transportToNext?.mode === TransportMode.DRIVING) {
        lastAutoDestIndex = i;
        break;
      }
    }
    
    if (lastAutoDestIndex === -1 || !destinations[lastAutoDestIndex].coordinates || !currentDest.coordinates) {
      return { distance: 0, time: 0 };
    }
    
    const fromDest = destinations[lastAutoDestIndex];
    const straightDistance = calculateDistance(fromDest.coordinates!, currentDest.coordinates);
    
    // Use driving parameters for calculation
    const distanceFactor = 1.4; // Roads are typically 40% longer than straight line
    const actualDistance = straightDistance * distanceFactor;
    const averageSpeed = straightDistance < 5 ? 30 : straightDistance < 50 ? 60 : straightDistance < 200 ? 80 : 90;
    const duration = Math.round((actualDistance / averageSpeed) * 60); // Convert to minutes
    
    return { 
      distance: actualDistance, 
      time: Math.max(10, duration), // Minimum 10 minutes
      fromDestination: fromDest 
    };
  }, []);

  // Enhanced timeline data with time calculations
  const enhancedTimelineData = useMemo((): TimelineDay[] => {
    console.log('🔍 EnhancedTimelineView: Computing timeline data');
    console.log('🎯 Current trip:', currentTrip);
    console.log('📊 All destinations:', destinations);
    console.log('📊 Destinations length:', destinations?.length);
    
    const currentDestinations = currentTrip 
      ? currentTrip.destinations
          .map(id => destinations.find(dest => dest.id === id))
          .filter((dest): dest is Destination => dest !== undefined)
      : [];
      
    console.log('✅ Filtered destinations for current trip:', currentDestinations);
    console.log('✅ Filtered destinations length:', currentDestinations.length);
    
    const grouped = new Map<string, TimelineDestination[]>();
    
    // Group destinations by day
    currentDestinations.forEach(dest => {
      const enhancedDest: TimelineDestination = {
        ...dest
      };

      if (dest.category === 'hotel' && dest.startDate !== dest.endDate) {
        // Multi-day accommodation logic
        const startDate = new Date(dest.startDate);
        const endDate = new Date(dest.endDate);
        
        for (let current = new Date(startDate); current <= endDate; current.setDate(current.getDate() + 1)) {
          const dateKey = current.toISOString().split('T')[0];
          if (!grouped.has(dateKey)) grouped.set(dateKey, []);
          
          const exists = grouped.get(dateKey)!.some(existing => existing.id === dest.id);
          if (!exists) {
            grouped.get(dateKey)!.push(enhancedDest);
          }
        }
      } else {
        const dateKey = dest.startDate;
        if (!grouped.has(dateKey)) grouped.set(dateKey, []);
        grouped.get(dateKey)!.push(enhancedDest);
      }
    });

    // Process each day
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dests]) => {
        // Sort destinations by their position in the trip.destinations array to maintain user-defined order
        const sortedDests = [...dests].sort((a, b) => {
          if (!currentTrip) return 0;
          const indexA = currentTrip.destinations.indexOf(a.id);
          const indexB = currentTrip.destinations.indexOf(b.id);
          return indexA - indexB;
        });

        // Calculate day statistics with breakdown by transport mode
        let totalDistance = 0;
        let totalTravelTime = 0;
        let totalCost = 0;
        let drivingDistance = 0;
        let walkingDistance = 0;
        let bikingDistance = 0;

        // Calculate travel between destinations
        for (let i = 0; i < sortedDests.length - 1; i++) {
          const current = sortedDests[i];
          const next = sortedDests[i + 1];
          
          if (current.coordinates && next.coordinates) {
            const straightDistance = calculateDistance(current.coordinates, next.coordinates);
            const travelTime = calculateTravelTime(current, next);
            
            // Get transport mode from the current destination
            const transportMode = current.transportToNext?.mode || TransportMode.DRIVING;
            
            // Apply transport-specific distance factor
            let distanceFactor: number;
            switch (transportMode) {
              case TransportMode.DRIVING:
                distanceFactor = 1.4; // Roads are typically 40% longer than straight line
                break;
              case TransportMode.WALKING:
                distanceFactor = 1.2; // Walking paths are typically 20% longer
                break;
              case TransportMode.BICYCLE:
                distanceFactor = 1.3; // Bike paths are typically 30% longer
                break;
              case TransportMode.PUBLIC_TRANSPORT:
                distanceFactor = 1.6; // Public transport routes are typically 60% longer
                break;
              default:
                distanceFactor = 1.4;
            }
            
            const actualDistance = straightDistance * distanceFactor;
            
            // Add to appropriate category
            switch (transportMode) {
              case TransportMode.DRIVING:
                drivingDistance += actualDistance;
                break;
              case TransportMode.WALKING:
                walkingDistance += actualDistance;
                break;
              case TransportMode.BICYCLE:
                bikingDistance += actualDistance;
                break;
              case TransportMode.PUBLIC_TRANSPORT:
                // Count public transport as driving for cost calculations
                drivingDistance += actualDistance;
                break;
            }
            
            totalDistance += actualDistance;
            totalTravelTime += travelTime;

            // Calculate travel cost (only for driving/public transport)
            if (transportMode === TransportMode.DRIVING || transportMode === TransportMode.PUBLIC_TRANSPORT) {
              if (currentTrip?.vehicleConfig) {
                const { fuelConsumption, fuelPrice } = currentTrip.vehicleConfig;
                totalCost += (actualDistance / 100) * (fuelConsumption || 9.0) * (fuelPrice || 1.65);
              } else {
                totalCost += actualDistance * 0.30;
              }
            }
          }
        }

        return {
          date,
          destinations: sortedDests,
          dayStats: {
            totalDistance,
            totalTravelTime,
            totalCost,
            drivingDistance,
            walkingDistance,
            bikingDistance
          }
        };
      });
  }, [destinations, currentTrip, calculateTravelTime]);

  // Drag and drop handlers
  const handleDragStart = useCallback((dest: TimelineDestination, e: React.DragEvent) => {
    try {
      // Don't allow new drag while processing a drop
      if (isProcessingDrop) {
        e.preventDefault();
        return;
      }

      // Start performance monitoring
      dragPerformanceRef.current.startTime = performance.now();
      dragPerformanceRef.current.dragCount++;

      console.log('🚀 Starting drag for:', dest.name);
      logDragPerformance('dragStart', { destinationName: dest.name });
    
      // Create custom drag image for better visual feedback
      const dragElement = e.currentTarget as HTMLElement;
      const dragImage = dragElement.cloneNode(true) as HTMLElement;
      dragImage.style.position = 'absolute';
      dragImage.style.top = '-1000px';
      dragImage.style.opacity = '0.8';
      dragImage.style.transform = 'rotate(2deg)';
      dragImage.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
      dragImage.style.borderRadius = '12px';
      dragImage.style.border = '2px solid #3b82f6';
      dragImage.style.background = '#ffffff';
      dragImage.style.minWidth = '200px';
      document.body.appendChild(dragImage);
      
      // Set custom drag image
      e.dataTransfer?.setDragImage(dragImage, dragElement.offsetWidth / 2, dragElement.offsetHeight / 2);
      
      // Clean up drag image after a delay
      setTimeout(() => {
        if (document.body.contains(dragImage)) {
          document.body.removeChild(dragImage);
        }
      }, 100);
      
      setDragState({
        isDragging: true,
        draggedItem: dest,
        dragOverDay: null,
        dragOverIndex: null,
        dropTargetIndex: null
      });
      
      // Enhanced drag data - CRITICAL for drop to work
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        // MUST set some data for drop to work in most browsers
        e.dataTransfer.setData('text/plain', dest.id);
        e.dataTransfer.setData('application/json', JSON.stringify({
          id: dest.id,
          name: dest.name,
          sourceDay: dest.startDate
        }));
        console.log('📦 Drag data set:', dest.id);
      }
      
      // Add visual feedback to the dragged element
      (e.target as HTMLElement).style.opacity = '0.5';
    } catch (error) {
      handleDragError(error as Error, 'dragStart');
    }
  }, [isProcessingDrop, logDragPerformance, handleDragError]);

  // Enhanced throttled drag over with RAF for optimal performance
  const lastDragOverTime = useRef(0);
  const dragOverRafId = useRef<number | null>(null);
  
  const throttledDragOver = useCallback((dayDate: string, visualIndex: number, originalIndex?: number) => {
    const now = Date.now();
    
    // Use original index for drop handling if provided, otherwise use visual index
    const indexForDrop = originalIndex !== undefined ? originalIndex : visualIndex;
    
    // Cancel previous RAF if exists
    if (dragOverRafId.current) {
      cancelAnimationFrame(dragOverRafId.current);
    }
    
    // Throttle to ~60fps (16ms) for smooth experience
    if (now - lastDragOverTime.current > 16) {
      setDragState(prev => {
        if (prev.dragOverDay === dayDate && prev.dragOverIndex === visualIndex) {
          return prev; // No change, prevent re-render
        }
        return {
          ...prev,
          dragOverDay: dayDate,
          dragOverIndex: visualIndex, // Use visual index for display
          dropTargetIndex: indexForDrop // Store original index for drop handling
        };
      });
      lastDragOverTime.current = now;
    } else {
      // Schedule for next frame
      dragOverRafId.current = requestAnimationFrame(() => {
        setDragState(prev => {
          if (prev.dragOverDay === dayDate && prev.dragOverIndex === visualIndex) {
            return prev;
          }
          return {
            ...prev,
            dragOverDay: dayDate,
            dragOverIndex: visualIndex, // Use visual index for display
            dropTargetIndex: indexForDrop // Store original index for drop handling
          };
        });
        lastDragOverTime.current = Date.now();
      });
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, dayDate: string, index: number) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling that might interfere
    
    // Don't process drag over if we're processing a drop
    if (isProcessingDrop || !dragState.isDragging) {
      return;
    }
    
    console.log('🔄 DragOver detected:', dayDate, 'index:', index);
    
    // Find the destination at this position for context
    const currentDestinations = currentTrip 
      ? currentTrip.destinations
          .map(id => destinations.find(dest => dest.id === id))
          .filter((dest): dest is Destination => dest !== undefined && dest.startDate === dayDate)
      : [];
    const destAtIndex = currentDestinations[index];
    if (destAtIndex) {
      console.log('📍 Drop would be BEFORE:', destAtIndex.name);
    } else {
      console.log('📍 Drop would be at END of day');
    }
    
    // Enhanced visual feedback - CRITICAL for drop to work
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
      e.dataTransfer.effectAllowed = 'move';
    }
    
    // Calculate the visual index for drop zone highlighting
    // We need to adjust the visual index if we're dragging within the same day
    let visualIndex = index;
    
    if (dragState.draggedItem && dragState.draggedItem.startDate === dayDate) {
      // Find the current position of the dragged item in this day
      const draggedItemDayIndex = currentDestinations.findIndex(d => d.id === dragState.draggedItem!.id);
      
      // If the drop target is after the dragged item's original position,
      // we need to adjust the visual index down by 1 for correct visual feedback
      if (draggedItemDayIndex !== -1 && index > draggedItemDayIndex) {
        visualIndex = index - 1;
        console.log(`🎨 Visual index adjusted from ${index} to ${visualIndex} for display`);
      }
    }
    
    // Skip unnecessary updates for better performance
    if (dragState.dragOverDay === dayDate && dragState.dragOverIndex === visualIndex) {
      return;
    }
    
    // Auto-scroll functionality for better UX
    const container = (e.currentTarget as HTMLElement).closest('[data-timeline-container]');
    if (container) {
      const rect = container.getBoundingClientRect();
      const mouseY = e.clientY;
      const scrollTop = container.scrollTop;
      const scrollThreshold = 100;
      
      // Auto-scroll up
      if (mouseY < rect.top + scrollThreshold) {
        container.scrollTop = Math.max(0, scrollTop - 10);
      }
      // Auto-scroll down
      else if (mouseY > rect.bottom - scrollThreshold) {
        container.scrollTop = scrollTop + 10;
      }
    }
    
    // Use the visual index for display and original index for drop handling
    throttledDragOver(dayDate, visualIndex, index);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [throttledDragOver, isProcessingDrop, dragState.isDragging]);

  // Add dragenter handler - required for HTML5 drag & drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔽 DragEnter detected');
    
    // Force set the drop effect to ensure drop is allowed
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }, []);


  const handleDragEnd = useCallback((e: React.DragEvent) => {
    console.log('🏁 Drag ended - this will be handled by drop or timeout');
    
    // Restore visual state of dragged element
    (e.target as HTMLElement).style.opacity = '1';
    
    // Cancel any pending RAF calls
    if (dragOverRafId.current) {
      cancelAnimationFrame(dragOverRafId.current);
      dragOverRafId.current = null;
    }
    
    // Set timeout fallback to reset state if drop doesn't occur
    setTimeout(() => {
      if (dragState.isDragging && !isProcessingDrop) {
        console.log('⏰ Drag end timeout - resetting state');
        setDragState({
          isDragging: false,
          draggedItem: null,
          dragOverDay: null,
          dragOverIndex: null,
          dropTargetIndex: null
        });
      }
    }, 20000); // 20 seconds timeout for cleanup
  }, [dragState.isDragging, isProcessingDrop]);

  // Global drop event debugging
  useEffect(() => {
    const globalDropHandler = (e: DragEvent) => {
      console.log('🌍 GLOBAL DROP EVENT detected!', e);
      // Don't prevent default here, just log
    };

    const globalDragOverHandler = (e: DragEvent) => {
      // console.log('🌍 Global dragover'); // Too verbose
    };

    if (dragState.isDragging) {
      document.addEventListener('drop', globalDropHandler);
      document.addEventListener('dragover', globalDragOverHandler);
      
      return () => {
        document.removeEventListener('drop', globalDropHandler);
        document.removeEventListener('dragover', globalDragOverHandler);
      };
    }
  }, [dragState.isDragging]);

  // Enhanced global event listeners with keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragState.isDragging) {
        console.log('⚠️ Drag canceled by Escape key');
        // Cancel RAF calls
        if (dragOverRafId.current) {
          cancelAnimationFrame(dragOverRafId.current);
          dragOverRafId.current = null;
        }
        setDragState({
          isDragging: false,
          draggedItem: null,
          dragOverDay: null,
          dragOverIndex: null,
          dropTargetIndex: null
        });
        // Restore visual state of all dragged elements
        document.querySelectorAll('[draggable="true"]').forEach(el => {
          (el as HTMLElement).style.opacity = '1';
        });
      }
      
      // Enhanced keyboard navigation during drag
      if (dragState.isDragging && dragState.draggedItem) {
        
        switch(e.key) {
          case 'ArrowUp':
            e.preventDefault();
            // Move to previous drop zone
            if (dragState.dragOverIndex !== null && dragState.dragOverIndex > 0) {
              throttledDragOver(dragState.dragOverDay!, dragState.dragOverIndex - 1);
            }
            break;
          case 'ArrowDown':
            e.preventDefault();
            // Move to next drop zone
            if (dragState.dragOverIndex !== null && dragState.dragOverDay) {
              throttledDragOver(dragState.dragOverDay, dragState.dragOverIndex + 1);
            }
            break;
          case 'Enter':
          case ' ':
            e.preventDefault();
            // Execute drop at current position via direct handler call
            if (dragState.dragOverDay && dragState.dragOverIndex !== null) {
              console.log('🎯 Keyboard drop triggered');
              // Create a mock event that satisfies the interface
              const mockEvent = {
                preventDefault: () => {},
                dataTransfer: {
                  getData: (format: string) => dragState.draggedItem!.id,
                  setData: () => {},
                  effectAllowed: 'move' as const,
                  dropEffect: 'move' as const
                }
              };
              // Use type assertion to satisfy TypeScript
              const targetIndex = (dragState.dropTargetIndex !== null && dragState.dropTargetIndex !== undefined) 
                ? dragState.dropTargetIndex 
                : dragState.dragOverIndex;
              if (targetIndex !== null) {
                handleDrop(mockEvent as any, dragState.dragOverDay, targetIndex);
              }
            }
            break;
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      // Cancel drag if clicking outside the timeline area while dragging
      if (dragState.isDragging && !isProcessingDrop) {
        const target = e.target as HTMLElement;
        const timelineContainer = document.querySelector('[data-timeline-container]');
        if (timelineContainer && !timelineContainer.contains(target)) {
          console.log('⚠️ Drag canceled by clicking outside');
          setDragState({
            isDragging: false,
            draggedItem: null,
            dragOverDay: null,
            dragOverIndex: null,
            dropTargetIndex: null
          });
        }
      }
    };

    if (dragState.isDragging) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('mousedown', handleClickOutside);
        
        // Cancel any pending RAF calls on cleanup
        if (dragOverRafId.current) {
          cancelAnimationFrame(dragOverRafId.current);
          dragOverRafId.current = null;
        }
        
        // Restore visual state of all dragged elements on cleanup
        document.querySelectorAll('[draggable="true"]').forEach(el => {
          (el as HTMLElement).style.opacity = '1';
        });
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragState.isDragging, isProcessingDrop, throttledDragOver]);

  const handleDrop = useCallback(async (e: React.DragEvent, targetDay: string, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    console.log('🎯 DROP HANDLER CALLED! Drop triggered for', targetDay, 'index', targetIndex);
    console.log('📦 Received drag data:', e.dataTransfer?.getData('text/plain'));
    
    // Use dropTargetIndex from dragState if available for accurate drop positioning
    const actualTargetIndex = dragState.dropTargetIndex !== null && dragState.dropTargetIndex !== undefined 
      ? dragState.dropTargetIndex 
      : targetIndex;
    console.log(`🎯 Using drop index: ${actualTargetIndex} (visual: ${targetIndex}, stored: ${dragState.dropTargetIndex})`);
    
    // Increment drop counter for performance monitoring
    dragPerformanceRef.current.dropCount++;
    logDragPerformance('dropStart', { targetDay, actualTargetIndex });
    
    // Ultra-fast prevention of multiple simultaneous drops
    if (isProcessingDrop) {
      console.warn('Drop already in progress, ignoring...');
      return;
    }
    
    if (!dragState.draggedItem || !currentTrip || !onReorderDestinations) {
      setDragState({
        isDragging: false,
        draggedItem: null,
        dragOverDay: null,
        dragOverIndex: null,
        dropTargetIndex: null
      });
      return;
    }

    setIsProcessingDrop(true);
    
    // Extended timeout to allow for longer drag operations
    const timeoutId = setTimeout(() => {
      console.warn('Drop operation timed out after 20 seconds, resetting state');
      setIsProcessingDrop(false);
      setDragState({
        isDragging: false,
        draggedItem: null,
        dragOverDay: null,
        dragOverIndex: null,
        dropTargetIndex: null
      });
    }, 20000); // 20 seconds timeout as requested - operations should complete much faster

    const draggedItem = dragState.draggedItem;
    const draggedDestination = destinations.find(d => d.id === draggedItem.id);
    
    if (!draggedDestination) {
      console.error('Dragged destination not found in destinations array');
      setIsProcessingDrop(false);
      setDragState({
        isDragging: false,
        draggedItem: null,
        dragOverDay: null,
        dragOverIndex: null,
        dropTargetIndex: null
      });
      return;
    }

    // Prevent dropping on itself (same position, same day)
    if (draggedDestination.startDate === targetDay) {
      const currentDayDests = destinations.filter(d => d.startDate === targetDay);
      const currentIndex = currentDayDests.findIndex(d => d.id === draggedItem.id);
      if (currentIndex === actualTargetIndex) {
        // Same position, just cleanup
        setIsProcessingDrop(false);
        setDragState({
          isDragging: false,
          draggedItem: null,
          dragOverDay: null,
          dragOverIndex: null,
          dropTargetIndex: null
        });
        return;
      }
    }
    
    try {
      console.log(`🚀 Instant Reordering: Moving ${draggedDestination.name} to ${targetDay} at position ${actualTargetIndex}`);
      
      // PROPER UPDATE STRATEGY: Complete reordering first, then update UI
      
      // Step 1: Clear timeout but keep drag state until reordering is done
      clearTimeout(timeoutId);
      
      // Step 2: Smart reordering based on whether it's same-day or cross-day
      const newDestinationIds = [...currentTrip.destinations];
      const draggedId = draggedItem.id;
      const draggedCurrentDate = draggedDestination.startDate;
      
      // Remove from current position
      const currentIndex = newDestinationIds.indexOf(draggedId);
      if (currentIndex !== -1) {
        newDestinationIds.splice(currentIndex, 1);
      }
      
      let globalTargetIndex: number;
      
      if (draggedCurrentDate === targetDay) {
        // INTRA-DAY REORDERING: Much simpler logic
        console.log(`📍 Intra-day reorder within ${targetDay}, actualTargetIndex: ${actualTargetIndex}`);
        
        // Get the current destinations for this day before any modifications
        const currentDestinations = currentTrip 
          ? currentTrip.destinations
              .map(id => destinations.find(dest => dest.id === id))
              .filter((dest): dest is Destination => dest !== undefined && dest.startDate === targetDay)
          : [];
        
        // Find all destinations for the same day (excluding the dragged one)
        const sameDayIds: string[] = [];
        const destinationDateMap = new Map<string, string>();
        destinations.forEach(dest => {
          destinationDateMap.set(dest.id, dest.startDate);
        });
        
        let foundDayStart = false;
        let dayStartIndex = 0;
        
        for (let i = 0; i < newDestinationIds.length; i++) {
          const id = newDestinationIds[i];
          const destDate = destinationDateMap.get(id);
          
          if (destDate === targetDay) {
            if (!foundDayStart) {
              foundDayStart = true;
              dayStartIndex = i;
            }
            sameDayIds.push(id);
          } else if (foundDayStart) {
            // We've passed the target day
            break;
          }
        }
        
        // Calculate insertion point within the day
        // IMPORTANT: When dragging within the same day, we need to account for the fact that
        // the dragged item was already removed from newDestinationIds at this point
        let adjustedTargetIndex = actualTargetIndex;
        
        // Find the original position of the dragged item within the day
        const draggedItemOriginalDayIndex = currentDestinations.findIndex((d: Destination) => d.id === draggedId);
        
        // If the target index is after the original position, we need to adjust it down by 1
        // because the original item was already removed from the array
        if (draggedItemOriginalDayIndex !== -1 && actualTargetIndex > draggedItemOriginalDayIndex) {
          adjustedTargetIndex = actualTargetIndex - 1;
          console.log(`🔧 Adjusting target index from ${actualTargetIndex} to ${adjustedTargetIndex} (dragged item was at position ${draggedItemOriginalDayIndex})`);
        }
        
        globalTargetIndex = dayStartIndex + Math.min(adjustedTargetIndex, sameDayIds.length);
        console.log(`🔢 Index calculation - dayStartIndex: ${dayStartIndex}, originalTargetIndex: ${actualTargetIndex}, adjustedTargetIndex: ${adjustedTargetIndex}, sameDayIds.length: ${sameDayIds.length}, globalTargetIndex: ${globalTargetIndex}`);
        
      } else {
        // CROSS-DAY REORDERING: Fixed logic for precise positioning
        console.log(`🔄 Cross-day reorder from ${draggedCurrentDate} to ${targetDay}, actualTargetIndex: ${actualTargetIndex}`);
        
        const destinationDateMap = new Map<string, string>();
        destinations.forEach(dest => {
          destinationDateMap.set(dest.id, dest.startDate);
        });
        
        // Use same strategy as intra-day: find day start + offset
        let foundTargetDayStart = false;
        let targetDayStartIndex = 0;
        let targetDayCount = 0;
        
        for (let i = 0; i < newDestinationIds.length; i++) {
          const id = newDestinationIds[i];
          const destDate = destinationDateMap.get(id);
          
          if (destDate === targetDay) {
            if (!foundTargetDayStart) {
              foundTargetDayStart = true;
              targetDayStartIndex = i;
            }
            targetDayCount++;
          } else if (foundTargetDayStart) {
            // We've passed the target day
            break;
          }
        }
        
        // Calculate precise insertion point within target day
        globalTargetIndex = targetDayStartIndex + Math.min(actualTargetIndex, targetDayCount);
        
        console.log(`📊 Cross-day calculation: dayStart=${targetDayStartIndex}, dayCount=${targetDayCount}, actualTargetIndex=${actualTargetIndex}, result=${globalTargetIndex}`);
      }
      
      // Insert at calculated position
      console.log(`🎯 Inserting ${draggedDestination.name} at global index ${globalTargetIndex}`);
      newDestinationIds.splice(globalTargetIndex, 0, draggedId);
      
      // Step 3: Build optimized destinations array (minimal object creation)
      const reorderedDestinations = newDestinationIds.map(id => {
        if (id === draggedId) {
          return {
            ...draggedDestination, 
            startDate: targetDay, 
            endDate: draggedDestination.category === DestinationCategory.HOTEL ? draggedDestination.endDate : targetDay
          };
        }
        return destinations.find(dest => dest.id === id)!;
      });
      
      // Step 4: Fire-and-forget background updates (no await blocking)
      
      // Execute reorder synchronously (since it's not async)
      try {
        onReorderDestinations(reorderedDestinations);
        console.log('✅ Destinations reordered synchronously');
        logDragPerformance('dropComplete', { 
          draggedDestination: draggedDestination.name,
          targetDay, 
          actualTargetIndex,
          reorderedCount: reorderedDestinations.length 
        });
        
        // Step 5: Reset UI state AFTER successful reordering
        setDragState({
          isDragging: false,
          draggedItem: null,
          dragOverDay: null,
          dragOverIndex: null,
          dropTargetIndex: null
        });
        setIsProcessingDrop(false);
      } catch (err) {
        console.error('❌ Sync reorder failed:', err);
        
        // Reset state even on error
        setDragState({
          isDragging: false,
          draggedItem: null,
          dragOverDay: null,
          dragOverIndex: null,
          dropTargetIndex: null
        });
        setIsProcessingDrop(false);
      }
      
      // Handle async destination date update if needed
      if (draggedDestination.startDate !== targetDay) {
        updateDestination(draggedId, {
          startDate: targetDay,
          endDate: draggedDestination.category === DestinationCategory.HOTEL ? draggedDestination.endDate : targetDay
        }).then(() => {
          console.log('✅ Background destination date update completed');
        }).catch((err: any) => {
          console.error('❌ Background destination update failed:', err);
        });
      }
      
    } catch (error) {
      console.error('❌ Failed to calculate drag position:', error);
      // For calculation errors, immediately reset UI state
      clearTimeout(timeoutId);
      setIsProcessingDrop(false);
      setDragState({
        isDragging: false,
        draggedItem: null,
        dragOverDay: null,
        dragOverIndex: null,
        dropTargetIndex: null
      });
    }
    // Note: No finally block needed since we handle cleanup in the try block for optimistic updates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragState.draggedItem, currentTrip, destinations, updateDestination, onReorderDestinations, isProcessingDrop, logDragPerformance]);

  // Mobile navigation
  const currentDayIndex = useMemo(() => {
    if (!selectedDay) return 0;
    return enhancedTimelineData.findIndex(day => day.date === selectedDay);
  }, [enhancedTimelineData, selectedDay]);

  const navigateDay = useCallback((direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? currentDayIndex - 1 : currentDayIndex + 1;
    if (newIndex >= 0 && newIndex < enhancedTimelineData.length) {
      setSelectedDay(enhancedTimelineData[newIndex].date);
    }
  }, [currentDayIndex, enhancedTimelineData]);

  // Statistics
  // Inline destination creation handlers
  const handleCreateDestination = useCallback(async () => {
    if (!creatingDestination || !currentTrip) return;

    try {
      const destinationData: CreateDestinationData = {
        name: newDestinationForm.name,
        location: newDestinationForm.location,
        coordinates: newDestinationForm.coordinates,
        startDate: creatingDestination.dayDate,
        endDate: newDestinationForm.category === DestinationCategory.HOTEL ? newDestinationForm.endDate : creatingDestination.dayDate,
        category: newDestinationForm.category,
        budget: 0,
        status: DestinationStatus.PLANNED,
        notes: newDestinationForm.transportMode !== TransportMode.DRIVING 
          ? `Transportmodus: ${getTransportModeLabel(newDestinationForm.transportMode)}` 
          : '',
        tags: newDestinationForm.transportMode !== TransportMode.DRIVING 
          ? [getTransportModeLabel(newDestinationForm.transportMode).toLowerCase()]
          : [],
        returnDestinationId: newDestinationForm.returnDestinationId
      };

      const createdDestination = await createDestination(destinationData);
      
      // Update the created destination with actualCost if provided
      if (createdDestination && newDestinationForm.actualCost !== undefined && newDestinationForm.actualCost !== null) {
        console.log(`Saving actualCost ${newDestinationForm.actualCost} for new destination "${createdDestination.name}"`);
        await updateDestination(createdDestination.id, { actualCost: newDestinationForm.actualCost });
      }

      // Position the destination correctly based on creatingDestination position
      if (createdDestination && onReorderDestinations && creatingDestination.position !== 'initial') {
        // Get all current destinations for the trip, including the newly created one
        const allDestinations = [...destinations, createdDestination];
        const currentTripDestinations = currentTrip.destinations
          .map(id => allDestinations.find(dest => dest.id === id))
          .filter((dest): dest is Destination => dest !== undefined);

        // Remove the newly created destination from the current list (it was added at the end)
        const existingDestinations = currentTripDestinations.filter(dest => dest.id !== createdDestination.id);
        
        // Get destinations for the target day sorted by their current order within the trip
        const sameDayDestinations = existingDestinations
          .filter(dest => dest.startDate === creatingDestination.dayDate)
          .sort((a, b) => {
            // Sort by existing position within the trip to maintain current order
            const aIndex = currentTrip.destinations.indexOf(a.id);
            const bIndex = currentTrip.destinations.indexOf(b.id);
            return aIndex - bIndex;
          });
        
        let insertIndex: number;
        
        if (creatingDestination.position === 'before' && creatingDestination.destinationIndex !== undefined) {
          // destinationIndex is relative to the day's sorted destinations
          insertIndex = creatingDestination.destinationIndex;
        } else if (creatingDestination.position === 'after' && creatingDestination.destinationIndex !== undefined) {
          // destinationIndex is relative to the day's sorted destinations, add 1 for 'after'
          insertIndex = creatingDestination.destinationIndex + 1;
        } else {
          // Default: add at the end of the same day destinations
          insertIndex = sameDayDestinations.length;
        }
        
        // Ensure insertIndex is within bounds
        insertIndex = Math.max(0, Math.min(insertIndex, sameDayDestinations.length));
        
        // Insert the new destination at the correct position within the same day
        sameDayDestinations.splice(insertIndex, 0, createdDestination);
        
        // Rebuild the full destination list maintaining order for all days
        const allDaysDestinations = existingDestinations.filter(dest => dest.startDate !== creatingDestination.dayDate);
        
        // Group all destinations by day, including our modified same-day destinations
        const destinationsByDay = new Map<string, Destination[]>();
        
        // Add other days' destinations maintaining their order
        allDaysDestinations.forEach(dest => {
          if (!destinationsByDay.has(dest.startDate)) {
            destinationsByDay.set(dest.startDate, []);
          }
          destinationsByDay.get(dest.startDate)!.push(dest);
        });
        
        // Sort destinations within each day by their original trip order
        destinationsByDay.forEach((dayDestinations, dayKey) => {
          if (dayKey !== creatingDestination.dayDate) { // Don't re-sort the day we just modified
            dayDestinations.sort((a, b) => {
              const aIndex = currentTrip.destinations.indexOf(a.id);
              const bIndex = currentTrip.destinations.indexOf(b.id);
              return aIndex - bIndex;
            });
            destinationsByDay.set(dayKey, dayDestinations);
          }
        });
        
        // Add our modified same-day destinations
        destinationsByDay.set(creatingDestination.dayDate, sameDayDestinations);
        
        // Sort days by date and flatten the destinations while maintaining day-internal order
        const sortedDays = Array.from(destinationsByDay.keys()).sort();
        const finalDestinations = sortedDays.flatMap(date => destinationsByDay.get(date) || []);

        await onReorderDestinations(finalDestinations);
      }

      // Clone return destination if returnDestinationId is provided
      if (createdDestination && newDestinationForm.returnDestinationId) {
        let returnDestination: Destination | undefined;
        
        if (newDestinationForm.returnDestinationId === 'home' && settings.homePoint) {
          // Create a home destination object for cloning
          returnDestination = {
            id: 'temp-home',
            name: settings.homePoint.name,
            location: settings.homePoint.address,
            coordinates: settings.homePoint.coordinates,
            startDate: createdDestination.endDate,
            endDate: createdDestination.endDate,
            category: DestinationCategory.OTHER,
            status: DestinationStatus.PLANNED,
            notes: '',
            photos: [],
            tags: ['home'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } as Destination;
        } else {
          returnDestination = destinations.find(dest => dest.id === newDestinationForm.returnDestinationId);
        }
        
        if (returnDestination) {
          // Clone the return destination and place it after the current destination
          // Use the transport mode of the original destination for the return journey
          const clonedDestinationData: CreateDestinationData = {
            name: returnDestination.name,
            location: returnDestination.location,
            coordinates: returnDestination.coordinates,
            startDate: createdDestination.endDate, // Use end date of the created destination
            endDate: createdDestination.endDate, // Same day return
            category: returnDestination.category,
            budget: returnDestination.budget,
            status: DestinationStatus.PLANNED,
            notes: `Rückweg von ${createdDestination.name} (${getTransportModeLabel(newDestinationForm.transportMode)})`,
            tags: [...returnDestination.tags, 'rückweg'],
            color: returnDestination.color
          };

          const clonedDestination = await createDestination(clonedDestinationData);
          
          // Set the transport mode of the cloned destination to match the original destination's transport mode
          if (clonedDestination) {
            await updateDestination(clonedDestination.id, {
              transportToNext: {
                mode: newDestinationForm.transportMode, // Use original destination's transport mode
                duration: 0,
                distance: 0
              }
            });
          }
          
          // Reorder destinations to place the cloned destination right after the original
          if (clonedDestination && onReorderDestinations) {
            const allDestinationsWithCloned = [...destinations, createdDestination, clonedDestination];
            const currentTripDestinationsWithCloned = currentTrip.destinations
              .map(id => allDestinationsWithCloned.find(dest => dest.id === id))
              .filter((dest): dest is Destination => dest !== undefined);
            
            // Add the cloned destinations to the list
            currentTripDestinationsWithCloned.push(clonedDestination);
            
            // Find the position of the created destination and insert the cloned one after it
            const createdIndex = currentTripDestinationsWithCloned.findIndex(dest => dest.id === createdDestination.id);
            if (createdIndex !== -1 && createdIndex < currentTripDestinationsWithCloned.length - 1) {
              // Remove the cloned destination from the end and insert it after the created destination
              const clonedDest = currentTripDestinationsWithCloned.pop()!;
              currentTripDestinationsWithCloned.splice(createdIndex + 1, 0, clonedDest);
            }
            
            await onReorderDestinations(currentTripDestinationsWithCloned);
          }
        }
      }
      
      // Hide the form after successful creation
      setCreatingDestination(null);
      setNewDestinationForm({ 
        name: '', 
        location: '', 
        coordinates: undefined,
        endDate: '',
        transportMode: TransportMode.DRIVING,
        category: DestinationCategory.ATTRACTION,
        actualCost: undefined,
        isPaid: false,
        returnDestinationId: undefined
      });
    } catch (error) {
      console.error('Failed to create destination:', error);
      // Even if there's an error, hide the form to prevent double-entry
      setCreatingDestination(null);
      setNewDestinationForm({ 
        name: '', 
        location: '', 
        coordinates: undefined,
        endDate: '',
        transportMode: TransportMode.DRIVING,
        category: DestinationCategory.ATTRACTION,
        actualCost: undefined,
        isPaid: false,
        returnDestinationId: undefined
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatingDestination, currentTrip, newDestinationForm, createDestination, updateDestination, destinations, onReorderDestinations]);

  // Handle place selection from autocomplete
  const handlePlaceSelect = useCallback((place: PlacePrediction) => {
    setNewDestinationForm(prev => ({
      ...prev,
      name: place.structured_formatting.main_text,
      location: place.display_name,
      coordinates: place.coordinates
    }));
  }, []);

  const handleUseHomePoint = useCallback(() => {
    if (settings.homePoint) {
      setNewDestinationForm(prev => ({
        ...prev,
        name: 'Zuhause',
        location: settings.homePoint!.address,
        coordinates: settings.homePoint!.coordinates
      }));
    }
  }, [settings.homePoint]);

  const handleUseHomePointForEdit = useCallback(() => {
    if (settings.homePoint) {
      setEditForm(prev => ({
        ...prev,
        name: 'Zuhause',
        location: settings.homePoint!.address,
        coordinates: settings.homePoint!.coordinates
      }));
    }
  }, [settings.homePoint]);

  const resetForm = useCallback(() => {
    setNewDestinationForm({ 
      name: '', 
      location: '', 
      coordinates: undefined,
      endDate: '',
      transportMode: TransportMode.DRIVING,
      category: DestinationCategory.ATTRACTION,
      actualCost: undefined,
      isPaid: false
    });
  }, []);

  // Edit destination handlers
  const handleStartEdit = useCallback((destination: Destination) => {
    setEditingDestination(destination.id);
    setEditForm({
      name: destination.name,
      location: destination.location,
      coordinates: destination.coordinates,
      category: destination.category,
      transportMode: destination.transportToNext?.mode || TransportMode.DRIVING,
      actualCost: destination.actualCost,
      isPaid: !!destination.actualCost,
      returnDestinationId: destination.returnDestinationId
    });
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingDestination) return;
    
    try {
      console.log(`Updating destination "${editForm.name}" with actualCost: ${editForm.actualCost}`);
      const originalDestination = destinations.find(dest => dest.id === editingDestination);
      const originalReturnDestinationId = originalDestination?.returnDestinationId;
      
      await updateDestination(editingDestination, {
        name: editForm.name,
        location: editForm.location,
        coordinates: editForm.coordinates,
        category: editForm.category,
        actualCost: editForm.actualCost !== undefined && editForm.actualCost !== null ? editForm.actualCost : undefined,
        transportToNext: editForm.transportMode ? {
          mode: editForm.transportMode,
          duration: 0,
          distance: 0
        } : undefined,
        returnDestinationId: editForm.returnDestinationId
      });
      
      // Handle return destination logic for walking/biking destinations
      if (editForm.transportMode === TransportMode.WALKING || editForm.transportMode === TransportMode.BICYCLE) {
        
        // If returnDestinationId changed or was newly added
        if (editForm.returnDestinationId !== originalReturnDestinationId) {
          
          // First, find and remove any existing cloned return destination
          if (originalReturnDestinationId && currentTrip) {
            const existingClonedDestinations = destinations.filter(dest => 
              currentTrip.destinations.includes(dest.id) &&
              dest.tags.includes('rückweg') &&
              dest.notes?.includes(`Rückweg von ${originalDestination?.name}`)
            );
            
            for (const clonedDest of existingClonedDestinations) {
              await deleteDestination(clonedDest.id);
            }
          }
          
          // Then create new cloned destination if returnDestinationId is set
          if (editForm.returnDestinationId) {
            let returnDestination: Destination | undefined;
            
            if (editForm.returnDestinationId === 'home' && settings.homePoint) {
              // Create a home destination object for cloning
              returnDestination = {
                id: 'temp-home',
                name: settings.homePoint.name,
                location: settings.homePoint.address,
                coordinates: settings.homePoint.coordinates,
                startDate: originalDestination?.endDate || originalDestination?.startDate || '',
                endDate: originalDestination?.endDate || originalDestination?.startDate || '',
                category: DestinationCategory.OTHER,
                status: DestinationStatus.PLANNED,
                notes: '',
                photos: [],
                tags: ['home'],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              } as Destination;
            } else {
              returnDestination = destinations.find(dest => dest.id === editForm.returnDestinationId);
            }
            
            if (returnDestination && originalDestination) {
              // Clone the return destination and place it after the current destination
              // Use the transport mode of the original destination for the return journey
              const clonedDestinationData: CreateDestinationData = {
                name: returnDestination.name,
                location: returnDestination.location,
                coordinates: returnDestination.coordinates,
                startDate: originalDestination.endDate, // Use end date of the edited destination
                endDate: originalDestination.endDate, // Same day return
                category: returnDestination.category,
                budget: returnDestination.budget,
                status: DestinationStatus.PLANNED,
                notes: `Rückweg von ${originalDestination.name} (${getTransportModeLabel(editForm.transportMode)})`,
                tags: [...returnDestination.tags, 'rückweg'],
                color: returnDestination.color
              };

              const clonedDestination = await createDestination(clonedDestinationData);
              
              // Set the transport mode of the cloned destination to match the original destination's transport mode
              if (clonedDestination) {
                await updateDestination(clonedDestination.id, {
                  transportToNext: {
                    mode: editForm.transportMode, // Use original destination's transport mode
                    duration: 0,
                    distance: 0
                  }
                });
              }
              
              // Reorder destinations to place the cloned destination right after the original
              if (clonedDestination && onReorderDestinations && currentTrip) {
                const allDestinationsWithCloned = [...destinations, clonedDestination];
                const currentTripDestinationsWithCloned = currentTrip.destinations
                  .map(id => allDestinationsWithCloned.find(dest => dest.id === id))
                  .filter((dest): dest is Destination => dest !== undefined);
                
                // Add the cloned destinations to the list
                currentTripDestinationsWithCloned.push(clonedDestination);
                
                // Find the position of the edited destination and insert the cloned one after it
                const editedIndex = currentTripDestinationsWithCloned.findIndex(dest => dest.id === editingDestination);
                if (editedIndex !== -1 && editedIndex < currentTripDestinationsWithCloned.length - 1) {
                  // Remove the cloned destination from the end and insert it after the edited destination
                  const clonedDest = currentTripDestinationsWithCloned.pop()!;
                  currentTripDestinationsWithCloned.splice(editedIndex + 1, 0, clonedDest);
                }
                
                await onReorderDestinations(currentTripDestinationsWithCloned);
              }
            }
          }
        }
      }
      
      setEditingDestination(null);
    } catch (error) {
      console.error('Failed to update destination:', error);
    }
  }, [editingDestination, editForm, updateDestination, destinations, currentTrip, settings, createDestination, deleteDestination, onReorderDestinations]);

  const handleCancelEdit = useCallback(() => {
    setEditingDestination(null);
  }, []);

  const handleDeleteDestination = useCallback(async (destinationId: string) => {
    if (!window.confirm('Möchten Sie dieses Ziel wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return;
    }

    try {
      await deleteDestination(destinationId);
      // Close any open forms related to this destination
      if (editingDestination === destinationId) {
        setEditingDestination(null);
      }
    } catch (error) {
      console.error('Failed to delete destination:', error);
      alert('Fehler beim Löschen des Ziels. Bitte versuchen Sie es erneut.');
    }
  }, [deleteDestination, editingDestination]);

  const handleEditPlaceSelect = useCallback((place: PlacePrediction) => {
    setEditForm(prev => ({
      ...prev,
      name: place.structured_formatting.main_text,
      location: place.display_name,
      coordinates: place.coordinates
    }));
  }, []);

  // Map picker handlers
  const handleOpenMapPicker = useCallback(() => {
    console.log('🗺️ Opening map picker, showMapPicker will be:', true);
    setShowMapPicker(true);
    console.log('🗺️ Map picker state set to:', true);
  }, []);

  const handleCloseMapPicker = useCallback(() => {
    setShowMapPicker(false);
  }, []);

  const handleMapLocationSelect = useCallback((coordinates: Coordinates, address?: string) => {
    if (editingDestination) {
      // If editing, update the edit form
      setEditForm(prev => ({
        ...prev,
        coordinates,
        location: address || `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`
      }));
    } else {
      // If creating new, update the new destination form
      setNewDestinationForm(prev => ({
        ...prev,
        coordinates,
        location: address || `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`
      }));
    }
  }, [editingDestination]);

  const getTransportModeLabel = (mode: TransportMode): string => {
    switch (mode) {
      case TransportMode.DRIVING: return 'Auto';
      case TransportMode.WALKING: return 'Wanderung';
      case TransportMode.BICYCLE: return 'Fahrrad';
      case TransportMode.PUBLIC_TRANSPORT: return 'Öffentlich';
      default: return 'Auto';
    }
  };

  // Check if a destination is a cloned return destination
  const isClonedReturnDestination = (destination: Destination): boolean => {
    return destination.notes?.includes('Rückweg von') || false;
  };


  const handleCancelCreation = useCallback(() => {
    setCreatingDestination(null);
    resetForm();
  }, [resetForm]);

  const handleStartCreation = useCallback((dayDate: string, position: 'before' | 'after' | 'initial', destinationIndex?: number) => {
    setCreatingDestination({ dayDate, position, destinationIndex });
    setNewDestinationForm(prev => ({ 
      ...prev, 
      endDate: dayDate
    }));
  }, []);

  const overallStats: OverallStats = useMemo(() => {
    let hasReferenceBudgets = false;

    const totalStats = enhancedTimelineData.reduce((acc, day) => {
      // Check for reference values in this day's destinations
      day.destinations.forEach(dest => {
        if (getDestinationBudget(dest).isReference) {
          hasReferenceBudgets = true;
        }
      });

      return {
        destinations: acc.destinations + day.destinations.length,
        days: acc.days + 1,
        distance: acc.distance + day.dayStats.totalDistance,
        travelTime: acc.travelTime + day.dayStats.totalTravelTime,
        cost: acc.cost + day.dayStats.totalCost,
        drivingDistance: acc.drivingDistance + day.dayStats.drivingDistance,
        walkingDistance: acc.walkingDistance + day.dayStats.walkingDistance,
        bikingDistance: acc.bikingDistance + day.dayStats.bikingDistance
      };
    }, {
      destinations: 0,
      days: 0,
      distance: 0,
      travelTime: 0,
      cost: 0,
      drivingDistance: 0,
      walkingDistance: 0,
      bikingDistance: 0
    });

    return {
      ...totalStats,
      hasReferenceBudgets
    };
  }, [enhancedTimelineData]);

  if (!currentTrip) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
        padding: '3rem',
        color: '#6b7280'
      }}>
        <Calendar size={48} style={{ opacity: 0.5 }} />
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Keine Reise ausgewählt</h2>
        <p style={{ margin: 0, textAlign: 'center' }}>
          Wählen Sie eine Reise aus, um die erweiterte Zeitplanung anzuzeigen.
        </p>
      </div>
    );
  }

  return (
    <>
    <div data-timeline-container style={{ padding: '1.5rem' }}>
      {/* Enhanced Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#1f2937'
          }}>
            📅 Erweiterte Timeline
          </h1>
          <p style={{
            margin: 0,
            color: '#6b7280',
            fontSize: '1rem'
          }}>
            {currentTrip.name} • {formatDate(currentTrip.startDate)} - {formatDate(currentTrip.endDate)}
          </p>
        </div>

      </div>

      {/* Enhanced Statistics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>


        {/* Übergeordnete Gesamtreisestrecke-Kachel */}
        <div style={{
          background: '#f0f9ff',
          border: '1px solid #7dd3fc',
          borderRadius: '12px',
          padding: '1.5rem',
          gridColumn: '1 / -1' // Spannt über alle Spalten
        }}>
          {/* Header der übergeordneten Kachel */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            <Route size={20} style={{ color: '#0284c7' }} />
            <span style={{ fontSize: '1.125rem', color: '#0284c7', fontWeight: '700' }}>
              Gesamtstrecke
            </span>
          </div>
          
          {/* Gesamtdistanz */}
          <div style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold', 
            color: '#0c4a6e',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            {Math.round(overallStats.distance)}km
          </div>

          {/* Eingebettete Transportmodi-Kacheln */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem'
          }}>
            {/* Auto-Strecke */}
            {overallStats.drivingDistance > 0 && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <Car size={16} style={{ color: '#0284c7' }} />
                  <span style={{ fontSize: '0.875rem', color: '#0284c7', fontWeight: '600' }}>
                    Auto
                  </span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0284c7' }}>
                  {Math.round(overallStats.drivingDistance)}km
                </div>
              </div>
            )}

            {/* Wandern-Strecke */}
            {overallStats.walkingDistance > 0 && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <Mountain size={16} style={{ color: '#059669' }} />
                  <span style={{ fontSize: '0.875rem', color: '#059669', fontWeight: '600' }}>
                    Wandern
                  </span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
                  {Math.round(overallStats.walkingDistance)}km
                </div>
              </div>
            )}

            {/* Fahrrad-Strecke */}
            {overallStats.bikingDistance > 0 && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <Bike size={16} style={{ color: '#dc2626' }} />
                  <span style={{ fontSize: '0.875rem', color: '#dc2626', fontWeight: '600' }}>
                    Fahrrad
                  </span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>
                  {Math.round(overallStats.bikingDistance)}km
                </div>
              </div>
            )}
          </div>
        </div>


      </div>

      {/* Timeline Content */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        {enhancedTimelineData.length === 0 ? (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <Calendar size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>
              Keine Ziele geplant
            </h3>
            <p style={{ margin: '0 0 2rem 0' }}>
              Erstellen Sie Ihr erstes Reiseziel, um mit der Planung zu beginnen.
            </p>
            
            {/* Initial destination creation */}
            {!creatingDestination ? (
              <button
                onClick={() => handleStartCreation(currentTrip!.startDate, 'initial')}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '1rem 2rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  margin: '0 auto',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#2563eb';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#3b82f6';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <Plus size={20} />
                Erstes Ziel erstellen
              </button>
            ) : (
              <div style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '1.5rem',
                maxWidth: '600px',
                margin: '0 auto'
              }}>
                <h4 style={{
                  margin: '0 0 1.5rem 0',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  textAlign: 'center'
                }}>
                  Neues Ziel erstellen
                </h4>
                
                {/* Simplified Search Description */}
                <div style={{
                  background: '#f0f9ff',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  textAlign: 'center'
                }}>
                  <p style={{
                    margin: 0,
                    color: '#1e40af',
                    fontSize: '0.875rem'
                  }}>
                    ✨ Verwenden Sie die erweiterte Ortssuche unten für präzise Ergebnisse und Karten-Integration
                  </p>
                </div>

                {/* Manual Input Fields */}
                <div style={{
                  display: 'grid',
                  gap: '1rem',
                  gridTemplateColumns: '1fr 1fr',
                  marginBottom: '1rem'
                }}>
                  <OpenStreetMapAutocomplete
                    value={newDestinationForm.name}
                    onChange={(value) => setNewDestinationForm(prev => ({ ...prev, name: value }))}
                    onPlaceSelect={handlePlaceSelect}
                    placeholder="Suche nach Zielen (z.B. 'Brandenburger Tor')"
                    style={{
                      gridColumn: '1 / -1'
                    }}
                  />
                  
                  <div style={{
                    gridColumn: '1 / -1',
                    position: 'relative'
                  }}>
                    <input
                      type="text"
                      placeholder="Adresse (wird automatisch gefüllt)"
                      value={newDestinationForm.location}
                      onChange={(e) => setNewDestinationForm(prev => ({ ...prev, location: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        paddingRight: settings.homePoint ? '5.5rem' : '3rem', // Extra space for home button when available
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        backgroundColor: newDestinationForm.coordinates ? '#f0f9ff' : 'white',
                        borderColor: newDestinationForm.coordinates ? '#0ea5e9' : '#e5e7eb'
                      }}
                      readOnly={!!newDestinationForm.coordinates}
                    />
                    {/* Home Point Button */}
                    {settings.homePoint && (
                      <button
                        type="button"
                        onClick={handleUseHomePoint}
                        style={{
                          position: 'absolute',
                          right: '50px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: '#059669',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '0.375rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title={`Zuhause auswählen: ${settings.homePoint.name}`}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = '#047857';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = '#059669';
                        }}
                      >
                        <Home size={16} />
                      </button>
                    )}
                    
                    {/* Map Picker Button */}
                    <button
                      type="button"
                      onClick={handleOpenMapPicker}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '0.375rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Ort auf Karte auswählen"
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#2563eb';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = '#3b82f6';
                      }}
                    >
                      <MapPin size={16} />
                    </button>
                  </div>
                </div>

                {/* Date Options */}
                <div style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  {newDestinationForm.category === DestinationCategory.HOTEL ? (
                    // Hotel mode: Always show end date as required
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.75rem'
                      }}>
                        Abreisedatum *
                      </label>
                      <input
                        type="date"
                        value={newDestinationForm.endDate}
                        onChange={(e) => setNewDestinationForm(prev => ({ ...prev, endDate: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '0.875rem'
                        }}
                        required
                      />
                    </div>
                  ) : (
                    // Non-hotel mode: End date is hidden but automatically set
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#6b7280',
                      fontStyle: 'italic',
                      marginBottom: '0.5rem'
                    }}>
                      Enddatum wird automatisch auf das gleiche Datum gesetzt
                    </div>
                  )}
                </div>

                {/* Transport Mode */}
                <div style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.75rem'
                  }}>
                    Transportmodus
                  </label>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.5rem'
                  }}>
                    {[
                      { mode: TransportMode.DRIVING, label: 'Auto', icon: <Car size={16} /> },
                      { mode: TransportMode.WALKING, label: 'Wanderung', icon: <Mountain size={16} /> },
                      { mode: TransportMode.BICYCLE, label: 'Fahrrad', icon: <Bike size={16} /> },
                      { mode: TransportMode.PUBLIC_TRANSPORT, label: 'Öffentlich', icon: <Route size={16} /> }
                    ].map(({ mode, label, icon }) => (
                      <button
                        key={mode}
                        onClick={() => setNewDestinationForm(prev => ({ ...prev, transportMode: mode }))}
                        style={{
                          background: newDestinationForm.transportMode === mode ? '#eff6ff' : 'white',
                          border: newDestinationForm.transportMode === mode ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: newDestinationForm.transportMode === mode ? '#1e40af' : '#374151',
                          transition: 'all 0.2s'
                        }}
                      >
                        {icon}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Return Destination Selection (only for walking/biking) */}
                {(newDestinationForm.transportMode === TransportMode.WALKING || newDestinationForm.transportMode === TransportMode.BICYCLE) && (
                  <div style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.75rem'
                    }}>
                      Rückweg zu (optional)
                    </label>
                    
                    <div style={{
                      position: 'relative'
                    }}>
                      <select
                        value={newDestinationForm.returnDestinationId || ''}
                        onChange={(e) => setNewDestinationForm(prev => ({ 
                          ...prev, 
                          returnDestinationId: e.target.value || undefined 
                        }))}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          background: 'white'
                        }}
                      >
                        <option value="">Kein Rückweg</option>
                        {settings.homePoint && (
                          <option value="home">🏠 {settings.homePoint.name}</option>
                        )}
                        {currentTrip && destinations
                          .filter(dest => currentTrip.destinations.includes(dest.id))
                          .map(dest => (
                            <option key={dest.id} value={dest.id}>
                              {getCategoryIcon(dest.category)} {dest.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    
                    {newDestinationForm.returnDestinationId && (
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem',
                        background: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        color: '#0369a1'
                      }}>
                        💡 Ein Rückweg-Ziel wird automatisch nach diesem Ziel erstellt
                      </div>
                    )}
                  </div>
                )}

                {/* Category Selection */}
                <div style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.75rem'
                  }}>
                    Kategorie
                  </label>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '0.5rem',
                    marginBottom: '0.75rem'
                  }}>
                    {Object.values(DestinationCategory).map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => {
                          setNewDestinationForm(prev => ({ 
                            ...prev, 
                            category: category,
                            // Set endDate for hotels, keep current day date for others
                            endDate: category === DestinationCategory.HOTEL ? '' : (creatingDestination?.dayDate || prev.endDate)
                          }));
                        }}
                        style={{
                          background: newDestinationForm.category === category ? '#dbeafe' : 'white',
                          border: newDestinationForm.category === category ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '0.75rem 0.5rem',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          color: newDestinationForm.category === category ? '#1e40af' : '#374151',
                          transition: 'all 0.2s',
                          minHeight: '70px'
                        }}
                        onMouseOver={(e) => {
                          if (newDestinationForm.category !== category) {
                            e.currentTarget.style.background = '#f3f4f6';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (newDestinationForm.category !== category) {
                            e.currentTarget.style.background = 'white';
                          }
                        }}
                      >
                        <span style={{ fontSize: '1.5rem' }}>
                          {getCategoryIcon(category)}
                        </span>
                        <span style={{ textAlign: 'center', lineHeight: '1.2' }}>
                          {getCategoryLabel(category)}
                        </span>
                      </button>
                    ))}
                  </div>
                  
                  {newDestinationForm.category === DestinationCategory.HOTEL && (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem',
                      background: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      color: '#0891b2'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🏨</span>
                        <span>Bei Hotels ist ein Abreisedatum erforderlich</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Kosten & Bezahlt-Status */}
                <div style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.75rem'
                  }}>
                    Kosten & Bezahlung
                  </label>
                  
                  <div style={{
                    marginBottom: '1rem'
                  }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginBottom: '0.25rem'
                    }}>
                      Kosten (€)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={newDestinationForm.actualCost || ''}
                      onChange={(e) => setNewDestinationForm(prev => ({ 
                        ...prev, 
                        actualCost: e.target.value ? parseFloat(e.target.value) : undefined 
                      }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '1rem'
                      }}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <input
                      type="checkbox"
                      id="isPaid-main"
                      checked={newDestinationForm.isPaid}
                      onChange={(e) => setNewDestinationForm(prev => ({ 
                        ...prev, 
                        isPaid: e.target.checked
                      }))}
                      style={{
                        width: '18px',
                        height: '18px'
                      }}
                    />
                    <label htmlFor="isPaid-main" style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151'
                    }}>
                      Bereits bezahlt
                    </label>
                    {newDestinationForm.isPaid && (
                      <span style={{
                        fontSize: '0.75rem',
                        color: '#059669',
                        fontWeight: '500'
                      }}>
                        ✓ Bezahlt
                      </span>
                    )}
                  </div>
                </div>
                
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  justifyContent: 'center',
                  marginTop: '1.5rem'
                }}>
                  <button
                    onClick={handleCreateDestination}
                    disabled={
                      !newDestinationForm.name || 
                      !newDestinationForm.location ||
                      (newDestinationForm.category === DestinationCategory.HOTEL && !newDestinationForm.endDate)
                    }
                    style={{
                      background: (
                        !newDestinationForm.name || 
                        !newDestinationForm.location ||
                        (newDestinationForm.category === DestinationCategory.HOTEL && !newDestinationForm.endDate)
                      ) ? '#9ca3af' : '#16a34a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: (
                        !newDestinationForm.name || 
                        !newDestinationForm.location ||
                        (newDestinationForm.category === DestinationCategory.HOTEL && !newDestinationForm.endDate)
                      ) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Check size={16} />
                    Erstellen
                  </button>
                  
                  <button
                    onClick={handleCancelCreation}
                    style={{
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <X size={16} />
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          enhancedTimelineData.map((day, dayIndex) => (
            <div key={day.date} style={{
              borderBottom: dayIndex < enhancedTimelineData.length - 1 ? '1px solid #e5e7eb' : 'none'
            }}>
              {/* Day Header */}
              <div style={{
                background: '#f8fafc',
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    📅 {formatDate(day.date)}
                  </h3>
                  <span style={{
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    {day.destinations.length} Ziele
                  </span>
                </div>

                {/* Day Statistics */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  fontSize: '0.875rem',
                  color: '#6b7280'
                }}>
                  <span>
                    <Route size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                    {Math.round(day.dayStats.totalDistance)}km
                  </span>
                </div>
              </div>

              {/* Day Timeline */}
              <div style={{ padding: '1rem 1.5rem' }}>
                {/* Add first destination button */}
                {!creatingDestination && day.destinations.length > 0 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <button
                      onClick={() => handleStartCreation(day.date, 'before', 0)}
                      style={{
                        background: 'white',
                        color: '#3b82f6',
                        border: '1px dashed #3b82f6',
                        borderRadius: '20px',
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#eff6ff';
                        e.currentTarget.style.transform = 'scale(1.02)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <Plus size={14} />
                      Ziel hinzufügen
                    </button>
                  </div>
                )}
                
                {day.destinations.map((dest, destIndex) => (
                  <div key={dest.id}>
                    {/* Drop Zone - Before each destination when dragging */}
                    {dragState.isDragging && (
                      <div
                        onDragEnter={handleDragEnter}
                        onDragOver={(e) => handleDragOver(e, day.date, destIndex)}
                        onDrop={(e) => handleDrop(e, day.date, destIndex)}
                        style={dragState.dragOverDay === day.date && dragState.dragOverIndex === destIndex 
                          ? dropZoneStyles.active 
                          : dropZoneStyles.inactive}
                      >
                        {dragState.dragOverDay === day.date && dragState.dragOverIndex === destIndex && (
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: '#3b82f6',
                            color: 'white',
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none'
                          }}>
                            Hier ablegen
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Add Destination Button - Between destinations only (not before first) */}
                    {!creatingDestination && !dragState.isDragging && destIndex > 0 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginBottom: '0.5rem'
                      }}>
                        <button
                          onClick={() => handleStartCreation(day.date, 'before', destIndex)}
                          style={{
                            background: 'white',
                            color: '#3b82f6',
                            border: '1px dashed #3b82f6',
                            borderRadius: '20px',
                            padding: '0.5rem 1rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = '#eff6ff';
                            e.currentTarget.style.transform = 'scale(1.02)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          <Plus size={14} />
                          Ziel hinzufügen
                        </button>
                      </div>
                    )}

                    {/* Inline Creation Form - Before */}
                    {creatingDestination?.dayDate === day.date && 
                     creatingDestination?.position === 'before' && 
                     creatingDestination?.destinationIndex === destIndex && (
                      <div style={{
                        background: '#f0f9ff',
                        border: '1px solid #3b82f6',
                        borderRadius: '12px',
                        padding: '1rem',
                        marginBottom: '1rem'
                      }}>
                        <h4 style={{
                          margin: '0 0 1rem 0',
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#1f2937',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <Plus size={16} style={{ color: '#3b82f6' }} />
                          Neues Ziel vor "{dest.name}"
                        </h4>
                        
                        {/* Simplified Search Info */}
                        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            padding: '0.5rem'
                          }}>
                            <Search size={16} style={{ color: '#6b7280', marginRight: '0.5rem' }} />
                            <input
                              type="text"
                              placeholder="Ziel suchen..."
                              value={newDestinationForm.name}
                              onChange={(e) => setNewDestinationForm(prev => ({ ...prev, name: e.target.value }))}
                              style={{
                                border: 'none',
                                outline: 'none',
                                flex: 1,
                                fontSize: '0.875rem',
                                background: 'transparent'
                              }}
                              autoFocus
                            />
                          </div>
                          
                          {/* Search Results Removed - Using OpenStreetMapAutocomplete below */}
                          {false && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              background: 'white',
                              border: '1px solid #e5e7eb',
                              borderTop: 'none',
                              borderRadius: '0 0 6px 6px',
                              maxHeight: '150px',
                              overflowY: 'auto',
                              zIndex: 10,
                              boxShadow: '0 2px 4px rgb(0 0 0 / 0.1)'
                            }}>
                              {[].map((result, index) => (
                                <button
                                  key={index}
                                  onClick={() => {}}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    textAlign: 'left',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    borderBottom: 'none',
                                    fontSize: '0.75rem'
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.background = '#f9fafb';
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                  }}
                                >
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                  }}>
                                    <div style={{ fontSize: '1rem' }}>
                                      {'📍'}
                                    </div>
                                    <div>
                                      <div style={{
                                        fontWeight: '500',
                                        color: '#1f2937'
                                      }}>
                                        {'Placeholder'}
                                      </div>
                                      <div style={{
                                        color: '#6b7280',
                                        fontSize: '0.7rem'
                                      }}>
                                        {'Not used'}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Manual Input Fields */}
                        <div style={{
                          display: 'grid',
                          gap: '0.75rem',
                          gridTemplateColumns: '1fr 1fr',
                          marginBottom: '0.75rem'
                        }}>
                          <OpenStreetMapAutocomplete
                            value={newDestinationForm.name}
                            onChange={(value) => setNewDestinationForm(prev => ({ ...prev, name: value }))}
                            onPlaceSelect={handlePlaceSelect}
                            placeholder="Ziel suchen (z.B. 'Brandenburger Tor')"
                            style={{
                              gridColumn: '1 / -1',
                              marginBottom: '0.75rem'
                            }}
                          />

                          {/* Location/Address Field with Map Picker */}
                          <div style={{ 
                            position: 'relative',
                            gridColumn: '1 / -1',
                            marginBottom: '0.75rem'
                          }}>
                            <input
                              type="text"
                              placeholder="Ort/Adresse (optional - aus Suche übernommen oder Karte nutzen)"
                              value={newDestinationForm.location}
                              onChange={(e) => setNewDestinationForm(prev => ({ ...prev, location: e.target.value }))}
                              style={{
                                width: '100%',
                                padding: settings.homePoint ? '0.75rem 5.5rem 0.75rem 0.75rem' : '0.75rem 3rem 0.75rem 0.75rem', // Extra space for home button when available
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                backgroundColor: newDestinationForm.coordinates ? '#f0f9ff' : 'white',
                                borderColor: newDestinationForm.coordinates ? '#0ea5e9' : '#e5e7eb'
                              }}
                              readOnly={!!newDestinationForm.coordinates}
                            />
                            {/* Home Point Button */}
                            {settings.homePoint && (
                              <button
                                type="button"
                                onClick={handleUseHomePoint}
                                style={{
                                  position: 'absolute',
                                  right: '40px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  background: '#059669',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '0.25rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '2rem',
                                  height: '2rem'
                                }}
                                title={`Zuhause auswählen: ${settings.homePoint.name}`}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.background = '#047857';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.background = '#059669';
                                }}
                              >
                                <Home size={14} />
                              </button>
                            )}
                            
                            {/* Map Picker Button */}
                            <button
                              type="button"
                              onClick={handleOpenMapPicker}
                              style={{
                                position: 'absolute',
                                right: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.25rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '2rem',
                                height: '2rem'
                              }}
                              title="Standort auf Karte auswählen"
                            >
                              <MapPin size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Date Options */}
                        <div style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          marginBottom: '0.75rem'
                        }}>
                          {newDestinationForm.category === DestinationCategory.HOTEL && (
                            <div style={{ marginBottom: '0.5rem' }}>
                              <label style={{
                                display: 'block',
                                fontSize: '0.7rem',
                                color: '#6b7280',
                                marginBottom: '0.25rem'
                              }}>
                                Abreisedatum
                              </label>
                              <input
                                type="date"
                                value={newDestinationForm.endDate}
                                onChange={(e) => setNewDestinationForm(prev => ({ ...prev, endDate: e.target.value }))}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem'
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Transport Mode */}
                        <div style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          marginBottom: '0.75rem'
                        }}>
                          <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '0.5rem'
                          }}>
                            Transportmodus
                          </label>
                          
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '0.5rem'
                          }}>
                            {[
                              { mode: TransportMode.DRIVING, label: 'Auto', icon: <Car size={14} /> },
                              { mode: TransportMode.WALKING, label: 'Wanderung', icon: <Mountain size={14} /> },
                              { mode: TransportMode.BICYCLE, label: 'Fahrrad', icon: <Bike size={14} /> },
                              { mode: TransportMode.PUBLIC_TRANSPORT, label: 'Öffentlich', icon: <Route size={14} /> }
                            ].map(({ mode, label, icon }) => (
                              <button
                                key={mode}
                                onClick={() => setNewDestinationForm(prev => ({ ...prev, transportMode: mode }))}
                                style={{
                                  background: newDestinationForm.transportMode === mode ? '#eff6ff' : 'white',
                                  border: newDestinationForm.transportMode === mode ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                  borderRadius: '6px',
                                  padding: '0.5rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  color: newDestinationForm.transportMode === mode ? '#1e40af' : '#374151',
                                  transition: 'all 0.2s'
                                }}
                              >
                                {icon}
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Category Selection */}
                        <div style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          marginBottom: '0.75rem'
                        }}>
                          <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '0.5rem'
                          }}>
                            Kategorie
                          </label>
                          
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '0.5rem',
                            marginBottom: '0.5rem'
                          }}>
                            {Object.values(DestinationCategory).map((category) => (
                              <button
                                key={category}
                                type="button"
                                onClick={() => {
                                  setNewDestinationForm(prev => ({ 
                                    ...prev, 
                                    category: category,
                                    // Set endDate for hotels, keep current day date for others
                                    endDate: category === DestinationCategory.HOTEL ? '' : (creatingDestination?.dayDate || prev.endDate)
                                  }));
                                }}
                                style={{
                                  background: newDestinationForm.category === category ? '#dbeafe' : 'white',
                                  border: newDestinationForm.category === category ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                  borderRadius: '6px',
                                  padding: '0.5rem 0.25rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                  fontSize: '0.7rem',
                                  fontWeight: '500',
                                  color: newDestinationForm.category === category ? '#1e40af' : '#374151',
                                  transition: 'all 0.2s',
                                  minHeight: '60px'
                                }}
                                onMouseOver={(e) => {
                                  if (newDestinationForm.category !== category) {
                                    e.currentTarget.style.background = '#f3f4f6';
                                  }
                                }}
                                onMouseOut={(e) => {
                                  if (newDestinationForm.category !== category) {
                                    e.currentTarget.style.background = 'white';
                                  }
                                }}
                              >
                                <span style={{ fontSize: '1.2rem' }}>
                                  {getCategoryIcon(category)}
                                </span>
                                <span>{getCategoryLabel(category)}</span>
                              </button>
                            ))}
                          </div>
                          
                          {newDestinationForm.category === DestinationCategory.HOTEL && (
                            <div style={{
                              marginTop: '0.5rem',
                              padding: '0.5rem',
                              background: '#f0f9ff',
                              border: '1px solid #bae6fd',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              color: '#0c4a6e'
                            }}>
                              ℹ️ Hotels benötigen ein Abreisedatum
                            </div>
                          )}
                        </div>

                        {/* Kosten und Bezahlt-Status */}
                        <div style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          marginBottom: '0.75rem'
                        }}>
                          <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '0.5rem'
                          }}>
                            Kosten & Bezahlung
                          </label>
                          
                          <div style={{
                            marginBottom: '0.75rem'
                          }}>
                            <label style={{
                              display: 'block',
                              fontSize: '0.7rem',
                              color: '#6b7280',
                              marginBottom: '0.25rem'
                            }}>
                              Kosten (€)
                            </label>
                            <input
                              type="number"
                              placeholder="0"
                              value={newDestinationForm.actualCost || ''}
                              onChange={(e) => setNewDestinationForm(prev => ({ 
                                ...prev, 
                                actualCost: e.target.value ? parseFloat(e.target.value) : undefined 
                              }))}
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid #e5e7eb',
                                borderRadius: '4px',
                                fontSize: '0.75rem'
                              }}
                              min="0"
                              step="0.01"
                            />
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            <input
                              type="checkbox"
                              id="isPaid-before"
                              checked={newDestinationForm.isPaid}
                              onChange={(e) => setNewDestinationForm(prev => ({ 
                                ...prev, 
                                isPaid: e.target.checked,
                                actualCost: e.target.checked ? (prev.actualCost || 0) : prev.actualCost
                              }))}
                              style={{
                                width: '14px',
                                height: '14px'
                              }}
                            />
                            <label htmlFor="isPaid-before" style={{
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              color: '#374151'
                            }}>
                              Bereits bezahlt
                            </label>
                            {newDestinationForm.isPaid && (
                              <span style={{
                                fontSize: '0.7rem',
                                color: '#059669',
                                fontWeight: '500'
                              }}>
                                ✓
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          gap: '0.5rem',
                          justifyContent: 'flex-end',
                          marginTop: '1rem'
                        }}>
                          <button
                            onClick={handleCreateDestination}
                            disabled={
                              !newDestinationForm.name || 
                              !newDestinationForm.location ||
                              (newDestinationForm.category === DestinationCategory.HOTEL && !newDestinationForm.endDate)
                            }
                            style={{
                              background: (
                                !newDestinationForm.name || 
                                !newDestinationForm.location ||
                                (newDestinationForm.category === DestinationCategory.HOTEL && !newDestinationForm.endDate)
                              ) ? '#9ca3af' : '#16a34a',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.5rem 1rem',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              cursor: (
                                !newDestinationForm.name || 
                                !newDestinationForm.location ||
                                (newDestinationForm.category === DestinationCategory.HOTEL && !newDestinationForm.endDate)
                              ) ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Check size={14} />
                            Erstellen
                          </button>
                          
                          <button
                            onClick={handleCancelCreation}
                            style={{
                              background: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.5rem 1rem',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <X size={14} />
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Destination Block */}
                    <div
                      draggable={!isProcessingDrop}
                      onDragStart={(e) => handleDragStart(dest, e)}
                      onDragEnd={handleDragEnd}
                      onDragEnter={handleDragEnter}
                      onDragOver={(e) => handleDragOver(e, day.date, destIndex)}
                      onDrop={(e) => handleDrop(e, day.date, destIndex)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '1rem',
                        background: dragState.dragOverDay === day.date && dragState.dragOverIndex === destIndex 
                          ? '#f0f9ff' : '#fafafa',
                        borderRadius: '8px',
                        opacity: isProcessingDrop ? 0.6 : 1,
                        cursor: isProcessingDrop ? 'wait' : (dragState.isDragging ? 'move' : 'grab'),
                        marginBottom: '0.5rem',
                        border: dragState.draggedItem?.id === dest.id ? '2px dashed #3b82f6' : '1px solid #e5e7eb',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => onDestinationClick?.(dest)}
                    >
                      {/* Drag Handle */}
                      <div style={{
                        marginRight: '1rem',
                        color: '#9ca3af'
                      }}>
                        <GripVertical size={16} />
                      </div>


                      {/* Category Icon */}
                      <div style={{
                        fontSize: '1.25rem',
                        marginRight: '1rem'
                      }}>
                        {getCategoryIcon(dest.category)}
                      </div>

                      {/* Destination Info */}
                      <div style={{ flex: 1 }}>
                        <h4 style={{
                          margin: '0 0 0.25rem 0',
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#1f2937',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          {dest.name}
                          {/* Icon for cloned/return destinations */}
                          {isClonedReturnDestination(dest) && (
                            <span 
                              title="Wiederkehrendes Ziel (Rückkehr)"
                              style={{ 
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <RotateCcw 
                                size={16} 
                                style={{ 
                                  color: '#f97316',
                                  opacity: 0.8
                                }}
                              />
                            </span>
                          )}
                        </h4>
                        <div style={{
                          fontSize: '0.875rem',
                          color: '#6b7280',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem'
                        }}>
                          <span>{getCategoryLabel(dest.category)}</span>
                          <span>{dest.location}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {!editingDestination && !creatingDestination && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '0.5rem' }}>
                          {/* Edit Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(dest);
                            }}
                          style={{
                            background: 'white',
                            color: '#3b82f6',
                            border: '1px solid #3b82f6',
                            borderRadius: '6px',
                            padding: '0.5rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = '#3b82f6';
                            e.currentTarget.style.color = 'white';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.color = '#3b82f6';
                          }}
                        >
                          <Edit size={14} />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDestination(dest.id);
                            }}
                          style={{
                            background: 'white',
                            color: '#dc2626',
                            border: '1px solid #dc2626',
                            borderRadius: '6px',
                            padding: '0.5rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = '#dc2626';
                            e.currentTarget.style.color = 'white';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.color = '#dc2626';
                          }}
                        >
                          <Trash2 size={14} />
                          </button>
                        </div>
                      )}

                    </div>

                    {/* Travel Time to Next Destination */}
                    {destIndex < day.destinations.length - 1 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0.5rem 0',
                        color: '#6b7280',
                        fontSize: '0.875rem'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: '#f9fafb',
                          padding: '0.5rem 1rem',
                          borderRadius: '20px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <ArrowRight size={14} />
                          {(() => {
                            const nextDest = day.destinations[destIndex + 1];
                            
                            // Determine the transport mode to display (same logic as calculateTravelTime)
                            let displayTransportMode: TransportMode;
                            if (dest.returnDestinationId && dest.transportToNext?.mode && 
                                (dest.transportToNext.mode === TransportMode.WALKING || dest.transportToNext.mode === TransportMode.BICYCLE)) {
                              // Use the transport mode from the current destination for walking/biking return journeys
                              displayTransportMode = dest.transportToNext.mode;
                            } else {
                              // Default behavior: Get transport mode from next destination
                              displayTransportMode = nextDest.transportToNext?.mode || TransportMode.DRIVING;
                            }
                            
                            const nextTransportMode = displayTransportMode;
                            
                            // Check if auto transport with walking/biking in between
                            if (nextTransportMode === TransportMode.DRIVING) {
                              const allDestinations = currentTrip?.destinations
                                .map(id => destinations.find(d => d.id === id))
                                .filter((d): d is Destination => d !== undefined) || [];
                              const nextDestGlobalIndex = allDestinations.findIndex(d => d.id === nextDest.id);
                              
                              if (nextDestGlobalIndex > 0) {
                                const autoTravelInfo = calculateAutoTravelTime(allDestinations, nextDestGlobalIndex);
                                
                                if (autoTravelInfo.fromDestination && autoTravelInfo.fromDestination.id !== dest.id) {
                                  // Show auto travel from last auto destination, not from immediate previous
                                  return (
                                    <span>
                                      {autoTravelInfo.time} min {getTransportLabel(nextTransportMode)}
                                      <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                        {' '}(von {autoTravelInfo.fromDestination.name})
                                      </span>
                                      • {Math.round(autoTravelInfo.distance)}km
                                    </span>
                                  );
                                }
                              }
                            }
                            
                            // Default behavior for non-auto or direct connection
                            return (
                              <span>
                                {calculateTravelTime(dest, nextDest)} min {getTransportLabel(nextTransportMode)}
                                {dest.coordinates && nextDest.coordinates && (
                                  <>• {Math.round(calculateDistance(dest.coordinates, nextDest.coordinates!) * 1.4)}km</>
                                )}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    )}


                    {/* Inline Edit Form */}
                    {editingDestination === dest.id && (
                      <div style={{
                        background: '#f0f9ff',
                        border: '2px solid #3b82f6',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        margin: '1rem 0',
                        marginLeft: '6rem'
                      }}>
                        <h4 style={{
                          margin: '0 0 1rem 0',
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#1f2937',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <Edit size={16} style={{ color: '#3b82f6' }} />
                          {dest.name} bearbeiten
                        </h4>

                        {/* Name and Location */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '1rem',
                          marginBottom: '1rem'
                        }}>
                          <OpenStreetMapAutocomplete
                            value={editForm.name}
                            onChange={(value) => setEditForm(prev => ({ ...prev, name: value }))}
                            onPlaceSelect={handleEditPlaceSelect}
                            placeholder="Ziel-Name"
                            style={{ gridColumn: '1 / -1' }}
                          />
                          
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              placeholder="Ort/Adresse"
                              value={editForm.location}
                              onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                paddingRight: settings.homePoint ? '5.5rem' : '3rem', // Extra space for home button when available
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                backgroundColor: editForm.coordinates ? '#f0f9ff' : 'white',
                                borderColor: editForm.coordinates ? '#0ea5e9' : '#e5e7eb'
                              }}
                              readOnly={!!editForm.coordinates}
                            />
                            {/* Home Point Button */}
                            {settings.homePoint && (
                              <button
                                type="button"
                                onClick={handleUseHomePointForEdit}
                                style={{
                                  position: 'absolute',
                                  right: '50px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  background: '#059669',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '0.375rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                title={`Zuhause auswählen: ${settings.homePoint.name}`}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.background = '#047857';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.background = '#059669';
                                }}
                              >
                                <Home size={14} />
                              </button>
                            )}
                            
                            {/* Map Picker Button */}
                            <button
                              type="button"
                              onClick={handleOpenMapPicker}
                              style={{
                                position: 'absolute',
                                right: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.375rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Ort auf Karte auswählen"
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = '#2563eb';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = '#3b82f6';
                              }}
                            >
                              <MapPin size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Time and Duration */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'auto auto auto 1fr',
                          gap: '1rem',
                          marginBottom: '1rem'
                        }}>

                          <div>
                            <label style={{
                              display: 'block',
                              fontSize: '0.75rem',
                              color: '#6b7280',
                              marginBottom: '0.25rem'
                            }}>
                              Kategorie
                            </label>
                            <select
                              value={editForm.category}
                              onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value as DestinationCategory }))}
                              style={{
                                padding: '0.75rem',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                background: 'white'
                              }}
                            >
                              <option value={DestinationCategory.ATTRACTION}>Sehenswürdigkeit</option>
                              <option value={DestinationCategory.RESTAURANT}>Restaurant</option>
                              <option value={DestinationCategory.HOTEL}>Hotel</option>
                              <option value={DestinationCategory.MUSEUM}>Museum</option>
                              <option value={DestinationCategory.NATURE}>Natur</option>
                              <option value={DestinationCategory.ENTERTAINMENT}>Unterhaltung</option>
                            </select>
                          </div>
                        </div>

                        {/* Transport Mode */}
                        <div style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          marginBottom: '1rem'
                        }}>
                          <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginBottom: '0.5rem'
                          }}>
                            Transportmodus zum nächsten Ziel
                          </label>
                          <div style={{
                            display: 'flex',
                            gap: '0.5rem',
                            flexWrap: 'wrap'
                          }}>
                            {[
                              { mode: TransportMode.DRIVING, icon: <Car size={16} />, label: 'Auto' },
                              { mode: TransportMode.WALKING, icon: <Mountain size={16} />, label: 'Wandern' },
                              { mode: TransportMode.BICYCLE, icon: <Bike size={16} />, label: 'Fahrrad' },
                              { mode: TransportMode.PUBLIC_TRANSPORT, icon: <Route size={16} />, label: 'Öffentlich' }
                            ].map(({ mode, icon, label }) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => setEditForm(prev => ({ ...prev, transportMode: mode }))}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: '6px',
                                  border: '1px solid #e5e7eb',
                                  background: editForm.transportMode === mode ? '#3b82f6' : 'white',
                                  color: editForm.transportMode === mode ? 'white' : '#6b7280',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem'
                                }}
                              >
                                {icon}
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Return Destination Selection (only for walking/biking) */}
                        {(editForm.transportMode === TransportMode.WALKING || editForm.transportMode === TransportMode.BICYCLE) && (
                          <div style={{
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            padding: '0.75rem',
                            marginBottom: '1rem'
                          }}>
                            <label style={{
                              display: 'block',
                              fontSize: '0.75rem',
                              color: '#6b7280',
                              marginBottom: '0.5rem'
                            }}>
                              Rückweg zu (optional)
                            </label>
                            
                            <select
                              value={editForm.returnDestinationId || ''}
                              onChange={(e) => setEditForm(prev => ({ 
                                ...prev, 
                                returnDestinationId: e.target.value || undefined 
                              }))}
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                background: 'white'
                              }}
                            >
                              <option value="">Kein Rückweg</option>
                              {settings.homePoint && (
                                <option value="home">🏠 {settings.homePoint.name}</option>
                              )}
                              {currentTrip && destinations
                                .filter(dest => currentTrip.destinations.includes(dest.id) && dest.id !== editingDestination)
                                .map(dest => (
                                  <option key={dest.id} value={dest.id}>
                                    {getCategoryIcon(dest.category)} {dest.name}
                                  </option>
                                ))}
                            </select>
                            
                            {editForm.returnDestinationId && (
                              <div style={{
                                marginTop: '0.5rem',
                                padding: '0.5rem',
                                background: '#f0f9ff',
                                border: '1px solid #bae6fd',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                color: '#0369a1'
                              }}>
                                💡 Rückweg-Ziel wird automatisch aktualisiert
                              </div>
                            )}
                          </div>
                        )}

                        {/* Kosten und Bezahlt-Status */}
                        <div style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          marginBottom: '1rem'
                        }}>
                          <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginBottom: '0.5rem'
                          }}>
                            Kosten & Bezahlung
                          </label>
                          
                          <div style={{
                            marginBottom: '0.75rem'
                          }}>
                            <label style={{
                              display: 'block',
                              fontSize: '0.7rem',
                              color: '#6b7280',
                              marginBottom: '0.25rem'
                            }}>
                              Kosten (€)
                            </label>
                            <input
                              type="number"
                              placeholder="0"
                              value={editForm.actualCost || ''}
                              onChange={(e) => setEditForm(prev => ({ 
                                ...prev, 
                                actualCost: e.target.value ? parseFloat(e.target.value) : undefined 
                              }))}
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '0.875rem'
                              }}
                              min="0"
                              step="0.01"
                            />
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            <input
                              type="checkbox"
                              id="isPaid-edit"
                              checked={editForm.isPaid}
                              onChange={(e) => setEditForm(prev => ({ 
                                ...prev, 
                                isPaid: e.target.checked,
                                actualCost: e.target.checked ? (prev.actualCost || 0) : prev.actualCost
                              }))}
                              style={{
                                width: '16px',
                                height: '16px'
                              }}
                            />
                            <label htmlFor="isPaid-edit" style={{
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              color: '#374151'
                            }}>
                              Bereits bezahlt
                            </label>
                            {editForm.isPaid && (
                              <span style={{
                                fontSize: '0.75rem',
                                color: '#059669',
                                fontWeight: '500'
                              }}>
                                ✓ Bezahlt
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{
                          display: 'flex',
                          gap: '0.75rem',
                          justifyContent: 'flex-end'
                        }}>
                          <button
                            onClick={handleCancelEdit}
                            style={{
                              background: '#f3f4f6',
                              color: '#6b7280',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              padding: '0.5rem 1rem',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <X size={14} />
                            Abbrechen
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            style={{
                              background: '#10b981',
                              color: 'white',
                              border: '1px solid #10b981',
                              borderRadius: '6px',
                              padding: '0.5rem 1rem',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = '#059669';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = '#10b981';
                            }}
                          >
                            <Save size={14} />
                            Speichern
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Drop Zone - After last destination when dragging */}
                    {dragState.isDragging && destIndex === day.destinations.length - 1 && (
                      <div
                        onDragEnter={handleDragEnter}
                        onDragOver={(e) => handleDragOver(e, day.date, destIndex + 1)}
                        onDrop={(e) => handleDrop(e, day.date, destIndex + 1)}
                        style={dragState.dragOverDay === day.date && dragState.dragOverIndex === destIndex + 1 
                          ? dropZoneStyles.lastActive 
                          : dropZoneStyles.lastInactive}
                      >
                        {dragState.dragOverDay === day.date && dragState.dragOverIndex === destIndex + 1 && (
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: '#3b82f6',
                            color: 'white',
                            fontSize: '0.75rem',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none'
                          }}>
                            Am Ende hinzufügen
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Add Destination Button - Only after the last destination */}
                    {!creatingDestination && !dragState.isDragging && destIndex === day.destinations.length - 1 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        margin: '0.5rem 0'
                      }}>
                        <button
                          onClick={() => handleStartCreation(day.date, 'after', destIndex)}
                          style={{
                            background: 'white',
                            color: '#3b82f6',
                            border: '1px dashed #3b82f6',
                            borderRadius: '20px',
                            padding: '0.5rem 1rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = '#eff6ff';
                            e.currentTarget.style.transform = 'scale(1.02)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          <Plus size={14} />
                          Ziel hinzufügen
                        </button>
                      </div>
                    )}

                    {/* Inline Creation Form - After */}
                    {creatingDestination?.dayDate === day.date && 
                     creatingDestination?.position === 'after' && 
                     creatingDestination?.destinationIndex === destIndex && (
                      <div style={{
                        background: '#f0f9ff',
                        border: '1px solid #3b82f6',
                        borderRadius: '12px',
                        padding: '1rem',
                        margin: '1rem 0'
                      }}>
                        <h4 style={{
                          margin: '0 0 1rem 0',
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#1f2937',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <Plus size={16} style={{ color: '#3b82f6' }} />
                          Neues Ziel nach "{dest.name}"
                        </h4>
                        
                        {/* Simplified Search Info */}
                        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            padding: '0.5rem'
                          }}>
                            <Search size={16} style={{ color: '#6b7280', marginRight: '0.5rem' }} />
                            <input
                              type="text"
                              placeholder="Ziel suchen..."
                              value={newDestinationForm.name}
                              onChange={(e) => setNewDestinationForm(prev => ({ ...prev, name: e.target.value }))}
                              style={{
                                border: 'none',
                                outline: 'none',
                                flex: 1,
                                fontSize: '0.875rem',
                                background: 'transparent'
                              }}
                              autoFocus
                            />
                          </div>
                          
                          {/* Search Results Removed - Using OpenStreetMapAutocomplete below */}
                          {false && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              background: 'white',
                              border: '1px solid #e5e7eb',
                              borderTop: 'none',
                              borderRadius: '0 0 6px 6px',
                              maxHeight: '150px',
                              overflowY: 'auto',
                              zIndex: 10,
                              boxShadow: '0 2px 4px rgb(0 0 0 / 0.1)'
                            }}>
                              {[].map((result, index) => (
                                <button
                                  key={index}
                                  onClick={() => {}}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    textAlign: 'left',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    borderBottom: 'none',
                                    fontSize: '0.75rem'
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.background = '#f9fafb';
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                  }}
                                >
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                  }}>
                                    <div style={{ fontSize: '1rem' }}>
                                      {'📍'}
                                    </div>
                                    <div>
                                      <div style={{
                                        fontWeight: '500',
                                        color: '#1f2937'
                                      }}>
                                        {'Placeholder'}
                                      </div>
                                      <div style={{
                                        color: '#6b7280',
                                        fontSize: '0.7rem'
                                      }}>
                                        {'Not used'}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Manual Input Fields */}
                        <div style={{
                          display: 'grid',
                          gap: '0.75rem',
                          gridTemplateColumns: '1fr 1fr',
                          marginBottom: '0.75rem'
                        }}>
                          <OpenStreetMapAutocomplete
                            value={newDestinationForm.name}
                            onChange={(value) => setNewDestinationForm(prev => ({ ...prev, name: value }))}
                            onPlaceSelect={handlePlaceSelect}
                            placeholder="Ziel suchen (z.B. 'Brandenburger Tor')"
                            style={{
                              gridColumn: '1 / -1',
                              marginBottom: '0.75rem'
                            }}
                          />

                          {/* Location/Address Field with Map Picker */}
                          <div style={{ 
                            position: 'relative',
                            gridColumn: '1 / -1',
                            marginBottom: '0.75rem'
                          }}>
                            <input
                              type="text"
                              placeholder="Ort/Adresse (optional - aus Suche übernommen oder Karte nutzen)"
                              value={newDestinationForm.location}
                              onChange={(e) => setNewDestinationForm(prev => ({ ...prev, location: e.target.value }))}
                              style={{
                                width: '100%',
                                padding: settings.homePoint ? '0.75rem 5.5rem 0.75rem 0.75rem' : '0.75rem 3rem 0.75rem 0.75rem', // Extra space for home button when available
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                backgroundColor: newDestinationForm.coordinates ? '#f0f9ff' : 'white',
                                borderColor: newDestinationForm.coordinates ? '#0ea5e9' : '#e5e7eb'
                              }}
                              readOnly={!!newDestinationForm.coordinates}
                            />
                            {/* Home Point Button */}
                            {settings.homePoint && (
                              <button
                                type="button"
                                onClick={handleUseHomePoint}
                                style={{
                                  position: 'absolute',
                                  right: '40px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  background: '#059669',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '0.25rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '2rem',
                                  height: '2rem'
                                }}
                                title={`Zuhause auswählen: ${settings.homePoint.name}`}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.background = '#047857';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.background = '#059669';
                                }}
                              >
                                <Home size={14} />
                              </button>
                            )}
                            
                            {/* Map Picker Button */}
                            <button
                              type="button"
                              onClick={handleOpenMapPicker}
                              style={{
                                position: 'absolute',
                                right: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.25rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '2rem',
                                height: '2rem'
                              }}
                              title="Standort auf Karte auswählen"
                            >
                              <MapPin size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Date Options */}
                        <div style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          marginBottom: '0.75rem'
                        }}>
                          {newDestinationForm.category === DestinationCategory.HOTEL && (
                            <div style={{ marginBottom: '0.5rem' }}>
                              <label style={{
                                display: 'block',
                                fontSize: '0.7rem',
                                color: '#6b7280',
                                marginBottom: '0.25rem'
                              }}>
                                Abreisedatum
                              </label>
                              <input
                                type="date"
                                value={newDestinationForm.endDate}
                                onChange={(e) => setNewDestinationForm(prev => ({ ...prev, endDate: e.target.value }))}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem'
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Transport Mode */}
                        <div style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          marginBottom: '0.75rem'
                        }}>
                          <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '0.5rem'
                          }}>
                            Transportmodus
                          </label>
                          
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '0.5rem'
                          }}>
                            {[
                              { mode: TransportMode.DRIVING, label: 'Auto', icon: <Car size={14} /> },
                              { mode: TransportMode.WALKING, label: 'Wanderung', icon: <Mountain size={14} /> },
                              { mode: TransportMode.BICYCLE, label: 'Fahrrad', icon: <Bike size={14} /> },
                              { mode: TransportMode.PUBLIC_TRANSPORT, label: 'Öffentlich', icon: <Route size={14} /> }
                            ].map(({ mode, label, icon }) => (
                              <button
                                key={mode}
                                onClick={() => setNewDestinationForm(prev => ({ ...prev, transportMode: mode }))}
                                style={{
                                  background: newDestinationForm.transportMode === mode ? '#eff6ff' : 'white',
                                  border: newDestinationForm.transportMode === mode ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                  borderRadius: '6px',
                                  padding: '0.5rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  color: newDestinationForm.transportMode === mode ? '#1e40af' : '#374151',
                                  transition: 'all 0.2s'
                                }}
                              >
                                {icon}
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Category Selection */}
                        <div style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          marginBottom: '0.75rem'
                        }}>
                          <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '0.5rem'
                          }}>
                            Kategorie
                          </label>
                          
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '0.5rem',
                            marginBottom: '0.5rem'
                          }}>
                            {Object.values(DestinationCategory).map((category) => (
                              <button
                                key={category}
                                type="button"
                                onClick={() => {
                                  setNewDestinationForm(prev => ({ 
                                    ...prev, 
                                    category: category,
                                    // Set endDate for hotels, keep current day date for others
                                    endDate: category === DestinationCategory.HOTEL ? '' : (creatingDestination?.dayDate || prev.endDate)
                                  }));
                                }}
                                style={{
                                  background: newDestinationForm.category === category ? '#dbeafe' : 'white',
                                  border: newDestinationForm.category === category ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                  borderRadius: '6px',
                                  padding: '0.5rem 0.25rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                  fontSize: '0.7rem',
                                  fontWeight: '500',
                                  color: newDestinationForm.category === category ? '#1e40af' : '#374151',
                                  transition: 'all 0.2s',
                                  minHeight: '60px'
                                }}
                                onMouseOver={(e) => {
                                  if (newDestinationForm.category !== category) {
                                    e.currentTarget.style.background = '#f3f4f6';
                                  }
                                }}
                                onMouseOut={(e) => {
                                  if (newDestinationForm.category !== category) {
                                    e.currentTarget.style.background = 'white';
                                  }
                                }}
                              >
                                <span style={{ fontSize: '1.2rem' }}>
                                  {getCategoryIcon(category)}
                                </span>
                                <span>{getCategoryLabel(category)}</span>
                              </button>
                            ))}
                          </div>
                          
                          {newDestinationForm.category === DestinationCategory.HOTEL && (
                            <div style={{
                              marginTop: '0.5rem',
                              padding: '0.5rem',
                              background: '#f0f9ff',
                              border: '1px solid #bae6fd',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              color: '#0c4a6e'
                            }}>
                              ℹ️ Hotels benötigen ein Abreisedatum
                            </div>
                          )}
                        </div>

                        {/* Kosten und Bezahlt-Status */}
                        <div style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          marginBottom: '0.75rem'
                        }}>
                          <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '0.5rem'
                          }}>
                            Kosten & Bezahlung
                          </label>
                          
                          <div style={{
                            marginBottom: '0.75rem'
                          }}>
                            <label style={{
                              display: 'block',
                              fontSize: '0.7rem',
                              color: '#6b7280',
                              marginBottom: '0.25rem'
                            }}>
                              Kosten (€)
                            </label>
                            <input
                              type="number"
                              placeholder="0"
                              value={newDestinationForm.actualCost || ''}
                              onChange={(e) => setNewDestinationForm(prev => ({ 
                                ...prev, 
                                actualCost: e.target.value ? parseFloat(e.target.value) : undefined 
                              }))}
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid #e5e7eb',
                                borderRadius: '4px',
                                fontSize: '0.75rem'
                              }}
                              min="0"
                              step="0.01"
                            />
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            <input
                              type="checkbox"
                              id="isPaid-after"
                              checked={newDestinationForm.isPaid}
                              onChange={(e) => setNewDestinationForm(prev => ({ 
                                ...prev, 
                                isPaid: e.target.checked,
                                actualCost: e.target.checked ? (prev.actualCost || 0) : prev.actualCost
                              }))}
                              style={{
                                width: '14px',
                                height: '14px'
                              }}
                            />
                            <label htmlFor="isPaid-after" style={{
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              color: '#374151'
                            }}>
                              Bereits bezahlt
                            </label>
                            {newDestinationForm.isPaid && (
                              <span style={{
                                fontSize: '0.7rem',
                                color: '#059669',
                                fontWeight: '500'
                              }}>
                                ✓
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          gap: '0.5rem',
                          justifyContent: 'flex-end',
                          marginTop: '1rem'
                        }}>
                          <button
                            onClick={handleCreateDestination}
                            disabled={
                              !newDestinationForm.name || 
                              !newDestinationForm.location ||
                              (newDestinationForm.category === DestinationCategory.HOTEL && !newDestinationForm.endDate)
                            }
                            style={{
                              background: (
                                !newDestinationForm.name || 
                                !newDestinationForm.location ||
                                (newDestinationForm.category === DestinationCategory.HOTEL && !newDestinationForm.endDate)
                              ) ? '#9ca3af' : '#16a34a',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.5rem 1rem',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              cursor: (
                                !newDestinationForm.name || 
                                !newDestinationForm.location ||
                                (newDestinationForm.category === DestinationCategory.HOTEL && !newDestinationForm.endDate)
                              ) ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Check size={14} />
                            Erstellen
                          </button>
                          
                          <button
                            onClick={handleCancelCreation}
                            style={{
                              background: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.5rem 1rem',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <X size={14} />
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Mobile Navigation */}
      <div style={{
        display: window.innerWidth < 768 ? 'flex' : 'none',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        marginTop: '2rem',
        padding: '1rem',
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb'
      }}>
        <button
          onClick={() => navigateDay('prev')}
          disabled={currentDayIndex <= 0}
          style={{
            background: currentDayIndex <= 0 ? '#f3f4f6' : '#3b82f6',
            color: currentDayIndex <= 0 ? '#9ca3af' : 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.75rem',
            cursor: currentDayIndex <= 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <ChevronLeft size={16} />
          Voriger Tag
        </button>

        <span style={{
          fontSize: '0.875rem',
          color: '#6b7280',
          fontWeight: '500'
        }}>
          {currentDayIndex + 1} von {enhancedTimelineData.length}
        </span>

        <button
          onClick={() => navigateDay('next')}
          disabled={currentDayIndex >= enhancedTimelineData.length - 1}
          style={{
            background: currentDayIndex >= enhancedTimelineData.length - 1 ? '#f3f4f6' : '#3b82f6',
            color: currentDayIndex >= enhancedTimelineData.length - 1 ? '#9ca3af' : 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.75rem',
            cursor: currentDayIndex >= enhancedTimelineData.length - 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          Nächster Tag
          <ChevronRight size={16} />
        </button>
      </div>
    </div>

    {/* Map Picker Modal - Outside main container to avoid nesting issues */}
    {showMapPicker && (
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        backgroundColor: 'rgba(0, 0, 0, 0.5)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 9999
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
          width: '90vw', 
          maxWidth: '800px',
          maxHeight: '90vh', 
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* Header */}
          <div style={{ 
            padding: '1.5rem', 
            borderBottom: '1px solid #e5e7eb', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            backgroundColor: '#f8fafc'
          }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                📍 Standort auswählen
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.5rem 0 0 0' }}>
                Klicken Sie auf die Karte, um einen genauen Standort auszuwählen
              </p>
            </div>
            <button
              onClick={handleCloseMapPicker}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#6b7280', 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '4px',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.color = '#374151';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6b7280';
              }}
            >
              ✕
            </button>
          </div>

          {/* Interactive Map */}
          <div style={{ height: '500px', position: 'relative' }}>
            <MapErrorBoundary>
              <LeafletMapOnly
                coordinates={
                  editingDestination ? 
                    (editForm.coordinates || { lat: 50.1109, lng: 8.6821 }) : 
                    (newDestinationForm.coordinates || { lat: 50.1109, lng: 8.6821 })
                }
                onLocationSelect={(coords) => {
                  console.log('🗺️ Map location selected:', coords);
                  handleMapLocationSelect(coords);
                  setShowMapPicker(false);
                }}
                height="500px"
                zoom={6}
              />
            </MapErrorBoundary>
          </div>

          {/* Footer */}
          <div style={{ 
            padding: '1.5rem', 
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc'
          }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#059669', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🗺️ OpenStreetMap Integration
              </p>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                Kostenlos, datenschutzfreundlich und Open Source
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleCloseMapPicker}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                  e.currentTarget.style.borderColor = '#9ca3af';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default EnhancedTimelineView;