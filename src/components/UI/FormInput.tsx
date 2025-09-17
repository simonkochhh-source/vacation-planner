import React, { forwardRef } from 'react';
import { FieldError } from 'react-hook-form';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: FieldError;
  icon?: React.ReactNode;
  helpText?: string;
  required?: boolean;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, icon, helpText, required, className, ...props }, ref) => {
    return (
      <div className="form-input-group" style={{ marginBottom: '1rem' }}>
        {/* Label */}
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '500',
          color: 'var(--color-text-primary)',
          marginBottom: '0.5rem'
        }}>
          {label} {required && <span style={{ color: 'var(--color-error)' }}>*</span>}
        </label>

        {/* Input Container */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          {icon && (
            <div style={{
              position: 'absolute',
              left: '0.75rem',
              zIndex: 1,
              color: error ? 'var(--color-error)' : 'var(--color-neutral-stone)',
              pointerEvents: 'none'
            }}>
              {icon}
            </div>
          )}
          
          <input
            ref={ref}
            style={{
              width: '100%',
              padding: icon ? '0.75rem 0.75rem 0.75rem 2.5rem' : '0.75rem',
              border: `2px solid ${error ? 'var(--color-error)' : 'var(--color-neutral-mist)'}`,
              borderRadius: '8px',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'all 0.2s ease',
              backgroundColor: error ? 'rgba(220, 38, 38, 0.1)' : 'var(--color-neutral-cream)',
              ...(!error && {
                ':focus': {
                  borderColor: 'var(--color-primary-ocean)',
                  boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
                }
              })
            }}
            onFocus={(e) => {
              if (!error) {
                e.target.style.borderColor = 'var(--color-primary-ocean)';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              if (!error) {
                e.target.style.borderColor = 'var(--color-neutral-mist)';
                e.target.style.boxShadow = 'none';
              }
              props.onBlur?.(e);
            }}
            {...props}
          />
        </div>

        {/* Error Message */}
        {error && (
          <p style={{
            color: 'var(--color-error)',
            fontSize: '0.75rem',
            margin: '0.25rem 0 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <span>⚠️</span>
            {error.message}
          </p>
        )}

        {/* Help Text */}
        {helpText && !error && (
          <p style={{
            color: 'var(--color-text-secondary)',
            fontSize: '0.75rem',
            margin: '0.25rem 0 0 0',
            fontStyle: 'italic'
          }}>
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

export default FormInput;