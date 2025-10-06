import React, { useState } from 'react';
import { useResponsive } from '../../hooks/useResponsive';
import { Destination } from '../../types';
import { Plus, Clock, MapPin } from 'lucide-react';

interface TimelineInsertPointProps {
  position: {
    between?: {
      previous?: Destination;
      next?: Destination;
    };
    day: string;
    index: number;
  };
  onActivate: () => void;
  isActive?: boolean;
}

const TimelineInsertPoint: React.FC<TimelineInsertPointProps> = ({
  position,
  onActivate,
  isActive = false
}) => {
  const { isMobile } = useResponsive();
  const [isHovered, setIsHovered] = useState(false);

  // Generate context description
  const getContextDescription = () => {
    const { previous, next } = position.between || {};
    
    if (previous && next) {
      return `zwischen ${previous.name} & ${next.name}`;
    } else if (previous) {
      return `nach ${previous.name}`;
    } else if (next) {
      return `vor ${next.name}`;
    } else {
      return 'neues Ziel';
    }
  };

  // Get suggested time slot
  const getTimeSlot = () => {
    const { index } = position;
    if (index === 0) return 'Morgens';
    if (index <= 2) return 'Mittags';
    return 'Abends';
  };

  return (
    <div
      style={{
        position: 'relative',
        margin: '0.5rem 0',
        opacity: isActive ? 1 : (isHovered ? 0.8 : 0.4),
        transition: 'all 0.2s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onActivate}
    >
      {/* Main Insert Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isActive 
            ? 'linear-gradient(135deg, var(--color-primary-ocean), var(--color-primary-sage))'
            : 'var(--color-background)',
          border: isActive 
            ? '2px solid var(--color-primary-ocean)'
            : `2px dashed ${isHovered ? 'var(--color-primary-ocean)' : 'var(--color-border)'}`,
          borderRadius: '12px',
          padding: isMobile ? '0.75rem' : '1rem',
          minHeight: '60px',
          transform: isHovered || isActive ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: isHovered || isActive 
            ? '0 4px 12px rgba(0, 0, 0, 0.1)' 
            : 'none',
          transition: 'all 0.2s ease'
        }}
      >
        {/* Plus Icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: isActive 
              ? 'rgba(255, 255, 255, 0.2)'
              : 'var(--color-primary-ocean)',
            color: isActive ? 'white' : 'white',
            marginRight: '0.75rem'
          }}
        >
          <Plus 
            size={16} 
            style={{
              transform: isActive ? 'rotate(45deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
          />
        </div>

        {/* Context Info */}
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div
            style={{
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontWeight: '600',
              color: isActive ? 'white' : 'var(--color-text-primary)',
              marginBottom: '0.25rem'
            }}
          >
            Neues Ziel {getContextDescription()}
          </div>
          
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.75rem',
              color: isActive 
                ? 'rgba(255, 255, 255, 0.8)' 
                : 'var(--color-text-secondary)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Clock size={12} />
              {getTimeSlot()}
            </div>
            
            {position.between?.previous && position.between?.next && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <MapPin size={12} />
                Unterwegs
              </div>
            )}
          </div>
        </div>

        {/* Hint Text */}
        {(isHovered || isActive) && !isMobile && (
          <div
            style={{
              fontSize: '0.75rem',
              color: isActive 
                ? 'rgba(255, 255, 255, 0.8)' 
                : 'var(--color-text-secondary)',
              fontStyle: 'italic'
            }}
          >
            Klicken zum Hinzufügen
          </div>
        )}
      </div>

      {/* Connection Lines */}
      {position.between?.previous && (
        <div
          style={{
            position: 'absolute',
            top: '-0.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '2px',
            height: '0.5rem',
            background: 'var(--color-border)',
            opacity: 0.5
          }}
        />
      )}
      
      {position.between?.next && (
        <div
          style={{
            position: 'absolute',
            bottom: '-0.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '2px',
            height: '0.5rem',
            background: 'var(--color-border)',
            opacity: 0.5
          }}
        />
      )}
    </div>
  );
};

export default TimelineInsertPoint;