import React, { forwardRef } from 'react';
import { FieldError } from 'react-hook-form';
import { ChevronDown } from 'lucide-react';

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: FieldError;
  options: { value: string | number; label: string; icon?: React.ReactNode }[];
  placeholder?: string;
  required?: boolean;
  helpText?: string;
}

const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, options, placeholder, required, helpText, ...props }, ref) => {
    return (
      <div className="form-select-group" style={{ marginBottom: '1rem' }}>
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

        {/* Select Container */}
        <div style={{
          position: 'relative',
          display: 'inline-block',
          width: '100%'
        }}>
          <select
            ref={ref}
            style={{
              width: '100%',
              padding: '0.75rem 2.5rem 0.75rem 0.75rem',
              border: `2px solid ${error ? 'var(--color-error)' : 'var(--color-neutral-mist)'}`,
              borderRadius: '8px',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'all 0.2s ease',
              backgroundColor: error ? 'rgba(220, 38, 38, 0.1)' : 'var(--color-neutral-cream)',
              appearance: 'none',
              cursor: 'pointer'
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
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Custom Arrow */}
          <div style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: error ? 'var(--color-error)' : 'var(--color-neutral-stone)'
          }}>
            <ChevronDown size={16} />
          </div>
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

FormSelect.displayName = 'FormSelect';

export default FormSelect;