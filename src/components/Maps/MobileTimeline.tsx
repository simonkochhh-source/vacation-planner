import React, { useState, useEffect } from 'react';
import { Destination } from '../../types';
import { getCategoryIcon, formatDate } from '../../utils';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  ChevronUp,
  ChevronDown,
  MapPin,
  Clock
} from 'lucide-react';

interface MobileTimelineProps {
  destinations: Destination[];
  onDestinationSelect: (destination: Destination) => void;
  currentDestination?: Destination;
  autoPlay?: boolean;
  playSpeed?: number; // seconds between auto-advance
  isMobile: boolean;
}

const MobileTimeline: React.FC<MobileTimelineProps> = ({
  destinations,
  onDestinationSelect,
  currentDestination,
  autoPlay = false,
  playSpeed = 3,
  isMobile
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  // Find current destination index
  useEffect(() => {
    if (currentDestination) {
      const index = destinations.findIndex(dest => dest.id === currentDestination.id);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [currentDestination, destinations]);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || destinations.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const nextIndex = (prev + 1) % destinations.length;
        onDestinationSelect(destinations[nextIndex]);
        return nextIndex;
      });
    }, playSpeed * 1000);

    return () => clearInterval(interval);
  }, [isPlaying, destinations, onDestinationSelect, playSpeed]);

  const handlePrevious = () => {
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : destinations.length - 1;
    setCurrentIndex(prevIndex);
    onDestinationSelect(destinations[prevIndex]);
  };

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % destinations.length;
    setCurrentIndex(nextIndex);
    onDestinationSelect(destinations[nextIndex]);
  };

  const handleDestinationClick = (destination: Destination, index: number) => {
    setCurrentIndex(index);
    onDestinationSelect(destination);
    if (isMobile) {
      setIsExpanded(false);
    }
  };

  if (destinations.length === 0) return null;

  if (!isMobile) {
    // Desktop Timeline (existing compact version)
    return (
      <div style={{
        position: 'absolute',
        bottom: '1rem',
        right: '1rem',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        minWidth: '320px',
        maxWidth: '400px',
        zIndex: 1000,
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: '600',
            color: '#374151'
          }}>
            Timeline ({currentIndex + 1}/{destinations.length})
          </h3>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handlePrevious}
              style={{
                background: 'transparent',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Vorheriges Ziel"
            >
              <SkipBack size={14} />
            </button>
            
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                background: isPlaying ? '#3b82f6' : 'transparent',
                color: isPlaying ? 'white' : '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title={isPlaying ? 'Pausieren' : 'Abspielen'}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            
            <button
              onClick={handleNext}
              style={{
                background: 'transparent',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Nächstes Ziel"
            >
              <SkipForward size={14} />
            </button>
          </div>
        </div>

        {/* Current Destination */}
        <div style={{ padding: '1rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem'
          }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: destinations[currentIndex].color || '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.125rem',
                color: 'white',
                flexShrink: 0
              }}
            >
              {getCategoryIcon(destinations[currentIndex].category)}
            </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{
                margin: '0 0 0.25rem 0',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                {destinations[currentIndex].name}
              </h4>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem',
                color: '#6b7280',
                fontSize: '0.875rem'
              }}>
                <MapPin size={14} />
                <span style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {destinations[currentIndex].location}
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem',
                fontSize: '0.75rem',
                color: '#6b7280'
              }}>
                <Clock size={12} />
                <span>
                  {formatDate(destinations[currentIndex].startDate)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{
          padding: '0 1rem 1rem 1rem'
        }}>
          <div style={{
            background: '#f3f4f6',
            borderRadius: '4px',
            height: '4px',
            overflow: 'hidden'
          }}>
            <div
              style={{
                background: '#3b82f6',
                height: '100%',
                width: `${((currentIndex + 1) / destinations.length) * 100}%`,
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Mobile Timeline
  return (
    <>
      {/* Mobile Timeline Bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'white',
        borderTopLeftRadius: isExpanded ? '0' : '12px',
        borderTopRightRadius: isExpanded ? '0' : '12px',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
        zIndex: 1000,
        maxHeight: isExpanded ? '60vh' : 'auto',
        overflow: isExpanded ? 'auto' : 'hidden'
      }}>
        {/* Compact Header */}
        {!isExpanded && (
          <div style={{
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            {/* Current Destination Info */}
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                background: destinations[currentIndex].color || '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                color: 'white',
                flexShrink: 0
              }}
            >
              {getCategoryIcon(destinations[currentIndex].category)}
            </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {destinations[currentIndex].name}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#6b7280'
              }}>
                {currentIndex + 1} von {destinations.length}
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={handlePrevious}
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <SkipBack size={16} />
              </button>
              
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                style={{
                  background: isPlaying ? '#3b82f6' : '#f3f4f6',
                  color: isPlaying ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
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
                  alignItems: 'center'
                }}
              >
                <SkipForward size={16} />
              </button>

              <button
                onClick={() => setIsExpanded(true)}
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <ChevronUp size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Expanded View */}
        {isExpanded && (
          <>
            {/* Expanded Header */}
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#374151'
              }}>
                Timeline
              </h3>
              
              <button
                onClick={() => setIsExpanded(false)}
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <ChevronDown size={16} />
              </button>
            </div>

            {/* Destinations List */}
            <div style={{ padding: '0.5rem' }}>
              {destinations.map((destination, index) => (
                <button
                  key={destination.id}
                  onClick={() => handleDestinationClick(destination, index)}
                  style={{
                    width: '100%',
                    background: index === currentIndex ? '#eff6ff' : 'transparent',
                    border: index === currentIndex ? '1px solid #3b82f6' : '1px solid transparent',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '0.25rem',
                    textAlign: 'left'
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: destination.color || '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem',
                      color: 'white',
                      flexShrink: 0
                    }}
                  >
                    {getCategoryIcon(destination.category)}
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: index === currentIndex ? '#3b82f6' : '#374151',
                      marginBottom: '0.25rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {destination.name}
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.75rem',
                      color: '#6b7280'
                    }}>
                      <Clock size={12} />
                      <span>
                        {formatDate(destination.startDate)}
                      </span>
                    </div>
                  </div>

                </button>
              ))}
            </div>
          </>
        )}

        {/* Progress Bar */}
        <div style={{
          padding: '0.5rem 1rem',
          borderTop: isExpanded ? '1px solid #e5e7eb' : 'none'
        }}>
          <div style={{
            background: '#f3f4f6',
            borderRadius: '2px',
            height: '3px',
            overflow: 'hidden'
          }}>
            <div
              style={{
                background: '#3b82f6',
                height: '100%',
                width: `${((currentIndex + 1) / destinations.length) * 100}%`,
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileTimeline;