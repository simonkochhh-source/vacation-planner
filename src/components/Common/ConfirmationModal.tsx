import React from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { useResponsive } from '../../hooks/useResponsive';

export interface ConfirmationModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Handler for closing the modal */
  onClose: () => void;
  /** Handler for confirmation action */
  onConfirm: () => void;
  /** Modal title */
  title: string;
  /** Modal message/description */
  message: string;
  /** Type of confirmation modal */
  type?: 'danger' | 'warning' | 'info' | 'success';
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Loading state for confirm button */
  loading?: boolean;
  /** Disable confirm button */
  confirmDisabled?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'Bestätigen',
  cancelText = 'Abbrechen',
  loading = false,
  confirmDisabled = false
}) => {
  const { isMobile } = useResponsive();

  // Icon and style mapping for different types
  const typeConfig = {
    danger: {
      icon: <XCircle size={24} />,
      iconColor: 'var(--color-error)',
      confirmVariant: 'danger' as const
    },
    warning: {
      icon: <AlertTriangle size={24} />,
      iconColor: 'var(--color-warning)',
      confirmVariant: 'warning' as const
    },
    info: {
      icon: <Info size={24} />,
      iconColor: 'var(--color-primary-ocean)',
      confirmVariant: 'primary' as const
    },
    success: {
      icon: <CheckCircle size={24} />,
      iconColor: 'var(--color-success)',
      confirmVariant: 'success' as const
    }
  };

  const config = typeConfig[type];

  const handleConfirm = () => {
    if (!loading && !confirmDisabled) {
      onConfirm();
    }
  };

  const footer = (
    <>
      <Button
        variant="secondary"
        onClick={onClose}
        disabled={loading}
        size={isMobile ? 'sm' : 'md'}
      >
        {cancelText}
      </Button>
      <Button
        variant={config.confirmVariant}
        onClick={handleConfirm}
        loading={loading}
        disabled={confirmDisabled}
        size={isMobile ? 'sm' : 'md'}
      >
        {confirmText}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      size="sm"
      closeOnBackdropClick={!loading}
      closeOnEscape={!loading}
    >
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-md)',
          alignItems: 'flex-start'
        }}
      >
        <div
          style={{
            color: config.iconColor,
            flexShrink: 0,
            marginTop: '2px'
          }}
        >
          {config.icon}
        </div>
        
        <div style={{ flex: 1 }}>
          <p
            style={{
              margin: 0,
              color: 'var(--color-text-primary)',
              lineHeight: 1.6,
              fontSize: 'var(--text-base)'
            }}
          >
            {message}
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;