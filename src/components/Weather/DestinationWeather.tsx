import React, { useState, useEffect } from 'react';
import { Coordinates } from '../../types';
import { WeatherService } from '../../services/weatherService';
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  Snowflake, 
  Zap,
  Eye,
  Info,
  Calendar
} from 'lucide-react';

interface DestinationWeatherProps {
  coordinates?: Coordinates;
  date: string;
  compact?: boolean;
  style?: React.CSSProperties;
}

interface WeatherData {
  weather?: {
    temperature?: number;
    condition: string;
    description: string;
    humidity?: number;
    windSpeed?: number;
    icon: string;
  };
  seasonal?: string;
  type: 'current' | 'forecast' | 'seasonal';
}

const DestinationWeather: React.FC<DestinationWeatherProps> = ({
  coordinates,
  date,
  compact = false,
  style
}) => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!coordinates) return;

    const fetchWeather = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await WeatherService.getDestinationWeather(coordinates, date);
        setWeatherData(data);
      } catch (err) {
        console.error('Failed to fetch weather:', err);
        setError('Wetter konnte nicht geladen werden');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [coordinates, date]);

  const getWeatherIcon = (condition: string, size: number = 16) => {
    const iconProps = { 
      size, 
      style: { color: getWeatherColor(condition) }
    };

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
      case 'thunderstorm':
        return <Zap {...iconProps} />;
      case 'mist':
      case 'fog':
      case 'haze':
        return <Eye {...iconProps} style={{ ...iconProps.style, opacity: 0.7 }} />;
      default:
        return <Cloud {...iconProps} />;
    }
  };

  const getWeatherColor = (condition: string): string => {
    switch (condition?.toLowerCase()) {
      case 'clear':
        return '#f59e0b'; // amber-500
      case 'clouds':
        return '#6b7280'; // gray-500
      case 'rain':
      case 'drizzle':
        return '#3b82f6'; // blue-500
      case 'snow':
        return '#e5e7eb'; // gray-200
      case 'thunderstorm':
        return '#7c3aed'; // violet-600
      case 'mist':
      case 'fog':
      case 'haze':
        return '#9ca3af'; // gray-400
      default:
        return '#6b7280';
    }
  };

  const getWeatherEmoji = (condition: string): string => {
    return WeatherService.getWeatherEmoji(condition);
  };

  if (!coordinates) {
    return null;
  }

  if (loading && !weatherData) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontSize: compact ? '0.75rem' : '0.875rem',
        color: 'var(--color-text-secondary)',
        ...style
      }}>
        <div style={{
          width: '12px',
          height: '12px',
          border: '2px solid var(--color-border)',
          borderTop: '2px solid var(--color-primary-ocean)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <span>Lade Wetter...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontSize: compact ? '0.75rem' : '0.875rem',
        color: 'var(--color-text-secondary)',
        opacity: 0.7,
        ...style
      }}>
        <Cloud size={12} />
        <span>Wetter n/a</span>
      </div>
    );
  }

  if (!weatherData) {
    return null;
  }

  // Render seasonal expectation
  if (weatherData.type === 'seasonal' && weatherData.seasonal) {
    return (
      <div style={{
        background: 'var(--color-neutral-sand)',
        border: '1px solid var(--color-accent-moss)',
        borderRadius: '6px',
        padding: compact ? '0.5rem' : '0.75rem',
        fontSize: compact ? '0.75rem' : '0.875rem',
        lineHeight: 1.4,
        ...style
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.5rem',
          color: 'var(--color-secondary-forest)',
          fontWeight: '500'
        }}>
          <Calendar size={14} />
          <span>Saisonales Wetter</span>
        </div>
        <div style={{ color: 'var(--color-text-primary)' }}>
          {weatherData.seasonal}
        </div>
      </div>
    );
  }

  // Render actual weather data
  if (weatherData.weather) {
    const { weather } = weatherData;
    
    if (compact) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.75rem',
          color: 'var(--color-text-secondary)',
          ...style
        }}>
          {getWeatherIcon(weather.condition, 14)}
          <span style={{ fontWeight: '500', color: 'var(--color-text-primary)' }}>
            {weather.temperature || 0}°C
          </span>
          <span>{weather.description}</span>
          {weather.windSpeed && weather.windSpeed > 0 && (
            <span style={{ opacity: 0.8 }}>
              💨 {Math.round(weather.windSpeed)} km/h
            </span>
          )}
        </div>
      );
    }

    return (
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '0.75rem',
        ...style
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.5rem'
        }}>
          {getWeatherIcon(weather.condition, 20)}
          <div>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: 'var(--color-text-primary)'
            }}>
              {weather.temperature || 0}°C
            </div>
            <div style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              textTransform: 'capitalize'
            }}>
              {weather.description}
            </div>
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          gap: '1rem',
          fontSize: '0.75rem',
          color: 'var(--color-text-secondary)'
        }}>
          {weather.humidity && (
            <span>💧 {weather.humidity}%</span>
          )}
          {weather.windSpeed && weather.windSpeed > 0 && (
            <span>💨 {Math.round(weather.windSpeed)} km/h</span>
          )}
          {weatherData.type === 'forecast' && (
            <span style={{ 
              color: 'var(--color-primary-ocean)', 
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <Info size={10} />
              Vorhersage
            </span>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default DestinationWeather;