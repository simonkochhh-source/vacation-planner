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
          color: '#374151',
          marginBottom: '0.5rem'
        }}>
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
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
              color: error ? '#ef4444' : '#6b7280',
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
              border: `2px solid ${error ? '#ef4444' : '#e5e7eb'}`,
              borderRadius: '8px',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'all 0.2s ease',
              backgroundColor: error ? '#fef2f2' : 'white',
              ...(!error && {
                ':focus': {
                  borderColor: '#3b82f6',
                  boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
                }
              })
            }}
            onFocus={(e) => {
              if (!error) {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              if (!error) {
                e.target.style.borderColor = '#e5e7eb';
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
            color: '#ef4444',
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
            color: '#6b7280',
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