import React, { forwardRef } from 'react';

type ButtonVariant = 'filled' | 'outlined' | 'text' | 'tonal';
type ButtonSize = 'sm' | 'default' | 'lg';

interface ModernButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
  
  // Enhanced accessibility props
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean | 'false' | 'true' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-controls'?: string;
  'aria-pressed'?: boolean;
  loadingText?: string; // Custom loading announcement text
  tooltipText?: string; // For additional context
}

const ModernButton = forwardRef<HTMLButtonElement, ModernButtonProps>(
  ({
    variant = 'filled',
    size = 'default',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className = '',
    disabled,
    children,
    loadingText = 'Loading...',
    tooltipText,
    'aria-describedby': ariaDescribedBy,
    'aria-expanded': ariaExpanded,
    'aria-haspopup': ariaHasPopup,
    'aria-controls': ariaControls,
    'aria-pressed': ariaPressed,
    onKeyDown,
    ...props
  }, ref) => {
    // Enhanced keyboard navigation for accessibility
    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      // Handle Space key activation (in addition to Enter which is handled by default)
      if (e.key === ' ') {
        // Prevent default to avoid scrolling
        e.preventDefault();
        // Trigger click if not disabled or loading
        if (!disabled && !loading && props.onClick) {
          props.onClick(e as any);
        }
      }
      
      // Call any additional onKeyDown handler
      if (onKeyDown) {
        onKeyDown(e);
      }
    };

    const getButtonClasses = () => {
      const baseClasses = 'btn';
      const variantClasses = `btn-${variant}`;
      const sizeClasses = size !== 'default' ? `btn-${size}` : '';
      const loadingClasses = loading ? 'btn-loading' : '';
      const widthClasses = fullWidth ? 'w-full' : '';
      
      return [
        baseClasses,
        variantClasses,
        sizeClasses,
        loadingClasses,
        widthClasses,
        className
      ].filter(Boolean).join(' ');
    };

    // Generate unique IDs for accessibility
    const buttonId = props.id || `button-${Math.random().toString(36).substring(2, 11)}`;
    const tooltipId = tooltipText ? `${buttonId}-tooltip` : undefined;

    return (
      <>
        <button
          ref={ref}
          id={buttonId}
          className={getButtonClasses()}
          disabled={disabled || loading}
          aria-disabled={disabled || loading}
          aria-busy={loading}
          aria-describedby={[tooltipId, ariaDescribedBy].filter(Boolean).join(' ') || undefined}
          aria-expanded={ariaExpanded}
          aria-haspopup={ariaHasPopup}
          aria-controls={ariaControls}
          aria-pressed={ariaPressed}
          onKeyDown={handleKeyDown}
          {...props}
        >
          {/* Loading state overrides all content */}
          {loading ? (
            <>
              <span className="sr-only">{loadingText}</span>
              {/* Loading spinner is handled by CSS */}
            </>
          ) : (
            <>
              {leftIcon && (
                <span className="btn-icon" aria-hidden="true">
                  {leftIcon}
                </span>
              )}
              <span>{children}</span>
              {rightIcon && (
                <span className="btn-icon" aria-hidden="true">
                  {rightIcon}
                </span>
              )}
            </>
          )}
        </button>
        
        {/* Tooltip for additional context */}
        {tooltipText && (
          <div
            id={tooltipId}
            className="sr-only"
            role="tooltip"
          >
            {tooltipText}
          </div>
        )}
      </>
    );
  }
);

ModernButton.displayName = 'ModernButton';

export default ModernButton;