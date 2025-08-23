import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../../test-utils';
import ScheduleOptimizer from '../ScheduleOptimizer';
import { useApp } from '../../../stores/AppContext';

jest.mock('../../../stores/AppContext', () => ({
  useApp: jest.fn()
}));

const mockUseApp = useApp as jest.MockedFunction<typeof useApp>;

const mockDestinations = [
  {
    id: 'dest-1',
    name: 'Museum',
    coordinates: { lat: 50.0, lng: 10.0 },
    startDate: '2024-01-01',
    startTime: '09:00',
    endTime: '12:00',
    priority: 5,
    category: 'museum',
    duration: 180
  },
  {
    id: 'dest-2',
    name: 'Restaurant',
    coordinates: { lat: 50.1, lng: 10.1 },
    startDate: '2024-01-01',
    startTime: '13:00',
    endTime: '14:30',
    priority: 3,
    category: 'restaurant',
    duration: 90
  },
  {
    id: 'dest-3',
    name: 'Park',
    coordinates: { lat: 50.2, lng: 10.2 },
    startDate: '2024-01-01',
    startTime: '15:00',
    endTime: '17:00',
    priority: 4,
    category: 'nature',
    duration: 120
  }
];

const mockAppState = {
  trips: [
    {
      id: 'trip-1',
      name: 'Test Trip',
      destinations: ['dest-1', 'dest-2', 'dest-3']
    }
  ],
  destinations: mockDestinations,
  currentTrip: {
    id: 'trip-1',
    name: 'Test Trip',
    destinations: ['dest-1', 'dest-2', 'dest-3']
  },
  uiState: {
    currentView: 'scheduling'
  },
  updateDestination: jest.fn(),
  reorderDestinations: jest.fn()
};

describe('ScheduleOptimizer', () => {
  beforeEach(() => {
    mockUseApp.mockReturnValue(mockAppState as any);
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ScheduleOptimizer />);
    
    expect(screen.getByText('Zeitplan-Optimierung')).toBeInTheDocument();
    expect(screen.getByText('KI-gestützte Routenoptimierung')).toBeInTheDocument();
  });

  it('displays current destinations', () => {
    render(<ScheduleOptimizer />);
    
    expect(screen.getByText('Museum')).toBeInTheDocument();
    expect(screen.getByText('Restaurant')).toBeInTheDocument();
    expect(screen.getByText('Park')).toBeInTheDocument();
  });

  it('shows optimization settings', () => {
    render(<ScheduleOptimizer />);
    
    expect(screen.getByText('Optimierungseinstellungen')).toBeInTheDocument();
    expect(screen.getByLabelText('Priorität berücksichtigen')).toBeInTheDocument();
    expect(screen.getByLabelText('Reisezeit minimieren')).toBeInTheDocument();
    expect(screen.getByLabelText('Öffnungszeiten beachten')).toBeInTheDocument();
  });

  it('allows toggling optimization settings', () => {
    render(<ScheduleOptimizer />);
    
    const priorityCheckbox = screen.getByLabelText('Priorität berücksichtigen');
    const travelTimeCheckbox = screen.getByLabelText('Reisezeit minimieren');
    
    expect(priorityCheckbox).toBeChecked();
    expect(travelTimeCheckbox).toBeChecked();
    
    fireEvent.click(priorityCheckbox);
    expect(priorityCheckbox).not.toBeChecked();
    
    fireEvent.click(travelTimeCheckbox);
    expect(travelTimeCheckbox).not.toBeChecked();
  });

  it('runs optimization when optimize button is clicked', async () => {
    render(<ScheduleOptimizer />);
    
    const optimizeButton = screen.getByRole('button', { name: /Optimieren/i });
    fireEvent.click(optimizeButton);
    
    await waitFor(() => {
      expect(screen.getByText('Optimierung läuft...')).toBeInTheDocument();
    });

    // Should show results after optimization
    await waitFor(() => {
      expect(screen.getByText('Optimierungsergebnisse')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('displays optimization results', async () => {
    render(<ScheduleOptimizer />);
    
    const optimizeButton = screen.getByRole('button', { name: /Optimieren/i });
    fireEvent.click(optimizeButton);
    
    await waitFor(() => {
      expect(screen.getByText('Optimierungsergebnisse')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Should show improvement statistics
    expect(screen.getByText(/Reisezeit reduziert um/)).toBeInTheDocument();
    expect(screen.getByText(/Neue Reihenfolge/)).toBeInTheDocument();
  });

  it('allows applying optimized route', async () => {
    const mockReorderDestinations = jest.fn();
    mockUseApp.mockReturnValue({
      ...mockAppState,
      reorderDestinations: mockReorderDestinations
    } as any);

    render(<ScheduleOptimizer />);
    
    const optimizeButton = screen.getByRole('button', { name: /Optimieren/i });
    fireEvent.click(optimizeButton);
    
    await waitFor(() => {
      expect(screen.getByText('Optimierungsergebnisse')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    const applyButton = screen.getByRole('button', { name: /Route anwenden/i });
    fireEvent.click(applyButton);
    
    expect(mockReorderDestinations).toHaveBeenCalledWith(
      'trip-1',
      expect.any(Array)
    );
  });

  it('calculates travel time correctly', () => {
    render(<ScheduleOptimizer />);
    
    // Should display current total travel time
    expect(screen.getByText(/Aktuelle Gesamtreisezeit/)).toBeInTheDocument();
  });

  it('shows priority-based optimization', async () => {
    render(<ScheduleOptimizer />);
    
    // Ensure priority is enabled
    const priorityCheckbox = screen.getByLabelText('Priorität berücksichtigen');
    if (!priorityCheckbox.checked) {
      fireEvent.click(priorityCheckbox);
    }
    
    const optimizeButton = screen.getByRole('button', { name: /Optimieren/i });
    fireEvent.click(optimizeButton);
    
    await waitFor(() => {
      expect(screen.getByText('Optimierungsergebnisse')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // High priority destinations should be listed first
    const destinationCards = screen.getAllByTestId(/optimized-destination/);
    expect(destinationCards[0]).toHaveTextContent('Museum'); // Priority 5 (highest)
  });

  it('handles empty state when no trip selected', () => {
    mockUseApp.mockReturnValue({
      ...mockAppState,
      currentTrip: undefined
    } as any);

    render(<ScheduleOptimizer />);
    
    expect(screen.getByText('Keine Reise ausgewählt')).toBeInTheDocument();
  });

  it('handles empty state when no destinations', () => {
    mockUseApp.mockReturnValue({
      ...mockAppState,
      destinations: [],
      currentTrip: {
        ...mockAppState.currentTrip,
        destinations: []
      }
    } as any);

    render(<ScheduleOptimizer />);
    
    expect(screen.getByText('Keine Ziele zum Optimieren')).toBeInTheDocument();
  });

  it('groups destinations by date correctly', () => {
    const multiDayDestinations = [
      { ...mockDestinations[0], startDate: '2024-01-01' },
      { ...mockDestinations[1], startDate: '2024-01-02' },
      { ...mockDestinations[2], startDate: '2024-01-02' }
    ];

    mockUseApp.mockReturnValue({
      ...mockAppState,
      destinations: multiDayDestinations
    } as any);

    render(<ScheduleOptimizer />);
    
    expect(screen.getByText('Tag 1: 1. Januar 2024')).toBeInTheDocument();
    expect(screen.getByText('Tag 2: 2. Januar 2024')).toBeInTheDocument();
  });

  it('shows algorithm selection', () => {
    render(<ScheduleOptimizer />);
    
    expect(screen.getByText('Algorithmus')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Nächster Nachbar')).toBeInTheDocument();
  });

  it('allows changing optimization algorithm', () => {
    render(<ScheduleOptimizer />);
    
    const algorithmSelect = screen.getByDisplayValue('Nächster Nachbar');
    fireEvent.change(algorithmSelect, { target: { value: 'genetic' } });
    
    expect(algorithmSelect).toHaveValue('genetic');
  });

  it('displays optimization progress', async () => {
    render(<ScheduleOptimizer />);
    
    const optimizeButton = screen.getByRole('button', { name: /Optimieren/i });
    fireEvent.click(optimizeButton);
    
    // Should show progress indicator
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Optimierung läuft...')).toBeInTheDocument();
  });

  it('handles optimization errors gracefully', async () => {
    // Mock console.error to avoid noise in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    // Force an error by providing invalid data
    mockUseApp.mockReturnValue({
      ...mockAppState,
      destinations: [
        { ...mockDestinations[0], coordinates: undefined } // Invalid coordinates
      ]
    } as any);

    render(<ScheduleOptimizer />);
    
    const optimizeButton = screen.getByRole('button', { name: /Optimieren/i });
    fireEvent.click(optimizeButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Optimierung fehlgeschlagen/)).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });
});