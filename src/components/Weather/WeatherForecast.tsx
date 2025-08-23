import React, { useState, useEffect } from 'react';
import { WeatherService, WeatherForecast as WeatherForecastType } from '../../services/weatherService';
import WeatherWidget from './WeatherWidget';
import { Coordinates } from '../../types';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  X
} from 'lucide-react';

interface WeatherForecastProps {
  coordinates: Coordinates;
  isOpen: boolean;
  onClose: () => void;
  locationName?: string;
}

const WeatherForecast: React.FC<WeatherForecastProps> = ({
  coordinates,
  isOpen,
  onClose,
  locationName
}) => {
  const [forecast, setForecast] = useState<WeatherForecastType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(0);

  useEffect(() => {
    if (!isOpen || !coordinates) return;

    const fetchForecast = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const forecastData = await WeatherService.getWeatherForecast(coordinates, 5);
        setForecast(forecastData);
      } catch (err) {
        setError('Wettervorhersage konnte nicht geladen werden');
        console.error('Weather forecast error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchForecast();
  }, [coordinates, isOpen]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Heute';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Morgen';
    } else {
      return date.toLocaleDateString('de-DE', { 
        weekday: 'short', 
        day: 'numeric',
        month: 'short'
      });
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const forecastData = await WeatherService.getWeatherForecast(coordinates, 5);
      setForecast(forecastData);
    } catch (err) {
      setError('Aktualisierung fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
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
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem'
        }}>
          <div>
            <h2 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              5-Tage Wettervorhersage
            </h2>
            {locationName && (
              <p style={{
                margin: 0,
                color: '#6b7280',
                fontSize: '0.875rem'
              }}>
                {locationName}
              </p>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              style={{
                background: 'transparent',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '0.5rem',
                cursor: 'pointer',
                color: '#6b7280'
              }}
              title="Aktualisieren"
            >
              <RefreshCw size={16} style={isLoading ? { animation: 'spin 1s linear infinite' } : {}} />
            </button>
            
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '6px',
                color: '#6b7280'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem',
            color: '#6b7280'
          }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />
            <span>Lade Wettervorhersage...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem',
            color: '#dc2626',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <AlertCircle size={48} />
            <span>{error}</span>
            <button
              onClick={handleRefresh}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '0.5rem 1rem',
                cursor: 'pointer'
              }}
            >
              Erneut versuchen
            </button>
          </div>
        )}

        {/* Forecast Content */}
        {!isLoading && !error && forecast.length > 0 && (
          <>
            {/* Day Navigation */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '2rem',
              background: '#f9fafb',
              borderRadius: '8px',
              padding: '0.5rem'
            }}>
              <button
                onClick={() => setSelectedDay(Math.max(0, selectedDay - 1))}
                disabled={selectedDay === 0}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: selectedDay === 0 ? 'not-allowed' : 'pointer',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  color: selectedDay === 0 ? '#9ca3af' : '#6b7280'
                }}
              >
                <ChevronLeft size={16} />
              </button>

              <div style={{
                display: 'flex',
                gap: '0.5rem',
                flex: 1,
                justifyContent: 'center'
              }}>
                {forecast.map((day, index) => (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDay(index)}
                    style={{
                      background: selectedDay === index ? '#3b82f6' : 'transparent',
                      color: selectedDay === index ? 'white' : '#6b7280',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.5rem 1rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                  >
                    {formatDate(day.date)}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setSelectedDay(Math.min(forecast.length - 1, selectedDay + 1))}
                disabled={selectedDay === forecast.length - 1}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: selectedDay === forecast.length - 1 ? 'not-allowed' : 'pointer',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  color: selectedDay === forecast.length - 1 ? '#9ca3af' : '#6b7280'
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Selected Day Details */}
            {forecast[selectedDay] && (
              <div style={{
                background: 'linear-gradient(135deg, #dbeafe 0%, #f0f9ff 100%)',
                borderRadius: '12px',
                padding: '2rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  <Calendar size={20} style={{ color: '#3b82f6' }} />
                  <h3 style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    {formatDate(forecast[selectedDay].date)}
                  </h3>
                  <span style={{
                    color: '#6b7280',
                    fontSize: '0.875rem'
                  }}>
                    {new Date(forecast[selectedDay].date).toLocaleDateString('de-DE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                <WeatherWidget
                  coordinates={coordinates}
                  date={forecast[selectedDay].date}
                  size="lg"
                  showDetails={true}
                />
              </div>
            )}

            {/* 5-Day Overview */}
            <div style={{
              background: '#f9fafb',
              borderRadius: '8px',
              padding: '1.5rem'
            }}>
              <h4 style={{
                margin: '0 0 1rem 0',
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Wochenübersicht
              </h4>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '1rem'
              }}>
                {forecast.map((day, index) => (
                  <div
                    key={day.date}
                    style={{
                      background: selectedDay === index ? '#dbeafe' : 'white',
                      border: selectedDay === index ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '1rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => setSelectedDay(index)}
                  >
                    <div style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#6b7280',
                      marginBottom: '0.5rem'
                    }}>
                      {formatDate(day.date)}
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '0.5rem'
                    }}>
                      <span style={{ fontSize: '1.5rem', marginRight: '0.25rem' }}>
                        {WeatherService.getWeatherEmoji(day.weather.condition || '')}
                      </span>
                    </div>
                    
                    <div style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: '0.25rem'
                    }}>
                      {day.weather.temperature}°C
                    </div>
                    
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280'
                    }}>
                      {WeatherService.getGermanDescription(day.weather.condition || '')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* No Data State */}
        {!isLoading && !error && forecast.length === 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem',
            color: '#6b7280',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <Calendar size={48} />
            <span>Keine Wettervorhersage verfügbar</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherForecast;