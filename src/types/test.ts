// Test utility types
export interface MockDestination {
  id: string;
  tripId: string;
  name: string;
  location: string;
  category: string;
  startDate: string;
  endDate: string;
  budget?: number;
  actualCost?: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
  notes?: string;
  status: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MockTrip {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  budget?: number;
  participants: string[];
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TestUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface MockSupabaseResponse<T> {
  data: T | null;
  error: any | null;
  status: number;
  statusText: string;
}

export type MockSupabaseClient = {
  from: jest.Mock;
  auth: {
    getUser: jest.Mock;
    signInWithOAuth: jest.Mock;
    signOut: jest.Mock;
    onAuthStateChange: jest.Mock;
  };
  storage: {
    from: jest.Mock;
  };
};

export interface RenderWithProvidersOptions {
  initialState?: any;
  route?: string;
}