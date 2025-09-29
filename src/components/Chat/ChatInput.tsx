import React, { useState, useRef, KeyboardEvent } from 'react';
import { ArrowUp, Plus, Camera, MapPin } from 'lucide-react';
import { MessageType, SendMessageParams } from '../../services/chatService';

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

  const isSubmitDisabled = !message.trim() || isSending || disabled;

  return (
    <div className="bg-white border-t border-gray-200 p-3">
      {/* Reply preview */}
      {replyTo && (
        <div className="mb-3 p-2 bg-gray-50 border-l-4 border-blue-500 rounded">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-blue-600 font-semibold">
                Antwort an {replyTo.senderName}
              </div>
              <div className="text-sm text-gray-600 truncate">
                {replyTo.content}
              </div>
            </div>
            <button
              onClick={onCancelReply}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        {/* Attachment button */}
        <div className="relative">
          <button
            type="button"
            onClick={handleAttachmentClick}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            disabled={disabled || isSending}
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Attachment menu */}
          {showAttachments && (
            <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Camera className="w-4 h-4" />
                <span>Bild</span>
              </button>
              <button
                type="button"
                className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                disabled
              >
                <MapPin className="w-4 h-4" />
                <span>Standort</span>
              </button>
            </div>
          )}
        </div>

        {/* Message input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || isSending}
            className="w-full resize-none border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: '44px', maxHeight: '120px' }}
            rows={1}
          />
        </div>

        {/* Emoji button (placeholder) */}
        <button
          type="button"
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          disabled={disabled || isSending}
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Send button */}
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className={`p-2 rounded-lg transition-colors ${
            isSubmitDisabled
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          title="Nachricht senden"
        >
          <ArrowUp className="w-5 h-5" />
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

      {/* Typing indicator placeholder */}
      {isSending && (
        <div className="mt-2 text-xs text-gray-500">
          Sende...
        </div>
      )}
    </div>
  );
};

export default ChatInput;