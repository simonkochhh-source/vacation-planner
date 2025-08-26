import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock, Calendar } from 'lucide-react';
import { Destination } from '../../types';
import { formatDate, getCategoryIcon } from '../../utils';
import StatusBadge from '../UI/StatusBadge';

interface TimelineProps {
  destinations: Destination[];
  onDestinationSelect: (destination: Destination) => void;
  currentDestination?: Destination;
  autoPlay?: boolean;
  playSpeed?: number; // seconds between destinations
}

const Timeline: React.FC<TimelineProps> = ({
  destinations,
  onDestinationSelect,
  currentDestination,
  autoPlay = false,
  playSpeed = 3
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  // Sort destinations by start date
  const sortedDestinations = destinations
    .filter(dest => dest.coordinates)
    .sort((a, b) => {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      return dateA.getTime() - dateB.getTime();
    });

  // Update current index based on selected destination
  useEffect(() => {
    if (currentDestination) {
      const index = sortedDestinations.findIndex(dest => dest.id === currentDestination.id);
      if (index >= 0) {
        setCurrentIndex(index);
      }
    }
  }, [currentDestination, sortedDestinations]);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || sortedDestinations.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const nextIndex = (prev + 1) % sortedDestinations.length;
        onDestinationSelect(sortedDestinations[nextIndex]);
        return nextIndex;
      });
    }, playSpeed * 1000);

    return () => clearInterval(interval);
  }, [isPlaying, sortedDestinations, playSpeed, onDestinationSelect]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handlePrevious = () => {
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : sortedDestinations.length - 1;
    setCurrentIndex(prevIndex);
    onDestinationSelect(sortedDestinations[prevIndex]);
  };

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % sortedDestinations.length;
    setCurrentIndex(nextIndex);
    onDestinationSelect(sortedDestinations[nextIndex]);
  };

  const handleDestinationClick = (destination: Destination, index: number) => {
    setCurrentIndex(index);
    onDestinationSelect(destination);
    setIsPlaying(false);
  };

  if (sortedDestinations.length === 0) {
    return null;
  }

  const currentDest = sortedDestinations[currentIndex];
  const progress = sortedDestinations.length > 1 ? (currentIndex / (sortedDestinations.length - 1)) * 100 : 0;

  return (
    <div style={{
      position: 'absolute',
      bottom: '1rem',
      right: '1rem',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      padding: '1rem',
      minWidth: '300px',
      maxWidth: isExpanded ? '400px' : '300px',
      zIndex: 1000,
      transition: 'all 0.3s ease'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.75rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Clock size={16} style={{ color: '#6b7280' }} />
          <span style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#374151'
          }}>
            Timeline
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '0.25rem',
            borderRadius: '4px',
            color: '#6b7280'
          }}
          title={isExpanded ? 'Minimieren' : 'Erweitern'}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {/* Current Destination Info */}
      <div style={{
        background: '#f8fafc',
        borderRadius: '8px',
        padding: '0.75rem',
        marginBottom: '0.75rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.5rem'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            background: currentDest.color || '#6b7280',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.875rem',
            color: 'white'
          }}>
            {getCategoryIcon(currentDest.category)}
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{
              margin: 0,
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              {currentDest.name}
            </h4>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '0.25rem'
            }}>
              <Calendar size={12} style={{ color: '#6b7280' }} />
              <span style={{
                fontSize: '0.75rem',
                color: '#6b7280'
              }}>
                {formatDate(currentDest.startDate)}
              </span>
            </div>
          </div>
          <StatusBadge status={currentDest.status} size="sm" />
        </div>
        
        <div style={{
          fontSize: '0.75rem',
          color: '#6b7280'
        }}>
          {currentIndex + 1} von {sortedDestinations.length} Zielen
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        background: '#e5e7eb',
        borderRadius: '4px',
        height: '4px',
        marginBottom: '0.75rem',
        overflow: 'hidden'
      }}>
        <div style={{
          background: '#3b82f6',
          height: '100%',
          width: `${progress}%`,
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem'
      }}>
        <button
          onClick={handlePrevious}
          style={{
            background: '#f3f4f6',
            border: 'none',
            borderRadius: '6px',
            padding: '0.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Vorheriges Ziel"
        >
          <SkipBack size={16} style={{ color: '#374151' }} />
        </button>

        <button
          onClick={handlePlayPause}
          style={{
            background: isPlaying ? '#ef4444' : '#3b82f6',
            border: 'none',
            borderRadius: '6px',
            padding: '0.75rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}
          title={isPlaying ? 'Pause' : 'Abspielen'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <button
          onClick={handleNext}
          style={{
            background: '#f3f4f6',
            border: 'none',
            borderRadius: '6px',
            padding: '0.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Nächstes Ziel"
        >
          <SkipForward size={16} style={{ color: '#374151' }} />
        </button>
      </div>

      {/* Expanded Timeline List */}
      {isExpanded && (
        <div style={{
          marginTop: '1rem',
          borderTop: '1px solid #e5e7eb',
          paddingTop: '1rem',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {sortedDestinations.map((destination, index) => (
            <button
              key={destination.id}
              onClick={() => handleDestinationClick(destination, index)}
              style={{
                width: '100%',
                background: index === currentIndex ? '#f0f9ff' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                padding: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.25rem',
                textAlign: 'left'
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                background: destination.color || '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                color: 'white',
                flexShrink: 0
              }}>
                {getCategoryIcon(destination.category)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: index === currentIndex ? '600' : '400',
                  color: index === currentIndex ? '#0891b2' : '#374151',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {destination.name}
                </div>
                <div style={{
                  fontSize: '0.625rem',
                  color: '#6b7280'
                }}>
                  {formatDate(destination.startDate)}
                </div>
              </div>
              {index === currentIndex && (
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#3b82f6'
                }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Timeline;