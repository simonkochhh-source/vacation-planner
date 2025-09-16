import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { SupabaseAppProvider } from '../stores/SupabaseAppContext';
import { MockSupabaseClient, TestUser } from '../types/test';

// Mock Supabase client
export const createMockSupabaseClient = (): MockSupabaseClient => ({
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      order: jest.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  })),
  auth: {
    getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    signInWithOAuth: jest.fn(() => Promise.resolve({ data: {}, error: null })),
    signOut: jest.fn(() => Promise.resolve({ error: null })),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(() => Promise.resolve({ data: null, error: null })),
      download: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
});

// Mock user for testing
export const mockUser: TestUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
  },
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  user?: TestUser | null;
  supabaseClient?: MockSupabaseClient;
}

// Custom render function that includes all providers
export function renderWithProviders(
  ui: React.ReactElement,
  {
    route = '/',
    user = null,
    supabaseClient = createMockSupabaseClient(),
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  // Mock authenticated user if provided
  if (user) {
    supabaseClient.auth.getUser.mockResolvedValue({
      data: { user },
      error: null,
    });
  }

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <BrowserRouter>
        <AuthProvider>
          <SupabaseAppProvider>
            {children}
          </SupabaseAppProvider>
        </AuthProvider>
      </BrowserRouter>
    );
  }

  // Navigate to the specified route
  if (route !== '/') {
    window.history.pushState({}, 'Test page', route);
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    mockSupabaseClient: supabaseClient,
  };
}

// Mock data generators
export const mockTrips = [
  {
    id: 'trip-1',
    name: 'Trip to Paris',
    description: 'A wonderful trip to the city of lights',
    startDate: '2025-10-01',
    endDate: '2025-10-07',
    budget: 2000,
    participants: ['user1', 'user2'],
    status: 'planned',
    createdAt: '2025-09-15T10:00:00Z',
    updatedAt: '2025-09-15T10:00:00Z',
  },
  {
    id: 'trip-2',
    name: 'Tokyo Adventure',
    description: 'Exploring Japan',
    startDate: '2025-11-15',
    endDate: '2025-11-25',
    budget: 3500,
    participants: ['user1'],
    status: 'active',
    createdAt: '2025-09-15T10:00:00Z',
    updatedAt: '2025-09-15T10:00:00Z',
  },
];

export const mockDestinations = [
  {
    id: 'dest-1',
    tripId: 'trip-1',
    name: 'Eiffel Tower',
    location: 'Paris, France',
    category: 'attraction',
    startDate: '2025-10-02',
    endDate: '2025-10-02',
    budget: 50,
    coordinates: { lat: 48.8584, lng: 2.2945 },
    notes: 'Must see landmark',
    status: 'planned',
    sortOrder: 0,
    createdAt: '2025-09-15T10:00:00Z',
    updatedAt: '2025-09-15T10:00:00Z',
  },
  {
    id: 'dest-2',
    tripId: 'trip-1',
    name: 'Louvre Museum',
    location: 'Paris, France',
    category: 'museum',
    startDate: '2025-10-03',
    endDate: '2025-10-03',
    budget: 75,
    coordinates: { lat: 48.8606, lng: 2.3376 },
    notes: 'Art and history',
    status: 'planned',
    sortOrder: 1,
    createdAt: '2025-09-15T10:00:00Z',
    updatedAt: '2025-09-15T10:00:00Z',
  },
];

// Utility to mock successful API responses
export const mockSuccessResponse = function<T>(data: T) {
  return {
    data,
    error: null,
    status: 200,
    statusText: 'OK',
  };
};

// Utility to mock error responses
export const mockErrorResponse = (message: string, status = 400) => ({
  data: null,
  error: { message },
  status,
  statusText: 'Error',
});

// Mock React Router hooks
export const mockNavigate = jest.fn();
export const mockLocation = {
  pathname: '/',
  search: '',
  hash: '',
  state: null,
  key: 'default',
};

// Mock window.matchMedia for responsive tests
export const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

// Mock IntersectionObserver for virtualization tests
export const mockIntersectionObserver = () => {
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
};

// Mock ResizeObserver for responsive component tests
export const mockResizeObserver = () => {
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
};