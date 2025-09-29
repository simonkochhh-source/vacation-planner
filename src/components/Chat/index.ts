// Chat Components
export { default as ChatInterface } from './ChatInterface';
export { default as ChatRoomList } from './ChatRoomList';
export { default as ChatRoomHeader } from './ChatRoomHeader';
export { default as ChatMessages } from './ChatMessages';
export { default as ChatInput } from './ChatInput';
export { default as UserStatusIndicator } from './UserStatusIndicator';

// Re-export types for convenience
export type {
  ChatRoom,
  ChatParticipant,
  ChatMessage,
  ChatMessageWithSender,
  ChatRoomWithInfo,
  CreateChatRoomParams,
  SendMessageParams,
  ChatNotification,
  ChatRoomType,
  MessageType,
  ParticipantRole
} from '../../services/chatService';

export type {
  UserStatus,
  UserStatusInfo,
  UserWithStatus
} from '../../services/userStatusService';