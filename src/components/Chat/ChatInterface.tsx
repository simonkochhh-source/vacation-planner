import React, { useState, useEffect, useCallback } from 'react';
import { X, Users, Settings, ChevronLeft, ChevronRight, Maximize2, Minimize2, ArrowLeft } from 'lucide-react';
import { 
  ChatRoomWithInfo, 
  ChatMessageWithSender, 
  chatService, 
  SendMessageParams 
} from '../../services/chatService';
import { UserWithStatus, userStatusService } from '../../services/userStatusService';
import { useAuth } from '../../contexts/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';
import ChatRoomList from './ChatRoomList';
import ChatRoomHeader from './ChatRoomHeader';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  initialRoomId?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  isOpen,
  onClose,
  initialRoomId
}) => {
  const { user } = useAuth();
  const { isMobile } = useResponsive();
  
  // State management
  const [rooms, setRooms] = useState<ChatRoomWithInfo[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | undefined>(initialRoomId);
  const [messages, setMessages] = useState<ChatMessageWithSender[]>([]);
  const [roomParticipants, setRoomParticipants] = useState<UserWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessageWithSender | null>(null);
  
  // Chat window resize states - Two sizes: small (default) and large
  const [isSmallMode, setIsSmallMode] = useState(true); // Default to small mode
  const smallWidth = 300; // Smaller to fit between sidebars
  const largeWidth = 400; // Reduced to fit between sidebars
  const [headerHeight, setHeaderHeight] = useState(64); // Dynamic header height

  // Mark messages as read (defined early to avoid hoisting issues)
  const markMessagesAsRead = useCallback(async (roomId: string) => {
    try {
      await chatService.markMessagesAsRead(roomId);
      // Update room unread count in local state
      setRooms(prev => prev.map(room => 
        room.id === roomId ? { ...room, unread_count: 0 } : room
      ));
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }, []);

  // Initialize chat service and load rooms
  useEffect(() => {
    if (isOpen && user) {
      initializeChat();
    }
  }, [isOpen, user]);

  // Set initial active room
  useEffect(() => {
    if (initialRoomId && rooms.length > 0) {
      setActiveRoomId(initialRoomId);
    }
  }, [initialRoomId, rooms]);

  // Load messages when active room changes
  useEffect(() => {
    if (activeRoomId) {
      loadMessages(activeRoomId);
      loadRoomParticipants(activeRoomId);
      markMessagesAsRead(activeRoomId);
    }
  }, [activeRoomId]);

  // Subscribe to room updates (separate from message subscriptions)
  useEffect(() => {
    let roomUnsubscribe: (() => void) | null = null;

    if (isOpen) {
      roomUnsubscribe = chatService.subscribeToRoomUpdates((updatedRooms) => {
        setRooms(updatedRooms);
      });
    }

    return () => {
      roomUnsubscribe?.();
    };
  }, [isOpen]);

  // Subscribe to messages for active room (separate subscription)
  useEffect(() => {
    let messageUnsubscribe: (() => void) | null = null;

    if (isOpen && activeRoomId) {
      messageUnsubscribe = chatService.subscribeToMessages(activeRoomId, (newMessage) => {
        setMessages(prev => [...prev, newMessage]);
        // Use the current activeRoomId from the closure
        markMessagesAsRead(activeRoomId);
      });
    }

    return () => {
      messageUnsubscribe?.();
    };
  }, [isOpen, activeRoomId, markMessagesAsRead]);

  // Calculate dynamic header height
  useEffect(() => {
    const calculateHeaderHeight = () => {
      // Look for header element (simple and reliable)
      const header = document.querySelector('header') || 
                     document.querySelector('[role="banner"]') || 
                     document.querySelector('.header');
      
      if (header) {
        const rect = header.getBoundingClientRect();
        const newHeight = rect.bottom;
        setHeaderHeight(newHeight);
        
        // Also set CSS custom property for other components
        document.documentElement.style.setProperty('--header-height', `${newHeight}px`);
      }
    };

    // Calculate immediately and on resize
    calculateHeaderHeight();
    
    const handleResize = () => calculateHeaderHeight();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Also recalculate when layout might change
    const observer = new MutationObserver(() => {
      setTimeout(calculateHeaderHeight, 100);
    });
    
    const header = document.querySelector('header');
    if (header) {
      observer.observe(header, { 
        attributes: true, 
        childList: true, 
        subtree: true 
      });
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      observer.disconnect();
    };
  }, [isOpen]);

  const initializeChat = async () => {
    try {
      setLoading(true);
      
      // Initialize services
      await chatService.initialize();
      await userStatusService.initialize();
      
      // Load initial data
      await loadRooms();
    } catch (error) {
      console.error('Failed to initialize chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRooms = async () => {
    try {
      const userRooms = await chatService.getUserChatRooms();
      setRooms(userRooms);
      
      // If no active room and we have rooms, select the first one
      if (!activeRoomId && userRooms.length > 0) {
        setActiveRoomId(userRooms[0].id);
      }
    } catch (error) {
      console.error('Failed to load rooms:', error);
    }
  };

  const loadMessages = async (roomId: string, before?: string) => {
    try {
      setMessagesLoading(true);
      const roomMessages = await chatService.getMessages(roomId, 50, before);
      
      if (before) {
        // Prepend older messages
        setMessages(prev => [...roomMessages, ...prev]);
      } else {
        // Set initial messages
        setMessages(roomMessages);
      }
      
      setHasMoreMessages(roomMessages.length === 50);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const loadRoomParticipants = async (roomId: string) => {
    try {
      // This would need to be implemented in chatService
      // For now, we'll use mock data
      setRoomParticipants([]);
    } catch (error) {
      console.error('Failed to load room participants:', error);
    }
  };


  const handleRoomSelect = (roomId: string) => {
    setActiveRoomId(roomId);
    setReplyToMessage(null);
  };

  const handleSendMessage = async (params: SendMessageParams) => {
    try {
      await chatService.sendMessage(params);
      // Message will be added via real-time subscription
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  const handleLoadMoreMessages = useCallback(() => {
    if (activeRoomId && messages.length > 0 && !messagesLoading) {
      const oldestMessage = messages[0];
      loadMessages(activeRoomId, oldestMessage.created_at);
    }
  }, [activeRoomId, messages, messagesLoading]);

  const handleReplyToMessage = (message: ChatMessageWithSender) => {
    setReplyToMessage(message);
  };

  const handleCancelReply = () => {
    setReplyToMessage(null);
  };

  // Chat window control functions
  const handleToggleSize = () => {
    setIsSmallMode(!isSmallMode);
  };

  // Mobile-first chat positioning with dynamic header height and safe area support
  const getChatStyle = () => {
    const currentWidth = isSmallMode ? smallWidth : largeWidth;
    
    if (isMobile) {
      // Full-screen mobile chat with modern bright design
      return {
        position: 'fixed' as const,
        top: `${headerHeight}px`,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--chat-bg, #ffffff)', // Adaptive background
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column' as const,
        borderRadius: '20px 20px 0 0', // Rounder top corners
        transition: 'transform 0.3s ease-out',
        boxShadow: '0 -4px 25px rgba(0, 0, 0, 0.1), 0 -2px 10px rgba(0, 0, 0, 0.05)',
        paddingBottom: 'env(safe-area-inset-bottom)', // Safe area für iOS
        maxHeight: `calc(100vh - ${headerHeight}px)`, // Verhindert Überlauf
        overflow: 'hidden' // Wichtig für das interne Flex-Layout
      };
    }
    
    // Desktop chat positioning with modern styling
    return {
      position: 'fixed' as const,
      top: `${headerHeight}px`,
      left: 'var(--social-sidebar-width, 320px)',
      bottom: 0,
      width: `${currentWidth}px`,
      background: 'var(--chat-bg, #ffffff)', // Adaptive background
      zIndex: 800,
      display: 'flex',
      flexDirection: 'column' as const,
      border: '1px solid var(--chat-border, #e5e7eb)', // Adaptive border
      borderLeft: '3px solid #2563eb', // Blue accent border
      borderRadius: '16px 0 0 0', // Rounded top-left corner
      transition: 'width 0.3s ease-out, box-shadow 0.2s ease-out',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.05)',
      maxHeight: `calc(100vh - ${headerHeight}px)`, // Verhindert Überlauf
      overflow: 'hidden' // Wichtig für das interne Flex-Layout
    };
  };

  const handleNewChat = async () => {
    // This would open a user selection dialog
    // For now, we'll just log
    console.log('New chat requested');
  };

  const handleNewGroup = async () => {
    // This would open a group creation dialog
    // For now, we'll just log
    console.log('New group requested');
  };

  // Get current room
  const activeRoom = rooms.find(room => room.id === activeRoomId);

  if (!isOpen) return null;

  return (
    <div 
      className="chat-interface" 
      data-theme="dark" 
      style={{
        ...getChatStyle(),
        // Zusätzliche Styles für bessere Mobile-Unterstützung
        ...(isMobile && {
          height: '100dvh', // Dynamic viewport height für moderne Browser (Fallback: 100vh)
          maxHeight: '100dvh'
        })
      }}
    >
      {/* Modern Chat Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: isMobile ? '16px 20px' : '12px 16px',
        borderBottom: '1px solid var(--chat-border-light, #f3f4f6)', // Adaptive light border
        background: 'var(--chat-header-bg, linear-gradient(135deg, #f8fafc 0%, #ffffff 100%))', // Adaptive gradient
        minHeight: isMobile ? '60px' : '56px',
        gap: isMobile ? '12px' : '10px',
        borderRadius: isMobile ? '20px 20px 0 0' : '16px 0 0 0' // Match container radius
      }}>
        {/* Mobile back button or desktop room title */}
        {isMobile ? (
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              border: 'none',
              background: 'var(--chat-button-bg, #f3f4f6)', // Adaptive button background
              borderRadius: '12px', // More rounded
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--chat-button-text, #374151)', // Adaptive text color
              minWidth: '40px',
              minHeight: '40px',
              transition: 'all 0.2s ease-out'
            }}
            aria-label="Chat schließen"
          >
            <ArrowLeft size={20} />
          </button>
        ) : null}

        {/* Modern Room Title */}
        <div style={{
          flex: 1,
          fontSize: isMobile ? '18px' : '16px', // Larger, more readable
          fontWeight: '600', // Bolder for better hierarchy
          color: 'var(--chat-text-primary, #111827)', // Adaptive primary text
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ 
            color: '#2563eb', 
            fontSize: '20px',
            lineHeight: '1'
          }}>💬</span>
          {activeRoom ? (activeRoom.name || `Chat ${activeRoom.id.slice(0, 8)}`) : 'Chat'}
        </div>

        {/* Modern Desktop Controls - Hidden on mobile */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: '6px' }}>
            {/* Size Toggle Button */}
            <button
              onClick={handleToggleSize}
              style={{
                padding: '8px',
                border: 'none',
                background: 'var(--chat-button-bg, #f3f4f6)',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--chat-button-text, #6b7280)',
                minWidth: '36px',
                minHeight: '36px',
                transition: 'all 0.2s ease-out'
              }}
              aria-label={isSmallMode ? "Chat vergrößern" : "Chat verkleinern"}
              title={isSmallMode ? "Chat vergrößern" : "Chat verkleinern"}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--chat-button-hover-bg, #e5e7eb)';
                e.currentTarget.style.color = 'var(--chat-button-hover-text, #374151)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--chat-button-bg, #f3f4f6)';
                e.currentTarget.style.color = 'var(--chat-button-text, #6b7280)';
              }}
            >
              {isSmallMode ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>

            {/* Modern Close Button */}
            <button
              onClick={onClose}
              style={{
                padding: '8px',
                border: 'none',
                background: 'var(--chat-close-bg, #fef2f2)',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--chat-close-text, #dc2626)',
                minWidth: '36px',
                minHeight: '36px',
                transition: 'all 0.2s ease-out'
              }}
              aria-label="Chat schließen"
              title="Chat schließen"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--chat-close-hover-bg, #fee2e2)';
                e.currentTarget.style.color = 'var(--chat-close-hover-text, #b91c1c)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--chat-close-bg, #fef2f2)';
                e.currentTarget.style.color = 'var(--chat-close-text, #dc2626)';
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Main Chat Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0 // Wichtig für Flexbox overflow
      }}>
        {activeRoom ? (
          <>
            {/* Chat Header - Fixed height */}
            <div style={{ flexShrink: 0 }}>
              <ChatRoomHeader
                room={activeRoom}
                participants={roomParticipants}
                onSettingsClick={() => console.log('Settings clicked')}
                onCallClick={() => console.log('Call clicked')}
                onVideoClick={() => console.log('Video call clicked')}
                onMenuClick={() => console.log('Menu clicked')}
                avatarSize="md"
              />
            </div>

            {/* Messages - Flexible height with scroll */}
            <div style={{
              flex: 1,
              minHeight: 0, // Wichtig für Flexbox overflow
              overflow: 'hidden'
            }}>
              <ChatMessages
                chatRoomId={activeRoom.id}
                messages={messages}
                onLoadMore={handleLoadMoreMessages}
                hasMore={hasMoreMessages}
                loading={messagesLoading}
                onReplyToMessage={handleReplyToMessage}
                avatarSize="sm"
              />
            </div>

            {/* Message Input - Fixed height */}
            <div style={{ flexShrink: 0 }}>
              <ChatInput
                chatRoomId={activeRoom.id}
                onSendMessage={handleSendMessage}
                replyTo={replyToMessage ? {
                  id: replyToMessage.id,
                  content: replyToMessage.content,
                  senderName: replyToMessage.sender.nickname || replyToMessage.sender.display_name || 'Unbekannt'
                } : undefined}
                onCancelReply={handleCancelReply}
              />
            </div>
          </>
        ) : (
          /* No room selected */
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--chat-bg, #f9fafb)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: 'var(--chat-button-bg, #e5e7eb)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}>
                <Users style={{
                  width: '32px',
                  height: '32px',
                  color: 'var(--chat-text-secondary, #9ca3af)'
                }} />
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '500',
                color: 'var(--chat-text-primary, #111827)',
                marginBottom: '8px',
                margin: 0
              }}>
                Wählen Sie einen Chat aus
              </h3>
              <p style={{
                color: 'var(--chat-text-secondary, #6b7280)',
                margin: 0
              }}>
                Beginnen Sie eine Unterhaltung aus der Seitenleiste
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;