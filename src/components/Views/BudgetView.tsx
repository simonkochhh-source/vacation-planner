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
    <div className="main-content">
      {/* Header with Tabs */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
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
            <h1 className="header-title">
              Budget-Verwaltung
            </h1>
            <p className="header-subtitle">
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
                background: quickStats.isOverBudget ? '#fef2f2' : '#f0fdf4',
                border: `1px solid ${quickStats.isOverBudget ? '#fca5a5' : '#bbf7d0'}`,
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: quickStats.isOverBudget ? '#dc2626' : '#16a34a',
                  marginBottom: '0.25rem'
                }}>
                  {quickStats.percentageUsed.toFixed(0)}%
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#6b7280'
                }}>
                  Budget genutzt
                </div>
              </div>

              {quickStats.destinationsOverBudget > 0 && (
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #fcd34d',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <AlertTriangle size={16} style={{ color: '#d97706' }} />
                  <div>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#d97706'
                    }}>
                      {quickStats.destinationsOverBudget} Überschreitungen
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#92400e'
                    }}>
                      Ziele über Budget
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleExportData}
                style={{
                  background: '#3b82f6',
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
                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                cursor: 'pointer',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: activeTab === tab.id ? '600' : '500',
                color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                minWidth: 'fit-content'
              }}
              title={tab.description}
              onMouseOver={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = '#374151';
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = '#6b7280';
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
        background: '#f9fafb'
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
        background: 'white',
        borderTop: '1px solid #e5e7eb',
        padding: '1rem 1.5rem',
        fontSize: '0.875rem',
        color: '#6b7280',
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
                <span style={{ fontWeight: '500', color: '#374151' }}>
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
                  color: quickStats.remaining >= 0 ? '#16a34a' : '#dc2626' 
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
            <span style={{ fontWeight: '500', color: '#374151' }}>
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
            background: 'white',
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
                color: '#1f2937'
              }}>
                Budget bearbeiten
              </h2>
              <button
                onClick={() => setShowBudgetForm(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
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
              color: '#9ca3af'
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