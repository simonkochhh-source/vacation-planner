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
      // Full-screen mobile chat with safe area support
      return {
        position: 'fixed' as const,
        top: 'max(var(--header-height, 64px), env(safe-area-inset-top))',
        left: 0,
        right: 0,
        bottom: 'max(var(--mobile-bottom-nav-height, 64px), env(safe-area-inset-bottom))',
        background: 'var(--color-surface)',
        zIndex: 1000, // High z-index for mobile overlay
        display: 'flex',
        flexDirection: 'column' as const,
        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        transition: 'transform var(--motion-duration-medium)',
        boxShadow: 'var(--elevation-5)'
      };
    }
    
    // Desktop chat positioning
    return {
      position: 'fixed' as const,
      top: `${headerHeight}px`, // Dynamic header height
      left: 'var(--social-sidebar-width, 320px)', // Use CSS custom property for sidebar width
      bottom: 0,
      width: `${currentWidth}px`,
      background: 'var(--color-surface)',
      zIndex: 800, // Lower than search results (1000) and modals
      display: 'flex',
      flexDirection: 'column' as const,
      border: '1px solid var(--color-outline-variant)',
      borderLeft: '2px solid var(--color-primary)',
      transition: 'width var(--motion-duration-medium)',
      boxShadow: 'var(--elevation-3)'
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
    <div style={getChatStyle()}>
      {/* Mobile Chat Header or Desktop Controls Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: isMobile ? 'var(--space-3) var(--space-4)' : 'var(--space-2) var(--space-3)',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        minHeight: isMobile ? 'var(--mobile-button-height)' : '48px',
        gap: isMobile ? 'var(--space-3)' : '8px'
      }}>
        {/* Mobile back button or desktop room title */}
        {isMobile ? (
          <button
            onClick={onClose}
            style={{
              padding: 'var(--space-2)',
              border: 'none',
              background: 'transparent',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
              minWidth: 'var(--mobile-button-height)',
              minHeight: 'var(--mobile-button-height)'
            }}
            aria-label="Chat schließen"
          >
            <ArrowLeft size={24} />
          </button>
        ) : null}

        {/* Room Title */}
        <div style={{
          flex: 1,
          fontSize: isMobile ? 'var(--mobile-text-lg)' : '14px',
          fontWeight: isMobile ? 'var(--font-weight-bold)' : '500',
          color: 'var(--color-text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {activeRoom ? (activeRoom.name || `Chat ${activeRoom.id.slice(0, 8)}`) : 'Chat'}
        </div>

        {/* Desktop Window Controls - Hidden on mobile */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: '4px' }}>
            {/* Size Toggle Button */}
            <button
              onClick={handleToggleSize}
              style={{
                padding: 'var(--space-1)',
                border: 'none',
                background: 'transparent',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-secondary)'
              }}
              aria-label={isSmallMode ? "Chat vergrößern" : "Chat verkleinern"}
              title={isSmallMode ? "Chat vergrößern" : "Chat verkleinern"}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-neutral-mist)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {isSmallMode ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                padding: 'var(--space-1)',
                border: 'none',
                background: 'transparent',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-secondary)'
              }}
              aria-label="Chat schließen"
              title="Chat schließen"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-error-bg)';
                e.currentTarget.style.color = 'var(--color-error)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Main Chat Content */}
      <div className="flex-1 flex flex-col">
        {activeRoom ? (
          <>
            {/* Chat Header */}
            <ChatRoomHeader
              room={activeRoom}
              participants={roomParticipants}
              onSettingsClick={() => console.log('Settings clicked')}
              onCallClick={() => console.log('Call clicked')}
              onVideoClick={() => console.log('Video call clicked')}
              onMenuClick={() => console.log('Menu clicked')}
            />

            {/* Messages */}
            <ChatMessages
              chatRoomId={activeRoom.id}
              messages={messages}
              onLoadMore={handleLoadMoreMessages}
              hasMore={hasMoreMessages}
              loading={messagesLoading}
              onReplyToMessage={handleReplyToMessage}
            />

            {/* Message Input */}
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
          </>
        ) : (
          /* No room selected */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Wählen Sie einen Chat aus
              </h3>
              <p className="text-gray-500">
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