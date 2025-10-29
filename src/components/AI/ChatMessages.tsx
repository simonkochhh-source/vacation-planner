import React, { useEffect, useRef, useCallback } from 'react';
import { ChatMessage as ChatMessageType, QuickAction, GeneratedRoute } from '../../types/ai';
import ChatMessage from './ChatMessage';
import QuickActions from './QuickActions';
import TypingIndicator from './TypingIndicator';
import RoutePreview from './RoutePreview';

interface ChatMessagesProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  isTyping: boolean;
  error: any;
  onQuickAction: (action: QuickAction) => void;
  onRouteAccept: (route: GeneratedRoute) => void;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isLoading,
  isTyping,
  error,
  onQuickAction,
  onRouteAccept
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = React.useState(true);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, [autoScroll]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Check if user has scrolled up to disable auto-scroll
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    setAutoScroll(isAtBottom);
  }, []);

  // Get welcome message if no messages exist
  const getWelcomeMessage = (): ChatMessageType => ({
    id: 'welcome',
    content: `Hallo! Ich bin dein Trailkeeper Assistent und helfe dir dabei, eine perfekte Kroatien-Rundreise zu planen. 🇭🇷

Erzähl mir von deinen Interessen und Vorlieben, damit ich dir personalisierte Vorschläge machen kann!`,
    sender: 'ai',
    timestamp: new Date(),
    type: 'text',
    status: 'sent',
    metadata: {
      actions: [
        { id: 'culture', label: '🏛️ Geschichte & Kultur', icon: '🏛️', message: 'Ich interessiere mich für Geschichte und Kultur', category: 'interest' },
        { id: 'beach', label: '🏖️ Strand & Meer', icon: '🏖️', message: 'Ich liebe Strände und Wassersport', category: 'interest' },
        { id: 'nature', label: '🌲 Natur & Wandern', icon: '🌲', message: 'Ich bin ein Naturliebhaber', category: 'interest' },
        { id: 'food', label: '🍷 Kulinarik', icon: '🍷', message: 'Ich mag gutes Essen und Wein', category: 'interest' }
      ]
    }
  });

  const displayMessages = messages.length === 0 ? [getWelcomeMessage()] : messages;

  return (
    <div className="chat-messages-container">
      <div 
        className="chat-messages"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {displayMessages.map((message, index) => (
          <div key={message.id} className="message-wrapper">
            <ChatMessage
              message={message}
              isUser={message.sender === 'user'}
              onActionClick={onQuickAction}
              onRouteAccept={onRouteAccept}
            />
            
            {/* Show quick actions after AI messages */}
            {message.sender === 'ai' && message.metadata?.actions && (
              <QuickActions
                actions={message.metadata.actions}
                onActionSelect={onQuickAction}
                loading={isLoading}
              />
            )}
            
            {/* Show route preview for route messages */}
            {message.type === 'route_preview' && message.metadata?.route && (
              <RoutePreview
                route={message.metadata.route}
                onAccept={() => onRouteAccept(message.metadata!.route!)}
                onModify={() => {/* TODO: Implement modify */}}
                onReject={() => {/* TODO: Implement reject */}}
                loading={isLoading}
              />
            )}
          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && <TypingIndicator />}
        
        {/* Error message */}
        {error && (
          <div className="error-message">
            <div className="error-content">
              <span className="error-icon">⚠️</span>
              <div className="error-text">
                <p>Es gab ein Problem bei der Verarbeitung deiner Anfrage.</p>
                <button 
                  className="retry-button"
                  onClick={() => window.location.reload()}
                >
                  Erneut versuchen
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Scroll to bottom button */}
      {!autoScroll && (
        <button
          className="scroll-to-bottom"
          onClick={scrollToBottom}
          title="Zu neuen Nachrichten scrollen"
        >
          ↓ Neue Nachrichten
        </button>
      )}

      <style>{`
        .chat-messages-container {
          flex: 1;
          position: relative;
          overflow: hidden;
        }

        .chat-messages {
          height: 100%;
          overflow-y: auto;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          scroll-behavior: smooth;
        }

        .chat-messages::-webkit-scrollbar {
          width: 6px;
        }

        .chat-messages::-webkit-scrollbar-track {
          background: #2a2a2a;
        }

        .chat-messages::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 3px;
        }

        .chat-messages::-webkit-scrollbar-thumb:hover {
          background: #555;
        }

        .message-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .error-message {
          display: flex;
          justify-content: center;
          padding: 1rem;
        }

        .error-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: #2a1a1a;
          border: 1px solid #ff4444;
          border-radius: 12px;
          padding: 1rem 1.5rem;
          max-width: 400px;
        }

        .error-icon {
          font-size: 1.5rem;
        }

        .error-text {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .error-text p {
          margin: 0;
          color: #ff6b6b;
          font-size: 0.9rem;
        }

        .retry-button {
          background: #ff4444;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          font-size: 0.8rem;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .retry-button:hover {
          background: #ff3333;
        }

        .scroll-to-bottom {
          position: absolute;
          bottom: 1rem;
          right: 1rem;
          background: #00bcd4;
          color: white;
          border: none;
          border-radius: 20px;
          padding: 0.5rem 1rem;
          font-size: 0.8rem;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 188, 212, 0.3);
          transition: all 0.2s ease;
          z-index: 10;
        }

        .scroll-to-bottom:hover {
          background: #00acc1;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 188, 212, 0.4);
        }

        .scroll-to-bottom:active {
          transform: translateY(0);
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .chat-messages {
            padding: 1rem;
            gap: 0.75rem;
          }

          .error-content {
            flex-direction: column;
            text-align: center;
            gap: 0.75rem;
          }

          .scroll-to-bottom {
            bottom: 0.5rem;
            right: 0.5rem;
            padding: 0.4rem 0.8rem;
            font-size: 0.75rem;
          }
        }

        @media (max-width: 480px) {
          .chat-messages {
            padding: 0.75rem;
          }

          .error-content {
            margin: 0 0.5rem;
            padding: 0.75rem 1rem;
          }

          .error-text p {
            font-size: 0.8rem;
          }

          .retry-button {
            padding: 0.4rem 0.8rem;
            font-size: 0.75rem;
          }
        }

        /* High contrast mode */
        @media (prefers-contrast: high) {
          .error-content {
            border-width: 2px;
          }

          .scroll-to-bottom {
            border: 2px solid #fff;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .chat-messages {
            scroll-behavior: auto;
          }

          .scroll-to-bottom:hover {
            transform: none;
          }

          .scroll-to-bottom:active {
            transform: none;
          }
        }

        /* Focus management */
        .retry-button:focus,
        .scroll-to-bottom:focus {
          outline: 2px solid #00bcd4;
          outline-offset: 2px;
        }

        /* Print styles */
        @media print {
          .scroll-to-bottom {
            display: none;
          }

          .error-message {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatMessages;