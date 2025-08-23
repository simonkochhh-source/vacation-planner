import React, { useState, useEffect } from 'react';
import { WeatherService, ExtendedWeatherInfo } from '../../services/weatherService';
import { Coordinates } from '../../types';
import {
  Cloud,
  Sun,
  CloudRain,
  Snowflake,
  CloudFog,
  Thermometer,
  Droplets,
  Wind,
  Eye,
  Gauge,
  Sunrise,
  Sunset,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface WeatherWidgetProps {
  coordinates?: Coordinates;
  date?: string;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  className?: string;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  coordinates,
  date,
  size = 'md',
  showDetails = false,
  className = ''
}) => {
  const [weather, setWeather] = useState<ExtendedWeatherInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!coordinates) return;

    const fetchWeather = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let weatherData: ExtendedWeatherInfo | null;
        
        if (date) {
          weatherData = await WeatherService.getWeatherForDate(coordinates, date);
        } else {
          weatherData = await WeatherService.getCurrentWeather(coordinates);
        }

        setWeather(weatherData);
      } catch (err) {
        setError('Wetter konnte nicht geladen werden');
        console.error('Weather fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeather();
  }, [coordinates, date]);

  const getWeatherIcon = (condition: string, iconSize: number = 24) => {
    const iconProps = { size: iconSize, style: { color: getIconColor(condition) } };
    
    switch (condition?.toLowerCase()) {
      case 'clear':
        return <Sun {...iconProps} />;
      case 'clouds':
        return <Cloud {...iconProps} />;
      case 'rain':
      case 'drizzle':
        return <CloudRain {...iconProps} />;
      case 'snow':
        return <Snowflake {...iconProps} />;
      case 'mist':
      case 'fog':
      case 'haze':
        return <CloudFog {...iconProps} />;
      default:
        return <Sun {...iconProps} />;
    }
  };

  const getIconColor = (condition: string): string => {
    switch (condition?.toLowerCase()) {
      case 'clear':
        return '#f59e0b';
      case 'clouds':
        return '#6b7280';
      case 'rain':
      case 'drizzle':
        return '#3b82f6';
      case 'snow':
        return '#e5e7eb';
      case 'mist':
      case 'fog':
      case 'haze':
        return '#9ca3af';
      default:
        return '#f59e0b';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return { 
          container: 'text-xs',
          icon: 16,
          spacing: 'gap-1',
          padding: 'p-1'
        };
      case 'lg':
        return { 
          container: 'text-base',
          icon: 32,
          spacing: 'gap-3',
          padding: 'p-3'
        };
      default:
        return { 
          container: 'text-sm',
          icon: 20,
          spacing: 'gap-2',
          padding: 'p-2'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  const handleRefresh = async () => {
    if (!coordinates) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const weatherData = date 
        ? await WeatherService.getWeatherForDate(coordinates, date)
        : await WeatherService.getCurrentWeather(coordinates);
      
      setWeather(weatherData);
    } catch (err) {
      setError('Aktualisierung fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  if (!coordinates) {
    return (
      <div className={`${className} ${sizeClasses.container} ${sizeClasses.padding}`} style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
        borderRadius: '6px',
        color: '#9ca3af'
      }}>
        <span>Keine GPS-Daten</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} ${sizeClasses.container} ${sizeClasses.padding}`} style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: '#fef2f2',
        borderRadius: '6px',
        color: '#dc2626'
      }}>
        <AlertCircle size={sizeClasses.icon} />
        <span>{error}</span>
        <button
          onClick={handleRefresh}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '0.25rem',
            borderRadius: '4px'
          }}
        >
          <RefreshCw size={12} />
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`${className} ${sizeClasses.container} ${sizeClasses.padding}`} style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
        borderRadius: '6px',
        color: '#6b7280'
      }}>
        <RefreshCw size={sizeClasses.icon} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ marginLeft: '0.5rem' }}>Lade...</span>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className={`${className} ${sizeClasses.container} ${sizeClasses.padding}`} style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
        borderRadius: '6px',
        color: '#9ca3af'
      }}>
        <span>Keine Wetterdaten</span>
      </div>
    );
  }

  return (
    <div className={`${className} ${sizeClasses.container}`} style={{
      background: 'linear-gradient(135deg, #dbeafe 0%, #f0f9ff 100%)',
      borderRadius: '8px',
      border: '1px solid #e0f2fe',
      padding: sizeClasses.padding === 'p-1' ? '0.25rem' : sizeClasses.padding === 'p-3' ? '0.75rem' : '0.5rem'
    }}>
      {/* Main Weather Info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: showDetails ? '0.5rem' : 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {getWeatherIcon(weather.condition || '', sizeClasses.icon)}
          <div>
            <div style={{
              fontSize: size === 'sm' ? '0.875rem' : size === 'lg' ? '1.25rem' : '1rem',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              {weather.temperature}°C
            </div>
            {size !== 'sm' && (
              <div style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                lineHeight: '1'
              }}>
                {WeatherService.getGermanDescription(weather.condition || '')}
              </div>
            )}
          </div>
        </div>

        {size !== 'sm' && (
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: '4px',
              color: '#6b7280',
              opacity: isLoading ? 0.5 : 1
            }}
            title="Wetter aktualisieren"
          >
            <RefreshCw size={12} style={isLoading ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
        )}
      </div>

      {/* Detailed Weather Info */}
      {showDetails && weather && 'feelsLike' in weather && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: size === 'lg' ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
          gap: '0.5rem',
          borderTop: '1px solid #e0f2fe',
          paddingTop: '0.5rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.75rem',
            color: '#6b7280'
          }}>
            <Thermometer size={12} />
            <span>Gefühlt {(weather as ExtendedWeatherInfo).feelsLike}°C</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.75rem',
            color: '#6b7280'
          }}>
            <Droplets size={12} />
            <span>{weather.humidity}%</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.75rem',
            color: '#6b7280'
          }}>
            <Wind size={12} />
            <span>{weather.windSpeed} km/h</span>
          </div>

          {size === 'lg' && (weather as ExtendedWeatherInfo).pressure && (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem',
                color: '#6b7280'
              }}>
                <Gauge size={12} />
                <span>{(weather as ExtendedWeatherInfo).pressure} hPa</span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem',
                color: '#6b7280'
              }}>
                <Eye size={12} />
                <span>{(weather as ExtendedWeatherInfo).visibility} km</span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem',
                color: '#6b7280'
              }}>
                <Sunrise size={12} />
                <span>{(weather as ExtendedWeatherInfo).sunrise}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default WeatherWidget;