import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowUp, Link, Mic, MicOff, Smile as SmileIcon } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Beschreibe deine Reisewünsche...",
  maxLength = 1000
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 120); // Max 5 lines
    textarea.style.height = `${newHeight}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  // Handle message input
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);
    }
  }, [maxLength]);

  // Handle send message
  const handleSend = useCallback(() => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled) return;

    onSendMessage(trimmedMessage);
    setMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, disabled, onSendMessage]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Voice recording functionality
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        // TODO: Convert audio to text using speech recognition
        console.log('Audio recorded:', audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Emoji picker data (simplified)
  const commonEmojis = ['😊', '👍', '❤️', '😄', '🤔', '👏', '🙌', '🎉', '✨', '🔥', '💯', '😍'];

  const handleEmojiSelect = useCallback((emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  }, []);

  // Character count color
  const getCharCountColor = () => {
    const ratio = message.length / maxLength;
    if (ratio > 0.9) return '#ff6b6b';
    if (ratio > 0.7) return '#ffa726';
    return '#999';
  };

  return (
    <div className="chat-input-container">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="emoji-picker">
          <div className="emoji-grid">
            {commonEmojis.map((emoji, index) => (
              <button
                key={index}
                className="emoji-btn"
                onClick={() => handleEmojiSelect(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="input-wrapper">
        {/* Attachment Button */}
        <button
          className="input-action-btn"
          title="Datei anhängen"
          disabled={disabled}
        >
          <Link size={18} />
        </button>

        {/* Text Input */}
        <div className="textarea-container">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="message-input"
            rows={1}
            maxLength={maxLength}
          />
          
          {/* Character Counter */}
          {message.length > maxLength * 0.8 && (
            <div 
              className="char-counter"
              style={{ color: getCharCountColor() }}
            >
              {message.length}/{maxLength}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="input-actions">
          {/* Emoji Button */}
          <button
            className="input-action-btn"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Emoji hinzufügen"
            disabled={disabled}
          >
            <SmileIcon size={18} />
          </button>

          {/* Voice Recording Button */}
          <button
            className={`input-action-btn voice-btn ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            title={isRecording ? "Aufnahme stoppen" : "Sprachnachricht"}
            disabled={disabled}
          >
            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Send Button */}
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={disabled || !message.trim()}
            title="Nachricht senden (Enter)"
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </div>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="recording-indicator">
          <div className="recording-pulse"></div>
          <span>Aufnahme läuft... Klicke zum Stoppen</span>
        </div>
      )}

      <style>{`
        .chat-input-container {
          padding: 1.5rem;
          border-top: 1px solid #333;
          background: #1a1a1a;
          position: relative;
        }

        .emoji-picker {
          position: absolute;
          bottom: 100%;
          left: 1.5rem;
          right: 1.5rem;
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 0.5rem;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.2s ease-out;
        }

        .emoji-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 0.5rem;
          max-height: 120px;
          overflow-y: auto;
        }

        .emoji-btn {
          background: none;
          border: none;
          font-size: 1.2rem;
          padding: 0.5rem;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .emoji-btn:hover {
          background: #333;
        }

        .input-wrapper {
          display: flex;
          align-items: flex-end;
          gap: 1rem;
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 16px;
          padding: 0.75rem;
          transition: border-color 0.2s ease;
        }

        .input-wrapper:focus-within {
          border-color: #00bcd4;
        }

        .input-action-btn {
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .input-action-btn:hover:not(:disabled) {
          color: #00bcd4;
          background: rgba(0, 188, 212, 0.1);
        }

        .input-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .textarea-container {
          flex: 1;
          position: relative;
        }

        .message-input {
          width: 100%;
          background: none;
          border: none;
          color: #fff;
          font-size: 0.95rem;
          line-height: 1.4;
          resize: none;
          outline: none;
          min-height: 24px;
          max-height: 120px;
          overflow-y: auto;
          font-family: inherit;
          padding: 0;
        }

        .message-input::placeholder {
          color: #666;
        }

        .message-input::-webkit-scrollbar {
          width: 4px;
        }

        .message-input::-webkit-scrollbar-track {
          background: transparent;
        }

        .message-input::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 2px;
        }

        .char-counter {
          position: absolute;
          bottom: -1.5rem;
          right: 0;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .input-actions {
          display: flex;
          gap: 0.25rem;
          align-items: center;
        }

        .voice-btn.recording {
          color: #ff4444;
          background: rgba(255, 68, 68, 0.1);
          animation: pulse 1s infinite;
        }

        .send-btn {
          background: #00bcd4;
          border: none;
          color: white;
          cursor: pointer;
          padding: 0.75rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          min-width: 48px;
          height: 48px;
        }

        .send-btn:hover:not(:disabled) {
          background: #00acc1;
          transform: scale(1.05);
        }

        .send-btn:active:not(:disabled) {
          transform: scale(0.95);
        }

        .send-btn:disabled {
          background: #444;
          cursor: not-allowed;
          transform: none;
        }

        .recording-indicator {
          position: absolute;
          top: -3rem;
          left: 50%;
          transform: translateX(-50%);
          background: #2a2a2a;
          border: 1px solid #ff4444;
          border-radius: 20px;
          padding: 0.5rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #ff4444;
          font-size: 0.85rem;
          font-weight: 500;
          animation: slideUp 0.2s ease-out;
        }

        .recording-pulse {
          width: 8px;
          height: 8px;
          background: #ff4444;
          border-radius: 50%;
          animation: pulse 1s infinite;
        }

        /* Animations */
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .chat-input-container {
            padding: 1rem;
          }

          .emoji-picker {
            left: 1rem;
            right: 1rem;
          }

          .emoji-grid {
            grid-template-columns: repeat(8, 1fr);
            gap: 0.375rem;
          }

          .emoji-btn {
            font-size: 1rem;
            padding: 0.375rem;
          }

          .input-wrapper {
            gap: 0.75rem;
            padding: 0.625rem;
          }

          .input-action-btn {
            padding: 0.375rem;
          }

          .send-btn {
            min-width: 44px;
            height: 44px;
            padding: 0.625rem;
          }
        }

        @media (max-width: 480px) {
          .chat-input-container {
            padding: 0.75rem;
          }

          .input-wrapper {
            gap: 0.5rem;
            padding: 0.5rem;
          }

          .emoji-picker {
            left: 0.75rem;
            right: 0.75rem;
          }

          .recording-indicator {
            left: 0.75rem;
            right: 0.75rem;
            transform: none;
            font-size: 0.8rem;
          }
        }

        /* High contrast mode */
        @media (prefers-contrast: high) {
          .input-wrapper {
            border-width: 2px;
          }

          .send-btn:disabled {
            border: 2px solid #666;
          }

          .emoji-picker {
            border-width: 2px;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .emoji-picker,
          .recording-indicator {
            animation: none;
          }

          .voice-btn.recording,
          .recording-pulse {
            animation: none;
          }

          .send-btn:hover,
          .send-btn:active {
            transform: none;
          }
        }

        /* Focus management */
        .input-action-btn:focus,
        .send-btn:focus,
        .emoji-btn:focus {
          outline: 2px solid #00bcd4;
          outline-offset: 2px;
        }

        .message-input:focus {
          outline: none;
        }

        /* Dark mode support */
        @media (prefers-color-scheme: light) {
          .chat-input-container {
            background: #f5f5f5;
            border-top-color: #e0e0e0;
          }

          .input-wrapper {
            background: #fff;
            border-color: #e0e0e0;
          }

          .message-input {
            color: #333;
          }

          .message-input::placeholder {
            color: #999;
          }

          .emoji-picker {
            background: #fff;
            border-color: #e0e0e0;
          }

          .recording-indicator {
            background: #fff;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatInput;