import React, { createContext, useContext, useReducer, useEffect, useState, ReactNode } from 'react';
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
  generateUUID, 
  getCurrentDateString,
  saveToLocalStorage,
  loadFromLocalStorage,
  exportToJSON,
  exportToCSV
} from '../utils';

// Action Types
type AppAction = 
  | { type: 'SET_TRIPS'; payload: Trip[] }
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

// Initial UI State
const initialUIState: UIState = {
  currentView: 'list',
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
  mapCenter: undefined,
  mapZoom: 10
};

// Initial Settings
const initialSettings: AppSettings = {
  // General Settings
  language: 'de',
  theme: 'auto',
  currency: 'EUR',
  dateFormat: 'dd.MM.yyyy',
  timeFormat: '24h',
  
  // Map Settings
  defaultMapProvider: 'osm',
  defaultMapZoom: 10,
  showTraffic: false,
  showPublicTransport: true,
  
  // Travel Settings
  defaultTransportMode: TransportMode.DRIVING,
  fuelType: FuelType.E10,
  fuelConsumption: 9.0,
  
  // Notification Settings
  enableNotifications: true,
  reminderTime: 30,
  
  // Export Settings
  defaultExportFormat: 'json',
  includePhotosInExport: true,
  includeNotesInExport: true,
  
  // Privacy Settings
  shareLocation: false,
  trackVisitHistory: true,
  
  // Backup Settings
  autoBackup: true,
  backupInterval: 24
};

// App State Interface
interface AppState {
  trips: Trip[];
  destinations: Destination[];
  currentTrip?: Trip;
  uiState: UIState;
  settings: AppSettings;
}

// Initial State
const initialState: AppState = {
  trips: [],
  destinations: [],
  currentTrip: undefined,
  uiState: initialUIState,
  settings: initialSettings
};

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_TRIPS':
      return { ...state, trips: action.payload };
    
    case 'ADD_TRIP':
      return { ...state, trips: [...state.trips, action.payload] };
    
    case 'UPDATE_TRIP':
      return {
        ...state,
        trips: state.trips.map(trip => 
          trip.id === action.payload.id 
            ? { ...trip, ...action.payload.data, updatedAt: getCurrentDateString() }
            : trip
        ),
        currentTrip: state.currentTrip?.id === action.payload.id
          ? { ...state.currentTrip, ...action.payload.data, updatedAt: getCurrentDateString() }
          : state.currentTrip
      };
    
    case 'DELETE_TRIP':
      return {
        ...state,
        trips: state.trips.filter(trip => trip.id !== action.payload),
        currentTrip: state.currentTrip?.id === action.payload ? undefined : state.currentTrip,
        destinations: state.destinations.filter(dest => 
          !state.trips.find(trip => trip.id === action.payload)?.destinations.includes(dest.id)
        )
      };
    
    case 'SET_DESTINATIONS':
      return { ...state, destinations: action.payload };
    
    case 'ADD_DESTINATION':
      const newDestination = action.payload;
      return {
        ...state,
        destinations: [...state.destinations, newDestination],
        trips: state.currentTrip 
          ? state.trips.map(trip => 
              trip.id === state.currentTrip!.id
                ? { ...trip, destinations: [...trip.destinations, newDestination.id] }
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
        destinations: state.destinations.map(dest => 
          dest.id === action.payload.id
            ? { ...dest, ...action.payload.data, updatedAt: getCurrentDateString() }
            : dest
        )
      };
    
    case 'DELETE_DESTINATION':
      return {
        ...state,
        destinations: state.destinations.filter(dest => dest.id !== action.payload),
        trips: state.trips.map(trip => ({
          ...trip,
          destinations: trip.destinations.filter(destId => destId !== action.payload)
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
        trips: state.trips.map(trip => 
          trip.id === action.payload.tripId
            ? { ...trip, destinations: action.payload.destinationIds, updatedAt: getCurrentDateString() }
            : trip
        ),
        currentTrip: state.currentTrip?.id === action.payload.tripId
          ? { ...state.currentTrip, destinations: action.payload.destinationIds, updatedAt: getCurrentDateString() }
          : state.currentTrip
      };
    
    case 'SET_CURRENT_TRIP':
      const trip = state.trips.find(t => t.id === action.payload);
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
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider Component
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedTrips = loadFromLocalStorage<Trip[]>('vacation-planner-trips');
    const savedDestinations = loadFromLocalStorage<Destination[]>('vacation-planner-destinations');
    const savedUIState = loadFromLocalStorage<Partial<UIState>>('vacation-planner-ui-state');
    const savedSettings = loadFromLocalStorage<Partial<AppSettings>>('vacation-planner-settings');

    console.log('🔄 Loading data from localStorage...');
    console.log('📍 Trips loaded:', savedTrips ? savedTrips.length : 0);
    console.log('🎯 Destinations loaded:', savedDestinations ? savedDestinations.length : 0);
    console.log('⚙️ Settings loaded:', savedSettings ? 'yes' : 'no');
    
    if (savedTrips) {
      console.log('✅ Setting trips:', savedTrips);
      dispatch({ type: 'SET_TRIPS', payload: savedTrips });
    } else {
      console.log('❌ No trips found in localStorage');
    }

    if (savedDestinations) {
      console.log('✅ Setting destinations:', savedDestinations);
      dispatch({ type: 'SET_DESTINATIONS', payload: savedDestinations });
    } else {
      console.log('❌ No destinations found in localStorage');
    }

    if (savedUIState) {
      dispatch({ type: 'UPDATE_UI_STATE', payload: { ...initialUIState, ...savedUIState } });
    }

    if (savedSettings) {
      dispatch({ type: 'UPDATE_SETTINGS', payload: savedSettings });
    }
    
    // Mark as initialized after loading
    console.log('✅ AppContext initialized');
    setIsInitialized(true);
  }, []);

  // Save to localStorage when state changes (but not on initial load)
  
  useEffect(() => {
    if (isInitialized) {
      console.log('💾 Saving trips to localStorage:', state.trips.length);
      saveToLocalStorage('vacation-planner-trips', state.trips);
    }
  }, [state.trips, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      console.log('💾 Saving destinations to localStorage:', state.destinations.length);
      saveToLocalStorage('vacation-planner-destinations', state.destinations);
    }
  }, [state.destinations, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      saveToLocalStorage('vacation-planner-ui-state', state.uiState);
    }
  }, [state.uiState, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      console.log('💾 Saving settings to localStorage');
      saveToLocalStorage('vacation-planner-settings', state.settings);
    }
  }, [state.settings, isInitialized]);

  // Auto-select first trip if no current trip is selected
  useEffect(() => {
    console.log('🎯 Checking trip auto-selection...');
    console.log('Available trips:', state.trips.length);
    console.log('Current trip:', state.currentTrip?.name || 'None');
    
    if (state.trips.length > 0 && !state.currentTrip) {
      const firstTrip = state.trips[0];
      console.log('🚀 Auto-selecting first trip:', firstTrip.name);
      dispatch({ type: 'SET_CURRENT_TRIP', payload: firstTrip.id });
      dispatch({ type: 'UPDATE_UI_STATE', payload: { activeTripId: firstTrip.id } });
    }
  }, [state.trips, state.currentTrip]);

  // Trip Actions
  const createTrip = async (data: CreateTripData): Promise<Trip> => {
    const newTrip: Trip = {
      id: generateUUID(),
      ...data,
      destinations: [],
      actualCost: 0,
      status: 'planned' as any,
      coverImage: undefined,
      createdAt: getCurrentDateString(),
      updatedAt: getCurrentDateString()
    };

    dispatch({ type: 'ADD_TRIP', payload: newTrip });
    return newTrip;
  };

  const updateTrip = async (id: UUID, data: Partial<Trip>): Promise<Trip> => {
    dispatch({ type: 'UPDATE_TRIP', payload: { id, data } });
    const updatedTrip = state.trips.find(trip => trip.id === id);
    if (!updatedTrip) throw new Error('Trip not found');
    return { ...updatedTrip, ...data };
  };

  const deleteTrip = async (id: UUID): Promise<void> => {
    dispatch({ type: 'DELETE_TRIP', payload: id });
  };

  // Destination Actions
  const createDestination = async (data: CreateDestinationData): Promise<Destination> => {
    console.log('Creating destination with data:', data);
    
    const activeTripId = state.uiState.activeTripId;
    const activeTrip = state.trips.find(trip => trip.id === activeTripId);
    console.log('Active trip:', activeTrip);
    
    const newDestination: Destination = {
      id: generateUUID(),
      ...data,
      actualCost: undefined,
      photos: [],
      bookingInfo: undefined,
      status: (data as any).status || DestinationStatus.PLANNED, // Use form status or default
      duration: 60, // default 1 hour
      weatherInfo: undefined,
      transportToNext: undefined,
      website: undefined,
      phoneNumber: undefined,
      address: undefined,
      openingHours: undefined,
      createdAt: getCurrentDateString(),
      updatedAt: getCurrentDateString()
    };

    console.log('New destination created:', newDestination);
    dispatch({ type: 'ADD_DESTINATION', payload: newDestination });
    
    // Add the destination to the current trip if there is one
    if (activeTrip) {
      console.log('Adding destination to current trip:', activeTrip.id);
      dispatch({ 
        type: 'UPDATE_TRIP', 
        payload: { 
          id: activeTrip.id, 
          data: { 
            destinations: [...activeTrip.destinations, newDestination.id] 
          } 
        } 
      });
      console.log('Destination added to trip');
    } else {
      console.log('No current trip found');
    }
    
    return newDestination;
  };

  const updateDestination = async (id: UUID, data: Partial<Destination>): Promise<Destination> => {
    dispatch({ type: 'UPDATE_DESTINATION', payload: { id, data } });
    const updatedDestination = state.destinations.find(dest => dest.id === id);
    if (!updatedDestination) throw new Error('Destination not found');
    return { ...updatedDestination, ...data };
  };

  const deleteDestination = async (id: UUID): Promise<void> => {
    dispatch({ type: 'DELETE_DESTINATION', payload: id });
    
    // Remove the destination from all trips
    const tripsWithDestination = state.trips.filter(trip => 
      trip.destinations.includes(id)
    );
    
    for (const trip of tripsWithDestination) {
      dispatch({
        type: 'UPDATE_TRIP',
        payload: {
          id: trip.id,
          data: {
            destinations: trip.destinations.filter(destId => destId !== id)
          }
        }
      });
    }
  };

  const reorderDestinations = async (tripId: UUID, destinationIds: UUID[]): Promise<void> => {
    dispatch({ type: 'REORDER_DESTINATIONS', payload: { tripId, destinationIds } });
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

  // Export Action
  const exportTrip = async (tripId: UUID, options: ExportOptions): Promise<string> => {
    const trip = state.trips.find(t => t.id === tripId);
    if (!trip) throw new Error('Trip not found');

    const tripDestinations = state.destinations.filter(dest => 
      trip.destinations.includes(dest.id)
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

  const contextValue: AppContextType = {
    trips: state.trips,
    destinations: state.destinations,
    currentTrip: state.currentTrip,
    uiState: state.uiState,
    settings: state.settings,
    createTrip,
    updateTrip,
    deleteTrip,
    createDestination,
    updateDestination,
    deleteDestination,
    reorderDestinations,
    setCurrentTrip,
    updateUIState,
    updateSettings,
    exportTrip
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Hook to use the context
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;