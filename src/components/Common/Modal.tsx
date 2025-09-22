import React, { useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { useResponsive } from '../../hooks/useResponsive';
import { getResponsiveTextSize } from '../../utils/responsive';
import Button from './Button';

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Handler for closing the modal */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal subtitle/description */
  subtitle?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Modal size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Show close button in header */
  showCloseButton?: boolean;
  /** Close modal when clicking backdrop */
  closeOnBackdropClick?: boolean;
  /** Close modal when pressing escape */
  closeOnEscape?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Custom header content (replaces title/subtitle) */
  header?: React.ReactNode;
  /** Footer content */
  footer?: React.ReactNode;
  /** Prevent modal content scrolling */
  preventScroll?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className = '',
  header,
  footer,
  preventScroll = false
}) => {
  const { isMobile } = useResponsive();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Memoize escape handler to prevent unnecessary re-renders
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Memoize backdrop click handler
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnBackdropClick) {
      onClose();
    }
  }, [closeOnBackdropClick, onClose]);

  // Handle escape key with optimized event listener
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, handleEscape]);

  // Focus management and body scroll prevention
  useEffect(() => {
    if (!isOpen) return;

    // Store previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Prevent body scroll
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    // Focus the modal container
    if (modalRef.current) {
      modalRef.current.focus();
    }
    
    return () => {
      // Restore body scroll
      document.body.style.overflow = originalStyle;
      
      // Restore focus to previously focused element
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  // Focus trapping
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }, []);

  if (!isOpen) return null;

  // Size configurations
  const sizeStyles = {
    sm: {
      maxWidth: '400px',
      maxHeight: '300px'
    },
    md: {
      maxWidth: '600px',
      maxHeight: '500px'
    },
    lg: {
      maxWidth: '800px',
      maxHeight: '700px'
    },
    xl: {
      maxWidth: '1000px',
      maxHeight: '800px'
    },
    full: {
      maxWidth: '95vw',
      maxHeight: '95vh'
    }
  };

  // Mobile adjustments
  const modalStyles = isMobile ? {
    maxWidth: '95vw',
    maxHeight: '90vh',
    margin: 'var(--space-md)'
  } : {
    ...sizeStyles[size],
    margin: 'var(--space-xl)'
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: isMobile ? 'var(--space-md)' : 'var(--space-xl)'
      }}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`modal-content ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        aria-describedby={subtitle ? "modal-subtitle" : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
          ...modalStyles
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(header || title || showCloseButton) && (
          <div
            className="modal-header"
            style={{
              padding: isMobile ? 'var(--space-md)' : 'var(--space-lg)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 'var(--space-md)'
            }}
          >
            {header || (
              <div style={{ flex: 1 }}>
                {title && (
                  <h2
                    id="modal-title"
                    className="modal-title"
                    style={{
                      margin: 0,
                      fontSize: getResponsiveTextSize('xl', isMobile),
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-text-primary)',
                      fontFamily: 'var(--font-heading)'
                    }}
                  >
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p
                    id="modal-subtitle"
                    className="modal-subtitle"
                    style={{
                      margin: title ? 'var(--space-xs) 0 0 0' : '0',
                      fontSize: getResponsiveTextSize('sm', isMobile),
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.5
                    }}
                  >
                    {subtitle}
                  </p>
                )}
              </div>
            )}

            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="Close modal"
                style={{
                  padding: 'var(--space-sm)',
                  minWidth: 'auto',
                  color: 'var(--color-text-secondary)'
                }}
              >
                <X size={20} />
              </Button>
            )}
          </div>
        )}

        {/* Content */}
        <div
          className="modal-body"
          style={{
            flex: 1,
            padding: isMobile ? 'var(--space-md)' : 'var(--space-lg)',
            overflow: preventScroll ? 'hidden' : 'auto',
            color: 'var(--color-text-primary)'
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="modal-footer"
            style={{
              padding: isMobile ? 'var(--space-md)' : 'var(--space-lg)',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              gap: 'var(--space-md)',
              justifyContent: 'flex-end',
              flexWrap: 'wrap'
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;