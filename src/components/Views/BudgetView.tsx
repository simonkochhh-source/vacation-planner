import React, { useState } from 'react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { 
  BudgetOverview, 
  ExpenseTracker
} from '../Budget';
import {
  DollarSign,
  Receipt,
  Target,
  Edit,
  AlertTriangle,
  Download
} from 'lucide-react';

type BudgetTab = 'overview' | 'expenses';

const BudgetView: React.FC = () => {
  const { currentTrip, destinations, updateTrip, updateDestination } = useSupabaseApp();
  const [activeTab, setActiveTab] = useState<BudgetTab>('overview');
  const [showBudgetForm, setShowBudgetForm] = useState(false);

  const tabs = [
    {
      id: 'overview' as BudgetTab,
      label: 'Übersicht',
      icon: <DollarSign size={18} />,
      description: 'Budget-Status und Gesamtübersicht'
    },
    {
      id: 'expenses' as BudgetTab,
      label: 'Ausgaben',
      icon: <Receipt size={18} />,
      description: 'Detaillierte Ausgabenverfolgung'
    },
  ];

  // Calculate quick stats
  const quickStats = React.useMemo(() => {
    if (!currentTrip) return null;

    const currentDestinations = destinations.filter(dest => 
      currentTrip.destinations.includes(dest.id)
    );

    const totalPlanned = currentTrip.budget || 0;
    const totalActual = currentTrip.actualCost || 0;
    const destinationsWithBudget = currentDestinations.filter(d => d.budget && d.budget > 0).length;
    const destinationsOverBudget = currentDestinations.filter(d => 
      d.budget && d.actualCost && d.actualCost > d.budget
    ).length;

    return {
      totalPlanned,
      totalActual,
      remaining: totalPlanned - totalActual,
      percentageUsed: totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0,
      destinationsWithBudget,
      destinationsOverBudget,
      isOverBudget: totalActual > totalPlanned && totalPlanned > 0
    };
  }, [currentTrip, destinations]);

  const handleExportData = () => {
    // Export budget data (placeholder)
    console.log('Exporting budget data...');
  };

  const handleEditBudget = (destination: any) => {
    // Open edit budget form (placeholder)
    console.log('Edit budget for:', destination.name);
  };

  const handleAddExpense = (destination: any) => {
    // Open add expense form (placeholder)
    console.log('Add expense for:', destination.name);
  };

  if (!currentTrip) {
    return (
      <div className="main-content centered-empty-state">
        <Target size={48} style={{ opacity: 0.5 }} />
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Keine Reise ausgewählt</h2>
        <p style={{ margin: 0, textAlign: 'center' }}>
          Wählen Sie eine Reise aus der Sidebar aus oder erstellen Sie eine neue Reise.
        </p>
      </div>
    );
  }

  return (
    <div className="main-content" style={{
      background: 'var(--color-neutral-cream)',
      minHeight: '100vh'
    }}>
      {/* Header with Tabs */}
      <div style={{
        background: 'var(--color-neutral-cream)',
        borderBottom: '1px solid var(--color-neutral-mist)',
        padding: '0 1.5rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '1rem',
          marginBottom: '1rem'
        }}>
          <div>
            <h1 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '1.875rem',
              fontWeight: '700',
              color: 'var(--color-text-primary)'
            }}>
              Budget-Verwaltung
            </h1>
            <p style={{
              margin: 0,
              fontSize: '1rem',
              color: 'var(--color-text-primary)'
            }}>
              {currentTrip.name} • Vollständige Kontrolle über Ihre Reisefinanzen
            </p>
          </div>

          {/* Quick Stats */}
          {quickStats && (
            <div style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'center'
            }}>
              <div style={{
                background: quickStats.isOverBudget ? 'rgba(220, 38, 38, 0.1)' : 'rgba(139, 195, 143, 0.1)',
                border: `1px solid ${quickStats.isOverBudget ? 'var(--color-error)' : 'var(--color-success)'}`,
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: quickStats.isOverBudget ? 'var(--color-error)' : 'var(--color-success)',
                  marginBottom: '0.25rem'
                }}>
                  {quickStats.percentageUsed.toFixed(0)}%
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-primary)'
                }}>
                  Budget genutzt
                </div>
              </div>

              {quickStats.destinationsOverBudget > 0 && (
                <div style={{
                  background: 'rgba(204, 139, 101, 0.1)',
                  border: '1px solid var(--color-warning)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} />
                  <div>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'var(--color-warning)'
                    }}>
                      {quickStats.destinationsOverBudget} Überschreitungen
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-secondary-sunset)'
                    }}>
                      Ziele über Budget
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleExportData}
                style={{
                  background: 'var(--color-primary-ocean)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
                title="Budget-Daten exportieren"
              >
                <Download size={16} />
                Export
              </button>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '1px'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--color-primary-ocean)' : '2px solid transparent',
                cursor: 'pointer',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: activeTab === tab.id ? '600' : '500',
                color: activeTab === tab.id ? 'var(--color-primary-ocean)' : 'var(--color-text-secondary)',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                minWidth: 'fit-content'
              }}
              title={tab.description}
              onMouseOver={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                }
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        background: 'var(--color-neutral-cream)'
      }}>
        {activeTab === 'overview' && (
          <BudgetOverview 
            onEditBudget={handleEditBudget}
            onAddExpense={handleAddExpense}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpenseTracker 
            onAddExpense={(expense) => {
              console.log('New expense added:', expense);
            }}
            onEditExpense={(expense) => {
              console.log('Expense edited:', expense);
            }}
            onDeleteExpense={(expenseId) => {
              console.log('Expense deleted:', expenseId);
            }}
          />
        )}

      </div>

      {/* Footer Info */}
      <div style={{
        background: 'var(--color-neutral-cream)',
        borderTop: '1px solid var(--color-neutral-mist)',
        padding: '1rem 1.5rem',
        fontSize: '0.875rem',
        color: 'var(--color-text-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          {activeTab === 'overview' && 'Gesamtübersicht über Budget und Ausgaben'}
          {activeTab === 'expenses' && 'Detaillierte Ausgabenverfolgung mit Kategorisierung'}
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          {quickStats && (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>Budget:</span>
                <span style={{ fontWeight: '500', color: 'var(--color-text-primary)' }}>
                  {((quickStats.totalActual / Math.max(quickStats.totalPlanned, 1)) * 100).toFixed(1)}% genutzt
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>Verbleibend:</span>
                <span style={{ 
                  fontWeight: '500', 
                  color: quickStats.remaining >= 0 ? 'var(--color-success)' : 'var(--color-error)' 
                }}>
                  {((quickStats.remaining / Math.max(quickStats.totalPlanned, 1)) * 100).toFixed(1)}%
                </span>
              </div>
            </>
          )}
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>Reise:</span>
            <span style={{ fontWeight: '500', color: 'var(--color-text-primary)' }}>
              {currentTrip.name}
            </span>
          </div>
        </div>
      </div>

      {/* Budget Form Modal (placeholder) */}
      {showBudgetForm && (
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
            width: '100%'
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
                Budget bearbeiten
              </h2>
              <button
                onClick={() => setShowBudgetForm(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-primary)',
                  fontSize: '1.5rem',
                  padding: '0.5rem'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
              color: 'var(--color-text-primary)'
            }}>
              Budget-Formular wird hier implementiert
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetView;