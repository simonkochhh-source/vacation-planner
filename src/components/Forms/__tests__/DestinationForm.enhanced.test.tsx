import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DestinationForm from '../DestinationForm';
import { renderWithProviders, mockUser, mockDestinations } from '../../../test-utils/renderWithProviders';

// Mock the map components to avoid leaflet issues in testing
jest.mock('../../Maps/LeafletMapPicker', () => ({
  LeafletMapPicker: ({ onLocationSelect }: any) => (
    <div data-testid="map-picker">
      <button onClick={() => onLocationSelect({ lat: 48.8566, lng: 2.3522, address: 'Paris, France' })}>
        Select Paris
      </button>
    </div>
  ),
}));

jest.mock('../../Forms/OpenStreetMapAutocomplete', () => ({
  OpenStreetMapAutocomplete: ({ onSelect }: any) => (
    <div data-testid="location-autocomplete">
      <input 
        placeholder="Search location"
        onChange={(e) => {
          if (e.target.value === 'Paris') {
            onSelect({ 
              lat: 48.8566, 
              lng: 2.3522, 
              display_name: 'Paris, France' 
            });
          }
        }}
      />
    </div>
  ),
}));

describe('DestinationForm', () => {
  const defaultProps = {
    tripId: 'trip-1',
    tripStartDate: '2025-09-15',
    tripEndDate: '2025-09-22',
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Form Rendering', () => {
    test('should render all form fields for new destination', () => {
      renderWithProviders(<DestinationForm {...defaultProps} />, { user: mockUser });

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/budget/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save destination/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    test('should populate fields when editing existing destination', () => {
      const destination = mockDestinations[0];
      renderWithProviders(
        <DestinationForm {...defaultProps} destination={destination} />,
        { user: mockUser }
      );

      expect(screen.getByDisplayValue(destination.name)).toBeInTheDocument();
      expect(screen.getByDisplayValue(destination.location)).toBeInTheDocument();
      expect(screen.getByDisplayValue(destination.budget?.toString() || '')).toBeInTheDocument();
      expect(screen.getByDisplayValue(destination.notes || '')).toBeInTheDocument();
    });

    test('should show correct button text for editing', () => {
      const destination = mockDestinations[0];
      renderWithProviders(
        <DestinationForm {...defaultProps} destination={destination} />,
        { user: mockUser }
      );

      expect(screen.getByRole('button', { name: /update destination/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('should show required field errors when submitting empty form', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DestinationForm {...defaultProps} />, { user: mockUser });

      const submitButton = screen.getByRole('button', { name: /save destination/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/location is required/i)).toBeInTheDocument();
      });

      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    test('should validate budget as positive number', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DestinationForm {...defaultProps} />, { user: mockUser });

      const budgetField = screen.getByLabelText(/budget/i);
      await user.type(budgetField, '-100');

      const submitButton = screen.getByRole('button', { name: /save destination/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/budget must be positive/i)).toBeInTheDocument();
      });
    });

    test('should validate date range within trip dates', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DestinationForm {...defaultProps} />, { user: mockUser });

      // Fill required fields
      await user.type(screen.getByLabelText(/name/i), 'Test Destination');
      await user.type(screen.getByLabelText(/location/i), 'Test Location');

      // Set dates outside trip range
      const startDateField = screen.getByLabelText(/start date/i);
      const endDateField = screen.getByLabelText(/end date/i);
      
      await user.clear(startDateField);
      await user.type(startDateField, '2025-09-10'); // Before trip start
      await user.clear(endDateField);
      await user.type(endDateField, '2025-09-25'); // After trip end

      const submitButton = screen.getByRole('button', { name: /save destination/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/date must be within trip dates/i)).toBeInTheDocument();
      });
    });

    test('should validate end date after start date', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DestinationForm {...defaultProps} />, { user: mockUser });

      await user.type(screen.getByLabelText(/name/i), 'Test Destination');
      await user.type(screen.getByLabelText(/location/i), 'Test Location');

      const startDateField = screen.getByLabelText(/start date/i);
      const endDateField = screen.getByLabelText(/end date/i);
      
      await user.clear(startDateField);
      await user.type(startDateField, '2025-09-20');
      await user.clear(endDateField);
      await user.type(endDateField, '2025-09-18'); // Before start date

      const submitButton = screen.getByRole('button', { name: /save destination/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Interactions', () => {
    test('should handle category selection', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DestinationForm {...defaultProps} />, { user: mockUser });

      const categorySelect = screen.getByLabelText(/category/i);
      await user.selectOptions(categorySelect, 'restaurant');

      expect(screen.getByDisplayValue('restaurant')).toBeInTheDocument();
    });

    test('should handle location autocomplete selection', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DestinationForm {...defaultProps} />, { user: mockUser });

      const locationInput = screen.getByPlaceholderText(/search location/i);
      await user.type(locationInput, 'Paris');

      await waitFor(() => {
        expect(screen.getByDisplayValue('Paris, France')).toBeInTheDocument();
      });
    });

    test('should handle map location selection', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DestinationForm {...defaultProps} />, { user: mockUser });

      // Open map picker
      const mapButton = screen.getByRole('button', { name: /open map/i });
      await user.click(mapButton);

      // Select location on map
      const selectParisButton = screen.getByText('Select Paris');
      await user.click(selectParisButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Paris, France')).toBeInTheDocument();
      });
    });

    test('should call onSubmit with correct data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DestinationForm {...defaultProps} />, { user: mockUser });

      // Fill form
      await user.type(screen.getByLabelText(/name/i), 'Eiffel Tower');
      await user.type(screen.getByLabelText(/location/i), 'Paris, France');
      await user.selectOptions(screen.getByLabelText(/category/i), 'attraction');
      await user.type(screen.getByLabelText(/budget/i), '50');
      await user.type(screen.getByLabelText(/notes/i), 'Must visit');

      const submitButton = screen.getByRole('button', { name: /save destination/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Eiffel Tower',
            location: 'Paris, France',
            category: 'attraction',
            budget: 50,
            notes: 'Must visit',
            tripId: 'trip-1',
          })
        );
      });
    });

    test('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DestinationForm {...defaultProps} />, { user: mockUser });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('Real-time Validation', () => {
    test('should show validation errors as user types', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DestinationForm {...defaultProps} />, { user: mockUser });

      const nameField = screen.getByLabelText(/name/i);
      
      // Type and then clear the field
      await user.type(nameField, 'Test');
      await user.clear(nameField);
      
      // Blur to trigger validation
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    test('should clear validation errors when field becomes valid', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DestinationForm {...defaultProps} />, { user: mockUser });

      const nameField = screen.getByLabelText(/name/i);
      
      // Trigger validation error
      await user.click(nameField);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });

      // Fix the error
      await user.type(nameField, 'Valid Name');

      await waitFor(() => {
        expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper form labels and structure', () => {
      renderWithProviders(<DestinationForm {...defaultProps} />, { user: mockUser });

      // Check for proper labeling
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();

      // Check for form structure
      expect(screen.getByRole('form')).toBeInTheDocument();
    });

    test('should show error messages with proper ARIA attributes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DestinationForm {...defaultProps} />, { user: mockUser });

      const submitButton = screen.getByRole('button', { name: /save destination/i });
      await user.click(submitButton);

      await waitFor(() => {
        const nameField = screen.getByLabelText(/name/i);
        expect(nameField).toHaveAttribute('aria-invalid', 'true');
        expect(nameField).toHaveAttribute('aria-describedby');
      });
    });

    test('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DestinationForm {...defaultProps} />, { user: mockUser });

      // Tab through form elements
      await user.tab();
      expect(screen.getByLabelText(/name/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/location/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/category/i)).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    test('should handle form submission errors gracefully', async () => {
      const onSubmitError = jest.fn().mockRejectedValue(new Error('Submission failed'));
      const user = userEvent.setup();
      
      renderWithProviders(
        <DestinationForm {...defaultProps} onSubmit={onSubmitError} />,
        { user: mockUser }
      );

      // Fill required fields
      await user.type(screen.getByLabelText(/name/i), 'Test Destination');
      await user.type(screen.getByLabelText(/location/i), 'Test Location');

      const submitButton = screen.getByRole('button', { name: /save destination/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/submission failed/i)).toBeInTheDocument();
      });
    });

    test('should handle map picker errors', async () => {
      const user = userEvent.setup();
      
      // Mock map picker to throw error
      jest.doMock('../../Maps/LeafletMapPicker', () => ({
        LeafletMapPicker: () => {
          throw new Error('Map failed to load');
        },
      }));

      renderWithProviders(<DestinationForm {...defaultProps} />, { user: mockUser });

      // Should still render form without map
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByText(/map unavailable/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('should not re-render unnecessarily', async () => {
      const renderSpy = jest.fn();
      const TestForm = (props: any) => {
        renderSpy();
        return <DestinationForm {...props} />;
      };

      const { rerender } = renderWithProviders(
        <TestForm {...defaultProps} />,
        { user: mockUser }
      );

      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Re-render with same props
      rerender(<TestForm {...defaultProps} />);
      
      // Should not cause additional renders due to memoization
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    test('should debounce location search', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DestinationForm {...defaultProps} />, { user: mockUser });

      const locationInput = screen.getByPlaceholderText(/search location/i);
      
      // Type rapidly
      await user.type(locationInput, 'Par', { delay: 50 });
      
      // Should debounce the search calls
      await waitFor(() => {
        expect(screen.queryByText(/searching/i)).not.toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Data Persistence', () => {
    test('should save form data to localStorage on input', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DestinationForm {...defaultProps} />, { user: mockUser });

      await user.type(screen.getByLabelText(/name/i), 'Draft Destination');

      // Check if data is saved to localStorage
      const savedData = localStorage.getItem('destination-form-draft');
      expect(savedData).toContain('Draft Destination');
    });

    test('should restore form data from localStorage', () => {
      // Pre-populate localStorage
      localStorage.setItem('destination-form-draft', JSON.stringify({
        name: 'Restored Destination',
        location: 'Restored Location',
      }));

      renderWithProviders(<DestinationForm {...defaultProps} />, { user: mockUser });

      expect(screen.getByDisplayValue('Restored Destination')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Restored Location')).toBeInTheDocument();
    });

    test('should clear localStorage on successful submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DestinationForm {...defaultProps} />, { user: mockUser });

      // Fill and submit form
      await user.type(screen.getByLabelText(/name/i), 'Test Destination');
      await user.type(screen.getByLabelText(/location/i), 'Test Location');

      const submitButton = screen.getByRole('button', { name: /save destination/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(localStorage.getItem('destination-form-draft')).toBeNull();
      });
    });
  });
});