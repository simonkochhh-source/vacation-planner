import React, { useState, useRef, KeyboardEvent } from 'react';
import { ArrowUp, Plus, Camera, MapPin } from 'lucide-react';
import { MessageType, SendMessageParams } from '../../services/chatService';
import LocationPicker from './LocationPicker';

interface ChatInputProps {
  chatRoomId: string;
  onSendMessage: (params: SendMessageParams) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  replyTo?: {
    id: string;
    content: string;
    senderName: string;
  };
  onCancelReply?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  chatRoomId,
  onSendMessage,
  disabled = false,
  placeholder = "Nachricht eingeben...",
  replyTo,
  onCancelReply
}) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!message.trim() || isSending || disabled) return;

    try {
      setIsSending(true);
      
      await onSendMessage({
        chat_room_id: chatRoomId,
        content: message.trim(),
        message_type: 'text',
        reply_to: replyTo?.id
      });

      setMessage('');
      onCancelReply?.();
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const handleFileUpload = async (file: File, messageType: MessageType) => {
    if (disabled || isSending) return;

    try {
      setIsSending(true);
      
      // Here you would upload the file to storage and get the URL
      // For now, we'll just send a placeholder message
      await onSendMessage({
        chat_room_id: chatRoomId,
        content: `[${messageType === 'image' ? 'Bild' : 'Datei'}: ${file.name}]`,
        message_type: messageType,
        metadata: {
          filename: file.name,
          filesize: file.size,
          mimetype: file.type
        }
      });

      setShowAttachments(false);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file, 'image');
    }
  };

  const handleAttachmentClick = () => {
    setShowAttachments(!showAttachments);
  };

  const handleLocationClick = () => {
    setShowAttachments(false);
    setShowLocationPicker(true);
  };

  const handleLocationSend = async (locationData: any) => {
    if (disabled || isSending) return;

    try {
      setIsSending(true);
      
      await onSendMessage({
        chat_room_id: chatRoomId,
        content: locationData.address || `Standort: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`,
        message_type: 'location',
        metadata: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          address: locationData.address,
          timestamp: locationData.timestamp
        }
      });
    } catch (error) {
      console.error('Error sending location:', error);
    } finally {
      setIsSending(false);
    }
  };

  const isSubmitDisabled = !message.trim() || isSending || disabled;

  return (
    <div style={{
      background: 'var(--chat-input-container-bg, linear-gradient(135deg, #ffffff 0%, #f8fafc 100%))',
      borderTop: '1px solid var(--chat-border, #e5e7eb)',
      padding: '12px 16px',
      borderRadius: '0 0 0 16px',
      flexShrink: 0 // Verhindert, dass sich der Input-Bereich zusammenzieht
    }}>
      {/* Modern Reply preview */}
      {replyTo && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          background: 'var(--chat-reply-bg, linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%))',
          borderLeft: '4px solid #2563eb',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.1)'
        }}>
          <div className="flex items-center justify-between">
            <div>
              <div style={{
                fontSize: '12px',
                color: 'var(--chat-reply-text, #1d4ed8)',
                fontWeight: '600',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>💬</span>
                Antwort an {replyTo.senderName}
              </div>
              <div style={{
                fontSize: '14px',
                color: '#4b5563',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '250px'
              }}>
                {replyTo.content}
              </div>
            </div>
            <button
              onClick={onCancelReply}
              style={{
                padding: '6px',
                border: 'none',
                background: '#f3f4f6',
                borderRadius: '8px',
                cursor: 'pointer',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '28px',
                minHeight: '28px',
                transition: 'all 0.2s ease-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--chat-button-hover-bg, #e5e7eb)';
                e.currentTarget.style.color = 'var(--chat-button-hover-text, #374151)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--chat-button-bg, #f3f4f6)';
                e.currentTarget.style.color = 'var(--chat-button-text, #6b7280)';
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'var(--chat-input-bg, #ffffff)',
        padding: '8px 12px',
        borderRadius: '24px',
        border: '1px solid var(--chat-border, #e5e7eb)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Modern Attachment button */}
        <div className="relative">
          <button
            type="button"
            onClick={handleAttachmentClick}
            style={{
              padding: '6px',
              border: 'none',
              background: 'transparent',
              borderRadius: '50%',
              cursor: disabled || isSending ? 'not-allowed' : 'pointer',
              color: disabled || isSending ? '#9ca3af' : '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '32px',
              minHeight: '32px',
              transition: 'all 0.2s ease-out'
            }}
            disabled={disabled || isSending}
            onMouseEnter={(e) => {
              if (!disabled && !isSending) {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.color = '#374151';
              }
            }}
            onMouseLeave={(e) => {
              if (!disabled && !isSending) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#6b7280';
              }
            }}
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Modern Attachment menu */}
          {showAttachments && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              marginBottom: '8px',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
              padding: '4px',
              minWidth: '140px',
              zIndex: 10
            }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: '#374151',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderRadius: '12px',
                  transition: 'background-color 0.15s ease-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Camera className="w-4 h-4" style={{ color: '#2563eb' }} />
                <span>Bild</span>
              </button>
              <button
                type="button"
                onClick={handleLocationClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: disabled || isSending ? '#9ca3af' : '#374151',
                  border: 'none',
                  background: 'transparent',
                  cursor: disabled || isSending ? 'not-allowed' : 'pointer',
                  borderRadius: '12px',
                  transition: 'background-color 0.15s ease-out'
                }}
                disabled={disabled || isSending}
                onMouseEnter={(e) => {
                  if (!disabled && !isSending) {
                    e.currentTarget.style.background = '#f3f4f6';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <MapPin className="w-4 h-4" style={{ color: '#10b981' }} />
                <span>Standort</span>
              </button>
            </div>
          )}
        </div>

        {/* Modern Message input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || isSending}
            style={{
              width: '100%',
              resize: 'none',
              border: 'none',
              borderRadius: '20px',
              padding: '10px 16px',
              fontSize: '14px',
              lineHeight: '1.4',
              fontFamily: 'inherit',
              background: '#f8fafc',
              color: '#111827',
              minHeight: '36px',
              maxHeight: '100px',
              transition: 'all 0.2s ease-out',
              outline: 'none',
              opacity: disabled || isSending ? 0.6 : 1,
              cursor: disabled || isSending ? 'not-allowed' : 'text'
            }}
            onFocus={(e) => {
              e.target.style.background = '#f1f5f9';
            }}
            onBlur={(e) => {
              e.target.style.background = '#f8fafc';
            }}
            rows={1}
          />
        </div>


        {/* Modern Send button */}
        <button
          type="submit"
          disabled={isSubmitDisabled}
          style={{
            padding: '8px',
            border: 'none',
            background: isSubmitDisabled 
              ? '#e5e7eb'
              : '#2563eb',
            borderRadius: '50%',
            cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '36px',
            minHeight: '36px',
            transition: 'all 0.2s ease-out',
            boxShadow: !isSubmitDisabled ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none'
          }}
          title="Nachricht senden"
          onMouseEnter={(e) => {
            if (!isSubmitDisabled) {
              e.currentTarget.style.background = '#1d4ed8';
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSubmitDisabled) {
              e.currentTarget.style.background = '#2563eb';
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.3)';
            }
          }}
        >
          <ArrowUp className="w-4 h-4" />
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </form>

      {/* Modern Typing indicator */}
      {isSending && (
        <div style={{
          marginTop: '8px',
          fontSize: '12px',
          color: '#6b7280',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: '#f8fafc',
          borderRadius: '16px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            background: '#2563eb',
            borderRadius: '50%',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
          <span>Sende...</span>
        </div>
      )}

      {/* Location Picker Modal */}
      <LocationPicker
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSendLocation={handleLocationSend}
        disabled={disabled || isSending}
      />
    </div>
  );
};

export default ChatInput;