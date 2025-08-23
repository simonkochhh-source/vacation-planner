import React, { useState, useEffect } from 'react';
import { useApp } from '../../stores/AppContext';
import { Destination } from '../../types';
import {
  Route,
  Clock,
  MapPin,
  Car,
  Train,
  Plane,
  Navigation,
  Calculator,
  ArrowRight,
  Info
} from 'lucide-react';
import { getCategoryIcon, formatTime } from '../../utils';

interface TravelTimeResult {
  from: Destination;
  to: Destination;
  distance: number;
  duration: {
    driving: number;
    walking: number;
    transit: number;
    flying?: number;
  };
  route: {
    type: 'direct' | 'via_transit' | 'via_airport';
    description: string;
    steps?: string[];
  };
}

interface TravelTimeCalculatorProps {
  onAddTravelTime?: (from: string, to: string, duration: number) => void;
}

const TravelTimeCalculator: React.FC<TravelTimeCalculatorProps> = ({
  onAddTravelTime
}) => {
  const { currentTrip, destinations } = useApp();
  const [fromDestination, setFromDestination] = useState<string>('');
  const [toDestination, setToDestination] = useState<string>('');
  const [travelMethod, setTravelMethod] = useState<'driving' | 'walking' | 'transit' | 'flying'>('driving');
  const [isCalculating, setIsCalculating] = useState(false);
  const [travelResult, setTravelResult] = useState<TravelTimeResult | null>(null);
  const [allResults, setAllResults] = useState<TravelTimeResult[]>([]);

  // Get current trip destinations
  const currentDestinations = currentTrip 
    ? destinations.filter(dest => currentTrip.destinations.includes(dest.id))
    : [];

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Calculate travel times for different methods
  const calculateTravelTimes = (distance: number): TravelTimeResult['duration'] => {
    const drivingSpeed = 50; // km/h average in city
    const walkingSpeed = 5; // km/h
    const transitSpeed = 25; // km/h average including waiting
    const flyingSpeed = 800; // km/h for flights (only for long distances)

    return {
      driving: Math.round((distance / drivingSpeed) * 60), // minutes
      walking: Math.round((distance / walkingSpeed) * 60), // minutes
      transit: Math.round((distance / transitSpeed) * 60 + 15), // minutes + waiting time
      flying: distance > 100 ? Math.round((distance / flyingSpeed) * 60 + 120) : undefined // minutes + airport time
    };
  };

  // Generate route description
  const generateRouteDescription = (
    from: Destination, 
    to: Destination, 
    method: typeof travelMethod,
    distance: number
  ): TravelTimeResult['route'] => {
    switch (method) {
      case 'driving':
        return {
          type: 'direct',
          description: `Fahrt von ${from.name} nach ${to.name}`,
          steps: [
            `Start: ${from.location}`,
            `Fahrtrichtung: ${distance < 5 ? 'Stadtverkehr' : 'Überlandfahrt'}`,
            `Ziel: ${to.location}`
          ]
        };
      
      case 'walking':
        return {
          type: 'direct',
          description: `Fußweg von ${from.name} nach ${to.name}`,
          steps: [
            `Start: ${from.location}`,
            distance < 2 ? 'Kurzer Spaziergang' : distance < 10 ? 'Längerer Fußweg' : 'Sehr weite Strecke',
            `Ziel: ${to.location}`
          ]
        };
      
      case 'transit':
        return {
          type: 'via_transit',
          description: `ÖPNV von ${from.name} nach ${to.name}`,
          steps: [
            `Start: ${from.location}`,
            'Weg zur nächsten Haltestelle',
            distance < 5 ? 'Bus/Straßenbahn' : distance < 50 ? 'Bus/U-Bahn/S-Bahn' : 'Regionalbahn/Fernverkehr',
            `Ziel: ${to.location}`
          ]
        };
      
      case 'flying':
        return {
          type: 'via_airport',
          description: `Flug von ${from.name} nach ${to.name}`,
          steps: [
            `Start: ${from.location}`,
            'Anreise zum Flughafen (1h)',
            'Check-in und Sicherheit (1h)',
            `Flugzeit: ${Math.round(distance / 800 * 60)} Min`,
            'Aussteigen und Gepäck (30 Min)',
            `Ziel: ${to.location}`
          ]
        };
      
      default:
        return {
          type: 'direct',
          description: `Route von ${from.name} nach ${to.name}`,
        };
    }
  };

  const calculateTravelTime = async () => {
    if (!fromDestination || !toDestination || fromDestination === toDestination) return;

    setIsCalculating(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const from = currentDestinations.find(d => d.id === fromDestination);
    const to = currentDestinations.find(d => d.id === toDestination);

    if (!from || !to || !from.coordinates || !to.coordinates) {
      setIsCalculating(false);
      return;
    }

    const distance = calculateDistance(
      from.coordinates.lat,
      from.coordinates.lng,
      to.coordinates.lat,
      to.coordinates.lng
    );

    const duration = calculateTravelTimes(distance);
    const route = generateRouteDescription(from, to, travelMethod, distance);

    const result: TravelTimeResult = {
      from,
      to,
      distance: Math.round(distance * 10) / 10, // Round to 1 decimal
      duration,
      route
    };

    setTravelResult(result);
    setAllResults(prev => [result, ...prev.slice(0, 4)]); // Keep last 5 results
    setIsCalculating(false);
  };

  const getTravelIcon = (method: typeof travelMethod) => {
    switch (method) {
      case 'driving': return <Car size={16} />;
      case 'walking': return <Navigation size={16} />;
      case 'transit': return <Train size={16} />;
      case 'flying': return <Plane size={16} />;
      default: return <Route size={16} />;
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} Min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
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
        <Calculator size={48} style={{ opacity: 0.5 }} />
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Keine Reise ausgewählt</h2>
        <p style={{ margin: 0, textAlign: 'center' }}>
          Wählen Sie eine Reise aus, um Reisezeiten zu berechnen.
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
        <Route size={48} style={{ opacity: 0.5 }} />
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Zu wenige Ziele</h2>
        <p style={{ margin: 0, textAlign: 'center' }}>
          Fügen Sie mindestens 2 Ziele hinzu, um Reisezeiten zu berechnen.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          margin: '0 0 0.5rem 0',
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#1f2937'
        }}>
          Reisezeit-Rechner
        </h1>
        <p style={{
          margin: 0,
          color: '#6b7280',
          fontSize: '1rem'
        }}>
          Berechnen Sie Reisezeiten zwischen Ihren Zielen
        </p>
      </div>

      {/* Calculator Form */}
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
          <Calculator size={18} />
          Route berechnen
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: '1rem',
          alignItems: 'end',
          marginBottom: '1rem'
        }}>
          {/* From Destination */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Von
            </label>
            <select
              value={fromDestination}
              onChange={(e) => setFromDestination(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.875rem',
                background: 'white'
              }}
            >
              <option value="">Startpunkt wählen</option>
              {currentDestinations.map(dest => (
                <option key={dest.id} value={dest.id}>
                  {dest.name} - {dest.location}
                </option>
              ))}
            </select>
          </div>

          {/* Arrow */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.75rem'
          }}>
            <ArrowRight size={20} style={{ color: '#6b7280' }} />
          </div>

          {/* To Destination */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Nach
            </label>
            <select
              value={toDestination}
              onChange={(e) => setToDestination(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.875rem',
                background: 'white'
              }}
            >
              <option value="">Ziel wählen</option>
              {currentDestinations
                .filter(dest => dest.id !== fromDestination)
                .map(dest => (
                  <option key={dest.id} value={dest.id}>
                    {dest.name} - {dest.location}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Travel Method */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            Verkehrsmittel
          </label>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap'
          }}>
            {[
              { value: 'driving', label: 'Auto', icon: <Car size={16} /> },
              { value: 'walking', label: 'Zu Fuß', icon: <Navigation size={16} /> },
              { value: 'transit', label: 'ÖPNV', icon: <Train size={16} /> },
              { value: 'flying', label: 'Flug', icon: <Plane size={16} /> }
            ].map(method => (
              <button
                key={method.value}
                onClick={() => setTravelMethod(method.value as typeof travelMethod)}
                style={{
                  background: travelMethod === method.value ? '#dbeafe' : 'white',
                  color: travelMethod === method.value ? '#3b82f6' : '#6b7280',
                  border: travelMethod === method.value ? '1px solid #3b82f6' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
              >
                {method.icon}
                {method.label}
              </button>
            ))}
          </div>
        </div>

        {/* Calculate Button */}
        <button
          onClick={calculateTravelTime}
          disabled={!fromDestination || !toDestination || fromDestination === toDestination || isCalculating}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.75rem 1.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            opacity: (!fromDestination || !toDestination || fromDestination === toDestination || isCalculating) ? 0.6 : 1
          }}
        >
          {isCalculating ? (
            <>
              <Clock size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Berechne...
            </>
          ) : (
            <>
              <Calculator size={16} />
              Reisezeit berechnen
            </>
          )}
        </button>
      </div>

      {/* Current Result */}
      {travelResult && (
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: '#f0f9ff',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <h3 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#0c4a6e'
            }}>
              Berechnete Route
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              color: '#0891b2'
            }}>
              {getTravelIcon(travelMethod)}
              <span>{travelResult.route.description}</span>
            </div>
          </div>

          <div style={{ padding: '1.5rem' }}>
            {/* Route Overview */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1.5rem',
              padding: '1rem',
              background: '#f9fafb',
              borderRadius: '8px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: travelResult.from.color || '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.25rem'
              }}>
                {getCategoryIcon(travelResult.from.category)}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '0.25rem'
                }}>
                  {travelResult.from.name} → {travelResult.to.name}
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <span>📍 {travelResult.distance} km</span>
                  <span>⏱️ {formatDuration(travelResult.duration[travelMethod] || 0)}</span>
                </div>
              </div>

              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: travelResult.to.color || '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.25rem'
              }}>
                {getCategoryIcon(travelResult.to.category)}
              </div>
            </div>

            {/* All Travel Methods */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              {Object.entries({
                driving: { label: 'Auto', icon: <Car size={16} />, color: '#3b82f6' },
                walking: { label: 'Zu Fuß', icon: <Navigation size={16} />, color: '#16a34a' },
                transit: { label: 'ÖPNV', icon: <Train size={16} />, color: '#d97706' },
                ...(travelResult.duration.flying && {
                  flying: { label: 'Flug', icon: <Plane size={16} />, color: '#dc2626' }
                })
              }).map(([method, config]) => {
                const duration = travelResult.duration[method as keyof typeof travelResult.duration];
                if (!duration) return null;

                return (
                  <div key={method} style={{
                    background: method === travelMethod ? `${config.color}15` : '#f9fafb',
                    border: method === travelMethod ? `1px solid ${config.color}` : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '1rem',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      color: config.color,
                      marginBottom: '0.5rem',
                      display: 'flex',
                      justifyContent: 'center'
                    }}>
                      {config.icon}
                    </div>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      color: '#1f2937',
                      marginBottom: '0.25rem'
                    }}>
                      {formatDuration(duration || 0)}
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      {config.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Route Steps */}
            {travelResult.route.steps && (
              <div style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem'
                }}>
                  <Info size={16} style={{ color: '#6b7280' }} />
                  <span style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    Routenverlauf
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {travelResult.route.steps.map((step, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      fontSize: '0.875rem',
                      color: '#374151'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        {index + 1}
                      </div>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add to Schedule Button */}
            {onAddTravelTime && (
              <div style={{
                marginTop: '1.5rem',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => onAddTravelTime(
                    travelResult.from.id,
                    travelResult.to.id,
                    travelResult.duration[travelMethod] || 0
                  )}
                  style={{
                    background: '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 1.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Clock size={16} />
                  Reisezeit zu Zeitplan hinzufügen
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Calculations */}
      {allResults.length > 0 && (
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
            Letzte Berechnungen
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {allResults.slice(0, 5).map((result, index) => (
              <div key={index} style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Route size={16} style={{ color: '#6b7280' }} />
                  <div>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#1f2937'
                    }}>
                      {result.from.name} → {result.to.name}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280'
                    }}>
                      {result.distance} km
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
                  <span>🚗 {formatDuration(result.duration.driving || 0)}</span>
                  <span>🚶 {formatDuration(result.duration.walking || 0)}</span>
                  <span>🚌 {formatDuration(result.duration.transit || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelTimeCalculator;