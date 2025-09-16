import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { 
  renderWithProviders, 
  mockUser, 
  mockTrips, 
  mockDestinations,
  createMockSupabaseClient,
  mockSuccessResponse,
  mockErrorResponse 
} from '../test-utils/renderWithProviders';

// Mock external services
jest.mock('../services/googleMapsService');
jest.mock('../services/weatherService');
jest.mock('../services/photoService');

// Mock React Router for navigation testing
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('App Integration Tests', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
    
    // Reset localStorage
    localStorage.clear();
    
    // Reset navigation mock
    mockNavigate.mockReset();
  });

  describe('Authentication Flow', () => {
    test('should show login page when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      renderWithProviders(<App />, { user: null, supabaseClient: mockSupabaseClient });

      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
      });
    });

    test('should show main app when user is authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue(mockSuccessResponse(mockTrips)),
          }),
        }),
      });

      renderWithProviders(<App />, { user: mockUser, supabaseClient: mockSupabaseClient });

      await waitFor(() => {
        expect(screen.getByText(/vacation planner/i)).toBeInTheDocument();
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });
    });

    test('should handle login process', async () => {
      const user = userEvent.setup();
      
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
        data: { url: 'https://oauth.example.com' },
        error: null,
      });

      renderWithProviders(<App />, { user: null, supabaseClient: mockSupabaseClient });

      const loginButton = await screen.findByRole('button', { name: /sign in with google/i });
      await user.click(loginButton);

      expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/callback'),
        }),
      });
    });

    test('should handle logout process', async () => {
      const user = userEvent.setup();
      
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      renderWithProviders(<App />, { user: mockUser, supabaseClient: mockSupabaseClient });

      // Open user menu
      const userMenuButton = await screen.findByTestId('user-menu-button');
      await user.click(userMenuButton);

      // Click logout
      const logoutButton = screen.getByRole('button', { name: /sign out/i });
      await user.click(logoutButton);

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('Trip Management Flow', () => {
    beforeEach(() => {
      // Setup authenticated user with trips data
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue(mockSuccessResponse(mockTrips)),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(mockSuccessResponse(mockTrips)),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(mockSuccessResponse(mockTrips)),
          }),
        }),
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(mockSuccessResponse([])),
        }),
      });
    });

    test('should complete full trip creation flow', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<App />, { user: mockUser, supabaseClient: mockSupabaseClient });

      // Wait for app to load
      await waitFor(() => {
        expect(screen.getByText(/vacation planner/i)).toBeInTheDocument();
      });

      // Click create trip button
      const createTripButton = await screen.findByRole('button', { name: /create trip/i });
      await user.click(createTripButton);

      // Fill trip form
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const nameField = screen.getByLabelText(/trip name/i);
      const descriptionField = screen.getByLabelText(/description/i);
      const startDateField = screen.getByLabelText(/start date/i);
      const endDateField = screen.getByLabelText(/end date/i);
      const budgetField = screen.getByLabelText(/budget/i);

      await user.type(nameField, 'Test Integration Trip');
      await user.type(descriptionField, 'A trip created during integration testing');
      await user.type(startDateField, '2025-10-01');
      await user.type(endDateField, '2025-10-07');
      await user.type(budgetField, '2000');

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save trip/i });
      await user.click(saveButton);

      // Verify trip was created
      await waitFor(() => {
        expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Integration Trip',
            description: 'A trip created during integration testing',
            budget: 2000,
          })
        );
      });

      // Verify dialog closed and trip appears in list
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText('Test Integration Trip')).toBeInTheDocument();
      });
    });

    test('should handle trip editing flow', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<App />, { user: mockUser, supabaseClient: mockSupabaseClient });

      await waitFor(() => {
        expect(screen.getByText('Trip to Paris')).toBeInTheDocument();
      });

      // Click edit button on first trip
      const tripCard = screen.getByTestId('trip-card-trip-1');
      const editButton = within(tripCard).getByRole('button', { name: /edit/i });
      await user.click(editButton);

      // Modify trip details
      const nameField = await screen.findByDisplayValue('Trip to Paris');
      await user.clear(nameField);
      await user.type(nameField, 'Updated Paris Trip');

      // Save changes
      const saveButton = screen.getByRole('button', { name: /update trip/i });
      await user.click(saveButton);

      // Verify update was called
      await waitFor(() => {
        expect(mockSupabaseClient.from().update).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Updated Paris Trip',
          })
        );
      });
    });

    test('should handle trip deletion flow', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<App />, { user: mockUser, supabaseClient: mockSupabaseClient });

      await waitFor(() => {
        expect(screen.getByText('Trip to Paris')).toBeInTheDocument();
      });

      // Click delete button
      const tripCard = screen.getByTestId('trip-card-trip-1');
      const deleteButton = within(tripCard).getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Confirm deletion
      const confirmDialog = await screen.findByRole('dialog');
      const confirmButton = within(confirmDialog).getByRole('button', { name: /confirm delete/i });
      await user.click(confirmButton);

      // Verify deletion was called
      await waitFor(() => {
        expect(mockSupabaseClient.from().delete).toHaveBeenCalled();
      });
    });
  });

  describe('Destination Management Flow', () => {
    beforeEach(() => {
      // Setup trips and destinations data
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'trips') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue(mockSuccessResponse(mockTrips)),
              }),
            }),
          };
        }
        if (table === 'destinations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue(mockSuccessResponse(mockDestinations)),
                }),
                order: jest.fn().mockResolvedValue(mockSuccessResponse(mockDestinations)),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue(mockSuccessResponse(mockDestinations)),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue(mockSuccessResponse(mockDestinations)),
              }),
            }),
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue(mockSuccessResponse([])),
            }),
          };
        }
        return {};
      });
    });

    test('should complete full destination creation flow', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<App />, { user: mockUser, supabaseClient: mockSupabaseClient });

      // Navigate to trip detail page
      await waitFor(() => {
        expect(screen.getByText('Trip to Paris')).toBeInTheDocument();
      });

      const tripCard = screen.getByTestId('trip-card-trip-1');
      await user.click(tripCard);

      // Wait for trip detail page to load
      await waitFor(() => {
        expect(screen.getByText(/destinations/i)).toBeInTheDocument();
      });

      // Click add destination button
      const addDestinationButton = await screen.findByRole('button', { name: /add destination/i });
      await user.click(addDestinationButton);

      // Fill destination form
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const nameField = screen.getByLabelText(/destination name/i);
      const locationField = screen.getByLabelText(/location/i);
      const categorySelect = screen.getByLabelText(/category/i);
      const budgetField = screen.getByLabelText(/budget/i);

      await user.type(nameField, 'Notre-Dame Cathedral');
      await user.type(locationField, 'Paris, France');
      await user.selectOptions(categorySelect, 'attraction');
      await user.type(budgetField, '25');

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save destination/i });
      await user.click(saveButton);

      // Verify destination was created
      await waitFor(() => {
        expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Notre-Dame Cathedral',
            location: 'Paris, France',
            category: 'attraction',
            budget: 25,
          })
        );
      });
    });

    test('should handle destination reordering via drag and drop', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<App />, { user: mockUser, supabaseClient: mockSupabaseClient });

      // Navigate to trip with destinations
      const tripCard = await screen.findByTestId('trip-card-trip-1');
      await user.click(tripCard);

      // Wait for destinations to load
      await waitFor(() => {
        expect(screen.getByText('Eiffel Tower')).toBeInTheDocument();
        expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
      });

      // Perform drag and drop (simplified simulation)
      const firstDestination = screen.getByTestId('destination-card-dest-1');
      const secondDestination = screen.getByTestId('destination-card-dest-2');

      // Simulate drag and drop
      await user.pointer([
        { target: firstDestination, keys: '[MouseLeft>]' },
        { coords: { x: 0, y: 100 } },
        { target: secondDestination },
        { keys: '[/MouseLeft]' },
      ]);

      // Verify reorder was called
      await waitFor(() => {
        expect(mockSupabaseClient.from().update).toHaveBeenCalled();
      });
    });
  });

  describe('Navigation and Routing', () => {
    test('should handle navigation between different views', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<App />, { user: mockUser, supabaseClient: mockSupabaseClient });

      // Start on dashboard
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });

      // Navigate to map view
      const mapNavButton = screen.getByRole('button', { name: /map/i });
      await user.click(mapNavButton);

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Navigate to settings
      const settingsNavButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsNavButton);

      await waitFor(() => {
        expect(screen.getByText(/settings/i)).toBeInTheDocument();
      });

      // Navigate back to dashboard
      const dashboardNavButton = screen.getByRole('button', { name: /dashboard/i });
      await user.click(dashboardNavButton);

      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });
    });

    test('should handle deep linking to specific trip', async () => {
      renderWithProviders(<App />, {
        user: mockUser,
        supabaseClient: mockSupabaseClient,
        route: '/trips/trip-1',
      });

      await waitFor(() => {
        expect(screen.getByText(/trip to paris/i)).toBeInTheDocument();
        expect(screen.getByText(/destinations/i)).toBeInTheDocument();
      });
    });

    test('should handle 404 for invalid routes', async () => {
      renderWithProviders(<App />, {
        user: mockUser,
        supabaseClient: mockSupabaseClient,
        route: '/invalid-route',
      });

      await waitFor(() => {
        expect(screen.getByText(/page not found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle network errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue(mockErrorResponse('Network error')),
          }),
        }),
      });

      renderWithProviders(<App />, { user: mockUser, supabaseClient: mockSupabaseClient });

      await waitFor(() => {
        expect(screen.getByText(/error loading data/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    test('should handle authentication errors', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      renderWithProviders(<App />, { user: mockUser, supabaseClient: mockSupabaseClient });

      await waitFor(() => {
        expect(screen.getByText(/authentication error/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in again/i })).toBeInTheDocument();
      });
    });

    test('should recover from errors with retry functionality', async () => {
      const user = userEvent.setup();
      
      // Initially return error
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue(mockErrorResponse('Network error')),
          }),
        }),
      });

      // Then return success on retry
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue(mockSuccessResponse(mockTrips)),
          }),
        }),
      });

      renderWithProviders(<App />, { user: mockUser, supabaseClient: mockSupabaseClient });

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/error loading data/i)).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      // Should recover and show data
      await waitFor(() => {
        expect(screen.getByText('Trip to Paris')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Loading States', () => {
    test('should show loading states during data fetch', async () => {
      // Delay the response to test loading state
      const delayedPromise = new Promise(resolve => 
        setTimeout(() => resolve(mockSuccessResponse(mockTrips)), 1000)
      );

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue(delayedPromise),
          }),
        }),
      });

      renderWithProviders(<App />, { user: mockUser, supabaseClient: mockSupabaseClient });

      // Should show loading spinner
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Trip to Paris')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Loading spinner should be gone
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    test('should handle concurrent operations correctly', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<App />, { user: mockUser, supabaseClient: mockSupabaseClient });

      await waitFor(() => {
        expect(screen.getByText('Trip to Paris')).toBeInTheDocument();
      });

      // Start multiple operations simultaneously
      const createTripButton = screen.getByRole('button', { name: /create trip/i });
      const editButton = screen.getByTestId('edit-trip-trip-1');

      // Click both buttons rapidly
      await user.click(createTripButton);
      await user.click(editButton);

      // Should handle both operations without conflicts
      await waitFor(() => {
        expect(screen.getAllByRole('dialog')).toHaveLength(1); // Only one dialog should be open
      });
    });
  });

  describe('Real-time Updates', () => {
    test('should handle real-time trip updates', async () => {
      renderWithProviders(<App />, { user: mockUser, supabaseClient: mockSupabaseClient });

      await waitFor(() => {
        expect(screen.getByText('Trip to Paris')).toBeInTheDocument();
      });

      // Simulate real-time update from Supabase
      const updatedTrip = { ...mockTrips[0], name: 'Updated Paris Trip' };
      
      // Mock Supabase real-time subscription
      const mockSubscription = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      };

      // Simulate receiving real-time update
      mockSupabaseClient.channel = jest.fn().mockReturnValue(mockSubscription);
      
      // Trigger the update
      const updateHandler = mockSubscription.on.mock.calls[0][1];
      updateHandler({
        eventType: 'UPDATE',
        new: updatedTrip,
        old: mockTrips[0],
      });

      await waitFor(() => {
        expect(screen.getByText('Updated Paris Trip')).toBeInTheDocument();
      });
    });
  });

  describe('Data Persistence', () => {
    test('should persist user preferences in localStorage', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<App />, { user: mockUser, supabaseClient: mockSupabaseClient });

      // Change a user preference
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      const themeToggle = await screen.findByRole('button', { name: /dark mode/i });
      await user.click(themeToggle);

      // Check that preference was saved
      expect(localStorage.getItem('user-preferences')).toContain('dark');
    });

    test('should restore app state on page reload', async () => {
      // Pre-populate localStorage with app state
      localStorage.setItem('app-state', JSON.stringify({
        currentView: 'map',
        selectedTrip: 'trip-1',
      }));

      renderWithProviders(<App />, { user: mockUser, supabaseClient: mockSupabaseClient });

      // Should restore the previous state
      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('should support keyboard navigation throughout the app', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<App />, { user: mockUser, supabaseClient: mockSupabaseClient });

      await waitFor(() => {
        expect(screen.getByText('Trip to Paris')).toBeInTheDocument();
      });

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /create trip/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('trip-card-trip-1')).toHaveFocus();

      // Navigate with arrow keys within trip list
      await user.keyboard('[ArrowDown]');
      expect(screen.getByTestId('trip-card-trip-2')).toHaveFocus();
    });

    test('should announce important changes to screen readers', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<App />, { user: mockUser, supabaseClient: mockSupabaseClient });

      // Create a trip
      const createButton = await screen.findByRole('button', { name: /create trip/i });
      await user.click(createButton);

      // Fill and submit form
      const nameField = await screen.findByLabelText(/trip name/i);
      await user.type(nameField, 'Accessible Trip');

      const saveButton = screen.getByRole('button', { name: /save trip/i });
      await user.click(saveButton);

      // Check for ARIA live region announcement
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/trip created successfully/i);
      });
    });
  });
});