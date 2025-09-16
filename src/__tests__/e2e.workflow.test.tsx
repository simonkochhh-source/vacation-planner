import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { 
  renderWithProviders, 
  mockUser, 
  createMockSupabaseClient,
  mockSuccessResponse 
} from '../test-utils/renderWithProviders';

// End-to-end workflow tests that simulate real user journeys
describe('End-to-End Workflow Tests', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
    localStorage.clear();
  });

  describe('Complete Trip Planning Workflow', () => {
    test('should allow user to plan a complete trip from start to finish', async () => {
      const user = userEvent.setup();
      
      // Setup mock responses for the entire workflow
      let createdTrip: any = null;
      let createdDestinations: any[] = [];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'trips') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue(
                  mockSuccessResponse(createdTrip ? [createdTrip] : [])
                ),
              }),
            }),
            insert: jest.fn().mockImplementation((data) => {
              createdTrip = { ...data, id: 'trip-new', createdAt: new Date().toISOString() };
              return {
                select: jest.fn().mockResolvedValue(mockSuccessResponse([createdTrip])),
              };
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue(mockSuccessResponse([createdTrip])),
              }),
            }),
          };
        }
        if (table === 'destinations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue(mockSuccessResponse(createdDestinations)),
                }),
                order: jest.fn().mockResolvedValue(mockSuccessResponse(createdDestinations)),
              }),
            }),
            insert: jest.fn().mockImplementation((data) => {
              const newDestination = { 
                ...data, 
                id: `dest-${createdDestinations.length + 1}`,
                sortOrder: createdDestinations.length,
                createdAt: new Date().toISOString(),
              };
              createdDestinations.push(newDestination);
              return {
                select: jest.fn().mockResolvedValue(mockSuccessResponse([newDestination])),
              };
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue(mockSuccessResponse(createdDestinations)),
              }),
            }),
          };
        }
        return {};
      });

      renderWithProviders(<App />, { user: mockUser, supabaseClient: mockSupabaseClient });

      // Step 1: Create a new trip
      await waitFor(() => {
        expect(screen.getByText(/vacation planner/i)).toBeInTheDocument();
      });

      const createTripButton = await screen.findByRole('button', { name: /create trip/i });
      await user.click(createTripButton);

      // Fill trip form
      const tripNameField = await screen.findByLabelText(/trip name/i);
      const descriptionField = screen.getByLabelText(/description/i);
      const startDateField = screen.getByLabelText(/start date/i);
      const endDateField = screen.getByLabelText(/end date/i);
      const budgetField = screen.getByLabelText(/budget/i);

      await user.type(tripNameField, 'European Adventure');
      await user.type(descriptionField, 'A comprehensive tour of European cities');
      await user.type(startDateField, '2025-06-01');
      await user.type(endDateField, '2025-06-14');
      await user.type(budgetField, '3000');

      const saveTripButton = screen.getByRole('button', { name: /save trip/i });
      await user.click(saveTripButton);

      // Verify trip was created
      await waitFor(() => {
        expect(screen.getByText('European Adventure')).toBeInTheDocument();
      });

      // Step 2: Navigate to trip details
      const tripCard = screen.getByTestId('trip-card-trip-new');
      await user.click(tripCard);

      await waitFor(() => {
        expect(screen.getByText(/destinations/i)).toBeInTheDocument();
      });

      // Step 3: Add multiple destinations
      const destinations = [
        {
          name: 'Eiffel Tower',
          location: 'Paris, France',
          category: 'attraction',
          budget: '50',
          notes: 'Iconic landmark, visit at sunset',
        },
        {
          name: 'Le Jules Verne',
          location: 'Paris, France',
          category: 'restaurant',
          budget: '200',
          notes: 'Fine dining experience',
        },
        {
          name: 'Colosseum',
          location: 'Rome, Italy',
          category: 'attraction',
          budget: '25',
          notes: 'Ancient Roman amphitheater',
        },
        {
          name: 'Sagrada Familia',
          location: 'Barcelona, Spain',
          category: 'attraction',
          budget: '30',
          notes: 'Gaudi masterpiece',
        },
      ];

      for (const destination of destinations) {
        const addDestinationButton = screen.getByRole('button', { name: /add destination/i });
        await user.click(addDestinationButton);

        // Fill destination form
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        const nameField = screen.getByLabelText(/destination name/i);
        const locationField = screen.getByLabelText(/location/i);
        const categorySelect = screen.getByLabelText(/category/i);
        const budgetField = screen.getByLabelText(/budget/i);
        const notesField = screen.getByLabelText(/notes/i);

        await user.type(nameField, destination.name);
        await user.type(locationField, destination.location);
        await user.selectOptions(categorySelect, destination.category);
        await user.type(budgetField, destination.budget);
        await user.type(notesField, destination.notes);

        const saveDestinationButton = screen.getByRole('button', { name: /save destination/i });
        await user.click(saveDestinationButton);

        // Wait for destination to appear
        await waitFor(() => {
          expect(screen.getByText(destination.name)).toBeInTheDocument();
        });
      }

      // Step 4: Verify all destinations were added
      expect(screen.getByText('Eiffel Tower')).toBeInTheDocument();
      expect(screen.getByText('Le Jules Verne')).toBeInTheDocument();
      expect(screen.getByText('Colosseum')).toBeInTheDocument();
      expect(screen.getByText('Sagrada Familia')).toBeInTheDocument();

      // Step 5: Reorder destinations
      const parisAttraction = screen.getByTestId('destination-card-dest-1');
      const parisRestaurant = screen.getByTestId('destination-card-dest-2');

      // Simulate drag and drop to reorder
      await user.pointer([
        { target: parisRestaurant, keys: '[MouseLeft>]' },
        { coords: { x: 0, y: -100 } },
        { target: parisAttraction },
        { keys: '[/MouseLeft]' },
      ]);

      // Step 6: Navigate to map view
      const mapTabButton = screen.getByRole('tab', { name: /map/i });
      await user.click(mapTabButton);

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      // Verify destinations appear on map
      const mapMarkers = screen.getAllByTestId('destination-marker');
      expect(mapMarkers).toHaveLength(4);

      // Step 7: Check budget overview
      const budgetTabButton = screen.getByRole('tab', { name: /budget/i });
      await user.click(budgetTabButton);

      await waitFor(() => {
        expect(screen.getByText(/budget overview/i)).toBeInTheDocument();
      });

      // Verify budget calculations
      const totalBudgetText = screen.getByText(/total: €305/i); // 50+200+25+30
      expect(totalBudgetText).toBeInTheDocument();

      // Step 8: Export trip data
      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      const exportDialog = await screen.findByRole('dialog');
      const exportFormatSelect = within(exportDialog).getByLabelText(/format/i);
      await user.selectOptions(exportFormatSelect, 'pdf');

      const confirmExportButton = within(exportDialog).getByRole('button', { name: /export/i });
      await user.click(confirmExportButton);

      // Verify export was initiated
      await waitFor(() => {
        expect(screen.getByText(/export started/i)).toBeInTheDocument();
      });

      // Step 9: Share trip
      const shareButton = screen.getByRole('button', { name: /share/i });
      await user.click(shareButton);

      const shareDialog = await screen.findByRole('dialog');
      const shareLink = within(shareDialog).getByTestId('share-link');
      expect(shareLink).toHaveValue(expect.stringContaining('/shared/trip-new'));

      const copyLinkButton = within(shareDialog).getByRole('button', { name: /copy link/i });
      await user.click(copyLinkButton);

      await waitFor(() => {
        expect(screen.getByText(/link copied/i)).toBeInTheDocument();
      });
    });
  });

  describe('Collaborative Planning Workflow', () => {
    test('should handle multiple users collaborating on a trip', async () => {
      const user = userEvent.setup();
      
      // Setup for collaborative features
      const sharedTrip = {
        id: 'shared-trip-1',
        name: 'Team Trip to Tokyo',
        description: 'Company retreat',
        startDate: '2025-07-01',
        endDate: '2025-07-07',
        budget: 5000,
        participants: ['user1', 'user2', 'user3'],
        isShared: true,
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'trips') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue(mockSuccessResponse([sharedTrip])),
              }),
            }),
          };
        }
        if (table === 'trip_participants') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue(mockSuccessResponse([
                { userId: 'user1', role: 'owner' },
                { userId: 'user2', role: 'editor' },
                { userId: 'user3', role: 'viewer' },
              ])),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue(mockSuccessResponse([])),
            }),
          };
        }
        return {};
      });

      renderWithProviders(<App />, { user: mockUser, supabaseClient: mockSupabaseClient });

      // View shared trip
      await waitFor(() => {
        expect(screen.getByText('Team Trip to Tokyo')).toBeInTheDocument();
      });

      const sharedTripCard = screen.getByTestId('trip-card-shared-trip-1');
      expect(within(sharedTripCard).getByTestId('shared-indicator')).toBeInTheDocument();

      // Navigate to trip
      await user.click(sharedTripCard);

      await waitFor(() => {
        expect(screen.getByText(/participants/i)).toBeInTheDocument();
      });

      // View participants
      const participantsSection = screen.getByTestId('participants-section');
      expect(within(participantsSection).getByText('3 participants')).toBeInTheDocument();

      // Add new participant
      const inviteButton = screen.getByRole('button', { name: /invite participant/i });
      await user.click(inviteButton);

      const inviteDialog = await screen.findByRole('dialog');
      const emailField = within(inviteDialog).getByLabelText(/email/i);
      const roleSelect = within(inviteDialog).getByLabelText(/role/i);

      await user.type(emailField, 'newuser@example.com');
      await user.selectOptions(roleSelect, 'editor');

      const sendInviteButton = within(inviteDialog).getByRole('button', { name: /send invite/i });
      await user.click(sendInviteButton);

      await waitFor(() => {
        expect(screen.getByText(/invitation sent/i)).toBeInTheDocument();
      });

      // Test real-time collaboration features
      // Simulate another user adding a destination
      const newDestination = {
        id: 'collab-dest-1',
        name: 'Tokyo Tower',
        location: 'Tokyo, Japan',
        category: 'attraction',
        addedBy: 'user2',
        addedAt: new Date().toISOString(),
      };

      // Simulate real-time update
      window.dispatchEvent(new CustomEvent('destination-added', {
        detail: newDestination,
      }));

      await waitFor(() => {
        expect(screen.getByText('Tokyo Tower')).toBeInTheDocument();
        expect(screen.getByText(/added by user2/i)).toBeInTheDocument();
      });
    });
  });

  describe('Mobile User Journey', () => {
    test('should provide complete mobile experience', async () => {
      const user = userEvent.setup();
      
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      // Mock touch events
      global.TouchEvent = class TouchEvent extends Event {
        constructor(type: string, options: any = {}) {
          super(type, options);
        }
      };

      renderWithProviders(<App />, { user: mockUser, supabaseClient: mockSupabaseClient });

      // Mobile navigation should be visible
      await waitFor(() => {
        expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
      });

      // Test mobile trip creation with touch interactions
      const mobileCreateButton = screen.getByTestId('mobile-create-button');
      await user.click(mobileCreateButton);

      // Mobile form should be optimized
      const mobileForm = await screen.findByTestId('mobile-trip-form');
      expect(mobileForm).toHaveClass('mobile-optimized');

      // Fill form with mobile-specific interactions
      const nameField = screen.getByLabelText(/trip name/i);
      await user.type(nameField, 'Mobile Trip');

      // Test mobile date picker
      const dateField = screen.getByLabelText(/start date/i);
      await user.click(dateField);

      const mobileDatePicker = await screen.findByTestId('mobile-date-picker');
      expect(mobileDatePicker).toBeInTheDocument();

      // Select date
      const dateOption = within(mobileDatePicker).getByText('15');
      await user.click(dateOption);

      // Save trip
      const saveTripButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveTripButton);

      await waitFor(() => {
        expect(screen.getByText('Mobile Trip')).toBeInTheDocument();
      });

      // Test mobile map interaction
      const tripCard = screen.getByTestId('trip-card-trip-new');
      await user.click(tripCard);

      // Switch to mobile map view
      const mapTab = screen.getByRole('tab', { name: /map/i });
      await user.click(mapTab);

      const mobileMap = await screen.findByTestId('mobile-map');
      expect(mobileMap).toBeInTheDocument();

      // Test touch gestures on map
      const mapContainer = screen.getByTestId('map-container');
      
      // Simulate pinch to zoom
      await user.pointer([
        { target: mapContainer, coords: { x: 100, y: 100 }, keys: '[TouchStart>]' },
        { target: mapContainer, coords: { x: 200, y: 200 }, keys: '[TouchStart>]' },
        { coords: { x: 150, y: 150 } },
        { keys: '[/TouchStart][/TouchStart]' },
      ]);

      // Test mobile destination addition with voice input
      const voiceInputButton = screen.getByTestId('voice-input-button');
      await user.click(voiceInputButton);

      await waitFor(() => {
        expect(screen.getByText(/listening/i)).toBeInTheDocument();
      });
    });
  });

  describe('Offline Capabilities', () => {
    test('should handle offline usage and sync when back online', async () => {
      const user = userEvent.setup();
      
      // Start with online state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      renderWithProviders(<App />, { user: mockUser, supabaseClient: mockSupabaseClient });

      await waitFor(() => {
        expect(screen.getByText(/vacation planner/i)).toBeInTheDocument();
      });

      // Create a trip while online
      const createTripButton = screen.getByRole('button', { name: /create trip/i });
      await user.click(createTripButton);

      const nameField = await screen.findByLabelText(/trip name/i);
      await user.type(nameField, 'Offline Test Trip');

      const saveTripButton = screen.getByRole('button', { name: /save trip/i });
      await user.click(saveTripButton);

      await waitFor(() => {
        expect(screen.getByText('Offline Test Trip')).toBeInTheDocument();
      });

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      window.dispatchEvent(new Event('offline'));

      // Should show offline indicator
      await waitFor(() => {
        expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
      });

      // Try to create another trip while offline
      await user.click(createTripButton);

      const offlineNameField = await screen.findByLabelText(/trip name/i);
      await user.type(offlineNameField, 'Offline Created Trip');

      const offlineSaveButton = screen.getByRole('button', { name: /save trip/i });
      await user.click(offlineSaveButton);

      // Should show offline save confirmation
      await waitFor(() => {
        expect(screen.getByText(/saved offline/i)).toBeInTheDocument();
      });

      // Trip should appear with offline indicator
      expect(screen.getByText('Offline Created Trip')).toBeInTheDocument();
      expect(screen.getByTestId('offline-trip-indicator')).toBeInTheDocument();

      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      window.dispatchEvent(new Event('online'));

      // Should show sync indicator
      await waitFor(() => {
        expect(screen.getByTestId('sync-indicator')).toBeInTheDocument();
      });

      // Wait for sync to complete
      await waitFor(() => {
        expect(screen.queryByTestId('offline-trip-indicator')).not.toBeInTheDocument();
        expect(screen.getByText(/synced successfully/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Data Export and Import', () => {
    test('should allow complete data export and import cycle', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<App />, { user: mockUser, supabaseClient: mockSupabaseClient });

      await waitFor(() => {
        expect(screen.getByText(/vacation planner/i)).toBeInTheDocument();
      });

      // Navigate to settings
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      // Export all data
      const exportAllButton = await screen.findByRole('button', { name: /export all data/i });
      await user.click(exportAllButton);

      const exportDialog = await screen.findByRole('dialog');
      const formatSelect = within(exportDialog).getByLabelText(/export format/i);
      await user.selectOptions(formatSelect, 'json');

      const includePhotosCheckbox = within(exportDialog).getByLabelText(/include photos/i);
      await user.click(includePhotosCheckbox);

      const startExportButton = within(exportDialog).getByRole('button', { name: /start export/i });
      await user.click(startExportButton);

      // Wait for export to complete
      await waitFor(() => {
        expect(screen.getByText(/export completed/i)).toBeInTheDocument();
      }, { timeout: 10000 });

      const downloadButton = screen.getByRole('button', { name: /download/i });
      await user.click(downloadButton);

      // Clear data to test import
      const clearDataButton = screen.getByRole('button', { name: /clear all data/i });
      await user.click(clearDataButton);

      const confirmClearDialog = await screen.findByRole('dialog');
      const confirmButton = within(confirmClearDialog).getByRole('button', { name: /confirm clear/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/no trips found/i)).toBeInTheDocument();
      });

      // Import the data back
      const importButton = screen.getByRole('button', { name: /import data/i });
      await user.click(importButton);

      const importDialog = await screen.findByRole('dialog');
      const fileInput = within(importDialog).getByLabelText(/select file/i);

      // Simulate file selection
      const file = new File(['{"trips": [], "destinations": []}'], 'export.json', {
        type: 'application/json',
      });

      await user.upload(fileInput, file);

      const startImportButton = within(importDialog).getByRole('button', { name: /start import/i });
      await user.click(startImportButton);

      // Wait for import to complete
      await waitFor(() => {
        expect(screen.getByText(/import completed/i)).toBeInTheDocument();
      }, { timeout: 10000 });

      // Verify data was restored
      await waitFor(() => {
        expect(screen.queryByText(/no trips found/i)).not.toBeInTheDocument();
      });
    });
  });
});