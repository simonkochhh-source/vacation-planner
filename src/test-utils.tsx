import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AppProvider } from './stores/AppContext';

// Mock for Leaflet Map
const mockMap = {
  on: jest.fn(),
  off: jest.fn(),
  getZoom: jest.fn(() => 10),
  getBounds: jest.fn(() => ({
    getNorthEast: jest.fn(() => ({ lat: 50, lng: 10 })),
    getSouthWest: jest.fn(() => ({ lat: 40, lng: 0 }))
  })),
  setView: jest.fn(),
  flyTo: jest.fn(),
  addLayer: jest.fn(),
  removeLayer: jest.fn()
};

// Mock for React-Leaflet
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...props }: any) => (
    <div data-testid="map-container" {...props}>
      {children}
    </div>
  ),
  TileLayer: (props: any) => <div data-testid="tile-layer" {...props} />,
  Marker: ({ children, ...props }: any) => (
    <div data-testid="marker" {...props}>
      {children}
    </div>
  ),
  Popup: ({ children, ...props }: any) => (
    <div data-testid="popup" {...props}>
      {children}
    </div>
  ),
  useMap: () => mockMap,
  useMapEvents: (handlers: any) => mockMap
}));

// Mock for @dnd-kit components
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div data-testid="dnd-context">{children}</div>,
  closestCenter: jest.fn(),
  KeyboardSensor: jest.fn(),
  PointerSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div data-testid="sortable-context">{children}</div>,
  verticalListSortingStrategy: jest.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
  }),
}));

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: jest.fn(() => ''),
    },
  },
}));

// Mock weather service
jest.mock('./services/weatherService', () => ({
  WeatherService: {
    getWeatherByCoordinates: jest.fn(() => Promise.resolve({
      temperature: 22,
      condition: 'sunny',
      humidity: 65,
      windSpeed: 10,
      icon: '01d',
      description: 'Clear sky'
    })),
    getForecast: jest.fn(() => Promise.resolve([
      {
        date: '2024-01-01',
        temperature: 20,
        condition: 'sunny',
        icon: '01d'
      }
    ]))
  }
}));

// Mock photo service
jest.mock('./services/photoService', () => ({
  PhotoService: {
    uploadPhoto: jest.fn(() => Promise.resolve('mock-photo-url')),
    deletePhoto: jest.fn(() => Promise.resolve()),
    generateThumbnail: jest.fn(() => Promise.resolve('mock-thumbnail-url')),
    extractMetadata: jest.fn(() => Promise.resolve({
      size: 1024,
      type: 'image/jpeg',
      dimensions: { width: 800, height: 600 }
    }))
  }
}));

// Mock export service
jest.mock('./services/exportService', () => ({
  ExportService: {
    exportToJSON: jest.fn(() => Promise.resolve('mock-json-data')),
    exportToCSV: jest.fn(() => Promise.resolve('mock-csv-data')),
    exportToGPX: jest.fn(() => Promise.resolve('mock-gpx-data')),
    exportToPDF: jest.fn(() => Promise.resolve('mock-pdf-data'))
  }
}));

// Mock geocoding service
jest.mock('./services/geocoding', () => ({
  searchLocation: jest.fn(() => Promise.resolve([
    {
      name: 'Test Location',
      coordinates: { lat: 50.0, lng: 10.0 },
      address: 'Test Address'
    }
  ])),
  reverseGeocode: jest.fn(() => Promise.resolve({
    name: 'Test Location',
    address: 'Test Address'
  }))
}));

// Mock data for tests
export const mockTrip = {
  id: 'trip-1',
  name: 'Test Trip',
  description: 'A test trip',
  startDate: '2024-01-01',
  endDate: '2024-01-07',
  destinations: ['dest-1', 'dest-2'],
  budget: 1000,
  actualCost: 750,
  participants: ['Alice', 'Bob'],
  status: 'planned' as const,
  coverImage: 'trip-image.jpg',
  tags: ['vacation', 'europe'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

export const mockDestination = {
  id: 'dest-1',
  name: 'Test Destination',
  location: 'Test City',
  coordinates: { lat: 50.0, lng: 10.0 },
  startDate: '2024-01-01',
  endDate: '2024-01-01',
  startTime: '09:00',
  endTime: '17:00',
  category: 'attraction' as const,
  budget: 100,
  actualCost: 85,
  notes: 'Test notes',
  photos: ['photo1.jpg', 'photo2.jpg'],
  bookingInfo: 'Booking reference: ABC123',
  status: 'planned' as const,
  tags: ['sightseeing', 'museum'],
  color: '#3b82f6',
  duration: 480,
  weatherInfo: {
    temperature: 22,
    condition: 'sunny',
    humidity: 65,
    windSpeed: 10,
    icon: '01d',
    description: 'Clear sky'
  },
  transportToNext: {
    mode: 'walking' as const,
    duration: 15,
    distance: 1200,
    cost: 0,
    notes: 'Short walk'
  },
  website: 'https://example.com',
  phoneNumber: '+1234567890',
  address: '123 Test Street',
  openingHours: '09:00-17:00',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

export const mockDestination2 = {
  ...mockDestination,
  id: 'dest-2',
  name: 'Second Destination',
  category: 'restaurant' as const,
  startTime: '18:00',
  endTime: '20:00'
};

export const mockUIState = {
  currentView: 'list' as const,
  activeDestination: undefined,
  activeTripId: 'trip-1',
  filters: {
    category: undefined,
    status: undefined,
    tags: undefined,
    dateRange: undefined,
    budgetRange: undefined
  },
  sortOptions: {
    field: 'startDate' as const,
    direction: 'asc' as const
  },
  isLoading: false,
  searchQuery: '',
  sidebarOpen: false,
  mapCenter: { lat: 50.0, lng: 10.0 },
  mapZoom: 10
};

// Custom render function with providers
const AllProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <AppProvider>
      {children}
    </AppProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };