import React, { useMemo, useState } from 'react';
import { useApp } from '../../stores/AppContext';
import { Destination } from '../../types';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Target,
  AlertTriangle,
  Calendar,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Minus,
  Download
} from 'lucide-react';
import { formatCurrency, formatDate, getCategoryLabel, calculateTravelCosts } from '../../utils';

interface BudgetTrend {
  date: string;
  planned: number;
  actual: number;
  cumulative: number;
}

interface CategoryAnalysis {
  category: string;
  planned: number;
  actual: number;
  variance: number;
  variancePercent: number;
  destinations: number;
  avgPerDestination: number;
}

interface BudgetAnalysisProps {
  onExportData?: () => void;
}

const BudgetAnalysis: React.FC<BudgetAnalysisProps> = ({
  onExportData
}) => {
  const { currentTrip, destinations, settings } = useApp();
  const [analysisType, setAnalysisType] = useState<'overview' | 'category' | 'timeline' | 'forecast'>('overview');
  const [timeframe, setTimeframe] = useState<'all' | 'past' | 'upcoming'>('all');

  // Get current trip destinations
  const currentDestinations = currentTrip 
    ? destinations.filter(dest => currentTrip.destinations.includes(dest.id))
    : [];

  // Filter destinations by timeframe
  const filteredDestinations = useMemo(() => {
    if (timeframe === 'all') return currentDestinations;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return currentDestinations.filter(dest => {
      const destDate = new Date(dest.startDate);
      if (timeframe === 'past') {
        return destDate < today;
      } else {
        return destDate >= today;
      }
    });
  }, [currentDestinations, timeframe]);

  // Calculate budget variance
  const budgetVariance = useMemo(() => {
    const totalPlanned = currentTrip?.budget || 0;
    const totalActual = currentTrip?.actualCost || 0;
    const variance = totalActual - totalPlanned;
    const variancePercent = totalPlanned > 0 ? (variance / totalPlanned) * 100 : 0;

    const destinationPlanned = filteredDestinations.reduce((sum, dest) => sum + (dest.budget || 0), 0);
    const destinationActual = filteredDestinations.reduce((sum, dest) => sum + (dest.actualCost || 0), 0);
    
    return {
      total: {
        planned: totalPlanned,
        actual: totalActual,
        variance,
        variancePercent
      },
      destinations: {
        planned: destinationPlanned,
        actual: destinationActual,
        variance: destinationActual - destinationPlanned,
        variancePercent: destinationPlanned > 0 ? ((destinationActual - destinationPlanned) / destinationPlanned) * 100 : 0
      }
    };
  }, [currentTrip, filteredDestinations]);

  // Calculate travel costs based on settings configuration
  const travelCosts = useMemo(() => {
    return calculateTravelCosts(
      currentDestinations,
      settings.fuelConsumption,
      1.65 // Use fallback price - will be replaced by fuel price API in BudgetOverview
    );
  }, [currentDestinations, settings.fuelConsumption]);

  // Category analysis
  const categoryAnalysis = useMemo(() => {
    const categories = new Map<string, CategoryAnalysis>();

    filteredDestinations.forEach(dest => {
      const categoryKey = dest.category;
      const categoryLabel = getCategoryLabel(categoryKey);
      
      if (!categories.has(categoryKey)) {
        categories.set(categoryKey, {
          category: categoryLabel,
          planned: 0,
          actual: 0,
          variance: 0,
          variancePercent: 0,
          destinations: 0,
          avgPerDestination: 0
        });
      }

      const cat = categories.get(categoryKey)!;
      cat.planned += dest.budget || 0;
      cat.actual += dest.actualCost || 0;
      cat.destinations += 1;
    });

    // Calculate variance and averages
    categories.forEach(cat => {
      cat.variance = cat.actual - cat.planned;
      cat.variancePercent = cat.planned > 0 ? (cat.variance / cat.planned) * 100 : 0;
      cat.avgPerDestination = cat.destinations > 0 ? cat.actual / cat.destinations : 0;
    });

    return Array.from(categories.values()).sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
  }, [filteredDestinations]);

  // Budget trends over time
  const budgetTrends = useMemo(() => {
    const trends: BudgetTrend[] = [];
    const sortedDestinations = [...filteredDestinations].sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    let cumulativePlanned = 0;
    let cumulativeActual = 0;

    sortedDestinations.forEach(dest => {
      cumulativePlanned += dest.budget || 0;
      cumulativeActual += dest.actualCost || 0;

      trends.push({
        date: dest.startDate,
        planned: dest.budget || 0,
        actual: dest.actualCost || 0,
        cumulative: cumulativeActual
      });
    });

    return trends;
  }, [filteredDestinations]);

  // Budget forecast
  const budgetForecast = useMemo(() => {
    const totalWithTravel = budgetVariance.total.actual + travelCosts;
    const remaining = budgetVariance.total.planned - totalWithTravel;
    const upcomingDestinations = currentDestinations.filter(dest => 
      new Date(dest.startDate) >= new Date()
    );
    
    const upcomingPlanned = upcomingDestinations.reduce((sum, dest) => sum + (dest.budget || 0), 0);
    const avgSpendingRate = budgetVariance.destinations.actual / Math.max(1, 
      currentDestinations.filter(dest => new Date(dest.startDate) < new Date()).length
    );
    
    const forecastedTotal = totalWithTravel + (upcomingDestinations.length * avgSpendingRate);
    const projectedOverrun = Math.max(0, forecastedTotal - budgetVariance.total.planned);

    return {
      remaining,
      upcomingPlanned,
      avgSpendingRate,
      forecastedTotal,
      projectedOverrun,
      daysLeft: upcomingDestinations.length,
      dailyBudgetRemaining: upcomingDestinations.length > 0 ? remaining / upcomingDestinations.length : 0,
      totalWithTravel
    };
  }, [budgetVariance, currentDestinations, travelCosts]);

  // Get variance indicator
  const getVarianceIndicator = (variance: number, amount: number = 1) => {
    if (Math.abs(variance) < 0.01) {
      return { icon: <Minus size={16} />, color: '#6b7280', label: 'Ausgeglichen' };
    } else if (variance > 0) {
      return { icon: <ArrowUp size={16} />, color: '#dc2626', label: 'Über Budget' };
    } else {
      return { icon: <ArrowDown size={16} />, color: '#16a34a', label: 'Unter Budget' };
    }
  };

  const getPerformanceColor = (variancePercent: number) => {
    if (Math.abs(variancePercent) <= 5) return '#16a34a';
    if (Math.abs(variancePercent) <= 15) return '#d97706';
    return '#dc2626';
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
        <BarChart3 size={48} style={{ opacity: 0.5 }} />
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Keine Reise ausgewählt</h2>
        <p style={{ margin: 0, textAlign: 'center' }}>
          Wählen Sie eine Reise aus, um Budget-Analysen zu sehen.
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
            Budget-Analyse
          </h1>
          <p style={{
            margin: 0,
            color: '#6b7280',
            fontSize: '1rem'
          }}>
            Detaillierte Finanzanalyse und Prognosen
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center'
        }}>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              background: 'white'
            }}
          >
            <option value="all">Gesamte Reise</option>
            <option value="past">Vergangene Ausgaben</option>
            <option value="upcoming">Geplante Ausgaben</option>
          </select>

          {onExportData && (
            <button
              onClick={onExportData}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              <Download size={14} />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Analysis Type Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '2rem',
        borderBottom: '1px solid #e5e7eb'
      }}>
        {[
          { id: 'overview', label: 'Übersicht', icon: <DollarSign size={16} /> },
          { id: 'category', label: 'Kategorien', icon: <PieChart size={16} /> },
          { id: 'timeline', label: 'Zeitverlauf', icon: <TrendingUp size={16} /> },
          { id: 'forecast', label: 'Prognose', icon: <Target size={16} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setAnalysisType(tab.id as any)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: analysisType === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: analysisType === tab.id ? '600' : '500',
              color: analysisType === tab.id ? '#3b82f6' : '#6b7280',
              transition: 'all 0.2s'
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Analysis Content */}
      {analysisType === 'overview' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* Budget Performance */}
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
              <Target size={18} />
              Budget-Performance
            </h3>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {/* Total Budget */}
              <div style={{
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
                  <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
                    Gesamtbudget
                  </span>
                  {(() => {
                    const indicator = getVarianceIndicator(budgetVariance.total.variance);
                    return (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        color: indicator.color
                      }}>
                        {indicator.icon}
                        <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>
                          {indicator.label}
                        </span>
                      </div>
                    );
                  })()}
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: '#1f2937'
                  }}>
                    {formatCurrency(budgetVariance.total.actual)}
                  </span>
                  <span style={{
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    von {formatCurrency(budgetVariance.total.planned)}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.875rem'
                }}>
                  <span style={{
                    color: Math.abs(budgetVariance.total.variance) > 0 
                      ? (budgetVariance.total.variance > 0 ? '#dc2626' : '#16a34a')
                      : '#6b7280'
                  }}>
                    {budgetVariance.total.variance >= 0 ? '+' : ''}{formatCurrency(budgetVariance.total.variance)}
                  </span>
                  <span style={{
                    color: getPerformanceColor(budgetVariance.total.variancePercent),
                    fontWeight: '600'
                  }}>
                    {budgetVariance.total.variancePercent >= 0 ? '+' : ''}{budgetVariance.total.variancePercent.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Destination Budget */}
              <div style={{
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
                  <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
                    Ziele ({filteredDestinations.length})
                  </span>
                  {(() => {
                    const indicator = getVarianceIndicator(budgetVariance.destinations.variance);
                    return (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        color: indicator.color
                      }}>
                        {indicator.icon}
                        <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>
                          {indicator.label}
                        </span>
                      </div>
                    );
                  })()}
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: '#1f2937'
                  }}>
                    {formatCurrency(budgetVariance.destinations.actual)}
                  </span>
                  <span style={{
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    von {formatCurrency(budgetVariance.destinations.planned)}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.875rem'
                }}>
                  <span style={{
                    color: Math.abs(budgetVariance.destinations.variance) > 0 
                      ? (budgetVariance.destinations.variance > 0 ? '#dc2626' : '#16a34a')
                      : '#6b7280'
                  }}>
                    {budgetVariance.destinations.variance >= 0 ? '+' : ''}{formatCurrency(budgetVariance.destinations.variance)}
                  </span>
                  <span style={{
                    color: getPerformanceColor(budgetVariance.destinations.variancePercent),
                    fontWeight: '600'
                  }}>
                    {budgetVariance.destinations.variancePercent >= 0 ? '+' : ''}{budgetVariance.destinations.variancePercent.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Travel Costs */}
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ fontSize: '0.875rem', color: '#16a34a', fontWeight: '500' }}>
                    Fahrtkosten (geschätzt)
                  </span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    color: '#16a34a'
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>
                      0,30 €/km
                    </span>
                  </div>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: '#14532d'
                  }}>
                    {formatCurrency(travelCosts)}
                  </span>
                  <span style={{
                    fontSize: '0.875rem',
                    color: '#16a34a'
                  }}>
                    geschätzte Autokosten
                  </span>
                </div>

                <div style={{
                  fontSize: '0.75rem',
                  color: '#16a34a'
                }}>
                  Basiert auf realistischen Fahrtrouten zwischen Zielen
                </div>
              </div>
            </div>
          </div>

          {/* Top Spending Categories */}
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
              Top Ausgaben-Kategorien
            </h3>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              {categoryAnalysis.slice(0, 5).map((category, index) => (
                <div key={index} style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '0.75rem'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem'
                  }}>
                    <h4 style={{
                      margin: 0,
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#1f2937'
                    }}>
                      {category.category}
                    </h4>
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#1f2937'
                    }}>
                      {formatCurrency(category.actual)}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    color: '#6b7280'
                  }}>
                    <span>{category.destinations} Ziele</span>
                    <span style={{
                      color: getPerformanceColor(category.variancePercent),
                      fontWeight: '500'
                    }}>
                      {category.variancePercent >= 0 ? '+' : ''}{category.variancePercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {analysisType === 'category' && (
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
            color: '#1f2937'
          }}>
            Kategorien-Analyse
          </h3>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {categoryAnalysis.map((category, index) => (
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
                  marginBottom: '1rem'
                }}>
                  <h4 style={{
                    margin: 0,
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    {category.category}
                  </h4>
                  
                  {(() => {
                    const indicator = getVarianceIndicator(category.variance);
                    return (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: indicator.color
                      }}>
                        {indicator.icon}
                        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                          {category.variancePercent >= 0 ? '+' : ''}{category.variancePercent.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      Geplant
                    </div>
                    <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
                      {formatCurrency(category.planned)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      Ausgegeben
                    </div>
                    <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
                      {formatCurrency(category.actual)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      Differenz
                    </div>
                    <div style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: category.variance >= 0 ? '#dc2626' : '#16a34a'
                    }}>
                      {category.variance >= 0 ? '+' : ''}{formatCurrency(category.variance)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      Ø pro Ziel
                    </div>
                    <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
                      {formatCurrency(category.avgPerDestination)}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: '#e5e7eb',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{
                    width: category.planned > 0 ? `${Math.min((category.actual / category.planned) * 100, 100)}%` : '0%',
                    height: '100%',
                    background: getPerformanceColor(category.variancePercent),
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>

                <div style={{
                  fontSize: '0.75rem',
                  color: '#6b7280'
                }}>
                  {category.destinations} Ziele in dieser Kategorie
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysisType === 'timeline' && (
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
            color: '#1f2937'
          }}>
            Ausgaben-Zeitverlauf
          </h3>

          {budgetTrends.length > 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              {budgetTrends.map((trend, index) => (
                <div key={index} style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div style={{
                    width: '80px',
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    fontWeight: '500'
                  }}>
                    {formatDate(trend.date)}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      marginBottom: '0.5rem'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Geplant: </span>
                        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>
                          {formatCurrency(trend.planned)}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Ausgegeben: </span>
                        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>
                          {formatCurrency(trend.actual)}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Kumulativ: </span>
                        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>
                          {formatCurrency(trend.cumulative)}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar showing cumulative vs total budget */}
                    <div style={{
                      width: '100%',
                      height: '6px',
                      background: '#e5e7eb',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: budgetVariance.total.planned > 0 
                          ? `${Math.min((trend.cumulative / budgetVariance.total.planned) * 100, 100)}%` 
                          : '0%',
                        height: '100%',
                        background: trend.cumulative > budgetVariance.total.planned ? '#dc2626' : '#3b82f6',
                        borderRadius: '3px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>

                  <div style={{
                    fontSize: '0.75rem',
                    color: '#6b7280'
                  }}>
                    {budgetVariance.total.planned > 0 
                      ? `${((trend.cumulative / budgetVariance.total.planned) * 100).toFixed(1)}%`
                      : '0%'
                    }
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
              <Calendar size={24} style={{ opacity: 0.5 }} />
              <span>Keine Ausgaben-Daten verfügbar</span>
            </div>
          )}
        </div>
      )}

      {analysisType === 'forecast' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* Budget Forecast */}
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
              <Target size={18} />
              Budget-Prognose
            </h3>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#0891b2',
                  fontWeight: '600',
                  marginBottom: '0.5rem'
                }}>
                  Gesamtausgaben (inkl. Fahrtkosten)
                </div>
                <div style={{
                  fontSize: '1.75rem',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: '0.5rem'
                }}>
                  {formatCurrency(budgetForecast.totalWithTravel)}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#6b7280'
                }}>
                  Davon {formatCurrency(travelCosts)} Fahrtkosten
                </div>
              </div>

              <div style={{
                background: budgetForecast.remaining >= 0 ? '#f0fdf4' : '#fef2f2',
                border: budgetForecast.remaining >= 0 ? '1px solid #bbf7d0' : '1px solid #fca5a5',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  color: budgetForecast.remaining >= 0 ? '#16a34a' : '#dc2626',
                  fontWeight: '600',
                  marginBottom: '0.5rem'
                }}>
                  Verbleibendes Budget
                </div>
                <div style={{
                  fontSize: '1.75rem',
                  fontWeight: 'bold',
                  color: budgetForecast.remaining >= 0 ? '#16a34a' : '#dc2626',
                  marginBottom: '0.5rem'
                }}>
                  {formatCurrency(Math.abs(budgetForecast.remaining))}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#6b7280'
                }}>
                  {budgetForecast.remaining >= 0 ? 'Noch verfügbar' : 'Überausgabe'}
                </div>
              </div>

              <div style={{
                background: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#d97706',
                  fontWeight: '600',
                  marginBottom: '0.5rem'
                }}>
                  Prognostizierte Gesamtausgaben
                </div>
                <div style={{
                  fontSize: '1.75rem',
                  fontWeight: 'bold',
                  color: '#92400e',
                  marginBottom: '0.5rem'
                }}>
                  {formatCurrency(budgetForecast.forecastedTotal)}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#6b7280'
                }}>
                  Basierend auf bisherigem Ausgabenverhalten
                </div>
              </div>

              {budgetForecast.projectedOverrun > 0 && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem'
                  }}>
                    <AlertTriangle size={16} style={{ color: '#dc2626' }} />
                    <span style={{
                      fontSize: '0.875rem',
                      color: '#dc2626',
                      fontWeight: '600'
                    }}>
                      Erwartete Budgetüberschreitung
                    </span>
                  </div>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: '#dc2626',
                    marginBottom: '0.5rem'
                  }}>
                    {formatCurrency(budgetForecast.projectedOverrun)}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#991b1b'
                  }}>
                    Bei gleichbleibendem Ausgabenverhalten
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Spending Recommendations */}
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
              <TrendingUp size={18} />
              Empfehlungen
            </h3>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#16a34a',
                  fontWeight: '600',
                  marginBottom: '0.5rem'
                }}>
                  Empfohlenes Tagesbudget
                </div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#14532d',
                  marginBottom: '0.25rem'
                }}>
                  {formatCurrency(budgetForecast.dailyBudgetRemaining)}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#16a34a'
                }}>
                  Für die verbleibenden {budgetForecast.daysLeft} Ziele
                </div>
              </div>

              <div style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#374151',
                  fontWeight: '600',
                  marginBottom: '0.5rem'
                }}>
                  Bisherige Ausgaben pro Ziel
                </div>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: '#1f2937'
                }}>
                  {formatCurrency(budgetForecast.avgSpendingRate)}
                </div>
              </div>

              {/* Budget Tips */}
              <div style={{
                background: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#d97706',
                  fontWeight: '600',
                  marginBottom: '0.5rem'
                }}>
                  Budget-Tipps
                </div>
                <ul style={{
                  margin: 0,
                  paddingLeft: '1rem',
                  fontSize: '0.75rem',
                  color: '#92400e',
                  lineHeight: '1.5'
                }}>
                  {budgetForecast.projectedOverrun > 0 ? (
                    <>
                      <li>Reduzieren Sie optionale Ausgaben</li>
                      <li>Suchen Sie nach günstigeren Alternativen</li>
                      <li>Priorisieren Sie wichtige Aktivitäten</li>
                    </>
                  ) : (
                    <>
                      <li>Sie liegen gut im Budget!</li>
                      <li>Eventuelle Spielräume für Extras</li>
                      <li>Weiter so mit der Budgetkontrolle</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetAnalysis;