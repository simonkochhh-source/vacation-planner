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
          color: '#374151',
          marginBottom: '0.5rem'
        }}>
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
          {charLimit && (
            <span style={{
              float: 'right',
              fontSize: '0.75rem',
              color: currentLength > charLimit * 0.9 ? '#ef4444' : '#6b7280'
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
            border: `2px solid ${error ? '#ef4444' : '#e5e7eb'}`,
            borderRadius: '8px',
            fontSize: '0.875rem',
            outline: 'none',
            transition: 'all 0.2s ease',
            backgroundColor: error ? '#fef2f2' : 'white',
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: '80px'
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

FormTextarea.displayName = 'FormTextarea';

export default FormTextarea;