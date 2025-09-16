import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../../test-utils';
import AdvancedFilters from '../AdvancedFilters';
import { useApp } from '../../../stores/AppContext';
import { DestinationCategory, DestinationStatus } from '../../../types';

jest.mock('../../../stores/AppContext', () => ({
  useApp: jest.fn()
}));

const mockUseApp = useApp as jest.MockedFunction<typeof useApp>;

const mockAppState = {
  destinations: [
    {
      id: 'dest-1',
      name: 'Museum',
      category: DestinationCategory.MUSEUM,
      status: DestinationStatus.PLANNED,
      budget: 50,
      actualCost: 45,
      startDate: '2024-01-01',
      tags: ['culture', 'indoor']
    },
    {
      id: 'dest-2',
      name: 'Restaurant',
      category: DestinationCategory.RESTAURANT,
      status: DestinationStatus.VISITED,
      budget: 80,
      actualCost: 85,
      startDate: '2024-01-02',
      tags: ['food', 'evening']
    },
    {
      id: 'dest-3',
      name: 'Park',
      category: DestinationCategory.NATURE,
      status: DestinationStatus.PLANNED,
      budget: 0,
      actualCost: 0,
      startDate: '2024-01-03',
      tags: ['outdoor', 'free']
    }
  ],
  currentTrip: {
    id: 'trip-1',
    destinations: ['dest-1', 'dest-2', 'dest-3']
  },
  uiState: {
    filters: {
      category: undefined,
      status: undefined,
      tags: undefined,
      dateRange: undefined,
      budgetRange: undefined
    }
  },
  updateUIState: jest.fn()
};

describe('AdvancedFilters', () => {
  const mockOnClose = jest.fn();
  const mockOnApply = jest.fn();
  const mockOnReset = jest.fn();

  beforeEach(() => {
    mockUseApp.mockReturnValue(mockAppState as any);
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <AdvancedFilters />
    );
    
    expect(screen.getByText('Erweiterte Filter')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <AdvancedFilters
      />
    );
    
    expect(screen.queryByText('Erweiterte Filter')).not.toBeInTheDocument();
  });

  it('displays category filter options', () => {
    render(
      <AdvancedFilters
      />
    );
    
    expect(screen.getByText('Kategorien')).toBeInTheDocument();
    expect(screen.getByLabelText('Museum')).toBeInTheDocument();
    expect(screen.getByLabelText('Restaurant')).toBeInTheDocument();
    expect(screen.getByLabelText('Natur')).toBeInTheDocument();
  });

  it('displays status filter options', () => {
    render(
      <AdvancedFilters
      />
    );
    
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Geplant')).toBeInTheDocument();
    expect(screen.getByLabelText('Besucht')).toBeInTheDocument();
    expect(screen.getByLabelText('Übersprungen')).toBeInTheDocument();
  });


  it('displays budget range filter', () => {
    render(
      <AdvancedFilters
      />
    );
    
    expect(screen.getByText('Budget-Bereich')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Min €')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Max €')).toBeInTheDocument();
  });

  it('displays date range filter', () => {
    render(
      <AdvancedFilters
      />
    );
    
    expect(screen.getByText('Datumsbereich')).toBeInTheDocument();
    expect(screen.getByLabelText('Von')).toBeInTheDocument();
    expect(screen.getByLabelText('Bis')).toBeInTheDocument();
  });

  it('displays available tags', () => {
    render(
      <AdvancedFilters
      />
    );
    
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByLabelText('culture')).toBeInTheDocument();
    expect(screen.getByLabelText('indoor')).toBeInTheDocument();
    expect(screen.getByLabelText('food')).toBeInTheDocument();
    expect(screen.getByLabelText('evening')).toBeInTheDocument();
  });

  it('applies category filter correctly', async () => {
    render(
      <AdvancedFilters
      />
    );
    
    const museumCheckbox = screen.getByLabelText('Museum');
    fireEvent.click(museumCheckbox);
    
    const applyButton = screen.getByRole('button', { name: /Filter anwenden/i });
    fireEvent.click(applyButton);
    
    expect(mockOnApply).toHaveBeenCalledWith({
      category: [DestinationCategory.MUSEUM],
      status: undefined,
      tags: undefined,
      dateRange: undefined,
      budgetRange: undefined
    });
  });

  it('applies multiple filters correctly', async () => {
    render(
      <AdvancedFilters
      />
    );
    
    // Select category
    const museumCheckbox = screen.getByLabelText('Museum');
    fireEvent.click(museumCheckbox);
    
    // Select status
    const plannedCheckbox = screen.getByLabelText('Geplant');
    fireEvent.click(plannedCheckbox);
    
    
    // Set budget range
    const minBudgetInput = screen.getByPlaceholderText('Min €');
    const maxBudgetInput = screen.getByPlaceholderText('Max €');
    fireEvent.change(minBudgetInput, { target: { value: '20' } });
    fireEvent.change(maxBudgetInput, { target: { value: '100' } });
    
    const applyButton = screen.getByRole('button', { name: /Filter anwenden/i });
    fireEvent.click(applyButton);
    
    expect(mockOnApply).toHaveBeenCalledWith({
      category: [DestinationCategory.MUSEUM],
      status: [DestinationStatus.PLANNED],
      tags: undefined,
      dateRange: undefined,
      budgetRange: { min: 20, max: 100 }
    });
  });

  it('applies date range filter correctly', async () => {
    render(
      <AdvancedFilters
      />
    );
    
    const startDateInput = screen.getByLabelText('Von');
    const endDateInput = screen.getByLabelText('Bis');
    
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
    fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });
    
    const applyButton = screen.getByRole('button', { name: /Filter anwenden/i });
    fireEvent.click(applyButton);
    
    expect(mockOnApply).toHaveBeenCalledWith({
      category: undefined,
      status: undefined,
      tags: undefined,
      dateRange: {
        start: '2024-01-01',
        end: '2024-01-31'
      },
      budgetRange: undefined
    });
  });

  it('applies tag filter correctly', async () => {
    render(
      <AdvancedFilters
      />
    );
    
    const cultureTag = screen.getByLabelText('culture');
    const outdoorTag = screen.getByLabelText('outdoor');
    
    fireEvent.click(cultureTag);
    fireEvent.click(outdoorTag);
    
    const applyButton = screen.getByRole('button', { name: /Filter anwenden/i });
    fireEvent.click(applyButton);
    
    expect(mockOnApply).toHaveBeenCalledWith({
      category: undefined,
      status: undefined,
      tags: ['culture', 'outdoor'],
      dateRange: undefined,
      budgetRange: undefined
    });
  });

  it('resets filters when reset button is clicked', () => {
    render(
      <AdvancedFilters
      />
    );
    
    const resetButton = screen.getByRole('button', { name: /Zurücksetzen/i });
    fireEvent.click(resetButton);
    
    expect(mockOnReset).toHaveBeenCalled();
  });

  it('closes when close button is clicked', () => {
    render(
      <AdvancedFilters
      />
    );
    
    const closeButton = screen.getByRole('button', { name: /Schließen/i });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('loads existing filters correctly', () => {
    mockUseApp.mockReturnValue({
      ...mockAppState,
      uiState: {
        filters: {
          category: [DestinationCategory.MUSEUM],
          status: [DestinationStatus.PLANNED],
              tags: ['culture'],
          dateRange: {
            start: '2024-01-01',
            end: '2024-01-31'
          },
          budgetRange: {
            min: 20,
            max: 100
          }
        }
      }
    } as any);

    render(
      <AdvancedFilters
      />
    );
    
    // Check that existing filters are pre-selected
    expect(screen.getByLabelText('Museum')).toBeChecked();
    expect(screen.getByLabelText('Geplant')).toBeChecked();
    expect(screen.getByLabelText('culture')).toBeChecked();
    expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2024-01-31')).toBeInTheDocument();
    expect(screen.getByDisplayValue('20')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
  });

  it('shows active filter count', () => {
    mockUseApp.mockReturnValue({
      ...mockAppState,
      uiState: {
        filters: {
          category: [DestinationCategory.MUSEUM],
          status: [DestinationStatus.PLANNED],
              tags: ['culture'],
          dateRange: undefined,
          budgetRange: undefined
        }
      }
    } as any);

    render(
      <AdvancedFilters
      />
    );
    
    // Should show count of active filters (category, status, tags = 3)
    expect(screen.getByText('3 Filter aktiv')).toBeInTheDocument();
  });

  it('validates budget range input', async () => {
    render(
      <AdvancedFilters
      />
    );
    
    const minBudgetInput = screen.getByPlaceholderText('Min €');
    const maxBudgetInput = screen.getByPlaceholderText('Max €');
    
    // Set max < min (invalid)
    fireEvent.change(minBudgetInput, { target: { value: '100' } });
    fireEvent.change(maxBudgetInput, { target: { value: '50' } });
    
    const applyButton = screen.getByRole('button', { name: /Filter anwenden/i });
    fireEvent.click(applyButton);
    
    expect(screen.getByText('Maximaler Betrag muss größer als minimaler Betrag sein')).toBeInTheDocument();
  });

  it('validates date range input', async () => {
    render(
      <AdvancedFilters
      />
    );
    
    const startDateInput = screen.getByLabelText('Von');
    const endDateInput = screen.getByLabelText('Bis');
    
    // Set end date before start date (invalid)
    fireEvent.change(startDateInput, { target: { value: '2024-01-31' } });
    fireEvent.change(endDateInput, { target: { value: '2024-01-01' } });
    
    const applyButton = screen.getByRole('button', { name: /Filter anwenden/i });
    fireEvent.click(applyButton);
    
    expect(screen.getByText('Enddatum muss nach Startdatum liegen')).toBeInTheDocument();
  });
});