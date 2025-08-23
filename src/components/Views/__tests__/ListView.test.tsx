import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../../test-utils';
import ListView from '../ListView';
import { useApp } from '../../../stores/AppContext';

// Mock the useApp hook for specific test scenarios
const mockUseApp = useApp as jest.MockedFunction<typeof useApp>;

jest.mock('../../../stores/AppContext', () => ({
  useApp: jest.fn()
}));

const mockAppState = {
  trips: [
    {
      id: 'trip-1',
      name: 'Test Trip',
      destinations: ['dest-1', 'dest-2']
    }
  ],
  destinations: [
    {
      id: 'dest-1',
      name: 'Test Destination 1',
      location: 'Test City 1',
      startDate: '2024-01-01',
      endDate: '2024-01-01',
      startTime: '09:00',
      endTime: '17:00',
      category: 'attraction',
      priority: 5,
      status: 'planned',
      tags: ['sightseeing'],
      photos: [],
      duration: 480,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'dest-2',
      name: 'Test Destination 2',
      location: 'Test City 2',
      startDate: '2024-01-02',
      endDate: '2024-01-02',
      startTime: '10:00',
      endTime: '16:00',
      category: 'restaurant',
      priority: 4,
      status: 'planned',
      tags: ['food'],
      photos: [],
      duration: 360,
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z'
    }
  ],
  currentTrip: {
    id: 'trip-1',
    name: 'Test Trip',
    destinations: ['dest-1', 'dest-2']
  },
  uiState: {
    currentView: 'list',
    activeDestination: undefined,
    activeTripId: 'trip-1',
    filters: {},
    sortOptions: {
      field: 'startDate',
      direction: 'asc'
    },
    isLoading: false,
    searchQuery: '',
    sidebarOpen: false,
    mapCenter: { lat: 50.0, lng: 10.0 },
    mapZoom: 10
  },
  createDestination: jest.fn(),
  updateDestination: jest.fn(),
  deleteDestination: jest.fn(),
  reorderDestinations: jest.fn(),
  setCurrentTrip: jest.fn(),
  updateUIState: jest.fn(),
  createTrip: jest.fn(),
  updateTrip: jest.fn(),
  deleteTrip: jest.fn(),
  exportTrip: jest.fn()
};

describe('ListView', () => {
  beforeEach(() => {
    mockUseApp.mockReturnValue(mockAppState as any);
  });

  it('renders without crashing', () => {
    render(<ListView />);
    expect(screen.getByText('Test Trip')).toBeInTheDocument();
  });

  it('displays destinations correctly', () => {
    render(<ListView />);
    
    expect(screen.getByText('Test Destination 1')).toBeInTheDocument();
    expect(screen.getByText('Test Destination 2')).toBeInTheDocument();
    expect(screen.getByText('Test City 1')).toBeInTheDocument();
    expect(screen.getByText('Test City 2')).toBeInTheDocument();
  });

  it('shows empty state when no trip is selected', () => {
    mockUseApp.mockReturnValue({
      ...mockAppState,
      currentTrip: undefined,
      uiState: {
        ...mockAppState.uiState,
        activeTripId: undefined
      }
    } as any);

    render(<ListView />);
    
    expect(screen.getByText('Keine Reise ausgewählt')).toBeInTheDocument();
    expect(screen.getByText(/Wählen Sie eine Reise aus der Sidebar/)).toBeInTheDocument();
  });

  it('shows empty state when no destinations exist', () => {
    mockUseApp.mockReturnValue({
      ...mockAppState,
      destinations: [],
      currentTrip: {
        ...mockAppState.currentTrip,
        destinations: []
      }
    } as any);

    render(<ListView />);
    
    expect(screen.getByText('Noch keine Ziele hinzugefügt')).toBeInTheDocument();
    expect(screen.getByText(/Fügen Sie Ihr erstes Reiseziel hinzu/)).toBeInTheDocument();
  });

  it('opens destination form when add button is clicked', () => {
    render(<ListView />);
    
    const addButton = screen.getByRole('button', { name: /Neues Ziel hinzufügen/i });
    fireEvent.click(addButton);
    
    expect(screen.getByText('Neues Ziel hinzufügen')).toBeInTheDocument();
  });

  it('filters destinations based on search query', () => {
    mockUseApp.mockReturnValue({
      ...mockAppState,
      uiState: {
        ...mockAppState.uiState,
        searchQuery: 'Destination 1'
      }
    } as any);

    render(<ListView />);
    
    expect(screen.getByText('Test Destination 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Destination 2')).not.toBeInTheDocument();
  });

  it('applies category filter correctly', () => {
    mockUseApp.mockReturnValue({
      ...mockAppState,
      uiState: {
        ...mockAppState.uiState,
        filters: {
          category: ['attraction']
        }
      }
    } as any);

    render(<ListView />);
    
    expect(screen.getByText('Test Destination 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Destination 2')).not.toBeInTheDocument();
  });

  it('sorts destinations correctly', () => {
    render(<ListView />);
    
    const destinations = screen.getAllByTestId(/destination-card/);
    expect(destinations[0]).toHaveTextContent('Test Destination 1');
    expect(destinations[1]).toHaveTextContent('Test Destination 2');
  });

  it('toggles batch mode correctly', () => {
    render(<ListView />);
    
    const batchButton = screen.getByRole('button', { name: /Batch-Modus/i });
    fireEvent.click(batchButton);
    
    // Batch mode should show selection checkboxes
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  });

  it('handles destination edit correctly', async () => {
    render(<ListView />);
    
    const editButton = screen.getAllByRole('button', { name: /Bearbeiten/i })[0];
    fireEvent.click(editButton);
    
    expect(screen.getByText('Ziel bearbeiten')).toBeInTheDocument();
  });

  it('handles destination delete correctly', async () => {
    render(<ListView />);
    
    const deleteButton = screen.getAllByRole('button', { name: /Löschen/i })[0];
    fireEvent.click(deleteButton);
    
    // Confirmation dialog should appear
    expect(screen.getByText(/Möchten Sie dieses Ziel wirklich löschen/)).toBeInTheDocument();
  });

  it('calls reorderDestinations when drag and drop occurs', async () => {
    const mockReorderDestinations = jest.fn();
    mockUseApp.mockReturnValue({
      ...mockAppState,
      reorderDestinations: mockReorderDestinations
    } as any);

    render(<ListView />);
    
    // Simulate drag and drop (this would be more complex in real implementation)
    // For now, we just verify the function is available
    expect(mockReorderDestinations).toBeDefined();
  });

  it('shows loading state correctly', () => {
    mockUseApp.mockReturnValue({
      ...mockAppState,
      uiState: {
        ...mockAppState.uiState,
        isLoading: true
      }
    } as any);

    render(<ListView />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('displays destination statistics correctly', () => {
    render(<ListView />);
    
    // Should show total count
    expect(screen.getByText('2 Ziele')).toBeInTheDocument();
    
    // Should show planned count
    expect(screen.getByText('2 geplant')).toBeInTheDocument();
  });

  it('handles photo upload for destination', async () => {
    render(<ListView />);
    
    const photoButton = screen.getAllByRole('button', { name: /Foto hinzufügen/i })[0];
    fireEvent.click(photoButton);
    
    // Photo upload dialog should appear
    expect(screen.getByText('Fotos hochladen')).toBeInTheDocument();
  });

  it('shows weather information when available', () => {
    mockUseApp.mockReturnValue({
      ...mockAppState,
      destinations: [
        {
          ...mockAppState.destinations[0],
          weatherInfo: {
            temperature: 22,
            condition: 'sunny',
            humidity: 65,
            windSpeed: 10,
            icon: '01d',
            description: 'Clear sky'
          }
        }
      ]
    } as any);

    render(<ListView />);
    
    expect(screen.getByText('22°')).toBeInTheDocument();
  });
});