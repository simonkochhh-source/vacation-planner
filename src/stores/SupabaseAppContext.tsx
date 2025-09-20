import React, { createContext, useContext, useReducer, useEffect, useState, useCallback, ReactNode } from 'react';
import { SupabaseService, getCurrentUserId } from '../services/supabaseService';
import { isUsingPlaceholderCredentials, supabase } from '../lib/supabase';
import { CrossAppSyncService } from '../services/CrossAppSyncService';
import { 
  Trip, 
  Destination, 
  UUID, 
  AppContextType, 
  CreateTripData, 
  CreateDestinationData,
  UIState,
  ExportOptions,
  DestinationStatus,
  SortField,
  SortDirection,
  AppSettings,
  TransportMode,
  FuelType
} from '../types';
import { 
  getCurrentDateString,
  saveToLocalStorage,
  loadFromLocalStorage,
  exportToJSON,
  exportToCSV,
  generateUUID
} from '../utils';

// Action Types
type AppAction = 
  | { type: 'SET_TRIPS'; payload: Trip[] }
  | { type: 'SET_PUBLIC_TRIPS'; payload: Trip[] }
  | { type: 'ADD_TRIP'; payload: Trip }
  | { type: 'UPDATE_TRIP'; payload: { id: UUID; data: Partial<Trip> } }
  | { type: 'DELETE_TRIP'; payload: UUID }
  | { type: 'SET_DESTINATIONS'; payload: Destination[] }
  | { type: 'ADD_DESTINATION'; payload: Destination }
  | { type: 'UPDATE_DESTINATION'; payload: { id: UUID; data: Partial<Destination> } }
  | { type: 'DELETE_DESTINATION'; payload: UUID }
  | { type: 'REORDER_DESTINATIONS'; payload: { tripId: UUID; destinationIds: UUID[] } }
  | { type: 'SET_CURRENT_TRIP'; payload: UUID | undefined }
  | { type: 'UPDATE_UI_STATE'; payload: Partial<UIState> }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'SET_LOADING'; payload: boolean };

// Helper function to determine initial view based on user activity
const getInitialView = (trips: Trip[], hasStoredUIState: boolean): UIState['currentView'] => {
  // If user has stored UI state, respect their preference
  if (hasStoredUIState) {
    return 'list'; // Will be overridden by stored state
  }
  
  // For new users (no trips), show landing page
  if (!trips || trips.length === 0) {
    return 'landing';
  }
  
  // For existing users with trips, show list view
  return 'list';
};

// Initial UI State
const initialUIState: UIState = {
  currentView: 'list', // Will be updated in useEffect based on user activity
  activeDestination: undefined,
  activeTripId: undefined,
  filters: {
    category: [],
    status: [],
    tags: []
  },
  sortOptions: {
    field: SortField.START_DATE,
    direction: SortDirection.ASC
  },
  isLoading: false,
  searchQuery: '',
  sidebarOpen: true,
  hideHeader: false,
  mapCenter: undefined,
  mapZoom: 10,
  selectedTripId: undefined,
  showTripDetails: false
};

// Initial Settings
const initialSettings: AppSettings = {
  language: 'de',
  theme: 'auto',
  currency: 'EUR',
  dateFormat: 'dd.MM.yyyy',
  timeFormat: '24h',
  defaultMapProvider: 'osm',
  defaultMapZoom: 10,
  showTraffic: false,
  showPublicTransport: true,
  defaultTransportMode: TransportMode.DRIVING,
  fuelType: FuelType.E10,
  fuelConsumption: 9.0,
  enableNotifications: true,
  reminderTime: 30,
  defaultExportFormat: 'json',
  includePhotosInExport: true,
  includeNotesInExport: true,
  shareLocation: false,
  trackVisitHistory: true,
  autoBackup: true,
  backupInterval: 24
};

// App State Interface
interface AppState {
  trips: Trip[];
  publicTrips: Trip[];
  destinations: Destination[];
  currentTrip?: Trip;
  uiState: UIState;
  settings: AppSettings;
}

// Initial State
const initialState: AppState = {
  trips: [],
  publicTrips: [],
  destinations: [],
  currentTrip: undefined,
  uiState: initialUIState,
  settings: initialSettings
};

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_TRIPS':
      return { ...state, trips: Array.isArray(action.payload) ? action.payload : [] };
    
    case 'SET_PUBLIC_TRIPS':
      return { ...state, publicTrips: Array.isArray(action.payload) ? action.payload : [] };
    
    case 'ADD_TRIP':
      return { ...state, trips: [...(Array.isArray(state.trips) ? state.trips : []), action.payload] };
    
    case 'UPDATE_TRIP':
      return {
        ...state,
        trips: (Array.isArray(state.trips) ? state.trips : []).map(trip => 
          trip.id === action.payload.id 
            ? { ...trip, ...action.payload.data, updatedAt: getCurrentDateString() }
            : trip
        ),
        currentTrip: state.currentTrip?.id === action.payload.id
          ? { ...state.currentTrip, ...action.payload.data, updatedAt: getCurrentDateString() }
          : state.currentTrip
      };
    
    case 'DELETE_TRIP': {
      // Find the trip to get its destinations before deleting
      const tripToDelete = (Array.isArray(state.trips) ? state.trips : []).find(trip => trip.id === action.payload);
      const tripDestinationIds = tripToDelete?.destinations || [];
      
      return {
        ...state,
        trips: (Array.isArray(state.trips) ? state.trips : []).filter(trip => trip.id !== action.payload),
        currentTrip: state.currentTrip?.id === action.payload ? undefined : state.currentTrip,
        // Remove all destinations that belong to the deleted trip
        destinations: (Array.isArray(state.destinations) ? state.destinations : []).filter(dest => 
          !tripDestinationIds.includes(dest.id)
        )
      };
    }
    
    case 'SET_DESTINATIONS':
      return { ...state, destinations: Array.isArray(action.payload) ? action.payload : [] };
    
    case 'ADD_DESTINATION':
      const newDestination = action.payload;
      return {
        ...state,
        destinations: [...state.destinations, newDestination],
        trips: state.currentTrip 
          ? (Array.isArray(state.trips) ? state.trips : []).map(trip => 
              trip.id === state.currentTrip!.id
                ? { ...trip, destinations: [...(Array.isArray(trip.destinations) ? trip.destinations : []), newDestination.id] }
                : trip
            )
          : state.trips,
        currentTrip: state.currentTrip
          ? { ...state.currentTrip, destinations: [...state.currentTrip.destinations, newDestination.id] }
          : state.currentTrip
      };
    
    case 'UPDATE_DESTINATION':
      return {
        ...state,
        destinations: (Array.isArray(state.destinations) ? state.destinations : []).map(dest => 
          dest.id === action.payload.id
            ? { ...dest, ...action.payload.data, updatedAt: getCurrentDateString() }
            : dest
        )
      };
    
    case 'DELETE_DESTINATION':
      return {
        ...state,
        destinations: (Array.isArray(state.destinations) ? state.destinations : []).filter(dest => dest.id !== action.payload),
        trips: (Array.isArray(state.trips) ? state.trips : []).map(trip => ({
          ...trip,
          destinations: (Array.isArray(trip.destinations) ? trip.destinations : []).filter(destId => destId !== action.payload)
        })),
        currentTrip: state.currentTrip
          ? {
              ...state.currentTrip,
              destinations: state.currentTrip.destinations.filter(destId => destId !== action.payload)
            }
          : state.currentTrip
      };

    case 'REORDER_DESTINATIONS':
      return {
        ...state,
        trips: (Array.isArray(state.trips) ? state.trips : []).map(trip => 
          trip.id === action.payload.tripId
            ? { ...trip, destinations: Array.isArray(action.payload.destinationIds) ? action.payload.destinationIds : [], updatedAt: getCurrentDateString() }
            : trip
        ),
        currentTrip: state.currentTrip?.id === action.payload.tripId
          ? { ...state.currentTrip, destinations: action.payload.destinationIds, updatedAt: getCurrentDateString() }
          : state.currentTrip
      };
    
    case 'SET_CURRENT_TRIP':
      const trip = (Array.isArray(state.trips) ? state.trips : []).find(t => t.id === action.payload);
      return { ...state, currentTrip: trip };
    
    case 'UPDATE_UI_STATE':
      return { ...state, uiState: { ...state.uiState, ...action.payload } };
    
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    
    case 'SET_LOADING':
      return { ...state, uiState: { ...state.uiState, isLoading: action.payload } };
    
    default:
      return state;
  }
};

// Context
const SupabaseAppContext = createContext<AppContextType | undefined>(undefined);

// Provider Component
interface SupabaseAppProviderProps {
  children: ReactNode;
}

export const SupabaseAppProvider: React.FC<SupabaseAppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load data from Supabase on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        console.log('🔄 Loading data from Supabase...');
        console.log('🔧 Placeholder credentials check:', isUsingPlaceholderCredentials);
        console.log('🔧 Supabase URL:', process.env.REACT_APP_SUPABASE_URL?.substring(0, 30) + '...');
        console.log('🔧 Has Anon Key:', !!process.env.REACT_APP_SUPABASE_ANON_KEY);
        
        // Test Supabase connection directly
        try {
          const { data, error } = await supabase.from('trips').select('count').limit(1);
          if (error) {
            console.error('❌ Supabase connection test failed:', error);
          } else {
            console.log('✅ Supabase connection test successful:', data);
          }
        } catch (testError) {
          console.error('❌ Supabase connection test error:', testError);
        }
        
        // Load settings from localStorage (still stored locally)
        const savedSettings = loadFromLocalStorage<Partial<AppSettings>>('vacation-planner-settings');
        if (savedSettings) {
          dispatch({ type: 'UPDATE_SETTINGS', payload: savedSettings });
        }
        
        // Load trips from Supabase with fallback
        let trips: Trip[] = [];
        try {
          trips = await SupabaseService.getTrips();
          console.log('📍 Trips loaded:', trips?.length || 'undefined/null');
          console.log('📍 Trips type:', typeof trips, Array.isArray(trips));
        } catch (error) {
          console.error('❌ Error loading trips from Supabase:', error);
          trips = []; // Ensure we have an empty array, not null/undefined
        }
        
        // Double-check trips is an array before dispatching
        if (!Array.isArray(trips)) {
          console.warn('⚠️ trips is not an array, converting to empty array:', trips);
          trips = [];
        }
        dispatch({ type: 'SET_TRIPS', payload: trips });

        // Load UI state from localStorage (stored locally) and determine initial view
        const savedUIState = loadFromLocalStorage<Partial<UIState>>('vacation-planner-ui-state');
        const hasStoredUIState = savedUIState && savedUIState.currentView;
        
        // Determine the appropriate initial view
        const initialView = getInitialView(trips, !!hasStoredUIState);
        
        if (savedUIState) {
          // Respect stored UI state for returning users
          dispatch({ type: 'UPDATE_UI_STATE', payload: { ...initialUIState, ...savedUIState } });
        } else {
          // For new users, set the determined initial view
          dispatch({ type: 'UPDATE_UI_STATE', payload: { ...initialUIState, currentView: initialView } });
          console.log('🎯 New user detected, setting initial view to:', initialView);
        }

        // Load destinations from Supabase with fallback
        let destinations: Destination[] = [];
        try {
          destinations = await SupabaseService.getDestinations();
          console.log('🎯 Destinations loaded:', destinations?.length || 'undefined/null');
          console.log('🎯 Destinations type:', typeof destinations, Array.isArray(destinations));
        } catch (error) {
          console.error('❌ Error loading destinations from Supabase:', error);
          destinations = []; // Ensure we have an empty array, not null/undefined
        }
        
        // Double-check destinations is an array before dispatching
        if (!Array.isArray(destinations)) {
          console.warn('⚠️ destinations is not an array, converting to empty array:', destinations);
          destinations = [];
        }
        dispatch({ type: 'SET_DESTINATIONS', payload: destinations });
        
        console.log('✅ Supabase AppContext initialized');
      } catch (error) {
        console.error('❌ Error loading data from Supabase:', error);
        // Fallback to localStorage if Supabase fails
        const savedTrips = loadFromLocalStorage<Trip[]>('vacation-planner-trips');
        const savedDestinations = loadFromLocalStorage<Destination[]>('vacation-planner-destinations');
        
        if (savedTrips) dispatch({ type: 'SET_TRIPS', payload: savedTrips });
        if (savedDestinations) dispatch({ type: 'SET_DESTINATIONS', payload: savedDestinations });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
        setIsInitialized(true);
      }
    };

    loadInitialData();
  }, []);

  // Initialize Cross-App Synchronization
  useEffect(() => {
    if (!isInitialized) return;

    // Initialize the sync service
    CrossAppSyncService.initialize();

    // Subscribe to sync events from other apps
    const unsubscribe = CrossAppSyncService.subscribe((eventType, eventData) => {
      console.log('📱 Received sync event from other app:', eventType);
      
      switch (eventType) {
        case 'trips_updated':
          if (eventData?.data && Array.isArray(eventData.data)) {
            console.log('📱 Updating trips from other app:', eventData.data.length);
            dispatch({ type: 'SET_TRIPS', payload: eventData.data });
          }
          break;
          
        case 'destinations_updated':
          if (eventData?.data && Array.isArray(eventData.data)) {
            console.log('📱 Updating destinations from other app:', eventData.data.length);
            dispatch({ type: 'SET_DESTINATIONS', payload: eventData.data });
          }
          break;
      }
    });

    // Load shared data on initialization
    const sharedTrips = CrossAppSyncService.loadSharedTrips();
    const sharedDestinations = CrossAppSyncService.loadSharedDestinations();
    
    if (sharedTrips.length > 0) {
      console.log('📱 Loading shared trips:', sharedTrips.length);
      dispatch({ type: 'SET_TRIPS', payload: sharedTrips });
    }
    
    if (sharedDestinations.length > 0) {
      console.log('📱 Loading shared destinations:', sharedDestinations.length);
      dispatch({ type: 'SET_DESTINATIONS', payload: sharedDestinations });
    }

    return unsubscribe;
  }, [isInitialized]);

  // Save settings and UI state to localStorage when they change
  useEffect(() => {
    if (isInitialized) {
      saveToLocalStorage('vacation-planner-settings', state.settings);
    }
  }, [state.settings, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      saveToLocalStorage('vacation-planner-ui-state', state.uiState);
    }
  }, [state.uiState, isInitialized]);

  // Auto-select first trip if no current trip is selected
  useEffect(() => {
    if (state.trips.length > 0 && !state.currentTrip) {
      const firstTrip = state.trips[0];
      console.log('🚀 Auto-selecting first trip:', firstTrip.name);
      dispatch({ type: 'SET_CURRENT_TRIP', payload: firstTrip.id });
      dispatch({ type: 'UPDATE_UI_STATE', payload: { activeTripId: firstTrip.id } });
    }
  }, [state.trips, state.currentTrip]);

  // Setup real-time subscriptions (skip if using placeholder credentials)
  useEffect(() => {
    if (!isInitialized || isUsingPlaceholderCredentials) {
      if (isUsingPlaceholderCredentials) {
        console.log('🔌 Skipping real-time subscriptions - using LocalStorage fallback');
      }
      return;
    }

    console.log('🔄 Setting up real-time subscriptions...');
    
    let tripsSubscription: any = null;
    let destinationsSubscription: any = null;
    
    try {
      // Subscribe to trips changes
      tripsSubscription = SupabaseService.subscribeToTrips((trips) => {
        console.log('📡 Real-time trips update:', trips.length);
        dispatch({ type: 'SET_TRIPS', payload: trips });
      });

      // Subscribe to destinations changes
      destinationsSubscription = SupabaseService.subscribeToDestinations((destinations) => {
        console.log('📡 Real-time destinations update:', destinations.length);
        dispatch({ type: 'SET_DESTINATIONS', payload: destinations });
      });
    } catch (error) {
      console.error('❌ Failed to set up subscriptions:', error);
    }

    return () => {
      console.log('🔌 Cleaning up subscriptions...');
      try {
        if (tripsSubscription) {
          tripsSubscription.unsubscribe();
        }
        if (destinationsSubscription) {
          destinationsSubscription.unsubscribe();
        }
      } catch (error) {
        console.error('❌ Error during subscription cleanup:', error);
      }
    };
  }, [isInitialized]);

  // Trip Actions
  const createTrip = async (data: CreateTripData): Promise<Trip> => {
    try {
      const tripData = {
        ...data,
        status: 'planned' as any,
        ownerId: await getCurrentUserId() || 'anonymous',
        privacy: data.privacy || 'private' as any,
        taggedUsers: data.taggedUsers || [],
      };
      const newTrip = await SupabaseService.createTrip(tripData);
      dispatch({ type: 'ADD_TRIP', payload: newTrip });
      
      // Always notify other apps for cross-app sync
      const updatedTrips = [newTrip, ...state.trips];
      CrossAppSyncService.notifyTripsUpdated(updatedTrips);
      
      return newTrip;
    } catch (error: any) {
      // Handle placeholder credentials by falling back to LocalStorage
      if (error?.message === 'PLACEHOLDER_CREDENTIALS' || isUsingPlaceholderCredentials) {
        console.log('📦 Creating trip in LocalStorage fallback mode');
        
        const newTrip: Trip = {
          id: generateUUID(),
          name: data.name,
          description: data.description || '',
          startDate: data.startDate,
          endDate: data.endDate,
          budget: data.budget,
          actualCost: 0,
          participants: data.participants || [],
          status: 'planned' as any,
          destinations: [],
          tags: data.tags || [],
          privacy: data.privacy || 'private' as any,
          ownerId: await getCurrentUserId() || 'anonymous',
          taggedUsers: data.taggedUsers || [],
          coverImage: undefined,
          vehicleConfig: undefined,
          createdAt: getCurrentDateString(),
          updatedAt: getCurrentDateString(),
        };
        
        // Add to current state and notify other apps
        dispatch({ type: 'ADD_TRIP', payload: newTrip });
        const updatedTrips = [newTrip, ...state.trips];
        
        // Notify other apps via CrossAppSync
        CrossAppSyncService.notifyTripsUpdated(updatedTrips);
        
        return newTrip;
      }
      
      console.error('Error creating trip:', error);
      throw error;
    }
  };

  const updateTrip = async (id: UUID, data: Partial<Trip>): Promise<Trip> => {
    try {
      const updatedTrip = await SupabaseService.updateTrip(id, data);
      dispatch({ type: 'UPDATE_TRIP', payload: { id, data: updatedTrip } });
      return updatedTrip;
    } catch (error) {
      console.error('Error updating trip:', error);
      throw error;
    }
  };

  const deleteTrip = async (id: UUID): Promise<void> => {
    try {
      await SupabaseService.deleteTrip(id);
      dispatch({ type: 'DELETE_TRIP', payload: id });
      
      // Reload destinations to ensure consistency
      const updatedDestinations = await SupabaseService.getDestinations();
      dispatch({ type: 'SET_DESTINATIONS', payload: updatedDestinations });
      
      console.log('✅ Trip deleted and state updated successfully');
    } catch (error) {
      console.error('Error deleting trip:', error);
      throw error;
    }
  };

  // Destination Actions
  const createDestinationForTrip = async (data: CreateDestinationData, tripId: string): Promise<Destination> => {
    try {
      console.log('🎯 Creating destination for specific trip:', tripId);
      console.log('🎯 Destination data:', data);
      
      const destinationData = {
        ...data,
        status: data.status || 'planned' as any,
        photos: [],
        createdAt: getCurrentDateString(),
        updatedAt: getCurrentDateString(),
      };
      
      const newDestination = await SupabaseService.createDestination(destinationData, tripId);
      console.log('✅ Destination created in Supabase:', newDestination);
      
      dispatch({ type: 'ADD_DESTINATION', payload: newDestination });
      
      
      // Reload trips and destinations to ensure data consistency
      console.log('🔄 Reloading trips and destinations after creation...');
      const [updatedTrips, updatedDestinations] = await Promise.all([
        SupabaseService.getTrips(),
        SupabaseService.getDestinations()
      ]);
      
      dispatch({ type: 'SET_TRIPS', payload: updatedTrips });
      dispatch({ type: 'SET_DESTINATIONS', payload: updatedDestinations });
      
      // Update current trip if needed
      if (state.currentTrip?.id === tripId) {
        const updatedCurrentTrip = updatedTrips.find(t => t.id === tripId);
        if (updatedCurrentTrip) {
          dispatch({ type: 'SET_CURRENT_TRIP', payload: updatedCurrentTrip.id });
        }
      }
      
      console.log('✅ Data reloaded successfully');
      return newDestination;
    } catch (error) {
      console.error('❌ Error creating destination for trip:', error);
      throw error;
    }
  };

  const createDestination = async (data: CreateDestinationData): Promise<Destination> => {
    try {
      // Debug current state
      console.log('🔍 Debug createDestination state:');
      console.log('  - state.uiState.activeTripId:', state.uiState.activeTripId);
      console.log('  - state.currentTrip?.id:', state.currentTrip?.id);
      console.log('  - state.currentTrip:', state.currentTrip);
      console.log('  - state.trips.length:', state.trips.length);
      console.log('  - Available trips:', state.trips.map(t => ({ id: t.id, name: t.name })));
      
      const activeTripId = state.uiState.activeTripId || state.currentTrip?.id;
      
      if (!activeTripId) {
        // Try to use the first trip if there's only one
        if (state.trips.length === 1) {
          const fallbackTripId = state.trips[0].id;
          console.log('🔧 No active trip, using fallback trip:', fallbackTripId);
          dispatch({ type: 'SET_CURRENT_TRIP', payload: fallbackTripId });
          dispatch({ type: 'UPDATE_UI_STATE', payload: { activeTripId: fallbackTripId } });
          
          // Proceed with the fallback trip
          const destinationData = {
            ...data,
            status: data.status || 'planned' as any,
            photos: [],
            createdAt: getCurrentDateString(),
            updatedAt: getCurrentDateString(),
          };
          
          console.log('🎯 Creating destination with fallback trip:', fallbackTripId);
          console.log('🎯 Destination data:', destinationData);
          
          const newDestination = await SupabaseService.createDestination(destinationData, fallbackTripId);
          console.log('✅ Destination created in Supabase:', newDestination);
          
          dispatch({ type: 'ADD_DESTINATION', payload: newDestination });
          
          // Add a small delay to ensure database consistency
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Reload trips and destinations to ensure data consistency
          console.log('🔄 Reloading trips and destinations after creation (fallback)...');
          const [updatedTrips, updatedDestinations] = await Promise.all([
            SupabaseService.getTrips(),
            SupabaseService.getDestinations()
          ]);
          
          dispatch({ type: 'SET_TRIPS', payload: updatedTrips });
          dispatch({ type: 'SET_DESTINATIONS', payload: updatedDestinations });
          
          // Update current trip if needed
          const updatedCurrentTrip = updatedTrips.find(t => t.id === fallbackTripId);
          if (updatedCurrentTrip) {
            dispatch({ type: 'SET_CURRENT_TRIP', payload: updatedCurrentTrip.id });
          }
          
          console.log('✅ Data reloaded successfully (fallback)');
          return newDestination;
        } else {
          throw new Error('No active trip selected. Please select a trip before creating destinations.');
        }
      }
      
      console.log('🎯 Creating destination for active trip:', activeTripId);
      
      const destinationData = {
        ...data,
        status: data.status || 'planned' as any,
        photos: [],
        createdAt: getCurrentDateString(),
        updatedAt: getCurrentDateString(),
      };
      
      console.log('🎯 Destination data:', destinationData);
      
      const newDestination = await SupabaseService.createDestination(destinationData, activeTripId);
      console.log('✅ Destination created in Supabase:', newDestination);
      
      dispatch({ type: 'ADD_DESTINATION', payload: newDestination });
      
      
      // Reload trips and destinations to ensure data consistency
      console.log('🔄 Reloading trips and destinations after creation...');
      const [updatedTrips, updatedDestinations] = await Promise.all([
        SupabaseService.getTrips(),
        SupabaseService.getDestinations()
      ]);
      
      dispatch({ type: 'SET_TRIPS', payload: updatedTrips });
      dispatch({ type: 'SET_DESTINATIONS', payload: updatedDestinations });
      
      // Update current trip if needed
      if (state.currentTrip?.id === activeTripId) {
        const updatedCurrentTrip = updatedTrips.find(t => t.id === activeTripId);
        if (updatedCurrentTrip) {
          dispatch({ type: 'SET_CURRENT_TRIP', payload: updatedCurrentTrip.id });
        }
      }
      
      console.log('✅ Data reloaded successfully');
      return newDestination;
    } catch (error) {
      console.error('❌ Error creating destination:', error);
      throw error;
    }
  };

  const updateDestination = async (id: UUID, data: Partial<Destination>): Promise<Destination> => {
    try {
      const updatedDestination = await SupabaseService.updateDestination(id, data);
      dispatch({ type: 'UPDATE_DESTINATION', payload: { id, data } });
      return updatedDestination;
    } catch (error) {
      console.error('Error updating destination:', error);
      throw error;
    }
  };

  const deleteDestination = async (id: UUID): Promise<void> => {
    try {
      await SupabaseService.deleteDestination(id);
      dispatch({ type: 'DELETE_DESTINATION', payload: id });
    } catch (error) {
      console.error('Error deleting destination:', error);
      throw error;
    }
  };

  const reorderDestinations = async (tripId: UUID, destinationIds: UUID[]): Promise<void> => {
    try {
      // Update sort order in Supabase
      const updates = destinationIds.map((id, index) => ({
        id,
        sortOrder: index
      }));
      
      await SupabaseService.updateDestinationsOrder(updates);
      dispatch({ type: 'REORDER_DESTINATIONS', payload: { tripId, destinationIds } });
    } catch (error) {
      console.error('Error reordering destinations:', error);
      throw error;
    }
  };

  // UI Actions
  const setCurrentTrip = (tripId: UUID) => {
    dispatch({ type: 'SET_CURRENT_TRIP', payload: tripId });
    dispatch({ type: 'UPDATE_UI_STATE', payload: { activeTripId: tripId } });
  };

  const updateUIState = (uiState: Partial<UIState>) => {
    dispatch({ type: 'UPDATE_UI_STATE', payload: uiState });
  };

  const updateSettings = (settings: Partial<AppSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  };

  // Export Action (still using local data for export)
  const exportTrip = async (tripId: UUID, options: ExportOptions): Promise<string> => {
    const trip = (Array.isArray(state.trips) ? state.trips : []).find(t => t.id === tripId);
    if (!trip) throw new Error('Trip not found');

    const tripDestinations = (Array.isArray(state.destinations) ? state.destinations : []).filter(dest => 
      (Array.isArray(trip.destinations) ? trip.destinations : []).includes(dest.id)
    );

    const exportData = {
      trip,
      destinations: tripDestinations,
      exportedAt: getCurrentDateString()
    };

    switch (options.format) {
      case 'json':
        return exportToJSON(exportData);
      case 'csv':
        return exportToCSV(tripDestinations);
      default:
        throw new Error(`Export format ${options.format} not yet implemented`);
    }
  };

  const loadPublicTrips = useCallback(async (): Promise<void> => {
    try {
      console.log('🌍 Loading public trips...');
      const publicTrips = await SupabaseService.getPublicTrips();
      console.log(`📊 Loaded ${publicTrips.length} public trips`);
      dispatch({ type: 'SET_PUBLIC_TRIPS', payload: publicTrips });
    } catch (error) {
      console.error('❌ Failed to load public trips:', error);
    }
  }, []);

  const contextValue: AppContextType = {
    trips: state.trips,
    publicTrips: state.publicTrips,
    destinations: state.destinations,
    currentTrip: state.currentTrip,
    uiState: state.uiState,
    settings: state.settings,
    createTrip,
    updateTrip,
    deleteTrip,
    createDestination,
    createDestinationForTrip,
    updateDestination,
    deleteDestination,
    reorderDestinations,
    setCurrentTrip,
    updateUIState,
    updateSettings,
    exportTrip,
    loadPublicTrips
  };

  // Expose functions globally for development debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as any).debugVacationPlanner = {
        createTrip,
        createDestination,
        state,
        testDestinationCreation: async () => {
          console.log('🧪 Running comprehensive destination creation test...');
          
          try {
            // Step 1: Ensure we have a trip
            let activeTrip = state.currentTrip;
            
            if (!activeTrip && state.trips.length === 0) {
              console.log('📝 Creating test trip first...');
              const testTrip = await createTrip({
                name: 'Debug Test Trip',
                description: 'Created for testing destination creation',
                startDate: '2025-01-15',
                endDate: '2025-01-17',
                participants: [],
                tags: ['debug']
              });
              activeTrip = testTrip;
              console.log('✅ Test trip created:', testTrip);
            } else if (!activeTrip && state.trips.length > 0) {
              activeTrip = state.trips[0];
              console.log('🔧 Using existing trip:', activeTrip.name);
            }
            
            if (!activeTrip) {
              throw new Error('No trip available for destination creation');
            }
            
            // Step 2: Create destination
            const testData: CreateDestinationData = {
              name: 'Debug Test Restaurant',
              location: 'Berlin, Germany',
              category: 'restaurant' as any,
              startDate: '2025-01-15',
              endDate: '2025-01-15',
              budget: 50,
              notes: 'Created from debug function',
              tags: ['debug', 'test']
            };
            
            console.log('🎯 Creating destination with trip ID:', activeTrip.id);
            console.log('🎯 Destination data:', testData);
            
            const result = await createDestination(testData);
            console.log('✅ Test destination created successfully:', result);
            return result;
          } catch (error) {
            console.error('❌ Test destination creation failed:', error);
            throw error;
          }
        }
      };
      console.log('🔧 Debug functions exposed to window.debugVacationPlanner');
    }
  }, [state, createTrip, createDestination]);

  return (
    <SupabaseAppContext.Provider value={contextValue}>
      {children}
    </SupabaseAppContext.Provider>
  );
};

// Hook to use the Supabase context
export const useSupabaseApp = (): AppContextType => {
  const context = useContext(SupabaseAppContext);
  if (!context) {
    throw new Error('useSupabaseApp must be used within a SupabaseAppProvider');
  }
  return context;
};

export default SupabaseAppContext;