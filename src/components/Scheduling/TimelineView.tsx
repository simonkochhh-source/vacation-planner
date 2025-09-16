import React, { useState, useMemo, useCallback } from 'react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { Destination } from '../../types';
import {
  Clock,
  Calendar,
  MapPin,
  Route,
  Zap,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  formatDate, 
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
}

const TimelineView: React.FC<TimelineViewProps> = ({
  onDestinationClick,
  onEditDestination
}) => {
  const { currentTrip, destinations } = useSupabaseApp();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  // Conflicts removed

  // Get current trip destinations
  const currentDestinations = currentTrip 
    ? destinations.filter(dest => currentTrip.destinations.includes(dest.id))
    : [];

  // Group destinations by day and detect conflicts, handling multi-day accommodations
  const timelineData = useMemo(() => {
    const grouped = new Map<string, Destination[]>();
    
    // Helper function to get all dates between start and end date
    const getDateRange = (startDate: string, endDate: string): string[] => {
      const dates: string[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
        dates.push(current.toISOString().split('T')[0]);
      }
      
      return dates;
    };
    
    currentDestinations.forEach(dest => {
      // If it's a hotel (accommodation) and spans multiple days, add it to each day
      if (dest.category === 'hotel' && dest.startDate !== dest.endDate) {
        const dateRange = getDateRange(dest.startDate, dest.endDate);
        
        dateRange.forEach(dateKey => {
          if (!grouped.has(dateKey)) {
            grouped.set(dateKey, []);
          }
          // Only add if not already present on this day
          const existsOnDay = grouped.get(dateKey)!.some(existing => existing.id === dest.id);
          if (!existsOnDay) {
            grouped.get(dateKey)!.push(dest);
          }
        });
      } else {
        // Regular single-day destination
        const dateKey = dest.startDate;
        if (!grouped.has(dateKey)) {
          grouped.set(dateKey, []);
        }
        grouped.get(dateKey)!.push(dest);
      }
    });

    // Sort destinations within each day by category (hotels first) and start time
    const timelineDays: TimelineDay[] = [];
    
    Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, dests]) => {
        const sortedDests = dests.sort((a, b) => {
          // Hotels (accommodations) first
          if (a.category === 'hotel' && b.category !== 'hotel') return -1;
          if (a.category !== 'hotel' && b.category === 'hotel') return 1;
          
          
          // Finally by name
          return a.name.localeCompare(b.name);
        });

        // Conflicts removed - no longer checking for overbooked days
        timelineDays.push({ date, destinations: sortedDests });
      });

    return timelineDays;
  }, [currentDestinations]);

  // Calculate estimated travel time between two destinations using car routes
  const calculateEstimatedTravelTime = useCallback((current: Destination, next: Destination): number => {
    if (current.coordinates && next.coordinates) {
      const lat1 = current.coordinates.lat;
      const lng1 = current.coordinates.lng;
      const lat2 = next.coordinates.lat;
      const lng2 = next.coordinates.lng;
      
      // Calculate straight-line distance using Haversine formula
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const straightDistance = R * c; // Distance in km
      
      // Apply road factor for realistic car routes (roads are typically 1.3-1.5x longer than straight line)
      const roadDistance = straightDistance * 1.4;
      
      // Calculate time based on average car speed
      let averageSpeed;
      if (roadDistance < 5) {
        averageSpeed = 30; // City driving: 30 km/h
      } else if (roadDistance < 50) {
        averageSpeed = 60; // Mixed city/highway: 60 km/h
      } else if (roadDistance < 200) {
        averageSpeed = 80; // Highway driving: 80 km/h
      } else {
        averageSpeed = 90; // Long-distance highway: 90 km/h
      }
      
      const timeInHours = roadDistance / averageSpeed;
      const timeInMinutes = Math.round(timeInHours * 60);
      
      return Math.max(10, timeInMinutes); // At least 10 minutes
    }
    return 30; // Default 30 minutes travel time
  }, []);

  // Helper function to calculate distance using Haversine formula
  const calculateDistance = useCallback((from: Destination, to: Destination): number => {
    if (from.coordinates && to.coordinates) {
      const lat1 = from.coordinates.lat;
      const lng1 = from.coordinates.lng;
      const lat2 = to.coordinates.lat;
      const lng2 = to.coordinates.lng;
      
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c; // Distance in km
    }
    return 0;
  }, []);

  // Calculate daily travel metrics including costs
  const dailyTravelMetrics = useMemo(() => {
    const metrics = new Map<string, { distance: number; travelTime: number; travelCost: number }>();
    
    timelineData.forEach((day, dayIndex) => {
      const destinations = day.destinations.sort((a, b) => a.name.localeCompare(b.name));
      let dayDistance = 0;
      let dayTravelTime = 0;
      
      // Calculate travel within the day
      for (let i = 0; i < destinations.length - 1; i++) {
        const current = destinations[i];
        const next = destinations[i + 1];
        
        if (current.coordinates && next.coordinates) {
          const travelTime = calculateEstimatedTravelTime(current, next);
          const distance = calculateDistance(current, next) * 1.4; // Apply road factor
          
          dayDistance += distance;
          dayTravelTime += travelTime;
        }
      }
      
      // Calculate travel from previous day's last destination to today's first destination
      if (dayIndex > 0) {
        const previousDay = timelineData[dayIndex - 1];
        const previousDestinations = previousDay.destinations;
        const lastPreviousDestination = previousDestinations[previousDestinations.length - 1];
        const firstTodayDestination = destinations[0];
        
        if (lastPreviousDestination && firstTodayDestination && 
            lastPreviousDestination.coordinates && firstTodayDestination.coordinates) {
          
          const travelTime = calculateEstimatedTravelTime(lastPreviousDestination, firstTodayDestination);
          const distance = calculateDistance(lastPreviousDestination, firstTodayDestination) * 1.4;
          
          dayDistance += distance;
          dayTravelTime += travelTime;
        }
      }
      
      // Calculate travel costs using vehicle configuration
      let travelCost = 0;
      if (currentTrip?.vehicleConfig) {
        const { fuelConsumption, fuelPrice } = currentTrip.vehicleConfig;
        // Formula: (distance/100) * consumption * price
        travelCost = (dayDistance / 100) * (fuelConsumption || 9.0) * (fuelPrice || 1.65);
      } else {
        // Fallback: old calculation
        travelCost = dayDistance * 0.30;
      }
      
      metrics.set(day.date, { 
        distance: dayDistance, 
        travelTime: dayTravelTime,
        travelCost: travelCost
      });
    });
    
    return metrics;
  }, [timelineData, calculateEstimatedTravelTime, calculateDistance]);

  // Get timeline statistics
  const stats = useMemo(() => {
    const totalDestinations = currentDestinations.length;
    // Conflicts removed - no longer needed
    const totalDays = timelineData.length;
    const totalDuration = currentDestinations.reduce((sum, dest) => sum + (dest.duration || 0 || 0), 0);

    // Calculate total travel time, distance and costs across all days
    let totalTravelTime = 0;
    let totalDistance = 0;
    let totalTravelCost = 0;
    
    Array.from(dailyTravelMetrics.values()).forEach(metrics => {
      totalTravelTime += metrics.travelTime;
      totalDistance += metrics.distance;
      totalTravelCost += metrics.travelCost;
    });

    return {
      totalDestinations,
      totalDays,
      totalDuration: {
        hours: Math.floor(totalDuration / 60),
        minutes: totalDuration % 60
      },
      totalTravelTime: {
        hours: Math.floor(totalTravelTime / 60),
        minutes: totalTravelTime % 60
      },
      totalDistance,
      totalTravelCost
    };
  }, [currentDestinations, timelineData, dailyTravelMetrics]);

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
            Reise-Rechner
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
          {/* Conflicts button removed */}
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
          background: '#f0f9ff',
          border: '1px solid #7dd3fc',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <Route size={16} style={{ color: '#0284c7' }} />
            <span style={{ fontSize: '0.875rem', color: '#0284c7', fontWeight: '600' }}>
              Fahrtzeit & Kosten
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0c4a6e' }}>
            {stats.totalTravelTime.hours}h {stats.totalTravelTime.minutes}m
          </div>
          <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '0.25rem' }}>
            {stats.totalDistance.toFixed(1)} km • {stats.totalTravelCost.toFixed(2)} €
          </div>
        </div>

        {/* Conflicts stats removed */}
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
                  {day.destinations.length} Ziele
                </p>
                {dailyTravelMetrics.get(day.date) && (
                  <div style={{
                    marginTop: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    fontSize: '0.75rem',
                    color: '#0284c7',
                    fontWeight: '500'
                  }}>
                    {dailyTravelMetrics.get(day.date)!.travelTime > 0 && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Route size={12} />
                          {Math.round(dailyTravelMetrics.get(day.date)!.travelTime / 60 * 10) / 10}h Fahrtzeit
                        </div>
                        <div>
                          {dailyTravelMetrics.get(day.date)!.distance.toFixed(1)} km • {dailyTravelMetrics.get(day.date)!.travelCost.toFixed(2)} €
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Conflicts removed */}
            </div>

            {/* Timeline */}
            <div style={{ padding: '1.5rem' }}>
              {day.destinations.map((destination, index) => {
                const nextDestination = day.destinations[index + 1];

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
                                <span>
                                  {destination.category === 'hotel' && destination.startDate !== destination.endDate
                                    ? `Übernachtung (${Math.ceil((new Date(destination.endDate).getTime() - new Date(destination.startDate).getTime()) / (1000 * 60 * 60 * 24))} Nächte)`
                                    : destination.startTime && destination.endTime 
                                    ? `${destination.startTime} - ${destination.endTime}`
                                    : 'Zeit wird in der Timeline-Ansicht festgelegt'
                                  }
                                </span>
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

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <div style={{
                            display: 'inline-block',
                            background: destination.category === 'hotel' ? '#dbeafe' : '#f3f4f6',
                            color: destination.category === 'hotel' ? '#1e40af' : '#374151',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            {getCategoryLabel(destination.category)}
                          </div>
                          {destination.category === 'hotel' && destination.startDate !== destination.endDate && (
                            <div style={{
                              display: 'inline-block',
                              background: '#1e40af',
                              color: 'white',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}>
                              🏨 Mehrtägig
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Estimated Travel Time to Next */}
                    {nextDestination && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        margin: '0.5rem 0',
                        fontSize: '0.75rem',
                        color: '#6b7280'
                      }}>
                        <Route size={12} />
                        <span>
                          Geschätzte Reisezeit: {calculateEstimatedTravelTime(destination, nextDestination)} Min
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Conflicts removed */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimelineView;