import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  error?: string;
  success?: string;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  success,
  required = false,
  children,
  htmlFor,
  className = ''
}) => {
  const fieldClasses = [
    'form-field',
    error && 'has-error',
    success && 'has-success',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={fieldClasses}>
      <label 
        htmlFor={htmlFor}
        className={`form-label ${required ? 'required' : ''}`}
      >
        {label}
      </label>
      
      {children}
      
      {error && (
        <div className="form-error">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
      
      {success && !error && (
        <div className="form-success">
          <CheckCircle size={14} />
          {success}
        </div>
      )}
    </div>
  );
};

export default FormField;