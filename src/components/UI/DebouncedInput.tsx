import React, { useState, useEffect, useRef } from 'react';
import { useDebouncedCallback, useOptimizedCallback } from '../../hooks/useOptimizedCallback';
import { performanceMonitor } from '../../utils/performanceMonitoring';

interface DebouncedInputProps {
  value: string;
  onChange: (value: string) => void;
  onDebouncedChange?: (value: string) => void;
  debounceMs?: number;
  placeholder?: string;
  className?: string;
  type?: 'text' | 'email' | 'search' | 'tel' | 'url';
  disabled?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  required?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onKeyUp?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  loading?: boolean;
}

const DebouncedInput: React.FC<DebouncedInputProps> = React.memo(({
  value,
  onChange,
  onDebouncedChange,
  debounceMs = 300,
  placeholder,
  className = '',
  type = 'text',
  disabled = false,
  autoFocus = false,
  maxLength,
  minLength,
  pattern,
  required = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  onFocus,
  onBlur,
  onKeyDown,
  onKeyUp,
  leftIcon,
  rightIcon,
  clearable = false,
  loading = false,
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastEmittedValue = useRef(value);

  // Sync internal value with external value
  useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value);
    }
  }, [value]);

  // Debounced change handler
  const debouncedOnChange = useDebouncedCallback(
    (newValue: string) => {
      if (newValue !== lastEmittedValue.current) {
        lastEmittedValue.current = newValue;
        onDebouncedChange?.(newValue);
        
        // Track search performance
        if (type === 'search') {
          performanceMonitor.recordMetric('search.debounced', Date.now());
        }
      }
    },
    debounceMs,
    [onDebouncedChange, type]
  );

  // Immediate change handler
  const handleChange = useOptimizedCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInternalValue(newValue);
    onChange(newValue);
    
    // Trigger debounced callback
    debouncedOnChange(newValue);
  }, [onChange, debouncedOnChange], 'handleChange');

  // Clear handler
  const handleClear = useOptimizedCallback(() => {
    setInternalValue('');
    onChange('');
    lastEmittedValue.current = '';
    onDebouncedChange?.('');
    inputRef.current?.focus();
  }, [onChange, onDebouncedChange], 'handleClear');

  // Enhanced key handlers for performance
  const handleKeyDown = useOptimizedCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle common shortcuts
    if (event.key === 'Escape' && clearable) {
      handleClear();
      return;
    }
    
    if (event.key === 'Enter') {
      // Force immediate emission on Enter
      const currentValue = (event.target as HTMLInputElement).value;
      if (currentValue !== lastEmittedValue.current) {
        lastEmittedValue.current = currentValue;
        onDebouncedChange?.(currentValue);
      }
    }
    
    onKeyDown?.(event);
  }, [onKeyDown, handleClear, onDebouncedChange, clearable], 'handleKeyDown');

  const handleKeyUp = useOptimizedCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyUp?.(event);
  }, [onKeyUp], 'handleKeyUp');

  const handleFocus = useOptimizedCallback((event: React.FocusEvent<HTMLInputElement>) => {
    onFocus?.(event);
  }, [onFocus], 'handleFocus');

  const handleBlur = useOptimizedCallback((event: React.FocusEvent<HTMLInputElement>) => {
    // Force emission on blur
    const currentValue = event.target.value;
    if (currentValue !== lastEmittedValue.current) {
      lastEmittedValue.current = currentValue;
      onDebouncedChange?.(currentValue);
    }
    onBlur?.(event);
  }, [onBlur, onDebouncedChange], 'handleBlur');

  // Compute styles
  const containerClassName = `relative inline-flex items-center ${className}`;
  
  const inputClassName = `
    block w-full px-3 py-2 
    border border-gray-300 rounded-md 
    shadow-sm placeholder-gray-400 
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    ${leftIcon ? 'pl-10' : ''}
    ${(rightIcon || clearable || loading) ? 'pr-10' : ''}
    ${type === 'search' ? 'pr-8' : ''}
  `.trim();

  return (
    <div className={containerClassName}>
      {/* Left Icon */}
      {leftIcon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {leftIcon}
        </div>
      )}

      {/* Input Element */}
      <input
        ref={inputRef}
        type={type}
        value={internalValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={inputClassName}
        disabled={disabled}
        autoFocus={autoFocus}
        maxLength={maxLength}
        minLength={minLength}
        pattern={pattern}
        required={required}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        autoComplete={type === 'search' ? 'off' : undefined}
        spellCheck={type === 'search' ? false : undefined}
      />

      {/* Right Icons */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
        {/* Loading Indicator */}
        {loading && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
        )}

        {/* Clear Button */}
        {clearable && internalValue && !loading && (
          <button
            type="button"
            onClick={handleClear}
            className="text-gray-400 hover:text-gray-600 focus:outline-none mr-2"
            aria-label="Clear input"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Right Icon */}
        {rightIcon && !loading && (
          <div className="text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
    </div>
  );
});

DebouncedInput.displayName = 'DebouncedInput';

export default DebouncedInput;