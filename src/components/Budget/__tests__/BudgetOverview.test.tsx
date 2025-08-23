import React from 'react';
import { render, screen, fireEvent } from '../../../test-utils';
import BudgetOverview from '../BudgetOverview';
import { useApp } from '../../../stores/AppContext';

jest.mock('../../../stores/AppContext', () => ({
  useApp: jest.fn()
}));

const mockUseApp = useApp as jest.MockedFunction<typeof useApp>;

const mockAppState = {
  trips: [
    {
      id: 'trip-1',
      name: 'Test Trip',
      destinations: ['dest-1', 'dest-2'],
      budget: 1000,
      actualCost: 750
    }
  ],
  destinations: [
    {
      id: 'dest-1',
      name: 'Museum Visit',
      category: 'museum',
      budget: 50,
      actualCost: 45,
      status: 'planned'
    },
    {
      id: 'dest-2',
      name: 'Restaurant Dinner',
      category: 'restaurant',
      budget: 100,
      actualCost: 120,
      status: 'visited'
    }
  ],
  currentTrip: {
    id: 'trip-1',
    name: 'Test Trip',
    destinations: ['dest-1', 'dest-2'],
    budget: 1000,
    actualCost: 750
  },
  uiState: {
    currentView: 'budget'
  },
  updateDestination: jest.fn(),
  createDestination: jest.fn(),
  deleteDestination: jest.fn()
};

describe('BudgetOverview', () => {
  const mockOnEditBudget = jest.fn();
  const mockOnAddExpense = jest.fn();

  beforeEach(() => {
    mockUseApp.mockReturnValue(mockAppState as any);
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <BudgetOverview 
        onEditBudget={mockOnEditBudget}
        onAddExpense={mockOnAddExpense}
      />
    );
    
    expect(screen.getByText('Budget-Übersicht')).toBeInTheDocument();
  });

  it('displays total budget correctly', () => {
    render(
      <BudgetOverview 
        onEditBudget={mockOnEditBudget}
        onAddExpense={mockOnAddExpense}
      />
    );
    
    expect(screen.getByText('€1.000')).toBeInTheDocument(); // Total budget
    expect(screen.getByText('€750')).toBeInTheDocument(); // Actual cost
  });

  it('shows budget progress correctly', () => {
    render(
      <BudgetOverview 
        onEditBudget={mockOnEditBudget}
        onAddExpense={mockOnAddExpense}
      />
    );
    
    // 750/1000 = 75% used
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('€250 verbleibend')).toBeInTheDocument();
  });

  it('displays destinations with their budgets', () => {
    render(
      <BudgetOverview 
        onEditBudget={mockOnEditBudget}
        onAddExpense={mockOnAddExpense}
      />
    );
    
    expect(screen.getByText('Museum Visit')).toBeInTheDocument();
    expect(screen.getByText('Restaurant Dinner')).toBeInTheDocument();
    expect(screen.getByText('€50')).toBeInTheDocument(); // Museum budget
    expect(screen.getByText('€45')).toBeInTheDocument(); // Museum actual cost
  });

  it('highlights over-budget destinations', () => {
    render(
      <BudgetOverview 
        onEditBudget={mockOnEditBudget}
        onAddExpense={mockOnAddExpense}
      />
    );
    
    // Restaurant is over budget (120 > 100)
    const overBudgetCard = screen.getByText('Restaurant Dinner').closest('[data-testid="destination-budget-card"]');
    expect(overBudgetCard).toHaveClass('over-budget');
  });

  it('shows category breakdown correctly', () => {
    render(
      <BudgetOverview 
        onEditBudget={mockOnEditBudget}
        onAddExpense={mockOnAddExpense}
      />
    );
    
    expect(screen.getByText('Museum')).toBeInTheDocument();
    expect(screen.getByText('Restaurant')).toBeInTheDocument();
  });

  it('calls onEditBudget when edit button is clicked', () => {
    render(
      <BudgetOverview 
        onEditBudget={mockOnEditBudget}
        onAddExpense={mockOnAddExpense}
      />
    );
    
    const editButton = screen.getAllByRole('button', { name: /Budget bearbeiten/i })[0];
    fireEvent.click(editButton);
    
    expect(mockOnEditBudget).toHaveBeenCalledWith(mockAppState.destinations[0]);
  });

  it('calls onAddExpense when add expense button is clicked', () => {
    render(
      <BudgetOverview 
        onEditBudget={mockOnEditBudget}
        onAddExpense={mockOnAddExpense}
      />
    );
    
    const addExpenseButton = screen.getAllByRole('button', { name: /Ausgabe hinzufügen/i })[0];
    fireEvent.click(addExpenseButton);
    
    expect(mockOnAddExpense).toHaveBeenCalledWith(mockAppState.destinations[0]);
  });

  it('shows warning when over total budget', () => {
    mockUseApp.mockReturnValue({
      ...mockAppState,
      currentTrip: {
        ...mockAppState.currentTrip,
        budget: 500, // Less than actual cost of 750
        actualCost: 750
      }
    } as any);

    render(
      <BudgetOverview 
        onEditBudget={mockOnEditBudget}
        onAddExpense={mockOnAddExpense}
      />
    );
    
    expect(screen.getByText(/Budget überschritten/i)).toBeInTheDocument();
  });

  it('handles empty state when no trip selected', () => {
    mockUseApp.mockReturnValue({
      ...mockAppState,
      currentTrip: undefined
    } as any);

    render(
      <BudgetOverview 
        onEditBudget={mockOnEditBudget}
        onAddExpense={mockOnAddExpense}
      />
    );
    
    expect(screen.getByText('Keine Reise ausgewählt')).toBeInTheDocument();
  });

  it('displays correct variance indicators', () => {
    render(
      <BudgetOverview 
        onEditBudget={mockOnEditBudget}
        onAddExpense={mockOnAddExpense}
      />
    );
    
    // Museum is under budget (45 < 50)
    expect(screen.getByText('-€5')).toBeInTheDocument();
    
    // Restaurant is over budget (120 > 100)
    expect(screen.getByText('+€20')).toBeInTheDocument();
  });

  it('shows statistics correctly', () => {
    render(
      <BudgetOverview 
        onEditBudget={mockOnEditBudget}
        onAddExpense={mockOnAddExpense}
      />
    );
    
    // Should show total destinations
    expect(screen.getByText('2 Ziele')).toBeInTheDocument();
    
    // Should show over-budget count
    expect(screen.getByText('1 über Budget')).toBeInTheDocument();
  });

  it('calculates average cost per day correctly', () => {
    mockUseApp.mockReturnValue({
      ...mockAppState,
      currentTrip: {
        ...mockAppState.currentTrip,
        startDate: '2024-01-01',
        endDate: '2024-01-07' // 7 days
      }
    } as any);

    render(
      <BudgetOverview 
        onEditBudget={mockOnEditBudget}
        onAddExpense={mockOnAddExpense}
      />
    );
    
    // 750 / 7 days ≈ 107
    expect(screen.getByText('€107/Tag')).toBeInTheDocument();
  });

  it('handles missing budget data gracefully', () => {
    mockUseApp.mockReturnValue({
      ...mockAppState,
      destinations: [
        {
          id: 'dest-1',
          name: 'No Budget Destination',
          category: 'other',
          // No budget or actualCost
          status: 'planned'
        }
      ]
    } as any);

    render(
      <BudgetOverview 
        onEditBudget={mockOnEditBudget}
        onAddExpense={mockOnAddExpense}
      />
    );
    
    expect(screen.getByText('No Budget Destination')).toBeInTheDocument();
    expect(screen.getByText('Kein Budget festgelegt')).toBeInTheDocument();
  });
});