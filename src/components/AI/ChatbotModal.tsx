import React, { useEffect, useCallback, useRef } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { ChatbotModalProps } from '../../types/ai';
import { useAI } from '../../contexts/AIContext';
import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import './ChatbotModal.css';

const ChatbotModal: React.FC<ChatbotModalProps> = ({
  isOpen,
  onClose,
  tripData,
  onRouteAccept
}) => {
  const {
    currentSession,
    messages,
    isLoading,
    isTyping,
    error,
    generatedRoute,
    sendMessage,
    sendQuickAction,
    acceptRoute,
    startNewSession,
    resetSession
  } = useAI();

  const modalRef = useRef<HTMLDivElement>(null);
  const [isMaximized, setIsMaximized] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);

  // Initialize session when modal opens
  useEffect(() => {
    if (isOpen && !currentSession) {
      startNewSession(tripData);
    }
  }, [isOpen, currentSession, startNewSession, tripData]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle route acceptance
  const handleRouteAccept = useCallback(async (route: any) => {
    console.log('handleRouteAccept called with route:', route);
    try {
      console.log('Calling acceptRoute...');
      await acceptRoute(route);
      console.log('Calling onRouteAccept...');
      await onRouteAccept(route);
      console.log('Both functions completed successfully');
      
      // Show success animation
      setIsAnimating(true);
      setTimeout(() => {
        setIsAnimating(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Route acceptance failed:', error);
    }
  }, [acceptRoute, onRouteAccept, onClose]);

  // Handle modal close
  const handleClose = useCallback(() => {
    if (isAnimating) return;
    
    // Fade out animation
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
      onClose();
    }, 300);
  }, [onClose, isAnimating]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  // Toggle maximize
  const toggleMaximize = useCallback(() => {
    setIsMaximized(!isMaximized);
  }, [isMaximized]);

  // Handle message send
  const handleSendMessage = useCallback(async (message: string) => {
    if (!currentSession || isLoading) return;
    await sendMessage(message);
  }, [currentSession, isLoading, sendMessage]);

  // Handle quick action
  const handleQuickAction = useCallback(async (action: any) => {
    if (!currentSession || isLoading) return;
    
    // Special handling for route acceptance
    if (action.id === 'accept' && generatedRoute) {
      console.log('Quick action accept - calling handleRouteAccept with:', generatedRoute);
      await handleRouteAccept(generatedRoute);
      return;
    }
    
    await sendQuickAction(action);
  }, [currentSession, isLoading, generatedRoute, sendQuickAction, handleRouteAccept]);

  if (!isOpen) return null;

  return (
    <div 
      className={`chatbot-overlay ${isAnimating ? 'animating' : ''}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chatbot-title"
    >
      <div 
        ref={modalRef}
        className={`chatbot-container ${isMaximized ? 'maximized' : ''} ${isAnimating ? 'success-animation' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <ChatHeader
          tripName={tripData.name}
          isTyping={isTyping}
          error={error}
          onClose={handleClose}
          onMaximize={toggleMaximize}
          isMaximized={isMaximized}
        />

        {/* Messages Area */}
        <div className="chatbot-content">
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            isTyping={isTyping}
            error={error}
            onQuickAction={handleQuickAction}
            onRouteAccept={handleRouteAccept}
          />
        </div>

        {/* Input Area */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isLoading || !currentSession}
          placeholder={
            error 
              ? "Fehler aufgetreten - bitte erneut versuchen..."
              : isTyping 
              ? "KI tippt gerade..."
              : "Beschreibe deine Reisewünsche..."
          }
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="chatbot-loading-overlay">
            <div className="loading-spinner">
              <div className="spinner-ring"></div>
              <div className="loading-text">KI erstellt Vorschläge...</div>
            </div>
          </div>
        )}

        {/* Success Animation Overlay */}
        {isAnimating && (
          <div className="success-overlay">
            <div className="success-animation">
              <div className="success-checkmark">
                <div className="check-icon">✓</div>
              </div>
              <div className="success-text">
                <h3>Route übernommen! 🎉</h3>
                <p>Deine Reiseplanung wurde erfolgreich erstellt.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatbotModal;