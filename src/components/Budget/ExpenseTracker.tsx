import React, { useState, useMemo } from 'react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { useResponsive } from '../../hooks/useResponsive';
import { Destination, DestinationCategory } from '../../types';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Download,
  Receipt,
  Calendar,
  MapPin,
  Tag,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { formatCurrency, formatDate, formatTime, getCategoryLabel } from '../../utils';

interface Expense {
  id: string;
  destinationId: string;
  destinationName: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  date: string;
  time: string;
  paymentMethod: PaymentMethod;
  currency: string;
  tags: string[];
  receipt?: string;
  notes?: string;
}

type ExpenseCategory = 
  | 'accommodation' 
  | 'transport' 
  | 'food' 
  | 'activities' 
  | 'shopping' 
  | 'other';

type PaymentMethod = 'cash' | 'card' | 'online' | 'bank_transfer';

interface ExpenseTrackerProps {
  onAddExpense?: (expense: Expense) => void;
  onEditExpense?: (expense: Expense) => void;
  onDeleteExpense?: (expenseId: string) => void;
}

const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({
  onAddExpense,
  onEditExpense,
  onDeleteExpense
}) => {
  const { currentTrip, destinations, updateDestination } = useSupabaseApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'all'>('all');
  const [selectedDestination, setSelectedDestination] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const { isMobile } = useResponsive();

  // Get current trip destinations in the same order as EnhancedTimelineView
  const currentDestinations = useMemo(() => currentTrip 
    ? currentTrip.destinations
        .map(id => destinations.find(dest => dest.id === id))
        .filter((dest): dest is Destination => dest !== undefined)
    : [], [currentTrip, destinations]);

  // Expenses data - initially empty, will be populated from actual destination costs
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Form state for adding/editing expenses
  const [formData, setFormData] = useState({
    destinationId: '',
    amount: '',
    category: 'food' as ExpenseCategory,
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    paymentMethod: 'card' as PaymentMethod,
    currency: 'EUR',
    tags: '',
    notes: ''
  });

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      // Search filter
      if (searchQuery) {
        const searchTerm = searchQuery.toLowerCase();
        const matchesSearch = 
          expense.description.toLowerCase().includes(searchTerm) ||
          expense.destinationName.toLowerCase().includes(searchTerm) ||
          expense.tags.some(tag => tag.toLowerCase().includes(searchTerm));
        if (!matchesSearch) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && expense.category !== selectedCategory) {
        return false;
      }

      // Destination filter
      if (selectedDestination !== 'all' && expense.destinationId !== selectedDestination) {
        return false;
      }

      // Date range filter
      if (dateRange !== 'all') {
        const expenseDate = new Date(expense.date);
        const today = new Date();
        const daysDiff = Math.floor((today.getTime() - expenseDate.getTime()) / (1000 * 60 * 60 * 24));

        switch (dateRange) {
          case 'today':
            if (daysDiff !== 0) return false;
            break;
          case 'week':
            if (daysDiff > 7) return false;
            break;
          case 'month':
            if (daysDiff > 30) return false;
            break;
        }
      }

      return true;
    });
  }, [expenses, searchQuery, selectedCategory, selectedDestination, dateRange]);

  // Calculate expense statistics
  const expenseStats = useMemo(() => {
    const total = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const avgPerExpense = filteredExpenses.length > 0 ? total / filteredExpenses.length : 0;
    const categorySums = filteredExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<ExpenseCategory, number>);

    const topCategory = Object.entries(categorySums)
      .sort(([,a], [,b]) => b - a)[0];

    return {
      total,
      count: filteredExpenses.length,
      avgPerExpense,
      topCategory: topCategory ? { category: topCategory[0], amount: topCategory[1] } : null
    };
  }, [filteredExpenses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const expense: Expense = {
      id: editingExpense?.id || `exp_${Date.now()}`,
      destinationId: formData.destinationId,
      destinationName: currentDestinations.find(d => d.id === formData.destinationId)?.name || '',
      amount: parseFloat(formData.amount),
      category: formData.category,
      description: formData.description,
      date: formData.date,
      time: formData.time,
      paymentMethod: formData.paymentMethod,
      currency: formData.currency,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      notes: formData.notes || undefined
    };

    if (editingExpense) {
      setExpenses(prev => prev.map(exp => exp.id === editingExpense.id ? expense : exp));
      setEditingExpense(null);
      onEditExpense?.(expense);
    } else {
      setExpenses(prev => [...prev, expense]);
      onAddExpense?.(expense);
    }

    // Update destination actual cost
    const destination = currentDestinations.find(d => d.id === formData.destinationId);
    if (destination) {
      const destExpenses = expenses.filter(exp => exp.destinationId === formData.destinationId);
      const totalCost = destExpenses.reduce((sum, exp) => sum + exp.amount, 0) + expense.amount;
      updateDestination(destination.id, { actualCost: totalCost });
    }

    setFormData({
      destinationId: '',
      amount: '',
      category: 'food',
      description: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      paymentMethod: 'card',
      currency: 'EUR',
      tags: '',
      notes: ''
    });
    setShowAddForm(false);
  };

  const handleEdit = (expense: Expense) => {
    setFormData({
      destinationId: expense.destinationId,
      amount: expense.amount.toString(),
      category: expense.category,
      description: expense.description,
      date: expense.date,
      time: expense.time,
      paymentMethod: expense.paymentMethod,
      currency: expense.currency,
      tags: expense.tags.join(', '),
      notes: expense.notes || ''
    });
    setEditingExpense(expense);
    setShowAddForm(true);
  };

  const handleDelete = (expenseId: string) => {
    if (window.confirm('Möchten Sie diese Ausgabe wirklich löschen?')) {
      setExpenses(prev => prev.filter(exp => exp.id !== expenseId));
      onDeleteExpense?.(expenseId);
    }
  };

  const getExpenseCategoryIcon = (category: ExpenseCategory) => {
    switch (category) {
      case 'accommodation': return '🏨';
      case 'transport': return '🚗';
      case 'food': return '🍽️';
      case 'activities': return '🎯';
      case 'shopping': return '🛍️';
      case 'other': return '📦';
      default: return '💰';
    }
  };

  const getExpenseCategoryLabel = (category: ExpenseCategory) => {
    switch (category) {
      case 'accommodation': return 'Unterkunft';
      case 'transport': return 'Transport';
      case 'food': return 'Essen & Trinken';
      case 'activities': return 'Aktivitäten';
      case 'shopping': return 'Einkäufe';
      case 'other': return 'Sonstiges';
      default: return category;
    }
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'cash': return '💵';
      case 'card': return '💳';
      case 'online': return '📱';
      case 'bank_transfer': return '🏦';
      default: return '💰';
    }
  };

  if (!currentTrip) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
        padding: '3rem',
        color: 'var(--color-text-secondary)'
      }}>
        <Receipt size={48} style={{ opacity: 0.5 }} />
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Keine Reise ausgewählt</h2>
        <p style={{ margin: 0, textAlign: 'center' }}>
          Wählen Sie eine Reise aus, um Ausgaben zu verfolgen.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        marginBottom: isMobile ? '1.5rem' : '2rem',
        gap: isMobile ? '1rem' : 0
      }}>
        <div style={{ flex: isMobile ? 'none' : 1 }}>
          <h1 style={{
            margin: '0 0 0.5rem 0',
            fontSize: isMobile ? '1.5rem' : '2rem',
            fontWeight: 'bold',
            color: 'var(--color-text-primary)'
          }}>
            Ausgaben-Tracker
          </h1>
          <p style={{
            margin: 0,
            color: 'var(--color-text-secondary)',
            fontSize: isMobile ? '0.875rem' : '1rem',
            lineHeight: 1.4
          }}>
            {isMobile ? 'Ausgaben-Verfolgung' : 'Detaillierte Verfolgung aller Reiseausgaben'}
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          style={{
            background: 'var(--color-success)',
            color: 'var(--color-neutral-cream)',
            border: 'none',
            borderRadius: '8px',
            padding: isMobile ? '0.875rem 1.25rem' : '0.75rem 1.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            minHeight: isMobile ? '48px' : 'auto',
            width: isMobile ? '100%' : 'auto'
          }}
        >
          <Plus size={16} />
          {isMobile ? 'Hinzufügen' : 'Ausgabe hinzufügen'}
        </button>
      </div>

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: 'var(--color-neutral-cream)',
          border: '1px solid var(--color-neutral-mist)',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <DollarSign size={16} style={{ color: 'var(--color-primary-ocean)' }} />
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', fontWeight: '600' }}>
              Gesamtausgaben
            </span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            {formatCurrency(expenseStats.total)}
          </div>
        </div>

        <div style={{
          background: 'var(--color-neutral-cream)',
          border: '1px solid var(--color-neutral-mist)',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <Receipt size={16} style={{ color: 'var(--color-success)' }} />
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', fontWeight: '600' }}>
              Anzahl Ausgaben
            </span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            {expenseStats.count}
          </div>
        </div>

        <div style={{
          background: 'var(--color-neutral-cream)',
          border: '1px solid var(--color-neutral-mist)',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <TrendingUp size={16} style={{ color: '#d97706' }} />
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', fontWeight: '600' }}>
              Ø pro Ausgabe
            </span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            {formatCurrency(expenseStats.avgPerExpense)}
          </div>
        </div>

        {expenseStats.topCategory && (
          <div style={{
            background: 'var(--color-neutral-cream)',
            border: '1px solid var(--color-neutral-mist)',
            borderRadius: '8px',
            padding: '1rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <Tag size={16} style={{ color: '#7c3aed' }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', fontWeight: '600' }}>
                Top Kategorie
              </span>
            </div>
            <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              {getExpenseCategoryIcon(expenseStats.topCategory.category as ExpenseCategory)} {getExpenseCategoryLabel(expenseStats.topCategory.category as ExpenseCategory)}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              {formatCurrency(expenseStats.topCategory.amount)}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{
        background: 'var(--color-neutral-cream)',
        border: '1px solid var(--color-neutral-mist)',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          alignItems: 'end'
        }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af'
            }} />
            <input
              type="text"
              placeholder="Ausgaben suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.5rem 0.5rem 2.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              background: 'var(--color-neutral-cream)'
            }}
          >
            <option value="all">Alle Kategorien</option>
            <option value="accommodation">Unterkunft</option>
            <option value="transport">Transport</option>
            <option value="food">Essen & Trinken</option>
            <option value="activities">Aktivitäten</option>
            <option value="shopping">Einkäufe</option>
            <option value="other">Sonstiges</option>
          </select>

          {/* Destination Filter */}
          <select
            value={selectedDestination}
            onChange={(e) => setSelectedDestination(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              background: 'var(--color-neutral-cream)'
            }}
          >
            <option value="all">Alle Ziele</option>
            {currentDestinations.map(dest => (
              <option key={dest.id} value={dest.id}>
                {dest.name}
              </option>
            ))}
          </select>

          {/* Date Range Filter */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              background: 'var(--color-neutral-cream)'
            }}
          >
            <option value="all">Alle Daten</option>
            <option value="today">Heute</option>
            <option value="week">Letzte Woche</option>
            <option value="month">Letzter Monat</option>
          </select>
        </div>
      </div>

      {/* Expenses List */}
      <div style={{
        background: 'var(--color-neutral-cream)',
        border: '1px solid var(--color-neutral-mist)',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <div style={{
          background: '#f9fafb',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--color-neutral-mist)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '1.125rem',
            fontWeight: '600',
            color: 'var(--color-text-primary)'
          }}>
            Ausgaben ({filteredExpenses.length})
          </h3>

          <button
            style={{
              background: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '0.5rem',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem'
            }}
            title="Exportieren"
          >
            <Download size={14} />
            Export
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {filteredExpenses.length > 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {filteredExpenses.map(expense => (
                <div key={expense.id} style={{
                  background: '#f9fafb',
                  border: '1px solid var(--color-neutral-mist)',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem'
                  }}>
                    {/* Category Icon */}
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'var(--color-neutral-mist)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      flexShrink: 0
                    }}>
                      {getExpenseCategoryIcon(expense.category)}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        marginBottom: '0.5rem'
                      }}>
                        <div>
                          <h4 style={{
                            margin: '0 0 0.25rem 0',
                            fontSize: '1.125rem',
                            fontWeight: '600',
                            color: 'var(--color-text-primary)'
                          }}>
                            {expense.description}
                          </h4>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            fontSize: '0.875rem',
                            color: 'var(--color-text-secondary)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <MapPin size={12} />
                              <span>{expense.destinationName}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Calendar size={12} />
                              <span>{formatDate(expense.date)} • {expense.time}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <span>{getPaymentMethodIcon(expense.paymentMethod)}</span>
                              <span>{expense.paymentMethod}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <div style={{
                            fontSize: '1.25rem',
                            fontWeight: 'bold',
                            color: 'var(--color-text-primary)'
                          }}>
                            {formatCurrency(expense.amount)}
                          </div>

                          <div style={{
                            display: 'flex',
                            gap: '0.25rem'
                          }}>
                            <button
                              onClick={() => handleEdit(expense)}
                              style={{
                                background: 'transparent',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                padding: '0.25rem',
                                cursor: 'pointer',
                                color: 'var(--color-text-secondary)'
                              }}
                              title="Bearbeiten"
                            >
                              <Edit size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(expense.id)}
                              style={{
                                background: 'transparent',
                                border: '1px solid #fca5a5',
                                borderRadius: '4px',
                                padding: '0.25rem',
                                cursor: 'pointer',
                                color: '#ef4444'
                              }}
                              title="Löschen"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Tags and Category */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.5rem'
                      }}>
                        <span style={{
                          background: '#e0f2fe',
                          color: '#0891b2',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          {getExpenseCategoryLabel(expense.category)}
                        </span>

                        {expense.tags.map(tag => (
                          <span key={tag} style={{
                            background: '#f3f4f6',
                            color: '#374151',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem'
                          }}>
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Notes */}
                      {expense.notes && (
                        <p style={{
                          margin: 0,
                          fontSize: '0.875rem',
                          color: 'var(--color-text-secondary)',
                          fontStyle: 'italic'
                        }}>
                          {expense.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '1rem',
              padding: '3rem',
              color: '#9ca3af'
            }}>
              <Receipt size={48} style={{ opacity: 0.5 }} />
              <span style={{ fontSize: '1.125rem' }}>
                Keine Ausgaben gefunden
              </span>
              <span style={{ fontSize: '0.875rem' }}>
                Fügen Sie Ihre erste Ausgabe hinzu oder passen Sie die Filter an
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Expense Modal */}
      {showAddForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--color-neutral-cream)',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: '600',
                color: 'var(--color-text-primary)'
              }}>
                {editingExpense ? 'Ausgabe bearbeiten' : 'Neue Ausgabe'}
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingExpense(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                  fontSize: '1.5rem',
                  padding: '0.5rem'
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {/* Destination */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Ziel *
                </label>
                <select
                  required
                  value={formData.destinationId}
                  onChange={(e) => setFormData(prev => ({ ...prev, destinationId: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    background: 'var(--color-neutral-cream)'
                  }}
                >
                  <option value="">Ziel auswählen</option>
                  {currentDestinations.map(dest => (
                    <option key={dest.id} value={dest.id}>
                      {dest.name} - {dest.location}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Betrag *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                  placeholder="0.00"
                />
              </div>

              {/* Description */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Beschreibung *
                </label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                  placeholder="Was haben Sie gekauft?"
                />
              </div>

              {/* Category */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Kategorie
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as ExpenseCategory }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    background: 'var(--color-neutral-cream)'
                  }}
                >
                  <option value="accommodation">Unterkunft</option>
                  <option value="transport">Transport</option>
                  <option value="food">Essen & Trinken</option>
                  <option value="activities">Aktivitäten</option>
                  <option value="shopping">Einkäufe</option>
                  <option value="other">Sonstiges</option>
                </select>
              </div>

              {/* Date and Time */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Datum
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Uhrzeit
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Zahlungsart
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as PaymentMethod }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    background: 'var(--color-neutral-cream)'
                  }}
                >
                  <option value="cash">Bar</option>
                  <option value="card">Karte</option>
                  <option value="online">Online</option>
                  <option value="bank_transfer">Überweisung</option>
                </select>
              </div>

              {/* Tags */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Tags (kommagetrennt)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                  placeholder="restaurant, tourist, souvenir"
                />
              </div>

              {/* Notes */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Notizen
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                  placeholder="Zusätzliche Informationen..."
                />
              </div>

              {/* Submit Buttons */}
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                marginTop: '1rem'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingExpense(null);
                  }}
                  style={{
                    flex: 1,
                    background: 'var(--color-neutral-cream)',
                    color: 'var(--color-text-secondary)',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    background: 'var(--color-success)',
                    color: 'var(--color-neutral-cream)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}
                >
                  {editingExpense ? 'Speichern' : 'Hinzufügen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseTracker;