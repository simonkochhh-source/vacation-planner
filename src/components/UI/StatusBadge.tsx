import React from 'react';
import { Check, Clock, X, MapPin } from 'lucide-react';
import { DestinationStatus } from '../../types';

interface StatusBadgeProps {
  status: DestinationStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  onClick?: () => void;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  size = 'md', 
  showIcon = true, 
  onClick,
  className = ''
}) => {
  const getStatusConfig = (status: DestinationStatus) => {
    switch (status) {
      case DestinationStatus.PLANNED:
        return {
          color: '#f59e0b',
          backgroundColor: '#fef3c7',
          borderColor: '#fcd34d',
          label: 'Geplant',
          icon: Clock
        };
      case DestinationStatus.VISITED:
        return {
          color: '#10b981',
          backgroundColor: '#d1fae5',
          borderColor: '#6ee7b7',
          label: 'Besucht',
          icon: Check
        };
      case DestinationStatus.SKIPPED:
        return {
          color: '#ef4444',
          backgroundColor: '#fee2e2',
          borderColor: '#fca5a5',
          label: 'Übersprungen',
          icon: X
        };
      default:
        return {
          color: '#6b7280',
          backgroundColor: '#f3f4f6',
          borderColor: '#d1d5db',
          label: 'Unbekannt',
          icon: MapPin
        };
    }
  };

  const getSizeConfig = (size: string) => {
    switch (size) {
      case 'sm':
        return {
          padding: '0.25rem 0.5rem',
          fontSize: '0.75rem',
          iconSize: 12,
          borderRadius: '0.375rem'
        };
      case 'lg':
        return {
          padding: '0.625rem 1rem',
          fontSize: '0.875rem',
          iconSize: 18,
          borderRadius: '0.5rem'
        };
      case 'md':
      default:
        return {
          padding: '0.375rem 0.75rem',
          fontSize: '0.8125rem',
          iconSize: 14,
          borderRadius: '0.4375rem'
        };
    }
  };

  const config = getStatusConfig(status);
  const sizeConfig = getSizeConfig(size);
  const Icon = config.icon;

  return (
    <span
      className={`status-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: showIcon ? '0.375rem' : '0',
        padding: sizeConfig.padding,
        backgroundColor: config.backgroundColor,
        color: config.color,
        borderRadius: sizeConfig.borderRadius,
        border: `1px solid ${config.borderColor}`,
        fontSize: sizeConfig.fontSize,
        fontWeight: '500',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        userSelect: 'none'
      }}
      onClick={onClick}
      onMouseOver={onClick ? (e) => {
        e.currentTarget.style.opacity = '0.8';
        e.currentTarget.style.transform = 'scale(1.05)';
      } : undefined}
      onMouseOut={onClick ? (e) => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.transform = 'scale(1)';
      } : undefined}
    >
      {showIcon && <Icon size={sizeConfig.iconSize} />}
      {config.label}
    </span>
  );
};

export default StatusBadge;