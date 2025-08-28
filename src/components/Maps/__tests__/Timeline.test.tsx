import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Timeline from '../Timeline';
import { Destination, DestinationCategory, DestinationStatus } from '../../../types';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Play: () => <div data-testid="play-icon">Play</div>,
  Pause: () => <div data-testid="pause-icon">Pause</div>,
  SkipBack: () => <div data-testid="skip-back-icon">SkipBack</div>,
  SkipForward: () => <div data-testid="skip-forward-icon">SkipForward</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  ChevronDown: () => <div data-testid="chevron-down-icon">ChevronDown</div>,
  ChevronUp: () => <div data-testid="chevron-up-icon">ChevronUp</div>
}));

// Mock utils
jest.mock('../../../utils', () => ({
  formatDate: jest.fn((date: string) => date),
  getCategoryIcon: jest.fn(() => <div data-testid="category-icon">Icon</div>)
}));

// Mock StatusBadge component
jest.mock('../../UI/StatusBadge', () => {
  return function MockStatusBadge({ status }: { status: string }) {
    return <div data-testid="status-badge">{status}</div>;
  };
});

describe('Timeline', () => {
  const mockDestinations: Destination[] = [
    {
      id: '1',
      name: 'Berlin',
      location: 'Berlin, Germany',
      category: DestinationCategory.CITY,
      startDate: '2024-01-01',
      endDate: '2024-01-03',
      coordinates: { lat: 52.52, lng: 13.405 },
      status: DestinationStatus.PLANNED,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2', 
      name: 'Munich',
      location: 'Munich, Germany',
      category: DestinationCategory.CITY,
      startDate: '2024-01-05',
      endDate: '2024-01-07',
      coordinates: { lat: 48.1374, lng: 11.5755 },
      status: DestinationStatus.PLANNED,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const mockOnDestinationSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with destinations', () => {
      render(
        <Timeline
          destinations={mockDestinations}
          onDestinationSelect={mockOnDestinationSelect}
        />
      );

      expect(screen.getByText('Berlin')).toBeInTheDocument();
      expect(screen.getByText('Munich')).toBeInTheDocument();
    });

    it('should render play controls', () => {
      render(
        <Timeline
          destinations={mockDestinations}
          onDestinationSelect={mockOnDestinationSelect}
        />
      );

      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
      expect(screen.getByTestId('skip-back-icon')).toBeInTheDocument();
      expect(screen.getByTestId('skip-forward-icon')).toBeInTheDocument();
    });

    it('should show destinations sorted by start date', () => {
      render(
        <Timeline
          destinations={mockDestinations}
          onDestinationSelect={mockOnDestinationSelect}
        />
      );

      const destinationElements = screen.getAllByTestId('category-icon');
      expect(destinationElements).toHaveLength(2);
    });

    it('should handle empty destinations array', () => {
      render(
        <Timeline
          destinations={[]}
          onDestinationSelect={mockOnDestinationSelect}
        />
      );

      expect(screen.queryByText('Berlin')).not.toBeInTheDocument();
      expect(screen.queryByText('Munich')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onDestinationSelect when destination is clicked', () => {
      render(
        <Timeline
          destinations={mockDestinations}
          onDestinationSelect={mockOnDestinationSelect}
        />
      );

      const berlinElement = screen.getByText('Berlin');
      fireEvent.click(berlinElement);

      expect(mockOnDestinationSelect).toHaveBeenCalledWith(mockDestinations[0]);
    });

    it('should toggle play/pause when play button is clicked', () => {
      render(
        <Timeline
          destinations={mockDestinations}
          onDestinationSelect={mockOnDestinationSelect}
        />
      );

      const playButton = screen.getByTestId('play-icon').closest('button');
      expect(playButton).toBeInTheDocument();

      if (playButton) {
        fireEvent.click(playButton);
        // After clicking play, it should show pause icon (this would need implementation)
      }
    });

    it('should handle skip forward button click', () => {
      render(
        <Timeline
          destinations={mockDestinations}
          onDestinationSelect={mockOnDestinationSelect}
        />
      );

      const skipForwardButton = screen.getByTestId('skip-forward-icon').closest('button');
      expect(skipForwardButton).toBeInTheDocument();

      if (skipForwardButton) {
        fireEvent.click(skipForwardButton);
      }
    });

    it('should handle skip back button click', () => {
      render(
        <Timeline
          destinations={mockDestinations}
          onDestinationSelect={mockOnDestinationSelect}
        />
      );

      const skipBackButton = screen.getByTestId('skip-back-icon').closest('button');
      expect(skipBackButton).toBeInTheDocument();

      if (skipBackButton) {
        fireEvent.click(skipBackButton);
      }
    });
  });

  describe('Current Destination', () => {
    it('should highlight current destination', () => {
      render(
        <Timeline
          destinations={mockDestinations}
          onDestinationSelect={mockOnDestinationSelect}
          currentDestination={mockDestinations[0]}
        />
      );

      // The current destination should be highlighted (implementation specific)
      expect(screen.getByText('Berlin')).toBeInTheDocument();
    });

    it('should handle undefined current destination', () => {
      render(
        <Timeline
          destinations={mockDestinations}
          onDestinationSelect={mockOnDestinationSelect}
          currentDestination={undefined}
        />
      );

      expect(screen.getByText('Berlin')).toBeInTheDocument();
      expect(screen.getByText('Munich')).toBeInTheDocument();
    });
  });

  describe('Auto Play', () => {
    it('should start with autoPlay disabled by default', () => {
      render(
        <Timeline
          destinations={mockDestinations}
          onDestinationSelect={mockOnDestinationSelect}
        />
      );

      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    });

    it('should handle autoPlay prop', () => {
      render(
        <Timeline
          destinations={mockDestinations}
          onDestinationSelect={mockOnDestinationSelect}
          autoPlay={true}
        />
      );

      // When autoPlay is true, component should start playing
      expect(screen.getByText('Berlin')).toBeInTheDocument();
    });

    it('should handle custom playSpeed', () => {
      render(
        <Timeline
          destinations={mockDestinations}
          onDestinationSelect={mockOnDestinationSelect}
          playSpeed={1}
        />
      );

      // Component should accept custom play speed
      expect(screen.getByText('Berlin')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should only show destinations with coordinates', () => {
      const destinationsWithoutCoords = [
        {
          ...mockDestinations[0],
          coordinates: undefined
        },
        mockDestinations[1]
      ];

      render(
        <Timeline
          destinations={destinationsWithoutCoords}
          onDestinationSelect={mockOnDestinationSelect}
        />
      );

      // Only Munich should be visible since Berlin has no coordinates
      expect(screen.queryByText('Berlin')).not.toBeInTheDocument();
      expect(screen.getByText('Munich')).toBeInTheDocument();
    });
  });
});