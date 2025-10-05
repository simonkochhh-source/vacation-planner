import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { Destination, UUID, CreateDestinationData, DestinationStatus, DestinationCategory } from '../types';
import { SupabaseService } from '../services/supabaseService';
import { getCurrentDateString, generateUUID } from '../utils';

// Destination Action Types
type DestinationAction = 
  | { type: 'SET_DESTINATIONS'; payload: Destination[] }
  | { type: 'ADD_DESTINATION'; payload: Destination }
  | { type: 'UPDATE_DESTINATION'; payload: { id: UUID; data: Partial<Destination> } }
  | { type: 'DELETE_DESTINATION'; payload: UUID }
  | { type: 'REORDER_DESTINATIONS'; payload: { tripId: UUID; destinationIds: UUID[] } }
  | { type: 'SET_LOADING'; payload: boolean };

// Destination State Interface
interface DestinationState {
  destinations: Destination[];
  isLoading: boolean;
}

// Destination Context Type
interface DestinationContextType extends DestinationState {
  // Destination Operations
  createDestination: (tripId: UUID, data: CreateDestinationData) => Promise<Destination>;
  updateDestination: (id: UUID, data: Partial<Destination>) => Promise<void>;
  deleteDestination: (id: UUID) => Promise<void>;
  reorderDestinations: (tripId: UUID, destinationIds: UUID[]) => Promise<void>;
  
  // Destination Queries
  getDestinationById: (id: UUID) => Destination | undefined;
  getDestinationsByTrip: (tripId: UUID) => Destination[];
  getDestinationsByStatus: (status: DestinationStatus) => Destination[];
  getDestinationsByCategory: (category: DestinationCategory) => Destination[];
  getUpcomingDestinations: () => Destination[];
  getCurrentDestinations: () => Destination[];
  
  // Filtering & Sorting
  filterDestinations: (filters: {
    status?: DestinationStatus[];
    category?: DestinationCategory[];
    tags?: string[];
    tripId?: UUID;
  }) => Destination[];
  
  // Utility
  refreshDestinations: () => Promise<void>;
  getDestinationCount: (tripId?: UUID) => number;
}

// Initial State
const initialDestinationState: DestinationState = {
  destinations: [],
  isLoading: false
};

// Destination Reducer
const destinationReducer = (state: DestinationState, action: DestinationAction): DestinationState => {
  switch (action.type) {
    case 'SET_DESTINATIONS':
      return { ...state, destinations: Array.isArray(action.payload) ? action.payload : [] };
    
    case 'ADD_DESTINATION':
      return { 
        ...state, 
        destinations: [...(Array.isArray(state.destinations) ? state.destinations : []), action.payload] 
      };
    
    case 'UPDATE_DESTINATION':
      return {
        ...state,
        destinations: (Array.isArray(state.destinations) ? state.destinations : []).map(destination => 
          destination.id === action.payload.id 
            ? { ...destination, ...action.payload.data, updatedAt: getCurrentDateString() }
            : destination
        )
      };
    
    case 'DELETE_DESTINATION':
      return {
        ...state,
        destinations: (Array.isArray(state.destinations) ? state.destinations : [])
          .filter(destination => destination.id !== action.payload)
      };
    
    case 'REORDER_DESTINATIONS':
      const { tripId, destinationIds } = action.payload;
      const tripDestinations = state.destinations.filter(d => d.tripId === tripId);
      const otherDestinations = state.destinations.filter(d => d.tripId !== tripId);
      
      // Reorder destinations for the specific trip
      const reorderedDestinations = destinationIds.map((id, index) => {
        const destination = tripDestinations.find(d => d.id === id);
        return destination ? { ...destination, order: index } : null;
      }).filter(Boolean) as Destination[];
      
      return {
        ...state,
        destinations: [...otherDestinations, ...reorderedDestinations]
      };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    default:
      return state;
  }
};

// Context
const DestinationContext = createContext<DestinationContextType | undefined>(undefined);

// Provider Props
interface DestinationProviderProps {
  children: ReactNode;
}

// Destination Provider Component
export const DestinationProvider: React.FC<DestinationProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(destinationReducer, initialDestinationState);

  // Create Destination
  const createDestination = useCallback(async (tripId: UUID, data: CreateDestinationData): Promise<Destination> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const newDestination: Destination = {
        id: generateUUID(),
        tripId,
        name: data.name,
        location: data.location,
        coordinates: data.coordinates,
        startDate: data.startDate,
        endDate: data.endDate,
        category: data.category,
        status: data.status || DestinationStatus.PLANNED,
        budget: data.budget,
        actualCost: 0,
        notes: data.notes || '',
        tags: data.tags || [],
        photos: [],
        color: data.color,
        order: state.destinations.filter(d => d.tripId === tripId).length,
        returnDestinationId: data.returnDestinationId,
        createdAt: getCurrentDateString(),
        updatedAt: getCurrentDateString()
      };

      // Save to Supabase
      const savedDestination = await SupabaseService.createDestination(newDestination, tripId);
      
      dispatch({ type: 'ADD_DESTINATION', payload: savedDestination });
      return savedDestination;
    } catch (error) {
      console.error('Failed to create destination:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.destinations]);

  // Update Destination
  const updateDestination = useCallback(async (id: UUID, data: Partial<Destination>): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Update in Supabase
      await SupabaseService.updateDestination(id, data);
      
      dispatch({ type: 'UPDATE_DESTINATION', payload: { id, data } });
    } catch (error) {
      console.error('Failed to update destination:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Delete Destination
  const deleteDestination = useCallback(async (id: UUID): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Delete from Supabase
      await SupabaseService.deleteDestination(id);
      
      dispatch({ type: 'DELETE_DESTINATION', payload: id });
    } catch (error) {
      console.error('Failed to delete destination:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Reorder Destinations
  const reorderDestinations = useCallback(async (tripId: UUID, destinationIds: UUID[]): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // TODO: Update order in Supabase when reorderDestinations method is implemented
      // await SupabaseService.reorderDestinations(tripId, destinationIds);
      
      dispatch({ type: 'REORDER_DESTINATIONS', payload: { tripId, destinationIds } });
    } catch (error) {
      console.error('Failed to reorder destinations:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Get Destination By ID
  const getDestinationById = useCallback((id: UUID): Destination | undefined => {
    return state.destinations.find(destination => destination.id === id);
  }, [state.destinations]);

  // Get Destinations By Trip
  const getDestinationsByTrip = useCallback((tripId: UUID): Destination[] => {
    return state.destinations
      .filter(destination => destination.tripId === tripId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [state.destinations]);

  // Get Destinations By Status
  const getDestinationsByStatus = useCallback((status: DestinationStatus): Destination[] => {
    return state.destinations.filter(destination => destination.status === status);
  }, [state.destinations]);

  // Get Destinations By Category
  const getDestinationsByCategory = useCallback((category: DestinationCategory): Destination[] => {
    return state.destinations.filter(destination => destination.category === category);
  }, [state.destinations]);

  // Get Upcoming Destinations
  const getUpcomingDestinations = useCallback((): Destination[] => {
    const today = getCurrentDateString();
    return state.destinations.filter(destination => destination.startDate >= today);
  }, [state.destinations]);

  // Get Current Destinations
  const getCurrentDestinations = useCallback((): Destination[] => {
    const today = getCurrentDateString();
    return state.destinations.filter(destination => 
      destination.startDate <= today && destination.endDate >= today
    );
  }, [state.destinations]);

  // Filter Destinations
  const filterDestinations = useCallback((filters: {
    status?: DestinationStatus[];
    category?: DestinationCategory[];
    tags?: string[];
    tripId?: UUID;
  }): Destination[] => {
    return state.destinations.filter(destination => {
      // Filter by trip
      if (filters.tripId && destination.tripId !== filters.tripId) {
        return false;
      }
      
      // Filter by status
      if (filters.status && filters.status.length > 0 && !filters.status.includes(destination.status)) {
        return false;
      }
      
      // Filter by category
      if (filters.category && filters.category.length > 0 && !filters.category.includes(destination.category)) {
        return false;
      }
      
      // Filter by tags
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag => 
          destination.tags?.some(destTag => destTag.toLowerCase().includes(tag.toLowerCase()))
        );
        if (!hasMatchingTag) {
          return false;
        }
      }
      
      return true;
    });
  }, [state.destinations]);

  // Refresh Destinations
  const refreshDestinations = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const destinations = await SupabaseService.getDestinations();
      dispatch({ type: 'SET_DESTINATIONS', payload: destinations });
    } catch (error) {
      console.error('Failed to refresh destinations:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Get Destination Count
  const getDestinationCount = useCallback((tripId?: UUID): number => {
    if (tripId) {
      return state.destinations.filter(d => d.tripId === tripId).length;
    }
    return state.destinations.length;
  }, [state.destinations]);

  // Context value
  const contextValue: DestinationContextType = {
    // State
    ...state,
    
    // Destination Operations
    createDestination,
    updateDestination,
    deleteDestination,
    reorderDestinations,
    
    // Destination Queries
    getDestinationById,
    getDestinationsByTrip,
    getDestinationsByStatus,
    getDestinationsByCategory,
    getUpcomingDestinations,
    getCurrentDestinations,
    
    // Filtering & Sorting
    filterDestinations,
    
    // Utility
    refreshDestinations,
    getDestinationCount
  };

  return (
    <DestinationContext.Provider value={contextValue}>
      {children}
    </DestinationContext.Provider>
  );
};

// Hook to use Destination Context
export const useDestinationContext = (): DestinationContextType => {
  const context = useContext(DestinationContext);
  if (!context) {
    throw new Error('useDestinationContext must be used within a DestinationProvider');
  }
  return context;
};

export default DestinationContext;