import React, { useMemo, useState, useEffect } from 'react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { Destination } from '../../types';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  PieChart,
  BarChart3,
  Target,
  Calendar,
  MapPin,
  Edit,
  Wallet
} from 'lucide-react';
import { formatCurrency, getCategoryLabel, formatDate, calculateTravelCosts } from '../../utils';
import { fuelPriceService } from '../../services/fuelPriceService';

interface CostCategory {
  category: string;
  totalCost: number;
  destinationCount: number;
  avgCostPerDestination: number;
  destinations: Destination[];
}

interface BudgetOverviewProps {
  onEditBudget?: (destination: Destination) => void;
  onAddExpense?: (destination: Destination) => void;
}

const BudgetOverview: React.FC<BudgetOverviewProps> = ({
  onEditBudget,
  onAddExpense
}) => {
  const { currentTrip, destinations, settings } = useSupabaseApp();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | 'upcoming' | 'past'>('all');
  const [groupBy, setGroupBy] = useState<'category' | 'date' | 'status'>('category');
  const [currentFuelPrice, setCurrentFuelPrice] = useState<number>(1.65);

  // Get current trip destinations in the same order as EnhancedTimelineView
  const currentDestinations = useMemo(() => currentTrip 
    ? currentTrip.destinations
        .map(id => destinations.find(dest => dest.id === id))
        .filter((dest): dest is Destination => dest !== undefined)
    : [], [currentTrip, destinations]);

  // Fetch current fuel price on component mount
  useEffect(() => {
    const fetchCurrentFuelPrice = async () => {
      try {
        if (fuelPriceService.isConfigured()) {
          const price = await fuelPriceService.getAverageFuelPrice(
            {
              lat: 50.1109, // Default to Germany center if no location
              lng: 8.6821
            },
            settings.fuelType,
            20 // 20km radius
          );
          setCurrentFuelPrice(price);
        }
      } catch (error) {
        console.warn('Could not fetch current fuel price, using fallback');
        // Keep the default value
      }
    };

    fetchCurrentFuelPrice();
  }, [settings.fuelType]);

  // Calculate budget statistics including travel costs
  const budgetStats = useMemo(() => {
    const totalPlanned = currentTrip?.budget || 0;
    // Calculate actual cost from destination data (same as EnhancedTimelineView)
    const totalActual = currentDestinations.reduce((sum, dest) => sum + (dest.actualCost || 0), 0);
    
    // Calculate travel costs based on settings configuration
    const travelCosts = calculateTravelCosts(
      currentDestinations,
      settings.fuelConsumption,
      currentFuelPrice
    );
    
    const destinationPlanned = currentDestinations.reduce((sum, dest) => 
      sum + (dest.budget || 0), 0);
    // destinationActual is same as totalActual since both come from destination data
    const destinationActual = totalActual;
    
    // Include travel costs in actual spending
    const totalActualWithTravel = totalActual + travelCosts;

    const remaining = totalPlanned - totalActualWithTravel;
    const percentageUsed = totalPlanned > 0 ? (totalActualWithTravel / totalPlanned) * 100 : 0;
    
    const avgCostPerDestination = currentDestinations.length > 0 
      ? destinationActual / currentDestinations.length 
      : 0;

    const destinationsWithBudget = currentDestinations.filter(d => d.budget && d.budget > 0);
    const destinationsOverBudget = currentDestinations.filter(d => 
      d.budget && d.actualCost && d.actualCost > d.budget);

    return {
      totalPlanned,
      totalActual: totalActualWithTravel,
      destinationPlanned,
      destinationActual,
      travelCosts,
      remaining,
      percentageUsed,
      avgCostPerDestination,
      destinationsWithBudget: destinationsWithBudget.length,
      destinationsOverBudget: destinationsOverBudget.length,
      isOverBudget: totalActualWithTravel > totalPlanned && totalPlanned > 0
    };
  }, [currentTrip, currentDestinations, settings.fuelConsumption, currentFuelPrice]);

  // Group destinations by category for cost analysis
  const costsByCategory = useMemo(() => {
    const categories = new Map<string, CostCategory>();
    

    currentDestinations.forEach(dest => {
      const categoryKey = dest.category;
      const categoryLabel = getCategoryLabel(categoryKey);
      
      if (!categories.has(categoryKey)) {
        categories.set(categoryKey, {
          category: categoryLabel,
          totalCost: 0,
          destinationCount: 0,
          avgCostPerDestination: 0,
          destinations: []
        });
      }

      const cat = categories.get(categoryKey)!;
      const destCost = dest.actualCost || 0;
      cat.totalCost += destCost;
      cat.destinationCount += 1;
      cat.destinations.push(dest);
    });

    // Calculate average cost per destination for each category
    categories.forEach(cat => {
      cat.avgCostPerDestination = cat.destinationCount > 0 ? cat.totalCost / cat.destinationCount : 0;
    });

    return Array.from(categories.values()).sort((a, b) => b.totalCost - a.totalCost);
  }, [currentDestinations]);

  // Get recent expenses (last 7 days)
  const recentExpenses = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return currentDestinations
      .filter(dest => dest.actualCost && dest.actualCost > 0)
      .filter(dest => new Date(dest.updatedAt) >= sevenDaysAgo)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [currentDestinations]);

  const getCategoryColor = (categoryKey: string) => {
    // Use the existing getCategoryColor function from utils but with fallback colors
    const colors: Record<string, string> = {
      'museum': '#8B5CF6',
      'restaurant': '#EF4444',
      'attraction': '#F59E0B',
      'hotel': '#3B82F6',
      'transport': '#6B7280',
      'nature': '#10B981',
      'entertainment': '#EC4899',
      'shopping': '#8B5CF6',
      'cultural': '#F97316',
      'sports': '#06B6D4',
      'other': '#6B7280'
    };
    return colors[categoryKey] || '#6B7280';
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
        color: '#6b7280'
      }}>
        <Wallet size={48} style={{ opacity: 0.5 }} />
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Keine Reise ausgewählt</h2>
        <p style={{ margin: 0, textAlign: 'center' }}>
          Wählen Sie eine Reise aus, um das Budget zu verwalten.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#1f2937'
          }}>
            Budget-Übersicht
          </h1>
          <p style={{
            margin: 0,
            color: '#6b7280',
            fontSize: '1rem'
          }}>
            {currentTrip.name} • Finanzielle Planung und Ausgabentracking
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center'
        }}>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              background: 'white'
            }}
          >
            <option value="category">Nach Kategorie</option>
            <option value="date">Nach Datum</option>
            <option value="status">Nach Status</option>
          </select>

          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as any)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              background: 'white'
            }}
          >
            <option value="all">Alle Ausgaben</option>
            <option value="upcoming">Geplant</option>
            <option value="past">Vergangen</option>
          </select>
        </div>
      </div>

      {/* Budget Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Total Budget */}
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '1.5rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100px',
            height: '100px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            borderRadius: '0 0 0 100px',
            opacity: 0.1
          }} />
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem',
            position: 'relative'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <DollarSign size={24} />
            </div>
            <div>
              <h3 style={{
                margin: '0 0 0.25rem 0',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#6b7280'
              }}>
                Gesamtbudget
              </h3>
              <div style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: '#1f2937'
              }}>
                {formatCurrency(budgetStats.totalPlanned)}
              </div>
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            <Target size={14} />
            <span>Geplant für {currentDestinations.length} Ziele</span>
          </div>
        </div>

        {/* Actual Spending */}
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '1.5rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100px',
            height: '100px',
            background: budgetStats.isOverBudget 
              ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
              : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            borderRadius: '0 0 0 100px',
            opacity: 0.1
          }} />
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem',
            position: 'relative'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: budgetStats.isOverBudget 
                ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
                : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              {budgetStats.isOverBudget ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
            </div>
            <div>
              <h3 style={{
                margin: '0 0 0.25rem 0',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#6b7280'
              }}>
                Ausgegeben
              </h3>
              <div style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: budgetStats.isOverBudget ? '#dc2626' : '#16a34a'
              }}>
                {formatCurrency(budgetStats.totalActual)}
              </div>
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            <BarChart3 size={14} />
            <span>{budgetStats.percentageUsed.toFixed(1)}% vom Budget</span>
          </div>
        </div>

        {/* Remaining Budget */}
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '1.5rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100px',
            height: '100px',
            background: budgetStats.remaining >= 0 
              ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
              : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            borderRadius: '0 0 0 100px',
            opacity: 0.1
          }} />
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem',
            position: 'relative'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: budgetStats.remaining >= 0 
                ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Wallet size={24} />
            </div>
            <div>
              <h3 style={{
                margin: '0 0 0.25rem 0',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#6b7280'
              }}>
                Verbleibendes Budget
              </h3>
              <div style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: budgetStats.remaining >= 0 ? '#16a34a' : '#dc2626'
              }}>
                {formatCurrency(Math.abs(budgetStats.remaining))}
              </div>
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            {budgetStats.remaining >= 0 ? (
              <>
                <TrendingUp size={14} />
                <span>Noch verfügbar</span>
              </>
            ) : (
              <>
                <AlertTriangle size={14} />
                <span>Überausgabe</span>
              </>
            )}
          </div>
        </div>

        {/* Travel Costs */}
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '1.5rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100px',
            height: '100px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            borderRadius: '0 0 0 100px',
            opacity: 0.1
          }} />
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem',
            position: 'relative'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              🚗
            </div>
            <div>
              <h3 style={{
                margin: '0 0 0.25rem 0',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#6b7280'
              }}>
                Fahrtkosten
              </h3>
              <div style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: '#1f2937'
              }}>
                {formatCurrency(budgetStats.travelCosts)}
              </div>
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            <MapPin size={14} />
            <span>{settings.fuelConsumption}L/100km • {formatCurrency(currentFuelPrice)}/L</span>
          </div>
        </div>
      </div>

      {/* Budget by Category */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Category Breakdown */}
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <h3 style={{
            margin: '0 0 1rem 0',
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#1f2937',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <PieChart size={18} />
            Kosten pro Kategorie
          </h3>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            {costsByCategory.map((category, index) => {
              const percentage = budgetStats.destinationActual > 0 
                ? (category.totalCost / budgetStats.destinationActual) * 100 
                : 0;
              const color = getCategoryColor(category.destinations[0]?.category || 'other');

              return (
                <div key={index} style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem'
                  }}>
                    <h4 style={{
                      margin: 0,
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#1f2937'
                    }}>
                      {category.category}
                    </h4>
                    <span style={{
                      background: color,
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>
                      {formatCurrency(category.totalCost)}
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#374151'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Gesamtkosten:</span>
                      <div style={{ fontWeight: '600', color: '#1f2937' }}>{formatCurrency(category.totalCost)}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Ø pro Ziel:</span>
                      <div style={{ fontWeight: '600', color: '#1f2937' }}>{formatCurrency(category.avgCostPerDestination)}</div>
                    </div>
                  </div>

                  {/* Cost Distribution Bar */}
                  <div style={{
                    width: '100%',
                    height: '6px',
                    background: '#e5e7eb',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{
                      width: `${percentage}%`,
                      height: '100%',
                      background: color,
                      borderRadius: '3px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    color: '#6b7280'
                  }}>
                    <span>{category.destinationCount} Ziele</span>
                    <span>{percentage.toFixed(1)}% der Gesamtkosten</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Expenses */}
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <h3 style={{
            margin: '0 0 1rem 0',
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#1f2937',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Calendar size={18} />
            Letzte Ausgaben
          </h3>

          {recentExpenses.length > 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              {recentExpenses.map(expense => (
                <div key={expense.id} style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ flex: 1 }}>
                    <h5 style={{
                      margin: '0 0 0.25rem 0',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#1f2937'
                    }}>
                      {expense.name}
                    </h5>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <MapPin size={10} />
                      <span>{expense.location}</span>
                      <span>•</span>
                      <span>{formatDate(expense.updatedAt)}</span>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: expense.actualCost && expense.budget && expense.actualCost > expense.budget ? '#dc2626' : '#374151'
                    }}>
                      {formatCurrency(expense.actualCost || 0)}
                    </div>
                    
                    {onEditBudget && (
                      <button
                        onClick={() => onEditBudget(expense)}
                        style={{
                          background: 'transparent',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          padding: '0.25rem',
                          cursor: 'pointer',
                          color: '#6b7280'
                        }}
                        title="Budget bearbeiten"
                      >
                        <Edit size={12} />
                      </button>
                    )}
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
              gap: '0.5rem',
              padding: '2rem',
              color: '#9ca3af'
            }}>
              <DollarSign size={24} style={{ opacity: 0.5 }} />
              <span style={{ fontSize: '0.875rem' }}>
                Keine aktuellen Ausgaben
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Budget Warnings */}
      {(budgetStats.isOverBudget || budgetStats.destinationsOverBudget > 0) && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <AlertTriangle size={20} style={{ color: '#dc2626' }} />
            <h4 style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: '600',
              color: '#dc2626'
            }}>
              Budget-Warnungen
            </h4>
          </div>
          
          <div style={{ fontSize: '0.875rem', color: '#991b1b' }}>
            {budgetStats.isOverBudget && (
              <p style={{ margin: '0 0 0.5rem 0' }}>
                • Das Gesamtbudget wurde um {formatCurrency(Math.abs(budgetStats.remaining))} überschritten
              </p>
            )}
            {budgetStats.destinationsOverBudget > 0 && (
              <p style={{ margin: 0 }}>
                • {budgetStats.destinationsOverBudget} Ziel(e) haben ihr Budget überschritten
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetOverview;