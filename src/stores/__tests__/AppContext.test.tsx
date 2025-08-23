import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AppProvider, useApp } from '../AppContext';
import { mockTrip, mockDestination } from '../../test-utils';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('AppContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides initial state correctly', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    expect(result.current.trips).toEqual([]);
    expect(result.current.destinations).toEqual([]);
    expect(result.current.currentTrip).toBeUndefined();
    expect(result.current.uiState.currentView).toBe('list');
    expect(result.current.uiState.isLoading).toBe(false);
  });

  it('creates a new trip successfully', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    const tripData = {
      name: 'New Trip',
      description: 'Test description',
      startDate: '2024-01-01',
      endDate: '2024-01-07',
      budget: 1000,
      participants: ['Alice'],
      tags: ['vacation']
    };

    let createdTrip;
    await act(async () => {
      createdTrip = await result.current.createTrip(tripData);
    });

    expect(result.current.trips).toHaveLength(1);
    expect(createdTrip).toMatchObject({
      name: 'New Trip',
      description: 'Test description',
      budget: 1000
    });
    expect(createdTrip.id).toBeDefined();
  });

  it('updates trip successfully', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    // First create a trip
    let trip;
    await act(async () => {
      trip = await result.current.createTrip({
        name: 'Original Trip',
        startDate: '2024-01-01',
        endDate: '2024-01-07',
        participants: [],
        tags: []
      });
    });

    // Then update it
    await act(async () => {
      await result.current.updateTrip(trip.id, {
        name: 'Updated Trip',
        budget: 2000
      });
    });

    const updatedTrip = result.current.trips.find(t => t.id === trip.id);
    expect(updatedTrip?.name).toBe('Updated Trip');
    expect(updatedTrip?.budget).toBe(2000);
  });

  it('deletes trip successfully', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    // Create a trip
    let trip;
    await act(async () => {
      trip = await result.current.createTrip({
        name: 'Trip to Delete',
        startDate: '2024-01-01',
        endDate: '2024-01-07',
        participants: [],
        tags: []
      });
    });

    expect(result.current.trips).toHaveLength(1);

    // Delete it
    await act(async () => {
      await result.current.deleteTrip(trip.id);
    });

    expect(result.current.trips).toHaveLength(0);
  });

  it('creates destination successfully', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    const destinationData = {
      name: 'Test Destination',
      location: 'Test City',
      startDate: '2024-01-01',
      endDate: '2024-01-01',
      startTime: '09:00',
      endTime: '17:00',
      category: 'attraction' as const,
      priority: 5,
      tags: ['sightseeing']
    };

    let destination;
    await act(async () => {
      destination = await result.current.createDestination(destinationData);
    });

    expect(result.current.destinations).toHaveLength(1);
    expect(destination).toMatchObject({
      name: 'Test Destination',
      location: 'Test City',
      category: 'attraction'
    });
  });

  it('updates destination successfully', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    // Create destination
    let destination;
    await act(async () => {
      destination = await result.current.createDestination({
        name: 'Original Destination',
        location: 'Test City',
        startDate: '2024-01-01',
        endDate: '2024-01-01',
        startTime: '09:00',
        endTime: '17:00',
        category: 'attraction' as const,
        priority: 3,
        tags: []
      });
    });

    // Update destination
    await act(async () => {
      await result.current.updateDestination(destination.id, {
        name: 'Updated Destination',
        priority: 5,
        rating: 4
      });
    });

    const updatedDestination = result.current.destinations.find(d => d.id === destination.id);
    expect(updatedDestination?.name).toBe('Updated Destination');
    expect(updatedDestination?.priority).toBe(5);
    expect(updatedDestination?.rating).toBe(4);
  });

  it('sets current trip correctly', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    // Create a trip
    let trip;
    await act(async () => {
      trip = await result.current.createTrip({
        name: 'Current Trip',
        startDate: '2024-01-01',
        endDate: '2024-01-07',
        participants: [],
        tags: []
      });
    });

    // Set as current
    act(() => {
      result.current.setCurrentTrip(trip.id);
    });

    expect(result.current.currentTrip?.id).toBe(trip.id);
    expect(result.current.uiState.activeTripId).toBe(trip.id);
  });

  it('updates UI state correctly', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.updateUIState({
        currentView: 'map',
        searchQuery: 'test search',
        sidebarOpen: true
      });
    });

    expect(result.current.uiState.currentView).toBe('map');
    expect(result.current.uiState.searchQuery).toBe('test search');
    expect(result.current.uiState.sidebarOpen).toBe(true);
  });

  it('reorders destinations successfully', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    // Create a trip and destinations
    let trip;
    await act(async () => {
      trip = await result.current.createTrip({
        name: 'Trip with Destinations',
        startDate: '2024-01-01',
        endDate: '2024-01-07',
        participants: [],
        tags: []
      });
    });

    let dest1, dest2;
    await act(async () => {
      dest1 = await result.current.createDestination({
        name: 'Destination 1',
        location: 'City 1',
        startDate: '2024-01-01',
        endDate: '2024-01-01',
        startTime: '09:00',
        endTime: '12:00',
        category: 'attraction' as const,
        priority: 5,
        tags: []
      });
      dest2 = await result.current.createDestination({
        name: 'Destination 2',
        location: 'City 2',
        startDate: '2024-01-01',
        endDate: '2024-01-01',
        startTime: '13:00',
        endTime: '17:00',
        category: 'restaurant' as const,
        priority: 4,
        tags: []
      });
    });

    // Update trip with destinations
    await act(async () => {
      await result.current.updateTrip(trip.id, {
        destinations: [dest1.id, dest2.id]
      });
    });

    // Reorder destinations
    await act(async () => {
      await result.current.reorderDestinations(trip.id, [dest2.id, dest1.id]);
    });

    const updatedTrip = result.current.trips.find(t => t.id === trip.id);
    expect(updatedTrip?.destinations).toEqual([dest2.id, dest1.id]);
  });

  it('persists data to localStorage', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    await act(async () => {
      await result.current.createTrip({
        name: 'Persisted Trip',
        startDate: '2024-01-01',
        endDate: '2024-01-07',
        participants: [],
        tags: []
      });
    });

    const storedTrips = JSON.parse(localStorage.getItem('vacation-planner-trips') || '[]');
    expect(storedTrips).toHaveLength(1);
    expect(storedTrips[0].name).toBe('Persisted Trip');
  });

  it('loads data from localStorage on initialization', () => {
    // Pre-populate localStorage
    localStorage.setItem('vacation-planner-trips', JSON.stringify([mockTrip]));
    localStorage.setItem('vacation-planner-destinations', JSON.stringify([mockDestination]));
    localStorage.setItem('vacation-planner-ui-state', JSON.stringify({
      ...mockTrip,
      currentView: 'map',
      activeTripId: 'trip-1'
    }));

    const { result } = renderHook(() => useApp(), { wrapper });

    expect(result.current.trips).toHaveLength(1);
    expect(result.current.destinations).toHaveLength(1);
    expect(result.current.trips[0].name).toBe('Test Trip');
    expect(result.current.destinations[0].name).toBe('Test Destination');
  });
});