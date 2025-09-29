import React, { forwardRef } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

interface ModernInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  required?: boolean;
  showPasswordToggle?: boolean;
  
  // Enhanced accessibility props
  'aria-describedby'?: string;
  'aria-labelledby'?: string;
  'aria-errormessage'?: string;
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
  autoComplete?: string;
  errorLive?: 'polite' | 'assertive' | 'off'; // How error announcements should be made
}

const ModernInput = forwardRef<HTMLInputElement, ModernInputProps>(
  ({
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className = '',
    type = 'text',
    id,
    required = false,
    showPasswordToggle = false,
    inputMode,
    autoComplete,
    errorLive = 'polite',
    'aria-describedby': ariaDescribedBy,
    'aria-labelledby': ariaLabelledBy,
    'aria-errormessage': ariaErrorMessage,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    
    const inputId = id || `input-${Math.random().toString(36).substring(2, 11)}`;
    const errorId = `${inputId}-error`;
    const helperTextId = `${inputId}-helper`;
    const labelId = label ? `${inputId}-label` : undefined;
    
    const actualType = showPasswordToggle && type === 'password' 
      ? (showPassword ? 'text' : 'password')
      : type;

    const getInputClasses = () => {
      const baseClasses = 'input';
      const errorClasses = error ? 'input-error' : '';
      const widthClasses = fullWidth ? 'w-full' : '';
      
      return [
        baseClasses,
        errorClasses,
        widthClasses,
        className
      ].filter(Boolean).join(' ');
    };

    const getContainerStyle = () => ({
      position: 'relative' as const,
      width: fullWidth ? '100%' : undefined,
    });

    const togglePassword = () => {
      setShowPassword(!showPassword);
    };

    return (
      <div style={getContainerStyle()}>
        {/* Label */}
        {label && (
          <label 
            id={labelId}
            htmlFor={inputId}
            className="text-label-large"
            style={{
              display: 'block',
              marginBottom: 'var(--space-2)',
              color: error ? 'var(--color-error-50)' : 'var(--color-on-surface)'
            }}
          >
            {label}
            {required && (
              <>
                <span 
                  style={{ color: 'var(--color-error-50)', marginLeft: '2px' }}
                  aria-hidden="true"
                >
                  *
                </span>
                <span className="sr-only"> (required)</span>
              </>
            )}
          </label>
        )}

        {/* Input Container */}
        <div style={{ position: 'relative' }}>
          {/* Left Icon */}
          {leftIcon && (
            <div
              style={{
                position: 'absolute',
                left: 'var(--space-3)',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-on-surface-variant)',
                pointerEvents: 'none',
                zIndex: 1
              }}
              aria-hidden="true"
            >
              {leftIcon}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            type={actualType}
            className={getInputClasses()}
            style={{
              paddingLeft: leftIcon ? 'var(--space-10)' : undefined,
              paddingRight: (rightIcon || showPasswordToggle || error) ? 'var(--space-10)' : undefined
            }}
            onFocus={(e) => {
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              props.onBlur?.(e);
            }}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              [
                error && errorId, 
                helperText && helperTextId, 
                ariaDescribedBy
              ].filter(Boolean).join(' ') || undefined
            }
            aria-labelledby={ariaLabelledBy || labelId}
            aria-errormessage={error ? (ariaErrorMessage || errorId) : undefined}
            inputMode={inputMode}
            autoComplete={autoComplete}
            required={required}
            {...props}
          />

          {/* Right Side Icons */}
          <div
            style={{
              position: 'absolute',
              right: 'var(--space-3)',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              color: 'var(--color-on-surface-variant)'
            }}
          >
            {/* Error Icon */}
            {error && (
              <AlertCircle
                size={20}
                style={{ color: 'var(--color-error-50)' }}
                aria-hidden="true"
              />
            )}

            {/* Password Toggle */}
            {showPasswordToggle && type === 'password' && (
              <button
                type="button"
                onClick={togglePassword}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: 'inherit',
                  display: 'flex',
                  alignItems: 'center'
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            )}

            {/* Right Icon */}
            {rightIcon && !error && (
              <span aria-hidden="true">
                {rightIcon}
              </span>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            id={errorId}
            role="alert"
            aria-live={errorLive}
            aria-atomic="true"
            className="text-body-small"
            style={{
              color: 'var(--color-error-50)',
              marginTop: 'var(--space-1)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)'
            }}
          >
            <AlertCircle size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Helper Text */}
        {helperText && !error && (
          <div
            id={helperTextId}
            className="text-body-small text-muted"
            style={{
              marginTop: 'var(--space-1)'
            }}
          >
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

ModernInput.displayName = 'ModernInput';

export default ModernInput;