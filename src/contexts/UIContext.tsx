import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { 
  UIState, 
  UUID, 
  SortField, 
  SortDirection, 
  DestinationCategory, 
  DestinationStatus,
  Coordinates,
  AppSettings,
  TransportMode,
  FuelType 
} from '../types';

// UI Action Types
type UIAction = 
  | { type: 'UPDATE_UI_STATE'; payload: Partial<UIState> }
  | { type: 'SET_CURRENT_VIEW'; payload: UIState['currentView'] }
  | { type: 'SET_ACTIVE_DESTINATION'; payload: UUID | undefined }
  | { type: 'SET_ACTIVE_TRIP'; payload: UUID | undefined }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SIDEBAR_OPEN'; payload: boolean }
  | { type: 'SET_HIDE_HEADER'; payload: boolean }
  | { type: 'SET_MAP_CENTER'; payload: Coordinates | undefined }
  | { type: 'SET_MAP_ZOOM'; payload: number }
  | { type: 'UPDATE_FILTERS'; payload: Partial<UIState['filters']> }
  | { type: 'UPDATE_SORT_OPTIONS'; payload: Partial<UIState['sortOptions']> }
  | { type: 'SET_SELECTED_TRIP'; payload: UUID | undefined }
  | { type: 'SET_SHOW_TRIP_DETAILS'; payload: boolean }
  | { type: 'SET_SELECTED_DESTINATION'; payload: UUID | undefined }
  | { type: 'SET_SHOW_DESTINATION_DETAILS'; payload: boolean }
  | { type: 'SET_SELECTED_USER'; payload: UUID | undefined }
  | { type: 'SET_SHOW_USER_PROFILE'; payload: boolean }
  | { type: 'SET_CHAT_OPEN'; payload: boolean }
  | { type: 'SET_SELECTED_CHAT_ROOM'; payload: string | undefined }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> };

// Initial UI State
const initialUIState: UIState = {
  currentView: 'landing', // Always start with landing view on page load/refresh
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
  showTripDetails: false,
  selectedDestinationId: undefined,
  showDestinationDetails: false,
  selectedUserId: undefined,
  showUserProfile: false,
  chatOpen: false,
  selectedChatRoomId: undefined,
  settings: {
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
    fuelConsumption: 7.5,
    shareLocation: false,
    trackVisitHistory: true,
    enableNotifications: true,
    reminderTime: 30,
    defaultExportFormat: 'json',
    includePhotosInExport: true,
    includeNotesInExport: true,
    autoBackup: false,
    backupInterval: 24
  }
};

// UI Context Type
interface UIContextType extends UIState {
  // Navigation
  navigateTo: (view: UIState['currentView']) => void;
  goBack: () => void;
  
  // Active Elements
  setActiveDestination: (id: UUID | undefined) => void;
  setActiveTrip: (id: UUID | undefined) => void;
  
  // Loading States
  setLoading: (loading: boolean) => void;
  
  // Search
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  
  // Sidebar
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  // Header
  setHideHeader: (hide: boolean) => void;
  
  // Map
  setMapCenter: (center: Coordinates | undefined) => void;
  setMapZoom: (zoom: number) => void;
  
  // Filters
  updateFilters: (filters: Partial<UIState['filters']>) => void;
  clearFilters: () => void;
  addCategoryFilter: (category: DestinationCategory) => void;
  removeCategoryFilter: (category: DestinationCategory) => void;
  addStatusFilter: (status: DestinationStatus) => void;
  removeStatusFilter: (status: DestinationStatus) => void;
  addTagFilter: (tag: string) => void;
  removeTagFilter: (tag: string) => void;
  
  // Sorting
  updateSortOptions: (options: Partial<UIState['sortOptions']>) => void;
  setSortField: (field: SortField) => void;
  setSortDirection: (direction: SortDirection) => void;
  toggleSortDirection: () => void;
  
  // Trip Details
  openTripDetails: (tripId: UUID) => void;
  closeTripDetails: () => void;
  
  // Destination Details
  openDestinationDetails: (destinationId: UUID) => void;
  closeDestinationDetails: () => void;
  
  // User Profile
  openUserProfile: (userId: UUID) => void;
  closeUserProfile: () => void;
  
  // Chat
  openChat: (roomId?: string) => void;
  closeChat: () => void;
  
  // Settings
  updateSettings: (settings: Partial<AppSettings>) => void;
  
  // Utility
  updateUIState: (state: Partial<UIState>) => void;
  resetUIState: () => void;
}

// UI Reducer
const uiReducer = (state: UIState, action: UIAction): UIState => {
  switch (action.type) {
    case 'UPDATE_UI_STATE':
      return { ...state, ...action.payload };
    
    case 'SET_CURRENT_VIEW':
      return { ...state, currentView: action.payload };
    
    case 'SET_ACTIVE_DESTINATION':
      return { ...state, activeDestination: action.payload };
    
    case 'SET_ACTIVE_TRIP':
      return { ...state, activeTripId: action.payload };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    
    case 'SET_SIDEBAR_OPEN':
      return { ...state, sidebarOpen: action.payload };
    
    case 'SET_HIDE_HEADER':
      return { ...state, hideHeader: action.payload };
    
    case 'SET_MAP_CENTER':
      return { ...state, mapCenter: action.payload };
    
    case 'SET_MAP_ZOOM':
      return { ...state, mapZoom: action.payload };
    
    case 'UPDATE_FILTERS':
      return { 
        ...state, 
        filters: { ...state.filters, ...action.payload }
      };
    
    case 'UPDATE_SORT_OPTIONS':
      return { 
        ...state, 
        sortOptions: { ...state.sortOptions, ...action.payload }
      };
    
    case 'SET_SELECTED_TRIP':
      return { ...state, selectedTripId: action.payload };
    
    case 'SET_SHOW_TRIP_DETAILS':
      return { ...state, showTripDetails: action.payload };
    
    case 'SET_SELECTED_DESTINATION':
      return { ...state, selectedDestinationId: action.payload };
    
    case 'SET_SHOW_DESTINATION_DETAILS':
      return { ...state, showDestinationDetails: action.payload };
    
    case 'SET_SELECTED_USER':
      return { ...state, selectedUserId: action.payload };
    
    case 'SET_SHOW_USER_PROFILE':
      return { ...state, showUserProfile: action.payload };
    
    case 'SET_CHAT_OPEN':
      return { ...state, chatOpen: action.payload };
    
    case 'SET_SELECTED_CHAT_ROOM':
      return { ...state, selectedChatRoomId: action.payload };
    
    case 'UPDATE_SETTINGS':
      return { 
        ...state, 
        settings: { ...state.settings, ...action.payload }
      };
    
    default:
      return state;
  }
};

// Context
const UIContext = createContext<UIContextType | undefined>(undefined);

// Provider Props
interface UIProviderProps {
  children: ReactNode;
}

// UI Provider Component
export const UIProvider: React.FC<UIProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(uiReducer, initialUIState);

  // Navigation
  const navigateTo = useCallback((view: UIState['currentView']) => {
    dispatch({ type: 'SET_CURRENT_VIEW', payload: view });
  }, []);

  const goBack = useCallback(() => {
    // Simple implementation - could be enhanced with history stack
    dispatch({ type: 'SET_CURRENT_VIEW', payload: 'landing' });
  }, []);

  // Active Elements
  const setActiveDestination = useCallback((id: UUID | undefined) => {
    dispatch({ type: 'SET_ACTIVE_DESTINATION', payload: id });
  }, []);

  const setActiveTrip = useCallback((id: UUID | undefined) => {
    dispatch({ type: 'SET_ACTIVE_TRIP', payload: id });
  }, []);

  // Loading States
  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  // Search
  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, []);

  const clearSearch = useCallback(() => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: '' });
  }, []);

  // Sidebar
  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'SET_SIDEBAR_OPEN', payload: !state.sidebarOpen });
  }, [state.sidebarOpen]);

  const setSidebarOpen = useCallback((open: boolean) => {
    dispatch({ type: 'SET_SIDEBAR_OPEN', payload: open });
  }, []);

  // Header
  const setHideHeader = useCallback((hide: boolean) => {
    dispatch({ type: 'SET_HIDE_HEADER', payload: hide });
  }, []);

  // Map
  const setMapCenter = useCallback((center: Coordinates | undefined) => {
    dispatch({ type: 'SET_MAP_CENTER', payload: center });
  }, []);

  const setMapZoom = useCallback((zoom: number) => {
    dispatch({ type: 'SET_MAP_ZOOM', payload: zoom });
  }, []);

  // Filters
  const updateFilters = useCallback((filters: Partial<UIState['filters']>) => {
    dispatch({ type: 'UPDATE_FILTERS', payload: filters });
  }, []);

  const clearFilters = useCallback(() => {
    dispatch({ type: 'UPDATE_FILTERS', payload: { category: [], status: [], tags: [] } });
  }, []);

  const addCategoryFilter = useCallback((category: DestinationCategory) => {
    const currentCategories = state.filters.category || [];
    if (!currentCategories.includes(category)) {
      dispatch({ 
        type: 'UPDATE_FILTERS', 
        payload: { category: [...currentCategories, category] }
      });
    }
  }, [state.filters.category]);

  const removeCategoryFilter = useCallback((category: DestinationCategory) => {
    const currentCategories = state.filters.category || [];
    dispatch({ 
      type: 'UPDATE_FILTERS', 
      payload: { category: currentCategories.filter(c => c !== category) }
    });
  }, [state.filters.category]);

  const addStatusFilter = useCallback((status: DestinationStatus) => {
    const currentStatuses = state.filters.status || [];
    if (!currentStatuses.includes(status)) {
      dispatch({ 
        type: 'UPDATE_FILTERS', 
        payload: { status: [...currentStatuses, status] }
      });
    }
  }, [state.filters.status]);

  const removeStatusFilter = useCallback((status: DestinationStatus) => {
    const currentStatuses = state.filters.status || [];
    dispatch({ 
      type: 'UPDATE_FILTERS', 
      payload: { status: currentStatuses.filter(s => s !== status) }
    });
  }, [state.filters.status]);

  const addTagFilter = useCallback((tag: string) => {
    const currentTags = state.filters.tags || [];
    if (!currentTags.includes(tag)) {
      dispatch({ 
        type: 'UPDATE_FILTERS', 
        payload: { tags: [...currentTags, tag] }
      });
    }
  }, [state.filters.tags]);

  const removeTagFilter = useCallback((tag: string) => {
    const currentTags = state.filters.tags || [];
    dispatch({ 
      type: 'UPDATE_FILTERS', 
      payload: { tags: currentTags.filter(t => t !== tag) }
    });
  }, [state.filters.tags]);

  // Sorting
  const updateSortOptions = useCallback((options: Partial<UIState['sortOptions']>) => {
    dispatch({ type: 'UPDATE_SORT_OPTIONS', payload: options });
  }, []);

  const setSortField = useCallback((field: SortField) => {
    dispatch({ type: 'UPDATE_SORT_OPTIONS', payload: { field } });
  }, []);

  const setSortDirection = useCallback((direction: SortDirection) => {
    dispatch({ type: 'UPDATE_SORT_OPTIONS', payload: { direction } });
  }, []);

  const toggleSortDirection = useCallback(() => {
    const newDirection = state.sortOptions.direction === SortDirection.ASC 
      ? SortDirection.DESC 
      : SortDirection.ASC;
    dispatch({ type: 'UPDATE_SORT_OPTIONS', payload: { direction: newDirection } });
  }, [state.sortOptions.direction]);

  // Trip Details
  const openTripDetails = useCallback((tripId: UUID) => {
    dispatch({ type: 'SET_SELECTED_TRIP', payload: tripId });
    dispatch({ type: 'SET_SHOW_TRIP_DETAILS', payload: true });
  }, []);

  const closeTripDetails = useCallback(() => {
    dispatch({ type: 'SET_SHOW_TRIP_DETAILS', payload: false });
    dispatch({ type: 'SET_SELECTED_TRIP', payload: undefined });
  }, []);

  // Destination Details
  const openDestinationDetails = useCallback((destinationId: UUID) => {
    dispatch({ type: 'SET_SELECTED_DESTINATION', payload: destinationId });
    dispatch({ type: 'SET_SHOW_DESTINATION_DETAILS', payload: true });
  }, []);

  const closeDestinationDetails = useCallback(() => {
    dispatch({ type: 'SET_SHOW_DESTINATION_DETAILS', payload: false });
    dispatch({ type: 'SET_SELECTED_DESTINATION', payload: undefined });
  }, []);

  // User Profile
  const openUserProfile = useCallback((userId: UUID) => {
    dispatch({ type: 'SET_SELECTED_USER', payload: userId });
    dispatch({ type: 'SET_SHOW_USER_PROFILE', payload: true });
  }, []);

  const closeUserProfile = useCallback(() => {
    dispatch({ type: 'SET_SHOW_USER_PROFILE', payload: false });
    dispatch({ type: 'SET_SELECTED_USER', payload: undefined });
  }, []);

  // Chat
  const openChat = useCallback((roomId?: string) => {
    if (roomId) {
      dispatch({ type: 'SET_SELECTED_CHAT_ROOM', payload: roomId });
    }
    dispatch({ type: 'SET_CHAT_OPEN', payload: true });
  }, []);

  const closeChat = useCallback(() => {
    dispatch({ type: 'SET_CHAT_OPEN', payload: false });
    dispatch({ type: 'SET_SELECTED_CHAT_ROOM', payload: undefined });
  }, []);

  // Settings
  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  }, []);

  // Utility
  const updateUIState = useCallback((newState: Partial<UIState>) => {
    dispatch({ type: 'UPDATE_UI_STATE', payload: newState });
  }, []);

  const resetUIState = useCallback(() => {
    dispatch({ type: 'UPDATE_UI_STATE', payload: initialUIState });
  }, []);

  // Context value
  const contextValue: UIContextType = {
    // State
    ...state,
    
    // Navigation
    navigateTo,
    goBack,
    
    // Active Elements
    setActiveDestination,
    setActiveTrip,
    
    // Loading States
    setLoading,
    
    // Search
    setSearchQuery,
    clearSearch,
    
    // Sidebar
    toggleSidebar,
    setSidebarOpen,
    
    // Header
    setHideHeader,
    
    // Map
    setMapCenter,
    setMapZoom,
    
    // Filters
    updateFilters,
    clearFilters,
    addCategoryFilter,
    removeCategoryFilter,
    addStatusFilter,
    removeStatusFilter,
    addTagFilter,
    removeTagFilter,
    
    // Sorting
    updateSortOptions,
    setSortField,
    setSortDirection,
    toggleSortDirection,
    
    // Trip Details
    openTripDetails,
    closeTripDetails,
    
    // Destination Details
    openDestinationDetails,
    closeDestinationDetails,
    
    // User Profile
    openUserProfile,
    closeUserProfile,
    
    // Chat
    openChat,
    closeChat,
    
    // Settings
    updateSettings,
    
    // Utility
    updateUIState,
    resetUIState
  };

  return (
    <UIContext.Provider value={contextValue}>
      {children}
    </UIContext.Provider>
  );
};

// Hook to use UI Context
export const useUIContext = (): UIContextType => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUIContext must be used within a UIProvider');
  }
  return context;
};

export default UIContext;