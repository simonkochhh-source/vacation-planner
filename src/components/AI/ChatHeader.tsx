import React from 'react';
import { X, Maximize2, Minimize2, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { AIError } from '../../types/ai';

interface ChatHeaderProps {
  tripName: string;
  isTyping: boolean;
  error: AIError | null;
  onClose: () => void;
  onMaximize: () => void;
  isMaximized: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  tripName,
  isTyping,
  error,
  onClose,
  onMaximize,
  isMaximized
}) => {
  const getStatusInfo = () => {
    if (error) {
      return {
        icon: <AlertCircle size={16} />,
        text: 'Verbindungsfehler',
        color: '#ff6b6b'
      };
    }
    
    if (isTyping) {
      return {
        icon: <div className="typing-dots"><span></span><span></span><span></span></div>,
        text: 'Assistent tippt...',
        color: '#00bcd4'
      };
    }
    
    return {
      icon: <Wifi size={16} />,
      text: 'Online',
      color: '#4caf50'
    };
  };

  const status = getStatusInfo();

  return (
    <div className="chatbot-header">
      <div className="chatbot-title">
        <div className="ai-avatar">
          <div className="avatar-inner">🤖</div>
          <div className="avatar-pulse"></div>
        </div>
        <div className="title-info">
          <h3>Trailkeeper Assistent</h3>
          <div className="subtitle-container">
            <span className="trip-name">{tripName}</span>
            <div className="status-indicator" style={{ color: status.color }}>
              {status.icon}
              <span>{status.text}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="header-actions">
        <button
          className="header-action-btn"
          onClick={onMaximize}
          title={isMaximized ? "Verkleinern" : "Vollbild"}
          aria-label={isMaximized ? "Verkleinern" : "Vollbild"}
        >
          {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
        
        <button
          className="header-action-btn close-btn"
          onClick={onClose}
          title="Schließen"
          aria-label="Chat schließen"
        >
          <X size={18} />
        </button>
      </div>

      <style>{`
        .chatbot-header {
          padding: 1.5rem;
          border-bottom: 1px solid #333;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #2a2a2a;
          min-height: 80px;
        }

        .chatbot-title {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
        }

        .ai-avatar {
          position: relative;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .avatar-inner {
          color: white;
          font-size: 1.2rem;
          font-weight: bold;
          z-index: 2;
          position: relative;
        }

        .avatar-pulse {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          animation: pulse 2s infinite;
          z-index: 1;
        }

        .title-info {
          flex: 1;
        }

        .title-info h3 {
          margin: 0;
          color: #fff;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .subtitle-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 0.25rem;
        }

        .trip-name {
          color: #999;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .typing-dots {
          display: flex;
          gap: 2px;
        }

        .typing-dots span {
          width: 4px;
          height: 4px;
          background: #00bcd4;
          border-radius: 50%;
          animation: typingDots 1.4s infinite ease-in-out;
        }

        .typing-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }

        .header-actions {
          display: flex;
          gap: 0.5rem;
        }

        .header-action-btn {
          width: 36px;
          height: 36px;
          background: #333;
          border: none;
          border-radius: 8px;
          color: #999;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .header-action-btn:hover {
          background: #444;
          color: #fff;
          transform: scale(1.05);
        }

        .header-action-btn:active {
          transform: scale(0.95);
        }

        .close-btn:hover {
          background: #ff4444;
          color: #fff;
        }

        .header-action-btn:focus {
          outline: 2px solid #00bcd4;
          outline-offset: 2px;
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes typingDots {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-8px);
            opacity: 1;
          }
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .chatbot-header {
            padding: 1rem;
            min-height: 70px;
          }

          .ai-avatar {
            width: 40px;
            height: 40px;
          }

          .avatar-inner {
            font-size: 1rem;
          }

          .title-info h3 {
            font-size: 1rem;
          }

          .subtitle-container {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }

          .trip-name {
            font-size: 0.8rem;
          }

          .status-indicator {
            font-size: 0.75rem;
          }

          .header-action-btn {
            width: 32px;
            height: 32px;
          }
        }

        @media (max-width: 480px) {
          .chatbot-header {
            padding: 0.75rem;
          }

          .chatbot-title {
            gap: 0.75rem;
          }

          .title-info h3 {
            font-size: 0.95rem;
          }
        }

        /* High contrast mode */
        @media (prefers-contrast: high) {
          .ai-avatar {
            border: 2px solid #fff;
          }

          .header-action-btn {
            border: 1px solid #666;
          }

          .status-indicator {
            font-weight: 600;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .avatar-pulse,
          .typing-dots span {
            animation: none;
          }

          .header-action-btn:hover {
            transform: none;
          }

          .header-action-btn:active {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatHeader;