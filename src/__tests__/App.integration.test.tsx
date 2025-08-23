import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import App from '../App';

// Integration tests that test the full application flow
describe('App Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows main interface for new users', () => {
    render(<App />);
    
    // Should show empty state since no trips exist
    expect(screen.getByText('Noch keine Ziele hinzugefügt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mock-Daten laden/i })).toBeInTheDocument();
  });

  it('creates first trip and shows updated interface', async () => {
    render(<App />);
    
    // Start with main interface showing empty state
    expect(screen.getByText('Noch keine Ziele hinzugefügt')).toBeInTheDocument();
    
    // Open trip creation from main interface
    const createTripButton = screen.getByRole('button', { name: /Neue Reise/i });
    fireEvent.click(createTripButton);
    
    // Fill trip form
    await waitFor(() => {
      expect(screen.getByText('Neue Reise erstellen')).toBeInTheDocument();
    });
    
    const nameInput = screen.getByLabelText('Name');
    const startDateInput = screen.getByLabelText('Startdatum');
    const endDateInput = screen.getByLabelText('Enddatum');
    
    fireEvent.change(nameInput, { target: { value: 'Meine erste Reise' } });
    fireEvent.change(startDateInput, { target: { value: '2024-06-01' } });
    fireEvent.change(endDateInput, { target: { value: '2024-06-07' } });
    
    const saveButton = screen.getByRole('button', { name: /Erstellen/i });
    fireEvent.click(saveButton);
    
    // Should show updated interface with new trip
    await waitFor(() => {
      expect(screen.getByText('Meine erste Reise')).toBeInTheDocument();
      expect(screen.getByText('Noch keine Ziele hinzugefügt')).toBeInTheDocument();
    });
  });

  it('complete trip planning workflow', async () => {
    render(<App />);
    
    // Load mock data
    const loadMockDataButton = screen.getByRole('button', { name: /Mock-Daten laden/i });
    fireEvent.click(loadMockDataButton);
    
    await waitFor(() => {
      expect(screen.getByText('Europa Rundreise')).toBeInTheDocument();
    });
    
    // Should show destinations in list view
    expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    expect(screen.getByText('Eiffelturm')).toBeInTheDocument();
    
    // Switch to map view
    const mapViewButton = screen.getByRole('button', { name: /Karte/i });
    fireEvent.click(mapViewButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
    
    // Switch to budget view
    const budgetViewButton = screen.getByRole('button', { name: /Budget/i });
    fireEvent.click(budgetViewButton);
    
    await waitFor(() => {
      expect(screen.getByText('Budget-Verwaltung')).toBeInTheDocument();
    });
    
    // Switch to scheduling view
    const schedulingViewButton = screen.getByRole('button', { name: /Zeitplanung/i });
    fireEvent.click(schedulingViewButton);
    
    await waitFor(() => {
      expect(screen.getByText('Zeitplanung & Optimierung')).toBeInTheDocument();
    });
  });

  it('handles destination CRUD operations', async () => {
    render(<App />);
    
    // Load mock data first
    const loadMockDataButton = screen.getByRole('button', { name: /Mock-Daten laden/i });
    fireEvent.click(loadMockDataButton);
    
    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });
    
    // Add new destination
    const addDestinationButton = screen.getByRole('button', { name: /Neues Ziel hinzufügen/i });
    fireEvent.click(addDestinationButton);
    
    await waitFor(() => {
      expect(screen.getByText('Neues Ziel hinzufügen')).toBeInTheDocument();
    });
    
    // Fill destination form
    const nameInput = screen.getByLabelText('Name');
    const locationInput = screen.getByLabelText('Ort');
    const categorySelect = screen.getByLabelText('Kategorie');
    
    fireEvent.change(nameInput, { target: { value: 'Test Destination' } });
    fireEvent.change(locationInput, { target: { value: 'Test City' } });
    fireEvent.change(categorySelect, { target: { value: 'attraction' } });
    
    const submitButton = screen.getByRole('button', { name: /Hinzufügen/i });
    fireEvent.click(submitButton);
    
    // Should appear in list
    await waitFor(() => {
      expect(screen.getByText('Test Destination')).toBeInTheDocument();
    });
    
    // Edit destination
    const editButtons = screen.getAllByRole('button', { name: /Bearbeiten/i });
    fireEvent.click(editButtons[editButtons.length - 1]); // Edit the new destination
    
    await waitFor(() => {
      expect(screen.getByText('Ziel bearbeiten')).toBeInTheDocument();
    });
    
    const editNameInput = screen.getByDisplayValue('Test Destination');
    fireEvent.change(editNameInput, { target: { value: 'Updated Test Destination' } });
    
    const saveButton = screen.getByRole('button', { name: /Speichern/i });
    fireEvent.click(saveButton);
    
    // Should show updated name
    await waitFor(() => {
      expect(screen.getByText('Updated Test Destination')).toBeInTheDocument();
    });
    
    // Delete destination
    const deleteButtons = screen.getAllByRole('button', { name: /Löschen/i });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);
    
    // Confirm deletion
    await waitFor(() => {
      expect(screen.getByText(/Möchten Sie dieses Ziel wirklich löschen/)).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /Löschen/i });
    fireEvent.click(confirmButton);
    
    // Should be removed from list
    await waitFor(() => {
      expect(screen.queryByText('Updated Test Destination')).not.toBeInTheDocument();
    });
  });

  it('handles search and filtering', async () => {
    render(<App />);
    
    // Load mock data
    const loadMockDataButton = screen.getByRole('button', { name: /Mock-Daten laden/i });
    fireEvent.click(loadMockDataButton);
    
    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });
    
    // Search for specific destination
    const searchInput = screen.getByPlaceholderText('Orte, Sehenswürdigkeiten suchen...');
    fireEvent.change(searchInput, { target: { value: 'Louvre' } });
    
    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
      expect(screen.queryByText('Eiffelturm')).not.toBeInTheDocument();
    });
    
    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    
    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
      expect(screen.getByText('Eiffelturm')).toBeInTheDocument();
    });
    
    // Open advanced filters
    const filterButton = screen.getByRole('button', { name: /Filter/i });
    fireEvent.click(filterButton);
    
    await waitFor(() => {
      expect(screen.getByText('Erweiterte Filter')).toBeInTheDocument();
    });
    
    // Apply category filter
    const museumCheckbox = screen.getByLabelText('Museum');
    fireEvent.click(museumCheckbox);
    
    const applyButton = screen.getByRole('button', { name: /Filter anwenden/i });
    fireEvent.click(applyButton);
    
    // Should only show museum destinations
    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
      expect(screen.queryByText('Eiffelturm')).not.toBeInTheDocument(); // Assuming Eiffelturm is not a museum
    });
  });

  it('handles photo upload workflow', async () => {
    render(<App />);
    
    // Load mock data
    const loadMockDataButton = screen.getByRole('button', { name: /Mock-Daten laden/i });
    fireEvent.click(loadMockDataButton);
    
    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });
    
    // Open photo upload for first destination
    const photoButtons = screen.getAllByRole('button', { name: /Foto hinzufügen/i });
    fireEvent.click(photoButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('Fotos hochladen')).toBeInTheDocument();
    });
    
    // Mock file selection
    const fileInput = screen.getByLabelText('Fotos hochladen');
    const file = new File(['mock content'], 'test-photo.jpg', { type: 'image/jpeg' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('test-photo.jpg')).toBeInTheDocument();
    });
    
    // Upload photo
    const uploadButton = screen.getByRole('button', { name: /Hochladen/i });
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(screen.getByText('Upload erfolgreich')).toBeInTheDocument();
    });
  });

  it('handles budget tracking workflow', async () => {
    render(<App />);
    
    // Load mock data
    const loadMockDataButton = screen.getByRole('button', { name: /Mock-Daten laden/i });
    fireEvent.click(loadMockDataButton);
    
    await waitFor(() => {
      expect(screen.getByText('Europa Rundreise')).toBeInTheDocument();
    });
    
    // Go to budget view
    const budgetViewButton = screen.getByRole('button', { name: /Budget/i });
    fireEvent.click(budgetViewButton);
    
    await waitFor(() => {
      expect(screen.getByText('Budget-Verwaltung')).toBeInTheDocument();
    });
    
    // Check budget overview
    expect(screen.getByText(/€/)).toBeInTheDocument(); // Should show budget amounts
    
    // Go to expense tracking
    const expensesTab = screen.getByRole('tab', { name: /Ausgaben/i });
    fireEvent.click(expensesTab);
    
    await waitFor(() => {
      expect(screen.getByText('Ausgaben-Verfolgung')).toBeInTheDocument();
    });
    
    // Add new expense
    const addExpenseButton = screen.getByRole('button', { name: /Neue Ausgabe/i });
    fireEvent.click(addExpenseButton);
    
    await waitFor(() => {
      expect(screen.getByText('Ausgabe hinzufügen')).toBeInTheDocument();
    });
  });

  it('persists data across page reloads', async () => {
    render(<App />);
    
    // Load mock data
    const loadMockDataButton = screen.getByRole('button', { name: /Mock-Daten laden/i });
    fireEvent.click(loadMockDataButton);
    
    await waitFor(() => {
      expect(screen.getByText('Europa Rundreise')).toBeInTheDocument();
    });
    
    // Verify data is in localStorage
    const storedTrips = localStorage.getItem('vacation-planner-trips');
    expect(storedTrips).toBeTruthy();
    
    const trips = JSON.parse(storedTrips || '[]');
    expect(trips).toHaveLength(1);
    expect(trips[0].name).toBe('Europa Rundreise');
    
    // Simulate page reload by re-rendering
    const { rerender } = render(<App />);
    rerender(<App />);
    
    // Data should still be there
    await waitFor(() => {
      expect(screen.getByText('Europa Rundreise')).toBeInTheDocument();
    });
  });

  it('handles scheduling optimization workflow', async () => {
    render(<App />);
    
    // Load mock data
    const loadMockDataButton = screen.getByRole('button', { name: /Mock-Daten laden/i });
    fireEvent.click(loadMockDataButton);
    
    await waitFor(() => {
      expect(screen.getByText('Europa Rundreise')).toBeInTheDocument();
    });
    
    // Go to scheduling view
    const schedulingViewButton = screen.getByRole('button', { name: /Zeitplanung/i });
    fireEvent.click(schedulingViewButton);
    
    await waitFor(() => {
      expect(screen.getByText('Zeitplanung & Optimierung')).toBeInTheDocument();
    });
    
    // Go to optimizer
    const optimizerTab = screen.getByRole('tab', { name: /Optimierung/i });
    fireEvent.click(optimizerTab);
    
    await waitFor(() => {
      expect(screen.getByText('Zeitplan-Optimierung')).toBeInTheDocument();
    });
    
    // Run optimization
    const optimizeButton = screen.getByRole('button', { name: /Optimieren/i });
    fireEvent.click(optimizeButton);
    
    await waitFor(() => {
      expect(screen.getByText('Optimierung läuft...')).toBeInTheDocument();
    });
  });
});