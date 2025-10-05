import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { Trip, UUID, CreateTripData, TripStatus } from '../types';
import { SupabaseService } from '../services/supabaseService';
import { getCurrentDateString, generateUUID } from '../utils';

// Trip Action Types
type TripAction = 
  | { type: 'SET_TRIPS'; payload: Trip[] }
  | { type: 'SET_PUBLIC_TRIPS'; payload: Trip[] }
  | { type: 'ADD_TRIP'; payload: Trip }
  | { type: 'UPDATE_TRIP'; payload: { id: UUID; data: Partial<Trip> } }
  | { type: 'DELETE_TRIP'; payload: UUID }
  | { type: 'SET_CURRENT_TRIP'; payload: UUID | undefined }
  | { type: 'SET_LOADING'; payload: boolean };

// Trip State Interface
interface TripState {
  trips: Trip[];
  publicTrips: Trip[];
  currentTrip?: Trip;
  isLoading: boolean;
}

// Trip Context Type
interface TripContextType extends TripState {
  // Trip Operations
  createTrip: (data: CreateTripData) => Promise<Trip>;
  updateTrip: (id: UUID, data: Partial<Trip>) => Promise<void>;
  deleteTrip: (id: UUID) => Promise<void>;
  setCurrentTrip: (tripId?: UUID) => void;
  getCurrentTrip: () => Trip | undefined;
  
  // Trip Queries
  getTripById: (id: UUID) => Trip | undefined;
  getTripsWithDestinations: () => Trip[];
  getUpcomingTrips: () => Trip[];
  getCompletedTrips: () => Trip[];
  
  // Public Trip Operations
  loadPublicTrips: () => Promise<void>;
  getPublicTrips: () => Trip[];
  
  // Utility
  refreshTrips: () => Promise<void>;
}

// Initial State
const initialTripState: TripState = {
  trips: [],
  publicTrips: [],
  currentTrip: undefined,
  isLoading: false
};

// Trip Reducer
const tripReducer = (state: TripState, action: TripAction): TripState => {
  switch (action.type) {
    case 'SET_TRIPS':
      return { ...state, trips: Array.isArray(action.payload) ? action.payload : [] };
    
    case 'SET_PUBLIC_TRIPS':
      return { ...state, publicTrips: Array.isArray(action.payload) ? action.payload : [] };
    
    case 'ADD_TRIP':
      return { 
        ...state, 
        trips: [...(Array.isArray(state.trips) ? state.trips : []), action.payload] 
      };
    
    case 'UPDATE_TRIP':
      const updatedTrips = (Array.isArray(state.trips) ? state.trips : []).map(trip => 
        trip.id === action.payload.id 
          ? { ...trip, ...action.payload.data, updatedAt: getCurrentDateString() }
          : trip
      );
      
      return {
        ...state,
        trips: updatedTrips,
        currentTrip: state.currentTrip?.id === action.payload.id
          ? { ...state.currentTrip, ...action.payload.data, updatedAt: getCurrentDateString() }
          : state.currentTrip
      };
    
    case 'DELETE_TRIP':
      return {
        ...state,
        trips: (Array.isArray(state.trips) ? state.trips : []).filter(trip => trip.id !== action.payload),
        currentTrip: state.currentTrip?.id === action.payload ? undefined : state.currentTrip
      };
    
    case 'SET_CURRENT_TRIP':
      const selectedTrip = action.payload 
        ? (Array.isArray(state.trips) ? state.trips : []).find(trip => trip.id === action.payload)
        : undefined;
      return { ...state, currentTrip: selectedTrip };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    default:
      return state;
  }
};

// Context
const TripContext = createContext<TripContextType | undefined>(undefined);

// Provider Props
interface TripProviderProps {
  children: ReactNode;
}

// Trip Provider Component
export const TripProvider: React.FC<TripProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(tripReducer, initialTripState);

  // Create Trip
  const createTrip = useCallback(async (data: CreateTripData): Promise<Trip> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const newTrip: Trip = {
        id: generateUUID(),
        name: data.name,
        description: data.description || '',
        startDate: data.startDate,
        endDate: data.endDate,
        status: TripStatus.PLANNED,
        privacy: 'private' as any, // Will be properly typed when Privacy enum is available
        destinations: [],
        createdAt: getCurrentDateString(),
        updatedAt: getCurrentDateString()
      };

      // Save to Supabase
      const savedTrip = await SupabaseService.createTrip(newTrip);
      
      dispatch({ type: 'ADD_TRIP', payload: savedTrip });
      return savedTrip;
    } catch (error) {
      console.error('Failed to create trip:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Update Trip
  const updateTrip = useCallback(async (id: UUID, data: Partial<Trip>): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Update in Supabase
      await SupabaseService.updateTrip(id, data);
      
      dispatch({ type: 'UPDATE_TRIP', payload: { id, data } });
    } catch (error) {
      console.error('Failed to update trip:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Delete Trip
  const deleteTrip = useCallback(async (id: UUID): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Delete from Supabase
      await SupabaseService.deleteTrip(id);
      
      dispatch({ type: 'DELETE_TRIP', payload: id });
    } catch (error) {
      console.error('Failed to delete trip:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Set Current Trip
  const setCurrentTrip = useCallback((tripId?: UUID) => {
    dispatch({ type: 'SET_CURRENT_TRIP', payload: tripId });
  }, []);

  // Get Current Trip
  const getCurrentTrip = useCallback((): Trip | undefined => {
    return state.currentTrip;
  }, [state.currentTrip]);

  // Get Trip By ID
  const getTripById = useCallback((id: UUID): Trip | undefined => {
    return state.trips.find(trip => trip.id === id);
  }, [state.trips]);

  // Get Trips With Destinations
  const getTripsWithDestinations = useCallback((): Trip[] => {
    return state.trips.filter(trip => trip.destinations && trip.destinations.length > 0);
  }, [state.trips]);

  // Get Upcoming Trips
  const getUpcomingTrips = useCallback((): Trip[] => {
    const today = getCurrentDateString();
    return state.trips.filter(trip => trip.startDate >= today);
  }, [state.trips]);

  // Get Completed Trips
  const getCompletedTrips = useCallback((): Trip[] => {
    const today = getCurrentDateString();
    return state.trips.filter(trip => trip.endDate < today || trip.status === TripStatus.COMPLETED);
  }, [state.trips]);

  // Load Public Trips
  const loadPublicTrips = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const publicTrips = await SupabaseService.getPublicTrips();
      dispatch({ type: 'SET_PUBLIC_TRIPS', payload: publicTrips });
    } catch (error) {
      console.error('Failed to load public trips:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Get Public Trips
  const getPublicTrips = useCallback((): Trip[] => {
    return state.publicTrips;
  }, [state.publicTrips]);

  // Refresh Trips
  const refreshTrips = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const trips = await SupabaseService.getTrips();
      dispatch({ type: 'SET_TRIPS', payload: trips });
    } catch (error) {
      console.error('Failed to refresh trips:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Load initial trips on mount
  useEffect(() => {
    refreshTrips();
  }, [refreshTrips]);

  // Context value
  const contextValue: TripContextType = {
    // State
    ...state,
    
    // Trip Operations
    createTrip,
    updateTrip,
    deleteTrip,
    setCurrentTrip,
    getCurrentTrip,
    
    // Trip Queries
    getTripById,
    getTripsWithDestinations,
    getUpcomingTrips,
    getCompletedTrips,
    
    // Public Trip Operations
    loadPublicTrips,
    getPublicTrips,
    
    // Utility
    refreshTrips
  };

  return (
    <TripContext.Provider value={contextValue}>
      {children}
    </TripContext.Provider>
  );
};

// Hook to use Trip Context
export const useTripContext = (): TripContextType => {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTripContext must be used within a TripProvider');
  }
  return context;
};

export default TripContext;