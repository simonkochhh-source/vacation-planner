import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowUp, Link, Mic, MicOff, Heart, Camera, Plus } from 'lucide-react';
import { useResponsive } from '../../hooks/useResponsive';

interface MobileOptimizedChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

const MobileOptimizedChatInput: React.FC<MobileOptimizedChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Was suchst du? 🗺️",
  maxLength = 1000
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const { isMobile, isTouchDevice } = useResponsive();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Social Media style quick actions
  const quickActions = [
    { icon: <Camera size={20} />, label: 'Foto teilen', action: 'photo' },
    { icon: <Mic size={20} />, label: 'Sprachnachricht', action: 'voice' },
    { icon: <Link size={20} />, label: 'Link teilen', action: 'link' },
    { icon: <Heart size={20} />, label: 'Favorit', action: 'favorite' }
  ];

  // Auto-resize for mobile (optimized for thumb typing)
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    // Mobile optimized max height (5 lines for better UX)
    const maxHeight = isMobile ? 100 : 120;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, [isMobile]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  const handleSend = useCallback(() => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      setShowQuickActions(false);
    }
  }, [message, disabled, onSendMessage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const inputContainerStyle = {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-full)',
    border: '2px solid var(--color-outline-variant)',
    padding: 'var(--space-2)',
    margin: 'var(--space-3)',
    display: 'flex',
    alignItems: 'flex-end',
    gap: 'var(--space-2)',
    transition: 'all var(--motion-duration-short)',
    // Mobile optimized z-index for keyboard
    position: 'relative',
    zIndex: 10,
    // Better shadow for mobile
    boxShadow: isMobile ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
  };

  const textareaStyle = {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: 'var(--color-on-surface)',
    fontSize: isMobile ? '16px' : '14px', // Prevent zoom on iOS
    lineHeight: '1.4',
    padding: 'var(--space-2)',
    resize: 'none' as const,
    fontFamily: 'inherit',
    minHeight: isMobile ? '44px' : '36px', // Touch-friendly
    maxHeight: isMobile ? '100px' : '120px'
  };

  const buttonStyle = {
    minWidth: isMobile ? '48px' : '40px',
    minHeight: isMobile ? '48px' : '40px',
    borderRadius: '50%',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all var(--motion-duration-short)',
    background: message.trim() ? 'var(--color-primary)' : 'var(--color-surface-variant)',
    color: message.trim() ? 'var(--color-on-primary)' : 'var(--color-on-surface-variant)',
    // Better touch feedback for mobile
    transform: 'scale(1)',
    ...(isTouchDevice && {
      WebkitTapHighlightColor: 'transparent',
      touchAction: 'manipulation'
    })
  };

  const quickActionStyle = {
    padding: 'var(--space-2) var(--space-3)',
    background: 'var(--color-surface-container)',
    border: '1px solid var(--color-outline-variant)',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    cursor: 'pointer',
    fontSize: isMobile ? '14px' : '12px',
    transition: 'all var(--motion-duration-short)',
    minHeight: isMobile ? '44px' : '36px' // Touch-friendly
  };

  return (
    <>
      {/* Quick Actions Bar (Social Media Style) */}
      {showQuickActions && (
        <div style={{
          padding: 'var(--space-3)',
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-outline-variant)',
          display: 'flex',
          gap: 'var(--space-2)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {quickActions.map((action, index) => (
            <button
              key={index}
              style={quickActionStyle}
              onClick={() => {
                // Handle quick action
                console.log(`Quick action: ${action.action}`);
                setShowQuickActions(false);
              }}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Input Container */}
      <div style={inputContainerStyle}>
        {/* Plus Button for Quick Actions */}
        <button
          style={{
            ...buttonStyle,
            background: 'var(--color-surface-variant)',
            color: 'var(--color-on-surface-variant)'
          }}
          onClick={() => setShowQuickActions(!showQuickActions)}
          aria-label="Schnellaktionen"
        >
          <Plus 
            size={isMobile ? 20 : 18} 
            style={{
              transform: showQuickActions ? 'rotate(45deg)' : 'rotate(0deg)',
              transition: 'transform var(--motion-duration-short)'
            }}
          />
        </button>

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          style={textareaStyle}
          aria-label="Nachricht eingeben"
          // Mobile optimizations
          autoCapitalize="sentences"
          autoCorrect="on"
          spellCheck="true"
        />

        {/* Voice/Send Button */}
        <button
          style={buttonStyle}
          onClick={message.trim() ? handleSend : () => setIsRecording(!isRecording)}
          disabled={disabled}
          aria-label={message.trim() ? "Nachricht senden" : "Sprachnachricht aufnehmen"}
          onTouchStart={isTouchDevice ? (e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          } : undefined}
          onTouchEnd={isTouchDevice ? (e) => {
            e.currentTarget.style.transform = 'scale(1)';
          } : undefined}
        >
          {message.trim() ? (
            <ArrowUp size={isMobile ? 20 : 18} />
          ) : isRecording ? (
            <MicOff size={isMobile ? 20 : 18} />
          ) : (
            <Mic size={isMobile ? 20 : 18} />
          )}
        </button>
      </div>
    </>
  );
};

export default MobileOptimizedChatInput;