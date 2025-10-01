import React, { useEffect, useRef, useState } from 'react';
import { ChatMessageWithSender, chatService } from '../../services/chatService';
import { useAuth } from '../../contexts/AuthContext';
import LocationMessage from './LocationMessage';

interface ChatMessagesProps {
  chatRoomId: string;
  messages: ChatMessageWithSender[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  onReplyToMessage?: (message: ChatMessageWithSender) => void;
  avatarSize?: 'sm' | 'md' | 'lg';
}


const ChatMessages: React.FC<ChatMessagesProps> = ({
  chatRoomId: _chatRoomId,
  messages,
  onLoadMore,
  hasMore = false,
  loading = false,
  onReplyToMessage,
  avatarSize = 'md'
}) => {
  const { user, userProfile } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Avatar size configuration
  const avatarSizes = {
    sm: { size: 24, className: 'w-6 h-6' },
    md: { size: 32, className: 'w-8 h-8' },
    lg: { size: 40, className: 'w-10 h-10' }
  };
  
  const currentAvatarSize = avatarSizes[avatarSize];

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


  const getMessageDisplayName = (message: ChatMessageWithSender): string => {
    // For current user's messages, prioritize their profile data from context
    if (message.sender_id === user?.id) {
      // Try userProfile from context first, then sender data, then email fallbacks
      return userProfile?.nickname || 
             userProfile?.display_name ||
             message.sender?.nickname || 
             message.sender?.display_name || 
             message.sender?.email?.split('@')[0] ||
             user?.email?.split('@')[0] || 
             'Sie';
    }
    
    // For other users, use profile data with email fallback
    return message.sender?.nickname || 
           message.sender?.display_name || 
           message.sender?.email?.split('@')[0] ||
           'Unbekannter Benutzer';
  };

  const getMessageAvatar = (message: ChatMessageWithSender): string => {
    // For current user, prioritize avatar from userProfile context
    if (message.sender_id === user?.id && userProfile?.avatar_url) {
      return userProfile.avatar_url;
    }
    
    // Use avatar from message sender data
    if (message.sender.avatar_url) {
      return message.sender.avatar_url;
    }
    
    // Generate SVG avatar with first letter of display name
    const name = getMessageDisplayName(message);
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#4A90A4"/>
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
      style={{ 
        height: '100%',
        overflowY: 'auto',
        padding: '16px 16px 0',
        background: 'var(--chat-bg, #ffffff)',
        scrollBehavior: 'smooth'
      }}
      onScroll={handleScroll}
    >
      {/* Modern Load more indicator */}
      {hasMore && (
        <div className="text-center py-3">
          {loading ? (
            <div 
              className="px-4 py-2 rounded-full inline-block text-sm"
              style={{
                color: 'var(--color-text-secondary)',
                backgroundColor: 'var(--color-neutral-mist)'
              }}
            >
              ⏳ Lade weitere Nachrichten...
            </div>
          ) : (
            <button
              onClick={onLoadMore}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: 'var(--color-neutral-cream)',
                color: 'var(--color-primary-ocean)',
                border: '1px solid var(--color-border)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-neutral-mist)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-neutral-cream)';
              }}
            >
              📜 Weitere Nachrichten laden
            </button>
          )}
        </div>
      )}

      {/* Message groups by date */}
      {messageGroups.map(({ date, messages: groupMessages }, groupIndex) => (
        <div key={groupIndex}>
          {/* Modern Date separator */}
          <div className="flex items-center justify-center my-6">
            <div 
              className="text-xs px-4 py-2 rounded-full shadow-sm font-medium"
              style={{
                background: 'linear-gradient(135deg, var(--color-neutral-cream) 0%, var(--color-neutral-mist) 100%)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)'
              }}
            >
              📅 {date}
            </div>
          </div>

          {/* Messages for this date */}
          {groupMessages.map((message, messageIndex) => {
            const isOwnMessage = message.sender_id === user?.id;
            const prevMessage = messageIndex > 0 ? groupMessages[messageIndex - 1] : undefined;
            const isConsecutive = isConsecutiveMessage(message, prevMessage);
            // Always show avatar and sender name for all messages
            const showAvatar = true;
            const showSender = true;

            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${
                  isConsecutive ? 'mt-1' : 'mt-4'
                }`}
              >
                <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} max-w-[70%]`}>
                  {/* Modern Avatar */}
                  <div className={`${isOwnMessage ? 'ml-3' : 'mr-3'}`}>
                    {showAvatar ? (
                      <img
                        src={getMessageAvatar(message)}
                        alt={getMessageDisplayName(message)}
                        className={`${currentAvatarSize.className} rounded-full object-cover shadow-md`}
                        style={{ 
                          border: '2px solid var(--color-surface)',
                          backgroundColor: 'var(--color-surface)',
                          width: `${currentAvatarSize.size}px`,
                          height: `${currentAvatarSize.size}px`,
                          minWidth: `${currentAvatarSize.size}px`,
                          minHeight: `${currentAvatarSize.size}px`,
                          maxWidth: `${currentAvatarSize.size}px`,
                          maxHeight: `${currentAvatarSize.size}px`
                        }}
                      />
                    ) : (
                      <div className={currentAvatarSize.className} />
                    )}
                  </div>

                  {/* Message content */}
                  <div className="flex flex-col">
                    {/* Modern Sender name */}
                    {showSender && (
                      <div 
                        className="text-xs mb-2 px-3 font-medium"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {getMessageDisplayName(message)}
                      </div>
                    )}

                    {/* Modern Reply preview */}
                    {message.reply_message && (
                      <div 
                        className="mx-3 mb-2 p-3 rounded-lg text-sm shadow-sm"
                        style={{
                          background: 'linear-gradient(135deg, var(--color-neutral-cream) 0%, var(--color-neutral-mist) 100%)',
                          borderLeft: '4px solid var(--color-primary-ocean)'
                        }}
                      >
                        <div 
                          className="text-xs font-semibold mb-1"
                          style={{ color: 'var(--color-primary-ocean)' }}
                        >
                          💬 {message.reply_message.sender_nickname || 'Unbekannt'}
                        </div>
                        <div 
                          className="truncate"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {message.reply_message.content}
                        </div>
                      </div>
                    )}

                    {/* Message bubble */}
                    <div className="relative group">
                      <div
                        className={`${message.message_type === 'location' ? 'p-0' : 'px-4 py-3'} rounded-2xl shadow-sm ${message.is_deleted ? 'italic opacity-60' : ''}`}
                        style={{
                          maxWidth: message.message_type === 'location' ? '350px' : '400px',
                          wordBreak: 'break-word',
                          lineHeight: '1.5',
                          ...(message.message_type === 'location' ? {
                            backgroundColor: 'transparent',
                            border: 'none'
                          } : isOwnMessage ? {
                            background: 'linear-gradient(135deg, var(--color-primary-ocean) 0%, var(--color-secondary-forest) 100%)',
                            color: 'var(--color-surface)'
                          } : {
                            backgroundColor: 'var(--color-surface)',
                            color: 'var(--color-text-primary)',
                            border: '1px solid var(--color-border)'
                          })
                        }}
                      >
                        {/* Message content */}
                        {editingMessage === message.id && message.message_type !== 'location' ? (
                          <div className="space-y-2">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full p-2 rounded text-sm resize-none"
                              style={{
                                border: '1px solid var(--color-border)',
                                backgroundColor: 'var(--color-surface)',
                                color: 'var(--color-text-primary)'
                              }}
                              rows={2}
                              autoFocus
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleSaveEdit(message.id)}
                                className="text-xs px-2 py-1 rounded"
                                style={{
                                  backgroundColor: 'var(--color-primary-ocean)',
                                  color: 'var(--color-surface)'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'var(--color-secondary-forest)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'var(--color-primary-ocean)';
                                }}
                              >
                                Speichern
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="text-xs px-2 py-1 rounded"
                                style={{
                                  backgroundColor: 'var(--color-neutral-stone)',
                                  color: 'var(--color-surface)'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'var(--color-neutral-charcoal)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'var(--color-neutral-stone)';
                                }}
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
                            ) : message.message_type === 'location' ? (
                              /* Location messages */
                              <LocationMessage
                                location={{
                                  latitude: message.metadata?.latitude || 0,
                                  longitude: message.metadata?.longitude || 0,
                                  accuracy: message.metadata?.accuracy,
                                  address: message.metadata?.address,
                                  timestamp: message.metadata?.timestamp || new Date(message.created_at).getTime()
                                }}
                                isOwnMessage={isOwnMessage}
                                senderName={getMessageDisplayName(message)}
                              />
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

                      </div>

                      {/* Timestamp and edit indicator */}
                      <div 
                        className={`text-xs mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
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
        <div 
          className="text-center py-8"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <div className="text-lg mb-2">Noch keine Nachrichten</div>
          <div className="text-sm">Beginnen Sie ein Gespräch!</div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} style={{ height: '16px' }} />
    </div>
  );
};

export default ChatMessages;