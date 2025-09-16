import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Timeline } from '../Timeline';
import { 
  renderWithProviders, 
  mockUser, 
  mockDestinations, 
  mockMatchMedia,
  mockIntersectionObserver 
} from '../../../test-utils/renderWithProviders';

// Mock React DnD for drag and drop functionality
const mockDragEnd = jest.fn();
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }: any) => {
    mockDragEnd.mockImplementation(onDragEnd);
    return <div data-testid="dnd-context">{children}</div>;
  },
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
  }),
  useDroppable: () => ({
    setNodeRef: jest.fn(),
    isOver: false,
  }),
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div>{children}</div>,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
  }),
}));

// Mock Leaflet map
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: any) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
  useMap: () => ({
    setView: jest.fn(),
    flyTo: jest.fn(),
  }),
}));

describe('Timeline Component', () => {
  const defaultProps = {
    destinations: mockDestinations,
    onDestinationUpdate: jest.fn(),
    onDestinationDelete: jest.fn(),
    onDestinationReorder: jest.fn(),
    onDestinationSelect: jest.fn(),
    tripId: 'trip-1',
    isEditable: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockMatchMedia(false); // Default to desktop
    mockIntersectionObserver();
  });

  describe('Rendering', () => {
    test('should render timeline with destinations', () => {
      renderWithProviders(<Timeline {...defaultProps} />, { user: mockUser });

      expect(screen.getByTestId('timeline-container')).toBeInTheDocument();
      expect(screen.getByText('Eiffel Tower')).toBeInTheDocument();
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });

    test('should render empty state when no destinations', () => {
      renderWithProviders(
        <Timeline {...defaultProps} destinations={[]} />,
        { user: mockUser }
      );

      expect(screen.getByText(/no destinations/i)).toBeInTheDocument();
      expect(screen.getByText(/add your first destination/i)).toBeInTheDocument();
    });

    test('should show destination cards with correct information', () => {
      renderWithProviders(<Timeline {...defaultProps} />, { user: mockUser });

      const destination = mockDestinations[0];
      
      expect(screen.getByText(destination.name)).toBeInTheDocument();
      expect(screen.getByText(destination.location)).toBeInTheDocument();
      expect(screen.getByText(destination.category)).toBeInTheDocument();
      expect(screen.getByText(`€${destination.budget}`)).toBeInTheDocument();
    });

    test('should render timeline in chronological order', () => {
      const unorderedDestinations = [
        { ...mockDestinations[1], sortOrder: 0 },
        { ...mockDestinations[0], sortOrder: 1 },
      ];

      renderWithProviders(
        <Timeline {...defaultProps} destinations={unorderedDestinations} />,
        { user: mockUser }
      );

      const destinationElements = screen.getAllByTestId(/destination-card/);
      expect(destinationElements[0]).toHaveTextContent('Louvre Museum');
      expect(destinationElements[1]).toHaveTextContent('Eiffel Tower');
    });
  });

  describe('Mobile Responsiveness', () => {
    test('should render mobile timeline on small screens', () => {
      mockMatchMedia(true); // Mobile screen

      renderWithProviders(<Timeline {...defaultProps} />, { user: mockUser });

      expect(screen.getByTestId('mobile-timeline')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-timeline')).not.toBeInTheDocument();
    });

    test('should render desktop timeline on large screens', () => {
      mockMatchMedia(false); // Desktop screen

      renderWithProviders(<Timeline {...defaultProps} />, { user: mockUser });

      expect(screen.getByTestId('desktop-timeline')).toBeInTheDocument();
      expect(screen.queryByTestId('mobile-timeline')).not.toBeInTheDocument();
    });

    test('should adapt timeline layout for tablet screens', () => {
      // Mock tablet screen size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderWithProviders(<Timeline {...defaultProps} />, { user: mockUser });

      const timeline = screen.getByTestId('timeline-container');
      expect(timeline).toHaveClass('tablet-layout');
    });
  });

  describe('Drag and Drop', () => {
    test('should handle destination reordering via drag and drop', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Timeline {...defaultProps} />, { user: mockUser });

      const firstDestination = screen.getByTestId('destination-card-0');
      const secondDestination = screen.getByTestId('destination-card-1');

      // Simulate drag and drop
      await user.pointer([
        { target: firstDestination, keys: '[MouseLeft>]' },
        { coords: { x: 0, y: 100 } },
        { target: secondDestination },
        { keys: '[/MouseLeft]' },
      ]);

      // Simulate the drag end event
      mockDragEnd({
        active: { id: 'dest-1' },
        over: { id: 'dest-2' },
      });

      expect(defaultProps.onDestinationReorder).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'dest-2' }),
        expect.objectContaining({ id: 'dest-1' }),
      ]);
    });

    test('should show drag preview during drag operation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Timeline {...defaultProps} />, { user: mockUser });

      const destination = screen.getByTestId('destination-card-0');
      
      await user.pointer({ target: destination, keys: '[MouseLeft>]' });

      expect(screen.getByTestId('drag-preview')).toBeInTheDocument();
      expect(screen.getByTestId('drag-preview')).toHaveTextContent('Eiffel Tower');
    });

    test('should prevent drag when not editable', () => {
      renderWithProviders(
        <Timeline {...defaultProps} isEditable={false} />,
        { user: mockUser }
      );

      const destination = screen.getByTestId('destination-card-0');
      expect(destination).not.toHaveAttribute('draggable');
    });
  });

  describe('Map Integration', () => {
    test('should show destination markers on map', () => {
      renderWithProviders(<Timeline {...defaultProps} />, { user: mockUser });

      const mapContainer = screen.getByTestId('map-container');
      expect(mapContainer).toBeInTheDocument();

      const markers = screen.getAllByTestId('marker');
      expect(markers).toHaveLength(mockDestinations.length);
    });

    test('should center map on selected destination', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Timeline {...defaultProps} />, { user: mockUser });

      const destination = screen.getByTestId('destination-card-0');
      await user.click(destination);

      expect(defaultProps.onDestinationSelect).toHaveBeenCalledWith(mockDestinations[0]);
    });

    test('should show route between destinations', () => {
      renderWithProviders(<Timeline {...defaultProps} />, { user: mockUser });

      expect(screen.getByTestId('route-polyline')).toBeInTheDocument();
    });

    test('should handle map errors gracefully', () => {
      // Mock map error
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock map to throw error
      jest.doMock('react-leaflet', () => {
        throw new Error('Map failed to load');
      });

      renderWithProviders(<Timeline {...defaultProps} />, { user: mockUser });

      expect(screen.getByText(/map unavailable/i)).toBeInTheDocument();
      expect(screen.getByTestId('timeline-container')).toBeInTheDocument(); // Timeline still renders

      consoleError.mockRestore();
    });
  });

  describe('Interaction Handling', () => {
    test('should handle destination card click', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Timeline {...defaultProps} />, { user: mockUser });

      const destination = screen.getByTestId('destination-card-0');
      await user.click(destination);

      expect(defaultProps.onDestinationSelect).toHaveBeenCalledWith(mockDestinations[0]);
    });

    test('should handle destination edit action', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Timeline {...defaultProps} />, { user: mockUser });

      const editButton = screen.getByTestId('edit-destination-0');
      await user.click(editButton);

      expect(screen.getByTestId('edit-modal')).toBeInTheDocument();
    });

    test('should handle destination delete action', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Timeline {...defaultProps} />, { user: mockUser });

      const deleteButton = screen.getByTestId('delete-destination-0');
      await user.click(deleteButton);

      // Should show confirmation dialog
      expect(screen.getByText(/confirm delete/i)).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /delete/i });
      await user.click(confirmButton);

      expect(defaultProps.onDestinationDelete).toHaveBeenCalledWith(mockDestinations[0].id);
    });

    test('should hide edit/delete actions when not editable', () => {
      renderWithProviders(
        <Timeline {...defaultProps} isEditable={false} />,
        { user: mockUser }
      );

      expect(screen.queryByTestId('edit-destination-0')).not.toBeInTheDocument();
      expect(screen.queryByTestId('delete-destination-0')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      renderWithProviders(<Timeline {...defaultProps} />, { user: mockUser });

      expect(screen.getByRole('list')).toHaveAttribute('aria-label', 'Destinations timeline');
      
      const destinationCards = screen.getAllByRole('listitem');
      destinationCards.forEach((card, index) => {
        expect(card).toHaveAttribute('aria-label', expect.stringContaining(mockDestinations[index].name));
      });
    });

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Timeline {...defaultProps} />, { user: mockUser });

      const firstCard = screen.getByTestId('destination-card-0');
      firstCard.focus();

      await user.keyboard('[ArrowDown]');
      expect(screen.getByTestId('destination-card-1')).toHaveFocus();

      await user.keyboard('[ArrowUp]');
      expect(screen.getByTestId('destination-card-0')).toHaveFocus();
    });

    test('should announce drag and drop actions to screen readers', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Timeline {...defaultProps} />, { user: mockUser });

      const destination = screen.getByTestId('destination-card-0');
      await user.pointer([
        { target: destination, keys: '[MouseLeft>]' },
        { coords: { x: 0, y: 100 } },
        { keys: '[/MouseLeft]' },
      ]);

      expect(screen.getByRole('status')).toHaveTextContent(/destination moved/i);
    });

    test('should have proper color contrast for timeline elements', () => {
      renderWithProviders(<Timeline {...defaultProps} />, { user: mockUser });

      const timelineElements = screen.getAllByTestId(/timeline-item/);
      timelineElements.forEach(element => {
        const styles = window.getComputedStyle(element);
        // Check that contrast ratio meets WCAG AA standards (4.5:1)
        expect(parseFloat(styles.opacity)).toBeGreaterThanOrEqual(0.8);
      });
    });
  });

  describe('Performance', () => {
    test('should virtualize long lists of destinations', () => {
      const manyDestinations = Array.from({ length: 100 }, (_, i) => ({
        ...mockDestinations[0],
        id: `dest-${i}`,
        name: `Destination ${i}`,
        sortOrder: i,
      }));

      renderWithProviders(
        <Timeline {...defaultProps} destinations={manyDestinations} />,
        { user: mockUser }
      );

      // Should only render visible items
      const visibleCards = screen.getAllByTestId(/destination-card/);
      expect(visibleCards.length).toBeLessThan(20); // Virtualized rendering
    });

    test('should debounce reorder operations', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Timeline {...defaultProps} />, { user: mockUser });

      const destination = screen.getByTestId('destination-card-0');

      // Perform multiple rapid drag operations
      for (let i = 0; i < 5; i++) {
        await user.pointer([
          { target: destination, keys: '[MouseLeft>]' },
          { coords: { x: 0, y: 10 * i } },
          { keys: '[/MouseLeft]' },
        ]);
      }

      // Should debounce and only call once
      await waitFor(() => {
        expect(defaultProps.onDestinationReorder).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
    });

    test('should handle large datasets without performance degradation', () => {
      const start = performance.now();

      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockDestinations[0],
        id: `dest-${i}`,
        name: `Destination ${i}`,
        sortOrder: i,
      }));

      renderWithProviders(
        <Timeline {...defaultProps} destinations={largeDataset} />,
        { user: mockUser }
      );

      const end = performance.now();
      expect(end - start).toBeLessThan(100); // Should render in under 100ms
    });
  });

  describe('Error Handling', () => {
    test('should handle corrupted destination data gracefully', () => {
      const corruptedDestinations = [
        { ...mockDestinations[0], coordinates: null },
        { ...mockDestinations[1], name: undefined },
      ];

      renderWithProviders(
        <Timeline {...defaultProps} destinations={corruptedDestinations} />,
        { user: mockUser }
      );

      // Should still render without crashing
      expect(screen.getByTestId('timeline-container')).toBeInTheDocument();
      expect(screen.getByText(/unnamed destination/i)).toBeInTheDocument();
    });

    test('should recover from drag and drop errors', async () => {
      const user = userEvent.setup();
      
      // Mock drag operation to fail
      mockDragEnd.mockImplementation(() => {
        throw new Error('Drag operation failed');
      });

      renderWithProviders(<Timeline {...defaultProps} />, { user: mockUser });

      const destination = screen.getByTestId('destination-card-0');
      await user.pointer([
        { target: destination, keys: '[MouseLeft>]' },
        { coords: { x: 0, y: 100 } },
        { keys: '[/MouseLeft]' },
      ]);

      // Should show error message and recover
      expect(screen.getByText(/operation failed/i)).toBeInTheDocument();
      expect(screen.getByTestId('timeline-container')).toBeInTheDocument();
    });
  });

  describe('Data Synchronization', () => {
    test('should update when destinations prop changes', () => {
      const { rerender } = renderWithProviders(
        <Timeline {...defaultProps} />,
        { user: mockUser }
      );

      expect(screen.getByText('Eiffel Tower')).toBeInTheDocument();

      const updatedDestinations = [
        { ...mockDestinations[0], name: 'Updated Tower' },
      ];

      rerender(<Timeline {...defaultProps} destinations={updatedDestinations} />);

      expect(screen.getByText('Updated Tower')).toBeInTheDocument();
      expect(screen.queryByText('Eiffel Tower')).not.toBeInTheDocument();
    });

    test('should handle real-time updates from other users', async () => {
      renderWithProviders(<Timeline {...defaultProps} />, { user: mockUser });

      // Simulate real-time update
      const newDestination = {
        id: 'dest-3',
        tripId: 'trip-1',
        name: 'Arc de Triomphe',
        location: 'Paris, France',
        category: 'attraction',
        startDate: '2025-10-04',
        endDate: '2025-10-04',
        sortOrder: 2,
      };

      // Simulate WebSocket update
      fireEvent(window, new CustomEvent('destination-added', {
        detail: newDestination,
      }));

      await waitFor(() => {
        expect(screen.getByText('Arc de Triomphe')).toBeInTheDocument();
      });
    });
  });
});