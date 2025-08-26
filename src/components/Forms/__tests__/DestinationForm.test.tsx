import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../../test-utils';
import DestinationForm from '../DestinationForm';
import { DestinationCategory } from '../../../types';

describe('DestinationForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    isOpen: true,
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders create form correctly', () => {
    render(<DestinationForm {...defaultProps} />);
    
    expect(screen.getByText('Neues Ziel hinzufügen')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Ort')).toBeInTheDocument();
    expect(screen.getByLabelText('Kategorie')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hinzufügen/i })).toBeInTheDocument();
  });

  it('renders edit form correctly', () => {
    const destination = {
      id: 'dest-1',
      name: 'Test Destination',
      location: 'Test City',
      category: DestinationCategory.MUSEUM,
      startDate: '2024-01-01',
      endDate: '2024-01-01',
      startTime: '09:00',
      endTime: '17:00',
      tags: ['culture']
    };

    render(
      <DestinationForm 
        {...defaultProps} 
        destination={destination}
      />
    );
    
    expect(screen.getByText('Ziel bearbeiten')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Destination')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test City')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Speichern/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<DestinationForm {...defaultProps} />);
    
    const submitButton = screen.getByRole('button', { name: /Hinzufügen/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Name ist erforderlich')).toBeInTheDocument();
      expect(screen.getByText('Ort ist erforderlich')).toBeInTheDocument();
    });
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates date range', async () => {
    render(<DestinationForm {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Name');
    const locationInput = screen.getByLabelText('Ort');
    const startDateInput = screen.getByLabelText('Startdatum');
    const endDateInput = screen.getByLabelText('Enddatum');
    
    fireEvent.change(nameInput, { target: { value: 'Test Destination' } });
    fireEvent.change(locationInput, { target: { value: 'Test City' } });
    fireEvent.change(startDateInput, { target: { value: '2024-01-15' } });
    fireEvent.change(endDateInput, { target: { value: '2024-01-10' } }); // Earlier than start
    
    const submitButton = screen.getByRole('button', { name: /Hinzufügen/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Enddatum muss nach Startdatum liegen')).toBeInTheDocument();
    });
  });

  it('validates time range', async () => {
    render(<DestinationForm {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Name');
    const locationInput = screen.getByLabelText('Ort');
    const startDateInput = screen.getByLabelText('Startdatum');
    const endDateInput = screen.getByLabelText('Enddatum');
    const startTimeInput = screen.getByLabelText('Startzeit');
    const endTimeInput = screen.getByLabelText('Endzeit');
    
    fireEvent.change(nameInput, { target: { value: 'Test Destination' } });
    fireEvent.change(locationInput, { target: { value: 'Test City' } });
    fireEvent.change(startDateInput, { target: { value: '2024-01-15' } });
    fireEvent.change(endDateInput, { target: { value: '2024-01-15' } }); // Same day
    fireEvent.change(startTimeInput, { target: { value: '18:00' } });
    fireEvent.change(endTimeInput, { target: { value: '09:00' } }); // Earlier time
    
    const submitButton = screen.getByRole('button', { name: /Hinzufügen/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Endzeit muss nach Startzeit liegen')).toBeInTheDocument();
    });
  });

  it('submits valid form data', async () => {
    render(<DestinationForm {...defaultProps} />);
    
    // Fill required fields
    const nameInput = screen.getByLabelText('Name');
    const locationInput = screen.getByLabelText('Ort');
    const categorySelect = screen.getByLabelText('Kategorie');
    const startDateInput = screen.getByLabelText('Startdatum');
    const endDateInput = screen.getByLabelText('Enddatum');
    const startTimeInput = screen.getByLabelText('Startzeit');
    const endTimeInput = screen.getByLabelText('Endzeit');
    
    fireEvent.change(nameInput, { target: { value: 'Test Destination' } });
    fireEvent.change(locationInput, { target: { value: 'Test City' } });
    fireEvent.change(categorySelect, { target: { value: 'museum' } });
    fireEvent.change(startDateInput, { target: { value: '2024-01-15' } });
    fireEvent.change(endDateInput, { target: { value: '2024-01-15' } });
    fireEvent.change(startTimeInput, { target: { value: '09:00' } });
    fireEvent.change(endTimeInput, { target: { value: '17:00' } });
    
    const submitButton = screen.getByRole('button', { name: /Hinzufügen/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Test Destination',
        location: 'Test City',
        category: 'museum',
        startDate: '2024-01-15',
        endDate: '2024-01-15',
        startTime: '09:00',
        endTime: '17:00',
        tags: []
      });
    });
  });

  it('handles tag input correctly', async () => {
    render(<DestinationForm {...defaultProps} />);
    
    const tagInput = screen.getByLabelText('Tags');
    
    // Add tags
    fireEvent.change(tagInput, { target: { value: 'culture' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });
    
    fireEvent.change(tagInput, { target: { value: 'museum' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });
    
    expect(screen.getByText('culture')).toBeInTheDocument();
    expect(screen.getByText('museum')).toBeInTheDocument();
  });

  it('allows removing tags', () => {
    const destination = {
      id: 'dest-1',
      name: 'Test Destination',
      location: 'Test City',
      category: DestinationCategory.MUSEUM,
      tags: ['culture', 'history']
    };

    render(
      <DestinationForm 
        {...defaultProps} 
        destination={destination}
      />
    );
    
    expect(screen.getByText('culture')).toBeInTheDocument();
    expect(screen.getByText('history')).toBeInTheDocument();
    
    // Remove first tag
    const removeButton = screen.getAllByRole('button', { name: /Tag entfernen/i })[0];
    fireEvent.click(removeButton);
    
    expect(screen.queryByText('culture')).not.toBeInTheDocument();
    expect(screen.getByText('history')).toBeInTheDocument();
  });

  it('handles coordinates input', async () => {
    render(<DestinationForm {...defaultProps} />);
    
    // Enable coordinates input
    const useCoordinatesCheckbox = screen.getByLabelText('Koordinaten manuell eingeben');
    fireEvent.click(useCoordinatesCheckbox);
    
    const latInput = screen.getByLabelText('Breitengrad');
    const lngInput = screen.getByLabelText('Längengrad');
    
    fireEvent.change(latInput, { target: { value: '50.0' } });
    fireEvent.change(lngInput, { target: { value: '10.0' } });
    
    expect(latInput).toHaveValue(50);
    expect(lngInput).toHaveValue(10);
  });

  it('validates coordinate ranges', async () => {
    render(<DestinationForm {...defaultProps} />);
    
    const useCoordinatesCheckbox = screen.getByLabelText('Koordinaten manuell eingeben');
    fireEvent.click(useCoordinatesCheckbox);
    
    const latInput = screen.getByLabelText('Breitengrad');
    const lngInput = screen.getByLabelText('Längengrad');
    
    // Invalid latitude (> 90)
    fireEvent.change(latInput, { target: { value: '95' } });
    fireEvent.change(lngInput, { target: { value: '200' } }); // Invalid longitude (> 180)
    
    const submitButton = screen.getByRole('button', { name: /Hinzufügen/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Breitengrad muss zwischen -90 und 90 liegen')).toBeInTheDocument();
      expect(screen.getByText('Längengrad muss zwischen -180 und 180 liegen')).toBeInTheDocument();
    });
  });

  it('handles budget input', () => {
    render(<DestinationForm {...defaultProps} />);
    
    const budgetInput = screen.getByLabelText('Budget (€)');
    fireEvent.change(budgetInput, { target: { value: '150' } });
    
    expect(budgetInput).toHaveValue(150);
  });

  it('handles notes input', () => {
    render(<DestinationForm {...defaultProps} />);
    
    const notesInput = screen.getByLabelText('Notizen');
    fireEvent.change(notesInput, { target: { value: 'This is a test note' } });
    
    expect(notesInput).toHaveValue('This is a test note');
  });

  it('cancels form correctly', () => {
    render(<DestinationForm {...defaultProps} />);
    
    const cancelButton = screen.getByRole('button', { name: /Abbrechen/i });
    fireEvent.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('closes on escape key', () => {
    render(<DestinationForm {...defaultProps} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('does not render when closed', () => {
    render(<DestinationForm {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Neues Ziel hinzufügen')).not.toBeInTheDocument();
  });

  it('handles location search integration', async () => {
    // Mock the location search component
    render(<DestinationForm {...defaultProps} />);
    
    const locationInput = screen.getByLabelText('Ort');
    fireEvent.change(locationInput, { target: { value: 'Berlin' } });
    
    // Location search should trigger (mocked in test-utils)
    await waitFor(() => {
      expect(screen.getByDisplayValue('Berlin')).toBeInTheDocument();
    });
  });

  it('preserves form state when switching between tabs', () => {
    render(<DestinationForm {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'Test Name' } });
    
    // Switch to advanced tab
    const advancedTab = screen.getByRole('tab', { name: /Erweitert/i });
    fireEvent.click(advancedTab);
    
    // Switch back to basic tab
    const basicTab = screen.getByRole('tab', { name: /Grundlagen/i });
    fireEvent.click(basicTab);
    
    // Name should still be preserved
    expect(screen.getByDisplayValue('Test Name')).toBeInTheDocument();
  });

  it('shows loading state during submission', async () => {
    // Mock slow submission
    mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    render(<DestinationForm {...defaultProps} />);
    
    // Fill required fields quickly
    const nameInput = screen.getByLabelText('Name');
    const locationInput = screen.getByLabelText('Ort');
    fireEvent.change(nameInput, { target: { value: 'Test' } });
    fireEvent.change(locationInput, { target: { value: 'City' } });
    
    const submitButton = screen.getByRole('button', { name: /Hinzufügen/i });
    fireEvent.click(submitButton);
    
    // Should show loading state
    expect(screen.getByText('Wird gespeichert...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });
});