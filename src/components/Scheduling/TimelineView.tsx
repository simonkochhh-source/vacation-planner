import React, { useState, useMemo } from 'react';
import { useApp } from '../../stores/AppContext';
import { Destination } from '../../types';
import {
  Clock,
  Calendar,
  MapPin,
  AlertTriangle,
  Route,
  Zap,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  formatDate, 
  formatTime, 
  getCategoryIcon, 
  getCategoryLabel 
} from '../../utils';

interface TimelineViewProps {
  onDestinationClick?: (destination: Destination) => void;
  onEditDestination?: (destination: Destination) => void;
}

interface TimelineDay {
  date: string;
  destinations: Destination[];
  conflicts: ConflictInfo[];
}

interface ConflictInfo {
  destination1: Destination;
  destination2: Destination;
  overlapMinutes: number;
}

const TimelineView: React.FC<TimelineViewProps> = ({
  onDestinationClick,
  onEditDestination
}) => {
  const { currentTrip, destinations } = useApp();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showConflicts, setShowConflicts] = useState(true);

  // Get current trip destinations
  const currentDestinations = currentTrip 
    ? destinations.filter(dest => currentTrip.destinations.includes(dest.id))
    : [];

  // Group destinations by day and detect conflicts
  const timelineData = useMemo(() => {
    const grouped = new Map<string, Destination[]>();
    
    currentDestinations.forEach(dest => {
      const dateKey = dest.startDate;
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(dest);
    });

    // Sort destinations within each day by start time
    const timelineDays: TimelineDay[] = [];
    
    Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, dests]) => {
        const sortedDests = dests.sort((a, b) => {
          const timeA = new Date(`${a.startDate}T${a.startTime}`);
          const timeB = new Date(`${b.startDate}T${b.startTime}`);
          return timeA.getTime() - timeB.getTime();
        });

        // Detect time conflicts
        const conflicts: ConflictInfo[] = [];
        for (let i = 0; i < sortedDests.length - 1; i++) {
          for (let j = i + 1; j < sortedDests.length; j++) {
            const dest1 = sortedDests[i];
            const dest2 = sortedDests[j];
            
            const start1 = new Date(`${dest1.startDate}T${dest1.startTime}`);
            const end1 = new Date(`${dest1.endDate}T${dest1.endTime}`);
            const start2 = new Date(`${dest2.startDate}T${dest2.startTime}`);
            const end2 = new Date(`${dest2.endDate}T${dest2.endTime}`);

            // Check for overlap
            const overlapStart = Math.max(start1.getTime(), start2.getTime());
            const overlapEnd = Math.min(end1.getTime(), end2.getTime());
            
            if (overlapStart < overlapEnd) {
              const overlapMinutes = (overlapEnd - overlapStart) / (1000 * 60);
              conflicts.push({
                destination1: dest1,
                destination2: dest2,
                overlapMinutes
              });
            }
          }
        }

        timelineDays.push({ date, destinations: sortedDests, conflicts });
      });

    return timelineDays;
  }, [currentDestinations]);

  // Get timeline statistics
  const stats = useMemo(() => {
    const totalDestinations = currentDestinations.length;
    const totalConflicts = timelineData.reduce((sum, day) => sum + day.conflicts.length, 0);
    const totalDays = timelineData.length;
    const totalDuration = currentDestinations.reduce((sum, dest) => sum + dest.duration, 0);

    return {
      totalDestinations,
      totalConflicts,
      totalDays,
      totalDuration: {
        hours: Math.floor(totalDuration / 60),
        minutes: totalDuration % 60
      }
    };
  }, [currentDestinations, timelineData]);

  const calculateTimeToNext = (current: Destination, next: Destination): number => {
    const currentEnd = new Date(`${current.endDate}T${current.endTime}`);
    const nextStart = new Date(`${next.startDate}T${next.startTime}`);
    return (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60); // minutes
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
        <Clock size={48} style={{ opacity: 0.5 }} />
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Keine Reise ausgewählt</h2>
        <p style={{ margin: 0, textAlign: 'center' }}>
          Wählen Sie eine Reise aus, um die Zeitplanung anzuzeigen.
        </p>
      </div>
    );
  }

  if (currentDestinations.length === 0) {
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
        <Calendar size={48} style={{ opacity: 0.5 }} />
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Noch keine Ziele geplant</h2>
        <p style={{ margin: 0, textAlign: 'center' }}>
          Fügen Sie Reiseziele hinzu, um Ihre Zeitplanung zu sehen.
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
            Zeitplanung
          </h1>
          <p style={{
            margin: 0,
            color: '#6b7280',
            fontSize: '1rem'
          }}>
            {currentTrip.name} • {formatDate(currentTrip.startDate)} - {formatDate(currentTrip.endDate)}
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center'
        }}>
          <button
            onClick={() => setShowConflicts(!showConflicts)}
            style={{
              background: showConflicts ? '#fef2f2' : 'white',
              color: showConflicts ? '#dc2626' : '#6b7280',
              border: showConflicts ? '1px solid #dc2626' : '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            <AlertTriangle size={16} />
            Konflikte {showConflicts ? 'ausblenden' : 'anzeigen'}
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <MapPin size={16} style={{ color: '#0891b2' }} />
            <span style={{ fontSize: '0.875rem', color: '#0891b2', fontWeight: '600' }}>
              Ziele
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0c4a6e' }}>
            {stats.totalDestinations}
          </div>
        </div>

        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <Calendar size={16} style={{ color: '#16a34a' }} />
            <span style={{ fontSize: '0.875rem', color: '#16a34a', fontWeight: '600' }}>
              Reisetage
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#14532d' }}>
            {stats.totalDays}
          </div>
        </div>

        <div style={{
          background: '#fef3c7',
          border: '1px solid #fcd34d',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <Clock size={16} style={{ color: '#d97706' }} />
            <span style={{ fontSize: '0.875rem', color: '#d97706', fontWeight: '600' }}>
              Gesamtdauer
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#92400e' }}>
            {stats.totalDuration.hours}h {stats.totalDuration.minutes}m
          </div>
        </div>

        {stats.totalConflicts > 0 && (
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
              <span style={{ fontSize: '0.875rem', color: '#dc2626', fontWeight: '600' }}>
                Konflikte
              </span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#991b1b' }}>
              {stats.totalConflicts}
            </div>
          </div>
        )}
      </div>

      {/* Timeline Days */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {timelineData.map((day, dayIndex) => (
          <div key={day.date} style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            {/* Day Header */}
            <div style={{
              background: '#f9fafb',
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{
                  margin: '0 0 0.25rem 0',
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  {formatDate(day.date)}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: '#6b7280'
                }}>
                  {day.destinations.length} Ziele • {day.conflicts.length} Konflikte
                </p>
              </div>

              {day.conflicts.length > 0 && showConflicts && (
                <div style={{
                  background: '#fef2f2',
                  color: '#dc2626',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <AlertTriangle size={12} />
                  {day.conflicts.length} Konflikt{day.conflicts.length !== 1 ? 'e' : ''}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div style={{ padding: '1.5rem' }}>
              {day.destinations.map((destination, index) => {
                const nextDestination = day.destinations[index + 1];
                const timeToNext = nextDestination 
                  ? calculateTimeToNext(destination, nextDestination)
                  : null;

                return (
                  <div key={destination.id}>
                    {/* Destination */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      marginBottom: index < day.destinations.length - 1 ? '1rem' : 0
                    }}>
                      {/* Timeline Indicator */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        marginTop: '0.5rem'
                      }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: destination.color || '#3b82f6',
                          border: '3px solid white',
                          boxShadow: '0 0 0 2px #e5e7eb'
                        }} />
                        {index < day.destinations.length - 1 && (
                          <div style={{
                            width: '2px',
                            height: '3rem',
                            background: '#e5e7eb',
                            marginTop: '0.5rem'
                          }} />
                        )}
                      </div>

                      {/* Destination Content */}
                      <div style={{
                        flex: 1,
                        background: '#f9fafb',
                        borderRadius: '8px',
                        padding: '1rem',
                        cursor: onDestinationClick ? 'pointer' : 'default'
                      }}
                      onClick={() => onDestinationClick && onDestinationClick(destination)}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          marginBottom: '0.75rem'
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              marginBottom: '0.5rem'
                            }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: destination.color || '#6b7280',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '1rem'
                              }}>
                                {getCategoryIcon(destination.category)}
                              </div>
                              
                              <div>
                                <h4 style={{
                                  margin: '0 0 0.25rem 0',
                                  fontSize: '1.125rem',
                                  fontWeight: '600',
                                  color: '#1f2937'
                                }}>
                                  {destination.name}
                                </h4>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  fontSize: '0.875rem',
                                  color: '#6b7280'
                                }}>
                                  <MapPin size={12} />
                                  <span>{destination.location}</span>
                                </div>
                              </div>
                            </div>

                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '1rem',
                              fontSize: '0.875rem',
                              color: '#374151'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Clock size={12} />
                                <span>{formatTime(destination.startTime)} - {formatTime(destination.endTime)}</span>
                              </div>
                              <div>
                                Dauer: {Math.floor(destination.duration / 60)}h {destination.duration % 60}m
                              </div>
                            </div>
                          </div>

                          {onEditDestination && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditDestination(destination);
                              }}
                              style={{
                                background: 'transparent',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                padding: '0.5rem',
                                cursor: 'pointer',
                                color: '#6b7280'
                              }}
                              title="Bearbeiten"
                            >
                              <Clock size={14} />
                            </button>
                          )}
                        </div>

                        <div style={{
                          display: 'inline-block',
                          background: '#f3f4f6',
                          color: '#374151',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          {getCategoryLabel(destination.category)}
                        </div>
                      </div>
                    </div>

                    {/* Travel Time to Next */}
                    {timeToNext !== null && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        margin: '0.5rem 0',
                        fontSize: '0.75rem',
                        color: timeToNext < 0 ? '#dc2626' : timeToNext < 30 ? '#d97706' : '#6b7280'
                      }}>
                        <Route size={12} />
                        <span>
                          {timeToNext < 0 
                            ? `Überschneidung: ${Math.abs(timeToNext)} Min`
                            : timeToNext === 0
                              ? 'Direkt anschließend'
                              : `${timeToNext} Min Pause`
                          }
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Conflicts */}
              {showConflicts && day.conflicts.length > 0 && (
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem'
                  }}>
                    <AlertTriangle size={16} style={{ color: '#dc2626' }} />
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#dc2626'
                    }}>
                      Zeitkonflikte
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {day.conflicts.map((conflict, conflictIndex) => (
                      <div key={conflictIndex} style={{
                        padding: '0.75rem',
                        background: 'white',
                        borderRadius: '6px',
                        fontSize: '0.875rem'
                      }}>
                        <div style={{ color: '#991b1b', fontWeight: '500', marginBottom: '0.25rem' }}>
                          Überschneidung: {Math.round(conflict.overlapMinutes)} Minuten
                        </div>
                        <div style={{ color: '#7f1d1d' }}>
                          {conflict.destination1.name} ↔ {conflict.destination2.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimelineView;