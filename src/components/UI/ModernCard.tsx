import React from 'react';

type CardVariant = 'elevated' | 'filled' | 'outlined';

interface ModernCardProps {
  variant?: CardVariant;
  className?: string;
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: () => void;
  interactive?: boolean;
  role?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
  
  // Enhanced accessibility props
  as?: 'div' | 'article' | 'section' | 'aside'; // Semantic HTML element
  focusable?: boolean; // Whether the card should be focusable even without onClick
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

const ModernCard: React.FC<ModernCardProps> = ({
  variant = 'elevated',
  className = '',
  children,
  header,
  footer,
  onClick,
  interactive = false,
  role,
  as = 'div',
  focusable = false,
  onKeyDown,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  'aria-expanded': ariaExpanded,
  'aria-selected': ariaSelected,
  'aria-current': ariaCurrent,
}) => {
  // Enhanced keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
    
    // Call any additional onKeyDown handler
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const getCardClasses = () => {
    const baseClasses = 'card';
    const variantClasses = variant !== 'elevated' ? `card-${variant}` : '';
    const interactiveClasses = interactive || onClick || focusable ? 'cursor-pointer' : '';
    
    return [
      baseClasses,
      variantClasses,
      interactiveClasses,
      className
    ].filter(Boolean).join(' ');
  };

  const isInteractive = onClick || interactive || focusable;
  
  const cardProps = {
    className: getCardClasses(),
    onClick,
    role: onClick ? (role || 'button') : role,
    tabIndex: isInteractive ? 0 : -1,
    onKeyDown: isInteractive ? handleKeyDown : undefined,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    'aria-expanded': ariaExpanded,
    'aria-selected': ariaSelected,
    'aria-current': ariaCurrent,
  };

  // Use the specified semantic element
  const CardElement = as;
  
  return (
    <CardElement {...cardProps}>
      {header && (
        <div className="card-header">
          {header}
        </div>
      )}
      
      <div className="card-content">
        {children}
      </div>
      
      {footer && (
        <div className="card-footer">
          {footer}
        </div>
      )}
    </CardElement>
  );
};

export default ModernCard;