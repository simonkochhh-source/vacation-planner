import React, { forwardRef } from 'react';
import { FieldError } from 'react-hook-form';

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: FieldError;
  helpText?: string;
  required?: boolean;
  charLimit?: number;
}

const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, helpText, required, charLimit, value, ...props }, ref) => {
    const currentLength = typeof value === 'string' ? value.length : 0;
    
    return (
      <div className="form-textarea-group" style={{ marginBottom: '1rem' }}>
        {/* Label */}
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '500',
          color: 'var(--color-text-primary)',
          marginBottom: '0.5rem'
        }}>
          {label} {required && <span style={{ color: 'var(--color-error)' }}>*</span>}
          {charLimit && (
            <span style={{
              float: 'right',
              fontSize: '0.75rem',
              color: currentLength > charLimit * 0.9 ? 'var(--color-error)' : 'var(--color-neutral-stone)'
            }}>
              {currentLength}/{charLimit}
            </span>
          )}
        </label>

        {/* Textarea */}
        <textarea
          ref={ref}
          value={value}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: `2px solid ${error ? 'var(--color-error)' : 'var(--color-neutral-mist)'}`,
            borderRadius: '8px',
            fontSize: '0.875rem',
            outline: 'none',
            transition: 'all 0.2s ease',
            backgroundColor: error ? 'rgba(220, 38, 38, 0.1)' : 'var(--color-neutral-cream)',
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: '80px'
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

FormTextarea.displayName = 'FormTextarea';

export default FormTextarea;