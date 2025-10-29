import React, { useState, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, Copy, MoreHorizontal, Star } from 'lucide-react';
import { ChatMessageProps, UserFeedback } from '../../types/ai';
import { useAI } from '../../contexts/AIContext';

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isUser,
  onActionClick,
  onFeedback,
  onRouteAccept
}) => {
  const { provideFeedback } = useAI();
  const [copied, setCopied] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);

  // Copy message content to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  }, [message.content]);

  // Handle feedback submission
  const handleFeedback = useCallback(async (rating: number) => {
    const feedback: UserFeedback = {
      messageId: message.id,
      rating: rating as 1 | 2 | 3 | 4 | 5,
      timestamp: new Date(),
      feedbackType: 'overall'
    };

    setUserRating(rating);
    setShowFeedback(false);

    try {
      await provideFeedback(message.id, feedback);
      if (onFeedback) {
        onFeedback(feedback);
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  }, [message.id, provideFeedback, onFeedback]);

  // Format timestamp
  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <div className="status-sending">⏳</div>;
      case 'sent':
        return <div className="status-sent">✓</div>;
      case 'error':
        return <div className="status-error">⚠️</div>;
      default:
        return null;
    }
  };

  return (
    <div className={`message ${isUser ? 'user' : 'ai'}`}>
      {/* Avatar */}
      <div className="message-avatar">
        {isUser ? (
          <div className="user-avatar">👤</div>
        ) : (
          <div className="ai-avatar">🤖</div>
        )}
      </div>

      {/* Message Content */}
      <div className="message-content">
        <div className="message-bubble">
          <div className="message-text">
            {message.content.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>

          {/* Cost information for route messages */}
          {message.metadata?.cost && (
            <div className="message-cost">
              <span className="cost-label">Geschätzte Kosten:</span>
              <span className="cost-value">~{message.metadata.cost}€</span>
            </div>
          )}

          {/* Message footer */}
          <div className="message-footer">
            <span className="message-time">
              {formatTime(message.timestamp)}
            </span>
            {getStatusIcon()}
          </div>
        </div>

        {/* Message actions (only for AI messages) */}
        {!isUser && message.status === 'sent' && (
          <div className="message-actions">
            <button
              className="action-btn"
              onClick={handleCopy}
              title={copied ? "Kopiert!" : "Kopieren"}
            >
              <Copy size={14} />
              {copied && <span className="copied-text">Kopiert!</span>}
            </button>

            <button
              className="action-btn"
              onClick={() => setShowFeedback(!showFeedback)}
              title="Bewerten"
            >
              <Star size={14} fill={userRating ? '#ffd700' : 'none'} />
            </button>

            <button
              className="action-btn"
              title="Mehr Optionen"
            >
              <MoreHorizontal size={14} />
            </button>
          </div>
        )}

        {/* Feedback panel */}
        {showFeedback && (
          <div className="feedback-panel">
            <div className="feedback-header">
              <span>Wie hilfreich war diese Antwort?</span>
            </div>
            <div className="feedback-stars">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  className={`star-btn ${userRating === rating ? 'active' : ''}`}
                  onClick={() => handleFeedback(rating)}
                  title={`${rating} Stern${rating > 1 ? 'e' : ''}`}
                >
                  <Star 
                    size={16} 
                    fill={rating <= (userRating || 0) ? '#ffd700' : 'none'}
                  />
                </button>
              ))}
            </div>
            <div className="feedback-actions">
              <button 
                className="feedback-cancel"
                onClick={() => setShowFeedback(false)}
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {/* User feedback display */}
        {userRating && (
          <div className="feedback-display">
            <span className="feedback-thanks">
              Danke für dein Feedback! 
              {userRating >= 4 ? ' 😊' : userRating >= 3 ? ' 👍' : ' 📝'}
            </span>
          </div>
        )}
      </div>

      <style>{`
        .message {
          display: flex;
          gap: 1rem;
          max-width: 85%;
          animation: messageSlideIn 0.3s ease-out;
        }

        .message.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .message-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          font-weight: bold;
        }

        .ai-avatar {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .user-avatar {
          background: #00bcd4;
          color: white;
        }

        .message-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .message-bubble {
          background: ${isUser ? '#00bcd4' : '#2a2a2a'};
          color: ${isUser ? 'white' : '#ffffff'};
          padding: 1rem 1.25rem;
          border-radius: 16px;
          border: 1px solid ${isUser ? 'transparent' : '#333'};
          position: relative;
          word-wrap: break-word;
        }

        .message.user .message-bubble {
          border-radius: 16px 16px 4px 16px;
        }

        .message.ai .message-bubble {
          border-radius: 16px 16px 16px 4px;
        }

        .message-text p {
          margin: 0;
          line-height: 1.5;
        }

        .message-text p:not(:last-child) {
          margin-bottom: 0.5rem;
        }

        .message-cost {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1rem;
          padding: 0.75rem;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .cost-label {
          font-size: 0.85rem;
          opacity: 0.8;
        }

        .cost-value {
          font-weight: 600;
          color: #4caf50;
        }

        .message-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.75rem;
          padding-top: 0.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .message-time {
          font-size: 0.75rem;
          opacity: 0.7;
        }

        .status-sending,
        .status-sent,
        .status-error {
          font-size: 0.75rem;
        }

        .status-error {
          color: #ff6b6b;
        }

        .message-actions {
          display: flex;
          gap: 0.25rem;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .message:hover .message-actions {
          opacity: 1;
        }

        .action-btn {
          background: #333;
          border: none;
          border-radius: 6px;
          padding: 0.5rem;
          color: #999;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          transition: all 0.2s ease;
          position: relative;
        }

        .action-btn:hover {
          background: #444;
          color: #fff;
        }

        .copied-text {
          position: absolute;
          top: -2rem;
          left: 50%;
          transform: translateX(-50%);
          background: #333;
          color: #4caf50;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.7rem;
          white-space: nowrap;
          animation: fadeInOut 2s ease-out;
        }

        .feedback-panel {
          background: #333;
          border: 1px solid #444;
          border-radius: 12px;
          padding: 1rem;
          margin-top: 0.5rem;
          animation: slideDown 0.2s ease-out;
        }

        .feedback-header {
          font-size: 0.85rem;
          color: #ccc;
          margin-bottom: 0.75rem;
        }

        .feedback-stars {
          display: flex;
          gap: 0.25rem;
          margin-bottom: 0.75rem;
        }

        .star-btn {
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .star-btn:hover,
        .star-btn.active {
          color: #ffd700;
          background: rgba(255, 215, 0, 0.1);
        }

        .feedback-actions {
          display: flex;
          justify-content: flex-end;
        }

        .feedback-cancel {
          background: none;
          border: 1px solid #555;
          color: #ccc;
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.8rem;
          transition: all 0.2s ease;
        }

        .feedback-cancel:hover {
          background: #444;
          border-color: #666;
        }

        .feedback-display {
          background: rgba(76, 175, 80, 0.1);
          border: 1px solid rgba(76, 175, 80, 0.3);
          border-radius: 8px;
          padding: 0.5rem 0.75rem;
          margin-top: 0.5rem;
        }

        .feedback-thanks {
          color: #4caf50;
          font-size: 0.8rem;
          font-weight: 500;
        }

        /* Animations */
        @keyframes messageSlideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInOut {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .message {
            max-width: 90%;
            gap: 0.75rem;
          }

          .message-avatar {
            width: 32px;
            height: 32px;
            font-size: 0.8rem;
          }

          .message-bubble {
            padding: 0.875rem 1rem;
          }

          .message-actions {
            opacity: 1; /* Always visible on mobile */
          }

          .action-btn {
            padding: 0.4rem;
          }

          .feedback-panel {
            padding: 0.75rem;
          }

          .feedback-stars {
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .message {
            max-width: 95%;
            gap: 0.5rem;
          }

          .message-bubble {
            padding: 0.75rem;
          }

          .message-cost {
            flex-direction: column;
            gap: 0.25rem;
            text-align: center;
          }

          .star-btn {
            padding: 0.375rem;
          }
        }

        /* High contrast mode */
        @media (prefers-contrast: high) {
          .message-bubble {
            border-width: 2px;
          }

          .action-btn {
            border: 1px solid #666;
          }

          .feedback-panel {
            border-width: 2px;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .message,
          .feedback-panel,
          .copied-text {
            animation: none;
          }

          .action-btn:hover {
            transform: none;
          }
        }

        /* Focus management */
        .action-btn:focus,
        .star-btn:focus,
        .feedback-cancel:focus {
          outline: 2px solid #00bcd4;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
};

export default ChatMessage;