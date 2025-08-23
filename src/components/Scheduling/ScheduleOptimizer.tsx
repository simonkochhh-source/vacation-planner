import React, { useState, useMemo } from 'react';
import { useApp } from '../../stores/AppContext';
import { Destination } from '../../types';
import {
  Zap,
  Route,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Settings,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { formatTime, formatDate } from '../../utils';

interface OptimizationResult {
  originalOrder: Destination[];
  optimizedOrder: Destination[];
  improvements: {
    totalTravelTimeReduced: number;
    conflictsResolved: number;
    efficiencyGain: number;
  };
  suggestions: OptimizationSuggestion[];
}

interface OptimizationSuggestion {
  type: 'reorder' | 'time_adjustment' | 'split_day' | 'add_break';
  title: string;
  description: string;
  destinations: string[];
  impact: 'low' | 'medium' | 'high';
  timeSaved?: number;
}

interface ScheduleOptimizerProps {
  onApplyOptimization?: (optimizedDestinations: Destination[]) => void;
}

const ScheduleOptimizer: React.FC<ScheduleOptimizerProps> = ({
  onApplyOptimization
}) => {
  const { currentTrip, destinations, updateDestination } = useApp();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [optimizationSettings, setOptimizationSettings] = useState({
    prioritizeProximity: true,
    minimizeBacktracking: true,
    respectOpeningHours: true,
    addTravelBuffers: true,
    preferMorningStart: true,
    maxDailyHours: 10
  });

  // Get current trip destinations
  const currentDestinations = currentTrip 
    ? destinations.filter(dest => currentTrip.destinations.includes(dest.id))
    : [];

  // Calculate travel time between two destinations (simplified)
  const calculateTravelTime = (from: Destination, to: Destination): number => {
    if (!from.coordinates || !to.coordinates) return 30; // Default 30 minutes
    
    const lat1 = from.coordinates.lat;
    const lon1 = from.coordinates.lng;
    const lat2 = to.coordinates.lat;
    const lon2 = to.coordinates.lng;
    
    // Haversine formula for distance
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    // Estimate travel time: 40 km/h average speed + 5 minutes base time
    return Math.round(distance / 40 * 60 + 5);
  };

  // Detect time conflicts
  const detectConflicts = (destinations: Destination[]): number => {
    let conflicts = 0;
    for (let i = 0; i < destinations.length - 1; i++) {
      for (let j = i + 1; j < destinations.length; j++) {
        const dest1 = destinations[i];
        const dest2 = destinations[j];
        
        if (dest1.startDate !== dest2.startDate) continue;
        
        const start1 = new Date(`${dest1.startDate}T${dest1.startTime}`);
        const end1 = new Date(`${dest1.endDate}T${dest1.endTime}`);
        const start2 = new Date(`${dest2.startDate}T${dest2.startTime}`);
        const end2 = new Date(`${dest2.endDate}T${dest2.endTime}`);

        if (start1 < end2 && start2 < end1) {
          conflicts++;
        }
      }
    }
    return conflicts;
  };

  // Optimize schedule using various algorithms
  const optimizeSchedule = async (): Promise<OptimizationResult> => {
    setIsOptimizing(true);
    
    // Simulate optimization process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const originalOrder = [...currentDestinations];
    let optimizedOrder = [...currentDestinations];
    const suggestions: OptimizationSuggestion[] = [];

    // Group by date
    const destinationsByDate = new Map<string, Destination[]>();
    originalOrder.forEach(dest => {
      const date = dest.startDate;
      if (!destinationsByDate.has(date)) {
        destinationsByDate.set(date, []);
      }
      destinationsByDate.get(date)!.push(dest);
    });

    // Optimize each day separately
    const optimizedDestinations: Destination[] = [];
    let totalTravelTimeReduced = 0;
    
    for (const [date, dayDestinations] of Array.from(destinationsByDate.entries())) {
      // Sort by geographical proximity (simplified TSP-like approach)
      if (optimizationSettings.prioritizeProximity && dayDestinations.length > 2) {
        const sorted = [...dayDestinations];
        
        // Simple nearest neighbor algorithm
        const optimized = [sorted.shift()!];
        while (sorted.length > 0) {
          const current = optimized[optimized.length - 1];
          let nearestIndex = 0;
          let minDistance = Infinity;
          
          sorted.forEach((dest, index) => {
            const travelTime = calculateTravelTime(current, dest);
            if (travelTime < minDistance) {
              minDistance = travelTime;
              nearestIndex = index;
            }
          });
          
          optimized.push(sorted.splice(nearestIndex, 1)[0]);
        }

        // Calculate time savings
        const originalTravelTime = dayDestinations.reduce((sum: number, dest: Destination, index: number) => {
          if (index === 0) return sum;
          return sum + calculateTravelTime(dayDestinations[index - 1], dest);
        }, 0);

        const optimizedTravelTime = optimized.reduce((sum: number, dest: Destination, index: number) => {
          if (index === 0) return sum;
          return sum + calculateTravelTime(optimized[index - 1], dest);
        }, 0);

        totalTravelTimeReduced += originalTravelTime - optimizedTravelTime;

        if (optimizedTravelTime < originalTravelTime) {
          suggestions.push({
            type: 'reorder',
            title: `Reihenfolge für ${formatDate(date)} optimiert`,
            description: `Reisezeit um ${originalTravelTime - optimizedTravelTime} Minuten reduziert`,
            destinations: optimized.map(d => d.name),
            impact: 'high',
            timeSaved: originalTravelTime - optimizedTravelTime
          });
        }

        optimizedDestinations.push(...optimized);
      } else {
        optimizedDestinations.push(...dayDestinations);
      }

      // Check for time conflicts and suggest adjustments
      const sortedByTime = dayDestinations.sort((a: Destination, b: Destination) => {
        const timeA = new Date(`${a.startDate}T${a.startTime}`);
        const timeB = new Date(`${b.startDate}T${b.startTime}`);
        return timeA.getTime() - timeB.getTime();
      });

      for (let i = 0; i < sortedByTime.length - 1; i++) {
        const current = sortedByTime[i];
        const next = sortedByTime[i + 1];
        
        const currentEnd = new Date(`${current.endDate}T${current.endTime}`);
        const nextStart = new Date(`${next.startDate}T${next.startTime}`);
        const travelTime = calculateTravelTime(current, next);
        const requiredEnd = new Date(nextStart.getTime() - travelTime * 60000);

        if (currentEnd > requiredEnd) {
          suggestions.push({
            type: 'time_adjustment',
            title: 'Zeitanpassung erforderlich',
            description: `${current.name} sollte früher enden oder ${next.name} später beginnen`,
            destinations: [current.name, next.name],
            impact: 'medium'
          });
        }
      }

      // Suggest breaks for long days
      const dayDuration = dayDestinations.reduce((sum: number, dest: Destination) => sum + dest.duration, 0);
      if (dayDuration > optimizationSettings.maxDailyHours * 60) {
        suggestions.push({
          type: 'split_day',
          title: 'Tag ist zu vollgepackt',
          description: `${Math.round(dayDuration/60)}h geplant, max. ${optimizationSettings.maxDailyHours}h empfohlen`,
          destinations: dayDestinations.map((d: Destination) => d.name),
          impact: 'high'
        });
      }
    }

    const originalConflicts = detectConflicts(originalOrder);
    const optimizedConflicts = detectConflicts(optimizedDestinations);
    const conflictsResolved = originalConflicts - optimizedConflicts;

    setIsOptimizing(false);

    return {
      originalOrder,
      optimizedOrder: optimizedDestinations,
      improvements: {
        totalTravelTimeReduced,
        conflictsResolved,
        efficiencyGain: totalTravelTimeReduced > 0 ? Math.round((totalTravelTimeReduced / 60) * 100) / 100 : 0
      },
      suggestions
    };
  };

  const handleOptimize = async () => {
    const result = await optimizeSchedule();
    setOptimizationResult(result);
  };

  const handleApplyOptimization = async () => {
    if (!optimizationResult || !onApplyOptimization) return;
    
    // Apply time adjustments and reordering
    const optimizedWithTimes = optimizationResult.optimizedOrder.map((dest, index) => {
      // For demo purposes, keep original times but could implement time adjustments here
      return { ...dest };
    });

    onApplyOptimization(optimizedWithTimes);
    setOptimizationResult(null);
  };

  const getSuggestionIcon = (type: OptimizationSuggestion['type']) => {
    switch (type) {
      case 'reorder': return <Route size={16} />;
      case 'time_adjustment': return <Clock size={16} />;
      case 'split_day': return <Calendar size={16} />;
      case 'add_break': return <AlertTriangle size={16} />;
      default: return <Settings size={16} />;
    }
  };

  const getImpactColor = (impact: OptimizationSuggestion['impact']) => {
    switch (impact) {
      case 'high': return '#dc2626';
      case 'medium': return '#d97706';
      case 'low': return '#16a34a';
      default: return '#6b7280';
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
        color: '#6b7280'
      }}>
        <Zap size={48} style={{ opacity: 0.5 }} />
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Keine Reise ausgewählt</h2>
        <p style={{ margin: 0, textAlign: 'center' }}>
          Wählen Sie eine Reise aus, um die Optimierung zu starten.
        </p>
      </div>
    );
  }

  if (currentDestinations.length < 2) {
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
        <TrendingUp size={48} style={{ opacity: 0.5 }} />
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Zu wenige Ziele</h2>
        <p style={{ margin: 0, textAlign: 'center' }}>
          Fügen Sie mindestens 2 Ziele hinzu, um die Optimierung zu nutzen.
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
            Zeitplan-Optimierung
          </h1>
          <p style={{
            margin: 0,
            color: '#6b7280',
            fontSize: '1rem'
          }}>
            Optimieren Sie Ihre Reiseroute für maximale Effizienz
          </p>
        </div>

        <button
          onClick={handleOptimize}
          disabled={isOptimizing}
          style={{
            background: '#16a34a',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.75rem 1.5rem',
            cursor: isOptimizing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            opacity: isOptimizing ? 0.6 : 1
          }}
        >
          {isOptimizing ? (
            <>
              <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Optimiere...
            </>
          ) : (
            <>
              <Zap size={16} />
              Optimieren
            </>
          )}
        </button>
      </div>

      {/* Optimization Settings */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem'
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
          <Settings size={18} />
          Optimierungseinstellungen
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem'
        }}>
          {Object.entries({
            prioritizeProximity: 'Nach Nähe sortieren',
            minimizeBacktracking: 'Umwege minimieren',
            respectOpeningHours: 'Öffnungszeiten beachten',
            addTravelBuffers: 'Reisepuffer hinzufügen',
            preferMorningStart: 'Morgens beginnen',
          }).map(([key, label]) => (
            <label key={key} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={optimizationSettings[key as keyof typeof optimizationSettings] as boolean}
                onChange={(e) => setOptimizationSettings(prev => ({
                  ...prev,
                  [key]: e.target.checked
                }))}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                {label}
              </span>
            </label>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', color: '#374151' }}>
              Max. Stunden/Tag:
            </label>
            <input
              type="number"
              min="4"
              max="16"
              value={optimizationSettings.maxDailyHours}
              onChange={(e) => setOptimizationSettings(prev => ({
                ...prev,
                maxDailyHours: parseInt(e.target.value) || 10
              }))}
              style={{
                width: '80px',
                padding: '0.25rem 0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </div>
      </div>

      {/* Optimization Results */}
      {optimizationResult && (
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '2rem'
        }}>
          {/* Results Header */}
          <div style={{
            background: '#f0fdf4',
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#14532d',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <CheckCircle size={20} />
                  Optimierung abgeschlossen
                </h3>
                <p style={{
                  margin: 0,
                  color: '#16a34a',
                  fontSize: '0.875rem'
                }}>
                  {optimizationResult.suggestions.length} Verbesserungsvorschläge gefunden
                </p>
              </div>

              <button
                onClick={handleApplyOptimization}
                style={{
                  background: '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                Anwenden
              </button>
            </div>
          </div>

          {/* Improvements Summary */}
          <div style={{ padding: '1.5rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: '#0c4a6e',
                  marginBottom: '0.5rem'
                }}>
                  {optimizationResult.improvements.totalTravelTimeReduced}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#0891b2' }}>
                  Minuten eingespart
                </div>
              </div>

              <div style={{
                background: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '8px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: '#92400e',
                  marginBottom: '0.5rem'
                }}>
                  {optimizationResult.improvements.conflictsResolved}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#d97706' }}>
                  Konflikte gelöst
                </div>
              </div>

              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: '#14532d',
                  marginBottom: '0.5rem'
                }}>
                  {optimizationResult.improvements.efficiencyGain}h
                </div>
                <div style={{ fontSize: '0.875rem', color: '#16a34a' }}>
                  Effizienzgewinn
                </div>
              </div>
            </div>

            {/* Suggestions */}
            <h4 style={{
              margin: '0 0 1rem 0',
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Verbesserungsvorschläge
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {optimizationResult.suggestions.map((suggestion, index) => (
                <div key={index} style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem'
                  }}>
                    <div style={{
                      color: getImpactColor(suggestion.impact),
                      marginTop: '0.125rem'
                    }}>
                      {getSuggestionIcon(suggestion.type)}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.5rem'
                      }}>
                        <h5 style={{
                          margin: 0,
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#1f2937'
                        }}>
                          {suggestion.title}
                        </h5>

                        <span style={{
                          background: getImpactColor(suggestion.impact),
                          color: 'white',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          {suggestion.impact === 'high' ? 'Hoch' : 
                           suggestion.impact === 'medium' ? 'Mittel' : 'Niedrig'}
                        </span>

                        {suggestion.timeSaved && (
                          <span style={{
                            background: '#dcfce7',
                            color: '#16a34a',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            +{suggestion.timeSaved} Min
                          </span>
                        )}
                      </div>

                      <p style={{
                        margin: '0 0 0.5rem 0',
                        fontSize: '0.875rem',
                        color: '#6b7280'
                      }}>
                        {suggestion.description}
                      </p>

                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.25rem'
                      }}>
                        {suggestion.destinations.map((destName, destIndex) => (
                          <span key={destIndex} style={{
                            background: '#e0f2fe',
                            color: '#0891b2',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem'
                          }}>
                            {destName}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Current Schedule Overview */}
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
          Aktueller Zeitplan
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem'
        }}>
          {currentDestinations
            .sort((a, b) => {
              const dateA = new Date(`${a.startDate}T${a.startTime}`);
              const dateB = new Date(`${b.startDate}T${b.startTime}`);
              return dateA.getTime() - dateB.getTime();
            })
            .map((dest, index) => (
              <div key={dest.id} style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: dest.color || '#6b7280',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    {index + 1}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <h4 style={{
                      margin: '0 0 0.25rem 0',
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#1f2937'
                    }}>
                      {dest.name}
                    </h4>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <MapPin size={12} />
                      <span>{dest.location}</span>
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#374151'
                }}>
                  <Clock size={12} />
                  <span>
                    {formatDate(dest.startDate)} • {formatTime(dest.startTime)} - {formatTime(dest.endTime)}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ScheduleOptimizer;