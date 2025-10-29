import React from 'react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="typing-indicator">
      <div className="typing-avatar">
        <div className="ai-avatar">🤖</div>
      </div>
      
      <div className="typing-content">
        <div className="typing-bubble">
          <div className="typing-dots">
            <div className="dot dot-1"></div>
            <div className="dot dot-2"></div>
            <div className="dot dot-3"></div>
          </div>
          <div className="typing-text">Assistent denkt nach...</div>
        </div>
      </div>

      <style>{`
        .typing-indicator {
          display: flex;
          gap: 1rem;
          max-width: 85%;
          animation: fadeIn 0.3s ease-out;
        }

        .typing-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ai-avatar {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.9rem;
          font-weight: bold;
          position: relative;
          overflow: hidden;
        }

        .ai-avatar::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: shimmer 2s infinite;
        }

        .typing-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .typing-bubble {
          background: #2a2a2a;
          border: 1px solid #333;
          padding: 1rem 1.25rem;
          border-radius: 16px 16px 16px 4px;
          display: flex;
          align-items: center;
          gap: 1rem;
          min-height: 52px;
          position: relative;
          overflow: hidden;
        }

        .typing-bubble::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(0, 188, 212, 0.05), transparent);
          animation: wave 3s infinite;
        }

        .typing-dots {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .dot {
          width: 8px;
          height: 8px;
          background: #00bcd4;
          border-radius: 50%;
          animation: typingDots 1.4s infinite ease-in-out;
        }

        .dot-1 {
          animation-delay: 0ms;
        }

        .dot-2 {
          animation-delay: 200ms;
        }

        .dot-3 {
          animation-delay: 400ms;
        }

        .typing-text {
          color: #999;
          font-size: 0.85rem;
          font-style: italic;
          opacity: 0.8;
        }

        /* Animations */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes typingDots {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-12px);
            opacity: 1;
          }
        }

        @keyframes shimmer {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }

        @keyframes wave {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }

        /* Alternative animation for dots */
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        /* Breathing animation for the bubble */
        @keyframes breathe {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
        }

        .typing-bubble {
          animation: breathe 3s infinite ease-in-out;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .typing-indicator {
            max-width: 90%;
            gap: 0.75rem;
          }

          .typing-avatar,
          .ai-avatar {
            width: 32px;
            height: 32px;
            font-size: 0.8rem;
          }

          .typing-bubble {
            padding: 0.875rem 1rem;
            gap: 0.75rem;
            min-height: 48px;
          }

          .dot {
            width: 6px;
            height: 6px;
          }

          .typing-text {
            font-size: 0.8rem;
          }
        }

        @media (max-width: 480px) {
          .typing-indicator {
            max-width: 95%;
            gap: 0.5rem;
          }

          .typing-bubble {
            padding: 0.75rem;
            gap: 0.5rem;
            min-height: 44px;
            flex-direction: column;
            align-items: flex-start;
          }

          .typing-dots {
            align-self: center;
          }

          .typing-text {
            font-size: 0.75rem;
            text-align: center;
            width: 100%;
          }
        }

        /* High contrast mode */
        @media (prefers-contrast: high) {
          .typing-bubble {
            border-width: 2px;
            border-color: #555;
          }

          .dot {
            background: #fff;
          }

          .typing-text {
            color: #fff;
            font-weight: 600;
          }

          .ai-avatar {
            border: 2px solid #fff;
          }
        }

        /* Reduced motion preferences */
        @media (prefers-reduced-motion: reduce) {
          .typing-indicator {
            animation: none;
          }

          .dot {
            animation: none;
            opacity: 0.6;
          }

          .ai-avatar::before {
            animation: none;
          }

          .typing-bubble::before {
            animation: none;
          }

          .typing-bubble {
            animation: none;
          }

          /* Static indication for reduced motion */
          .typing-text::after {
            content: ' ⏳';
          }
        }

        /* Dark mode adjustments */
        @media (prefers-color-scheme: light) {
          .typing-bubble {
            background: #f5f5f5;
            border-color: #e0e0e0;
          }

          .typing-text {
            color: #666;
          }

          .dot {
            background: #2196f3;
          }
        }

        /* Print styles */
        @media print {
          .typing-indicator {
            display: none;
          }
        }

        /* Focus and accessibility */
        .typing-indicator[aria-live="polite"] {
          /* Screen reader will announce typing status */
        }

        /* Alternative dot styles for different moods */
        .typing-bubble.creative .dot {
          background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
          animation: typingDots 1.2s infinite ease-in-out, colorShift 3s infinite;
        }

        .typing-bubble.thinking .dot {
          background: #ffa726;
          animation: typingDots 1.8s infinite ease-in-out;
        }

        .typing-bubble.processing .dot {
          background: #66bb6a;
          animation: pulse 1s infinite ease-in-out;
        }

        @keyframes colorShift {
          0%, 100% { filter: hue-rotate(0deg); }
          50% { filter: hue-rotate(60deg); }
        }

        /* Accessibility improvements */
        @media (prefers-reduced-motion: no-preference) {
          .typing-indicator {
            /* Enhanced animations for users who prefer motion */
          }
        }

        /* RTL support */
        [dir="rtl"] .typing-bubble {
          border-radius: 16px 16px 4px 16px;
        }

        [dir="rtl"] .typing-indicator {
          flex-direction: row-reverse;
        }
      `}</style>
    </div>
  );
};

export default TypingIndicator;