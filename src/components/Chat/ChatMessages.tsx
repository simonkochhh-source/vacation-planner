import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Edit3, Trash2, MoreHorizontal } from 'lucide-react';
import { ChatMessageWithSender, chatService } from '../../services/chatService';
import { useAuth } from '../../contexts/AuthContext';

interface ChatMessagesProps {
  chatRoomId: string;
  messages: ChatMessageWithSender[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  onReplyToMessage?: (message: ChatMessageWithSender) => void;
}

interface MessageMenuProps {
  message: ChatMessageWithSender;
  isOwnMessage: boolean;
  onReply: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose: () => void;
}

const MessageMenu: React.FC<MessageMenuProps> = ({
  message,
  isOwnMessage,
  onReply,
  onEdit,
  onDelete,
  onClose
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div 
      ref={menuRef}
      className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-32"
    >
      <button
        onClick={onReply}
        className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        <MessageSquare className="w-4 h-4" />
        <span>Antworten</span>
      </button>
      
      {isOwnMessage && !message.is_deleted && (
        <>
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Edit3 className="w-4 h-4" />
              <span>Bearbeiten</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>Löschen</span>
            </button>
          )}
        </>
      )}
    </div>
  );
};

const ChatMessages: React.FC<ChatMessagesProps> = ({
  chatRoomId,
  messages,
  onLoadMore,
  hasMore = false,
  loading = false,
  onReplyToMessage
}) => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current || loading || !hasMore) return;

    const { scrollTop } = messagesContainerRef.current;
    if (scrollTop < 100) {
      onLoadMore?.();
    }
  };

  const handleMessageMenu = (messageId: string) => {
    setActiveMenu(activeMenu === messageId ? null : messageId);
  };

  const handleReply = (message: ChatMessageWithSender) => {
    onReplyToMessage?.(message);
    setActiveMenu(null);
  };

  const handleEdit = (message: ChatMessageWithSender) => {
    setEditingMessage(message.id);
    setEditContent(message.content);
    setActiveMenu(null);
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editContent.trim()) return;

    try {
      await chatService.editMessage(messageId, editContent.trim());
      setEditingMessage(null);
      setEditContent('');
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditContent('');
  };

  const handleDelete = async (messageId: string) => {
    if (window.confirm('Möchten Sie diese Nachricht wirklich löschen?')) {
      try {
        await chatService.deleteMessage(messageId);
        setActiveMenu(null);
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    }
  };

  const getMessageDisplayName = (message: ChatMessageWithSender): string => {
    return message.sender.nickname || 
           message.sender.display_name || 
           'Unbekannter Benutzer';
  };

  const getMessageAvatar = (message: ChatMessageWithSender): string => {
    if (message.sender.avatar_url) {
      return message.sender.avatar_url;
    }
    
    const name = getMessageDisplayName(message);
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#3B82F6"/>
        <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">
          ${name.charAt(0).toUpperCase()}
        </text>
      </svg>
    `)}`;
  };

  const isConsecutiveMessage = (currentMessage: ChatMessageWithSender, prevMessage?: ChatMessageWithSender): boolean => {
    if (!prevMessage) return false;
    
    const isSameSender = currentMessage.sender_id === prevMessage.sender_id;
    const timeDiff = new Date(currentMessage.created_at).getTime() - new Date(prevMessage.created_at).getTime();
    const isWithinMinutes = timeDiff < 2 * 60 * 1000; // 2 minutes
    
    return isSameSender && isWithinMinutes;
  };

  const formatMessageTime = (timestamp: string): string => {
    return chatService.formatMessageTime(timestamp);
  };

  const groupMessagesByDate = (messages: ChatMessageWithSender[]) => {
    const groups: { date: string; messages: ChatMessageWithSender[] }[] = [];
    let currentDate = '';
    let currentGroup: ChatMessageWithSender[] = [];

    messages.forEach(message => {
      const messageDate = new Date(message.created_at).toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = messageDate;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div 
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
      onScroll={handleScroll}
    >
      {/* Load more indicator */}
      {hasMore && (
        <div className="text-center py-2">
          {loading ? (
            <div className="text-gray-500">Lade weitere Nachrichten...</div>
          ) : (
            <button
              onClick={onLoadMore}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Weitere Nachrichten laden
            </button>
          )}
        </div>
      )}

      {/* Message groups by date */}
      {messageGroups.map(({ date, messages: groupMessages }, groupIndex) => (
        <div key={groupIndex}>
          {/* Date separator */}
          <div className="flex items-center justify-center my-4">
            <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
              {date}
            </div>
          </div>

          {/* Messages for this date */}
          {groupMessages.map((message, messageIndex) => {
            const isOwnMessage = message.sender_id === user?.id;
            const prevMessage = messageIndex > 0 ? groupMessages[messageIndex - 1] : undefined;
            const isConsecutive = isConsecutiveMessage(message, prevMessage);
            const showAvatar = !isConsecutive;
            const showSender = !isConsecutive && !isOwnMessage;

            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${
                  isConsecutive ? 'mt-1' : 'mt-4'
                }`}
              >
                <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} max-w-[70%]`}>
                  {/* Avatar */}
                  <div className={`${isOwnMessage ? 'ml-2' : 'mr-2'}`}>
                    {showAvatar ? (
                      <img
                        src={getMessageAvatar(message)}
                        alt={getMessageDisplayName(message)}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8" />
                    )}
                  </div>

                  {/* Message content */}
                  <div className="flex flex-col">
                    {/* Sender name */}
                    {showSender && (
                      <div className="text-xs text-gray-500 mb-1 px-2">
                        {getMessageDisplayName(message)}
                      </div>
                    )}

                    {/* Reply preview */}
                    {message.reply_message && (
                      <div className="mx-2 mb-1 p-2 bg-gray-100 border-l-2 border-gray-300 rounded text-sm">
                        <div className="text-xs text-gray-500 font-semibold">
                          {message.reply_message.sender_nickname || 'Unbekannt'}
                        </div>
                        <div className="text-gray-700 truncate">
                          {message.reply_message.content}
                        </div>
                      </div>
                    )}

                    {/* Message bubble */}
                    <div className="relative group">
                      <div
                        className={`px-3 py-2 rounded-lg ${
                          isOwnMessage
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-900'
                        } ${message.is_deleted ? 'italic opacity-60' : ''}`}
                      >
                        {/* Message content */}
                        {editingMessage === message.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded text-gray-900 text-sm resize-none"
                              rows={2}
                              autoFocus
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleSaveEdit(message.id)}
                                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                              >
                                Speichern
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                              >
                                Abbrechen
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* System messages */}
                            {message.message_type === 'system' ? (
                              <div className="text-center text-sm font-medium">
                                {message.content}
                              </div>
                            ) : (
                              <>
                                {/* Regular message content */}
                                <div className="break-words">
                                  {message.content}
                                </div>

                                {/* Message metadata */}
                                {(message.message_type === 'image' || message.message_type === 'file') && (
                                  <div className="text-xs opacity-75 mt-1">
                                    [{message.message_type === 'image' ? 'Bild' : 'Datei'}]
                                  </div>
                                )}
                              </>
                            )}
                          </>
                        )}

                        {/* Message actions menu button */}
                        {message.message_type !== 'system' && editingMessage !== message.id && (
                          <button
                            onClick={() => handleMessageMenu(message.id)}
                            className="absolute -right-8 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
                          >
                            <MoreHorizontal className="w-4 h-4 text-gray-500" />
                          </button>
                        )}

                        {/* Message menu */}
                        {activeMenu === message.id && (
                          <MessageMenu
                            message={message}
                            isOwnMessage={isOwnMessage}
                            onReply={() => handleReply(message)}
                            onEdit={!message.is_deleted ? () => handleEdit(message) : undefined}
                            onDelete={!message.is_deleted ? () => handleDelete(message.id) : undefined}
                            onClose={() => setActiveMenu(null)}
                          />
                        )}
                      </div>

                      {/* Timestamp and edit indicator */}
                      <div className={`text-xs text-gray-400 mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                        {formatMessageTime(message.created_at)}
                        {message.is_edited && ' (bearbeitet)'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Empty state */}
      {messages.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-8">
          <div className="text-lg mb-2">Noch keine Nachrichten</div>
          <div className="text-sm">Beginnen Sie ein Gespräch!</div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;