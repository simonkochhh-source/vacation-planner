import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Clock, X } from 'lucide-react';
import { DestinationStatus } from '../../types';
import StatusBadge from './StatusBadge';

interface StatusDropdownProps {
  currentStatus: DestinationStatus;
  onStatusChange: (status: DestinationStatus) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const StatusDropdown: React.FC<StatusDropdownProps> = ({
  currentStatus,
  onStatusChange,
  disabled = false,
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const statusOptions = [
    {
      value: DestinationStatus.PLANNED,
      label: 'Geplant',
      icon: Clock,
      description: 'Ziel ist geplant, aber noch nicht besucht'
    },
    {
      value: DestinationStatus.VISITED,
      label: 'Besucht',
      icon: Check,
      description: 'Ziel wurde erfolgreich besucht'
    },
    {
      value: DestinationStatus.SKIPPED,
      label: 'Übersprungen',
      icon: X,
      description: 'Ziel wurde aus der Reise ausgelassen'
    }
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleStatusSelect = (status: DestinationStatus) => {
    onStatusChange(status);
    setIsOpen(false);
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return {
          padding: '0.25rem 0.5rem',
          fontSize: '0.75rem',
          iconSize: 12,
          dropdownPadding: '0.5rem'
        };
      case 'lg':
        return {
          padding: '0.625rem 1rem',
          fontSize: '0.875rem',
          iconSize: 18,
          dropdownPadding: '0.75rem'
        };
      case 'md':
      default:
        return {
          padding: '0.375rem 0.75rem',
          fontSize: '0.8125rem',
          iconSize: 14,
          dropdownPadding: '0.625rem'
        };
    }
  };

  const sizeConfig = getSizeConfig();

  if (disabled) {
    return <StatusBadge status={currentStatus} size={size} />;
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          borderRadius: '0.5rem',
          padding: '0.25rem',
          transition: 'background-color 0.2s ease'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <StatusBadge status={currentStatus} size={size} />
        <ChevronDown 
          size={sizeConfig.iconSize} 
          style={{ 
            color: 'var(--color-text-secondary)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10
            }}
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '0.25rem',
              background: 'var(--color-neutral-cream)',
              borderRadius: '0.75rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              border: '1px solid var(--color-neutral-mist)',
              padding: sizeConfig.dropdownPadding,
              minWidth: '200px',
              zIndex: 20,
              animation: 'fadeIn 0.15s ease-out'
            }}
          >
            <div style={{ 
              fontSize: '0.75rem', 
              fontWeight: '600', 
              color: 'var(--color-text-secondary)', 
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Status ändern
            </div>
            
            {statusOptions.map((option) => {
              const isSelected = option.value === currentStatus;
              
              return (
                <button
                  key={option.value}
                  onClick={() => handleStatusSelect(option.value)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    border: 'none',
                    borderRadius: '0.5rem',
                    background: isSelected ? 'var(--color-neutral-mist)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.2s ease',
                    marginBottom: '0.25rem'
                  }}
                  onMouseOver={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--color-neutral-cream)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <StatusBadge status={option.value} size="sm" showIcon={true} />
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: '500', 
                      color: 'var(--color-text-primary)',
                      marginBottom: '0.125rem'
                    }}>
                      {option.label}
                    </div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: 'var(--color-text-secondary)', 
                      lineHeight: '1.4'
                    }}>
                      {option.description}
                    </div>
                  </div>

                  {isSelected && (
                    <Check size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
};

export default StatusDropdown;