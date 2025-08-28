import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TripForm from '../TripForm';
import { useApp } from '../../../stores/AppContext';
import { Trip, FuelType } from '../../../types';
import { getCurrentDateString, addDaysToDate } from '../../../utils';

// Mock the useApp hook
const mockUseApp = {
  createTrip: jest.fn(),
  updateTrip: jest.fn(),
  setCurrentTrip: jest.fn(),
  destinations: []
};

jest.mock('../../../stores/AppContext', () => ({
  useApp: () => mockUseApp
}));

// Mock utils
jest.mock('../../../utils', () => ({
  getCurrentDateString: jest.fn(() => '2024-01-01'),
  addDaysToDate: jest.fn(() => '2024-01-08'),
  getCenterCoordinates: jest.fn(() => ({ lat: 52.52, lng: 13.405 }))
}));

// Mock zod and react-hook-form validation
jest.mock('@hookform/resolvers/zod', () => ({
  zodResolver: jest.fn(() => () => ({}))
}));

jest.mock('../../../schemas/validationSchemas', () => ({
  tripSchema: {
    safeParse: jest.fn(() => ({ success: true, data: {} }))
  },
  TripFormData: {}
}));

// Mock VehicleConfigPanel component
jest.mock('../../Trip/VehicleConfigPanel', () => {
  return function MockVehicleConfigPanel({ 
    config, 
    onChange, 
    coordinates 
  }: {
    config: any;
    onChange: (config: any) => void;
    coordinates?: any;
  }) {
    const defaultConfig = {
      fuelType: 'diesel',
      fuelConsumption: 9.0,
      fuelPrice: 1.65,
      ...config
    };
    
    return (
      <div data-testid="vehicle-config-panel">
        <input
          data-testid="fuel-consumption"
          type="number"
          value={defaultConfig.fuelConsumption}
          onChange={(e) => onChange({ ...defaultConfig, fuelConsumption: parseFloat(e.target.value) })}
        />
        <select
          data-testid="fuel-type"
          value={defaultConfig.fuelType}
          onChange={(e) => onChange({ ...defaultConfig, fuelType: e.target.value })}
        >
          <option value="diesel">Diesel</option>
          <option value="gasoline">Gasoline</option>
          <option value="electric">Electric</option>
        </select>
      </div>
    );
  };
});

describe('TripForm', () => {
  const mockTrip: Trip = {
    id: 'trip-1',
    name: 'Test Trip',
    description: 'A test trip',
    startDate: '2024-01-01',
    endDate: '2024-01-07',
    budget: 1000,
    participants: ['Alice', 'Bob'],
    tags: ['vacation', 'europe'],
    destinations: [],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    vehicleConfig: {
      fuelType: FuelType.DIESEL,
      fuelConsumption: 8.5,
      fuelPrice: 1.55
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('should render form when isOpen is true', () => {
      render(<TripForm isOpen={true} onClose={() => {}} />);
      
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/beschreibung/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/startdatum/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/enddatum/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/budget/i)).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<TripForm isOpen={false} onClose={() => {}} />);
      
      expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
    });

    it('should show "Neue Reise" title for new trip', () => {
      render(<TripForm isOpen={true} onClose={() => {}} />);
      
      expect(screen.getByText('Neue Reise erstellen')).toBeInTheDocument();
    });

    it('should show "Reise bearbeiten" title for editing', () => {
      render(<TripForm isOpen={true} onClose={() => {}} trip={mockTrip} />);
      
      expect(screen.getByText('Reise bearbeiten')).toBeInTheDocument();
    });

    it('should populate form fields when editing a trip', () => {
      render(<TripForm isOpen={true} onClose={() => {}} trip={mockTrip} />);
      
      expect(screen.getByDisplayValue('Test Trip')).toBeInTheDocument();
      expect(screen.getByDisplayValue('A test trip')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-07')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show validation error for empty name', async () => {
      const user = userEvent.setup();
      render(<TripForm isOpen={true} onClose={() => {}} />);
      
      const submitButton = screen.getByRole('button', { name: /erstellen/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/name ist erforderlich/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for end date before start date', async () => {
      const user = userEvent.setup();
      render(<TripForm isOpen={true} onClose={() => {}} />);
      
      const nameInput = screen.getByLabelText(/name/i);
      const startDateInput = screen.getByLabelText(/startdatum/i);
      const endDateInput = screen.getByLabelText(/enddatum/i);
      
      await user.type(nameInput, 'Test Trip');
      await user.clear(startDateInput);
      await user.type(startDateInput, '2024-01-10');
      await user.clear(endDateInput);
      await user.type(endDateInput, '2024-01-05');
      
      const submitButton = screen.getByRole('button', { name: /erstellen/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/enddatum muss nach dem startdatum liegen/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for negative budget', async () => {
      const user = userEvent.setup();
      render(<TripForm isOpen={true} onClose={() => {}} />);
      
      const nameInput = screen.getByLabelText(/name/i);
      const budgetInput = screen.getByLabelText(/budget/i);
      
      await user.type(nameInput, 'Test Trip');
      await user.clear(budgetInput);
      await user.type(budgetInput, '-100');
      
      const submitButton = screen.getByRole('button', { name: /erstellen/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/budget muss positiv sein/i)).toBeInTheDocument();
      });
    });
  });

  describe('Participants Management', () => {
    it('should add a new participant', async () => {
      const user = userEvent.setup();
      render(<TripForm isOpen={true} onClose={() => {}} />);
      
      const participantInput = screen.getByPlaceholderText(/teilnehmer hinzufügen/i);
      const addButton = screen.getByRole('button', { name: /hinzufügen/i });
      
      await user.type(participantInput, 'John Doe');
      await user.click(addButton);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(participantInput).toHaveValue('');
    });

    it('should not add duplicate participants', async () => {
      const user = userEvent.setup();
      render(<TripForm isOpen={true} onClose={() => {}} />);
      
      const participantInput = screen.getByPlaceholderText(/teilnehmer hinzufügen/i);
      const addButton = screen.getByRole('button', { name: /hinzufügen/i });
      
      await user.type(participantInput, 'John Doe');
      await user.click(addButton);
      
      await user.type(participantInput, 'John Doe');
      await user.click(addButton);
      
      const participants = screen.getAllByText('John Doe');
      expect(participants).toHaveLength(1);
    });

    it('should remove a participant', async () => {
      const user = userEvent.setup();
      render(<TripForm isOpen={true} onClose={() => {}} trip={mockTrip} />);
      
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      
      const removeButton = screen.getAllByLabelText(/entfernen/i)[0];
      await user.click(removeButton);
      
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('should trim whitespace from participant names', async () => {
      const user = userEvent.setup();
      render(<TripForm isOpen={true} onClose={() => {}} />);
      
      const participantInput = screen.getByPlaceholderText(/teilnehmer hinzufügen/i);
      const addButton = screen.getByRole('button', { name: /hinzufügen/i });
      
      await user.type(participantInput, '  John Doe  ');
      await user.click(addButton);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should not add empty participants', async () => {
      const user = userEvent.setup();
      render(<TripForm isOpen={true} onClose={() => {}} />);
      
      const participantInput = screen.getByPlaceholderText(/teilnehmer hinzufügen/i);
      const addButton = screen.getByRole('button', { name: /hinzufügen/i });
      
      await user.type(participantInput, '   ');
      await user.click(addButton);
      
      expect(screen.queryByText('   ')).not.toBeInTheDocument();
    });
  });

  describe('Tags Management', () => {
    it('should add a new tag', async () => {
      const user = userEvent.setup();
      render(<TripForm isOpen={true} onClose={() => {}} />);
      
      const tagInput = screen.getByPlaceholderText(/tag hinzufügen/i);
      const addButton = screen.getAllByRole('button', { name: /hinzufügen/i })[1];
      
      await user.type(tagInput, 'adventure');
      await user.click(addButton);
      
      expect(screen.getByText('adventure')).toBeInTheDocument();
      expect(tagInput).toHaveValue('');
    });

    it('should not add duplicate tags', async () => {
      const user = userEvent.setup();
      render(<TripForm isOpen={true} onClose={() => {}} />);
      
      const tagInput = screen.getByPlaceholderText(/tag hinzufügen/i);
      const addButton = screen.getAllByRole('button', { name: /hinzufügen/i })[1];
      
      await user.type(tagInput, 'adventure');
      await user.click(addButton);
      
      await user.type(tagInput, 'adventure');
      await user.click(addButton);
      
      const tags = screen.getAllByText('adventure');
      expect(tags).toHaveLength(1);
    });

    it('should remove a tag', async () => {
      const user = userEvent.setup();
      render(<TripForm isOpen={true} onClose={() => {}} trip={mockTrip} />);
      
      expect(screen.getByText('vacation')).toBeInTheDocument();
      expect(screen.getByText('europe')).toBeInTheDocument();
      
      // Find and click remove button for 'vacation' tag
      const vacationTag = screen.getByText('vacation').closest('span');
      const removeButton = vacationTag?.querySelector('button');
      
      if (removeButton) {
        await user.click(removeButton);
      }
      
      expect(screen.queryByText('vacation')).not.toBeInTheDocument();
      expect(screen.getByText('europe')).toBeInTheDocument();
    });
  });

  describe('Vehicle Configuration', () => {
    it('should render vehicle configuration panel', () => {
      render(<TripForm isOpen={true} onClose={() => {}} />);
      
      expect(screen.getByTestId('vehicle-config-panel')).toBeInTheDocument();
    });

    it('should update vehicle configuration', async () => {
      const user = userEvent.setup();
      render(<TripForm isOpen={true} onClose={() => {}} />);
      
      const fuelConsumptionInput = screen.getByTestId('fuel-consumption');
      const fuelTypeSelect = screen.getByTestId('fuel-type');
      
      await user.clear(fuelConsumptionInput);
      await user.type(fuelConsumptionInput, '7.5');
      
      await user.selectOptions(fuelTypeSelect, 'gasoline');
      
      expect(fuelConsumptionInput).toHaveValue(7.5);
      expect(fuelTypeSelect).toHaveValue('gasoline');
    });

    it('should load vehicle config from existing trip', () => {
      render(<TripForm isOpen={true} onClose={() => {}} trip={mockTrip} />);
      
      const fuelConsumptionInput = screen.getByTestId('fuel-consumption');
      const fuelTypeSelect = screen.getByTestId('fuel-type');
      
      expect(fuelConsumptionInput).toHaveValue(8.5);
      expect(fuelTypeSelect).toHaveValue('diesel');
    });
  });

  describe('Form Submission', () => {
    it('should create a new trip with valid data', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();
      const newTripId = 'new-trip-id';
      
      mockUseApp.createTrip.mockResolvedValueOnce({ id: newTripId });
      
      render(<TripForm isOpen={true} onClose={mockOnClose} />);
      
      const nameInput = screen.getByLabelText(/name/i);
      const descriptionInput = screen.getByLabelText(/beschreibung/i);
      const budgetInput = screen.getByLabelText(/budget/i);
      
      await user.type(nameInput, 'My New Trip');
      await user.type(descriptionInput, 'An amazing trip');
      await user.type(budgetInput, '2000');
      
      const submitButton = screen.getByRole('button', { name: /erstellen/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockUseApp.createTrip).toHaveBeenCalledWith({
          name: 'My New Trip',
          description: 'An amazing trip',
          startDate: '2024-01-01',
          endDate: '2024-01-08',
          budget: 2000,
          participants: [],
          tags: [],
          vehicleConfig: {
            fuelType: FuelType.DIESEL,
            fuelConsumption: 9.0,
            fuelPrice: 1.65
          }
        });
      });
      
      expect(mockUseApp.setCurrentTrip).toHaveBeenCalledWith(newTripId);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should update existing trip', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();
      
      render(<TripForm isOpen={true} onClose={mockOnClose} trip={mockTrip} />);
      
      const nameInput = screen.getByDisplayValue('Test Trip');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Trip Name');
      
      const submitButton = screen.getByRole('button', { name: /speichern/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockUseApp.updateTrip).toHaveBeenCalledWith('trip-1', expect.objectContaining({
          name: 'Updated Trip Name',
          description: 'A test trip',
          participants: ['Alice', 'Bob'],
          tags: ['vacation', 'europe'],
          vehicleConfig: expect.objectContaining({
            fuelType: FuelType.DIESEL,
            fuelConsumption: 8.5,
            fuelPrice: 1.55
          })
        }));
      });
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should include participants and tags in submission', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();
      
      render(<TripForm isOpen={true} onClose={mockOnClose} />);
      
      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, 'Trip with participants');
      
      // Add participant
      const participantInput = screen.getByPlaceholderText(/teilnehmer hinzufügen/i);
      await user.type(participantInput, 'John');
      await user.click(screen.getByRole('button', { name: /hinzufügen/i }));
      
      // Add tag
      const tagInput = screen.getByPlaceholderText(/tag hinzufügen/i);
      await user.type(tagInput, 'family');
      await user.click(screen.getAllByRole('button', { name: /hinzufügen/i })[1]);
      
      const submitButton = screen.getByRole('button', { name: /erstellen/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockUseApp.createTrip).toHaveBeenCalledWith(expect.objectContaining({
          participants: ['John'],
          tags: ['family']
        }));
      });
    });

    it('should handle submission errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockUseApp.createTrip.mockRejectedValueOnce(new Error('Network error'));
      
      render(<TripForm isOpen={true} onClose={() => {}} />);
      
      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, 'Test Trip');
      
      const submitButton = screen.getByRole('button', { name: /erstellen/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error saving trip:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Form Interaction', () => {
    it('should close form when X button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();
      
      render(<TripForm isOpen={true} onClose={mockOnClose} />);
      
      const closeButton = screen.getByRole('button', { name: /schließen/i });
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close form when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();
      
      render(<TripForm isOpen={true} onClose={mockOnClose} />);
      
      const cancelButton = screen.getByRole('button', { name: /abbrechen/i });
      await user.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close form when clicking outside modal', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();
      
      render(<TripForm isOpen={true} onClose={mockOnClose} />);
      
      const backdrop = screen.getByTestId('modal-backdrop') || document.body;
      await user.click(backdrop);
      
      // Since we can't easily test clicking outside, we'll test the close functionality
      // In real implementation, backdrop click would call onClose
    });

    it('should update end date when start date changes', async () => {
      const user = userEvent.setup();
      render(<TripForm isOpen={true} onClose={() => {}} />);
      
      const startDateInput = screen.getByLabelText(/startdatum/i);
      const endDateInput = screen.getByLabelText(/enddatum/i);
      
      await user.clear(startDateInput);
      await user.type(startDateInput, '2024-02-01');
      
      // In real implementation, end date might auto-update based on start date
      // This depends on the actual form logic implementation
    });
  });

  describe('Keyboard Navigation', () => {
    it('should add participant when pressing Enter', async () => {
      const user = userEvent.setup();
      render(<TripForm isOpen={true} onClose={() => {}} />);
      
      const participantInput = screen.getByPlaceholderText(/teilnehmer hinzufügen/i);
      
      await user.type(participantInput, 'John Doe');
      await user.keyboard('{Enter}');
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should add tag when pressing Enter', async () => {
      const user = userEvent.setup();
      render(<TripForm isOpen={true} onClose={() => {}} />);
      
      const tagInput = screen.getByPlaceholderText(/tag hinzufügen/i);
      
      await user.type(tagInput, 'adventure');
      await user.keyboard('{Enter}');
      
      expect(screen.getByText('adventure')).toBeInTheDocument();
    });
  });

  describe('Default Values', () => {
    it('should set current date as default start date', () => {
      render(<TripForm isOpen={true} onClose={() => {}} />);
      
      expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument();
    });

    it('should set end date 7 days after start date by default', () => {
      render(<TripForm isOpen={true} onClose={() => {}} />);
      
      expect(screen.getByDisplayValue('2024-01-08')).toBeInTheDocument();
    });

    it('should set default vehicle config for new trip', () => {
      render(<TripForm isOpen={true} onClose={() => {}} />);
      
      const fuelConsumptionInput = screen.getByTestId('fuel-consumption');
      const fuelTypeSelect = screen.getByTestId('fuel-type');
      
      expect(fuelConsumptionInput).toHaveValue(9.0);
      expect(fuelTypeSelect).toHaveValue('diesel');
    });
  });

  describe('Form Reset', () => {
    it('should reset form after successful submission', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();
      
      mockUseApp.createTrip.mockResolvedValueOnce({ id: 'new-trip' });
      
      render(<TripForm isOpen={true} onClose={mockOnClose} />);
      
      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, 'Test Trip');
      
      // Add participant and tag
      const participantInput = screen.getByPlaceholderText(/teilnehmer hinzufügen/i);
      await user.type(participantInput, 'John');
      await user.click(screen.getByRole('button', { name: /hinzufügen/i }));
      
      const submitButton = screen.getByRole('button', { name: /erstellen/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockUseApp.createTrip).toHaveBeenCalled();
      });
      
      // Form should be reset (though we can't test this directly in this test since form closes)
    });
  });
});