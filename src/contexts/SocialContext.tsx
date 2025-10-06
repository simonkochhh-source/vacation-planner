import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { 
  SocialUserProfile,
  UUID, 
  ChatRoom, 
  ChatMessage, 
  FriendshipStatus,
  UserSearchResult,
  ActivityFeedItem
} from '../types';
import { socialService } from '../services/socialService';
import { chatService, ChatRoomWithInfo, ChatMessageWithSender, CreateChatRoomParams } from '../services/chatService';
import { handleServiceError } from '../utils/errorHandling';

// Social Action Types
type SocialAction = 
  | { type: 'SET_FRIENDS'; payload: SocialUserProfile[] }
  | { type: 'SET_FRIEND_REQUESTS'; payload: SocialUserProfile[] }
  | { type: 'SET_SEARCH_RESULTS'; payload: UserSearchResult[] }
  | { type: 'SET_CHAT_ROOMS'; payload: ChatRoomWithInfo[] }
  | { type: 'SET_ACTIVE_CHAT_ROOM'; payload: ChatRoomWithInfo | undefined }
  | { type: 'SET_CHAT_MESSAGES'; payload: ChatMessageWithSender[] }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessageWithSender }
  | { type: 'UPDATE_CHAT_MESSAGE'; payload: { id: string; data: Partial<ChatMessage> } }
  | { type: 'SET_ROOM_PARTICIPANTS'; payload: SocialUserProfile[] }
  | { type: 'SET_ACTIVITIES'; payload: ActivityFeedItem[] }
  | { type: 'ADD_ACTIVITY'; payload: ActivityFeedItem }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CHAT_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// Social State Interface
interface SocialState {
  // Friends & Social
  friends: SocialUserProfile[];
  friendRequests: SocialUserProfile[];
  searchResults: UserSearchResult[];
  
  // Chat
  chatRooms: ChatRoomWithInfo[];
  activeChatRoom?: ChatRoomWithInfo;
  chatMessages: ChatMessageWithSender[];
  roomParticipants: SocialUserProfile[];
  
  // Activities
  activities: ActivityFeedItem[];
  
  // Loading & Error States
  isLoading: boolean;
  isChatLoading: boolean;
  error: string | null;
}

// Social Context Type
interface SocialContextType extends SocialState {
  // Friends Management
  getFriends: () => Promise<void>;
  sendFriendRequest: (userId: UUID) => Promise<void>;
  acceptFriendRequest: (userId: UUID) => Promise<void>;
  rejectFriendRequest: (userId: UUID) => Promise<void>;
  removeFriend: (userId: UUID) => Promise<void>;
  
  // User Search & Profile
  searchUsers: (query: string) => Promise<void>;
  getUserProfile: (userId: UUID) => Promise<SocialUserProfile | null>;
  
  // Chat Operations
  loadChatRooms: () => Promise<void>;
  createChatRoom: (participantIds: UUID[], name?: string) => Promise<ChatRoom>;
  joinChatRoom: (roomId: string) => Promise<void>;
  leaveChatRoom: (roomId: string) => Promise<void>;
  setActiveChatRoom: (room: ChatRoomWithInfo | undefined) => void;
  
  // Message Operations
  loadChatMessages: (roomId: string) => Promise<void>;
  sendMessage: (roomId: string, content: string, type?: 'text' | 'image' | 'file') => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  markMessageAsRead: (messageId: string) => Promise<void>;
  
  // Participants
  loadRoomParticipants: (roomId: string) => Promise<void>;
  addParticipant: (roomId: string, userId: UUID) => Promise<void>;
  removeParticipant: (roomId: string, userId: UUID) => Promise<void>;
  
  // Activities
  loadActivities: () => Promise<void>;
  createActivity: (type: string, data: any) => Promise<void>;
  
  // Utility
  clearError: () => void;
  refreshSocialData: () => Promise<void>;
}

// Initial State
const initialSocialState: SocialState = {
  friends: [],
  friendRequests: [],
  searchResults: [],
  chatRooms: [],
  activeChatRoom: undefined,
  chatMessages: [],
  roomParticipants: [],
  activities: [],
  isLoading: false,
  isChatLoading: false,
  error: null
};

// Social Reducer
const socialReducer = (state: SocialState, action: SocialAction): SocialState => {
  switch (action.type) {
    case 'SET_FRIENDS':
      return { ...state, friends: Array.isArray(action.payload) ? action.payload : [] };
    
    case 'SET_FRIEND_REQUESTS':
      return { ...state, friendRequests: Array.isArray(action.payload) ? action.payload : [] };
    
    
    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: Array.isArray(action.payload) ? action.payload : [] };
    
    case 'SET_CHAT_ROOMS':
      return { ...state, chatRooms: Array.isArray(action.payload) ? action.payload : [] };
    
    case 'SET_ACTIVE_CHAT_ROOM':
      return { ...state, activeChatRoom: action.payload };
    
    case 'SET_CHAT_MESSAGES':
      return { ...state, chatMessages: Array.isArray(action.payload) ? action.payload : [] };
    
    case 'ADD_CHAT_MESSAGE':
      return { 
        ...state, 
        chatMessages: [...state.chatMessages, action.payload] 
      };
    
    case 'UPDATE_CHAT_MESSAGE':
      return {
        ...state,
        chatMessages: state.chatMessages.map(message => 
          message.id === action.payload.id 
            ? { ...message, ...action.payload.data }
            : message
        )
      };
    
    case 'SET_ROOM_PARTICIPANTS':
      return { ...state, roomParticipants: Array.isArray(action.payload) ? action.payload : [] };
    
    case 'SET_ACTIVITIES':
      return { ...state, activities: Array.isArray(action.payload) ? action.payload : [] };
    
    case 'ADD_ACTIVITY':
      return { 
        ...state, 
        activities: [action.payload, ...state.activities] 
      };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_CHAT_LOADING':
      return { ...state, isChatLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    default:
      return state;
  }
};

// Context
const SocialContext = createContext<SocialContextType | undefined>(undefined);

// Provider Props
interface SocialProviderProps {
  children: ReactNode;
}

// Social Provider Component
export const SocialProvider: React.FC<SocialProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(socialReducer, initialSocialState);

  // Error handling helper
  const handleError = useCallback((error: any, context: string) => {
    const appError = handleServiceError(error, context);
    dispatch({ type: 'SET_ERROR', payload: appError.message });
    console.error(`❌ ${context}:`, appError);
  }, []);

  // Friends Management
  const getFriends = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const friends = await socialService.getFriends();
      dispatch({ type: 'SET_FRIENDS', payload: friends });
    } catch (error) {
      handleError(error, 'getFriends');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [handleError]);

  const sendFriendRequest = useCallback(async (userId: UUID): Promise<void> => {
    try {
      await socialService.sendFriendshipRequest(userId);
      // Refresh friend requests to show updated state
      const requests = await socialService.getPendingFriendshipRequests();
      dispatch({ type: 'SET_FRIEND_REQUESTS', payload: requests });
    } catch (error) {
      handleError(error, 'sendFriendRequest');
    }
  }, [handleError]);

  const acceptFriendRequest = useCallback(async (userId: UUID): Promise<void> => {
    try {
      await socialService.acceptFriendshipRequest(userId);
      // Refresh both friends and requests
      await getFriends();
      const requests = await socialService.getPendingFriendshipRequests();
      dispatch({ type: 'SET_FRIEND_REQUESTS', payload: requests });
    } catch (error) {
      handleError(error, 'acceptFriendRequest');
    }
  }, [handleError, getFriends]);

  const rejectFriendRequest = useCallback(async (userId: UUID): Promise<void> => {
    try {
      await socialService.declineFriendshipRequest(userId);
      const requests = await socialService.getPendingFriendshipRequests();
      dispatch({ type: 'SET_FRIEND_REQUESTS', payload: requests });
    } catch (error) {
      handleError(error, 'rejectFriendRequest');
    }
  }, [handleError]);

  const removeFriend = useCallback(async (userId: UUID): Promise<void> => {
    try {
      await socialService.removeFriend(userId);
      await getFriends();
    } catch (error) {
      handleError(error, 'removeFriend');
    }
  }, [handleError, getFriends]);



  // User Search & Profile
  const searchUsers = useCallback(async (query: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const results = await socialService.searchUsers(query);
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: results });
    } catch (error) {
      handleError(error, 'searchUsers');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [handleError]);

  const getUserProfile = useCallback(async (userId: UUID): Promise<SocialUserProfile | null> => {
    try {
      return await socialService.getUserProfile(userId);
    } catch (error) {
      handleError(error, 'getUserProfile');
      return null;
    }
  }, [handleError]);


  // Chat Operations
  const loadChatRooms = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_CHAT_LOADING', payload: true });
      const rooms = await chatService.getUserChatRooms();
      dispatch({ type: 'SET_CHAT_ROOMS', payload: rooms });
    } catch (error) {
      handleError(error, 'loadChatRooms');
    } finally {
      dispatch({ type: 'SET_CHAT_LOADING', payload: false });
    }
  }, [handleError]);

  const createChatRoom = useCallback(async (participantIds: UUID[], name?: string): Promise<ChatRoom> => {
    try {
      const room = await chatService.createChatRoom({
        name,
        type: 'direct',
        is_private: true,
        participant_user_ids: participantIds
      });
      await loadChatRooms(); // Reload all rooms to get the updated list
      return room;
    } catch (error) {
      handleError(error, 'createChatRoom');
      throw error;
    }
  }, [handleError, loadChatRooms]);

  const joinChatRoom = useCallback(async (roomId: string): Promise<void> => {
    try {
      // joinChatRoom not implemented in ChatService
      await loadChatRooms();
    } catch (error) {
      handleError(error, 'joinChatRoom');
    }
  }, [handleError, loadChatRooms]);

  const leaveChatRoom = useCallback(async (roomId: string): Promise<void> => {
    try {
      await chatService.leaveRoom(roomId);
      await loadChatRooms();
    } catch (error) {
      handleError(error, 'leaveChatRoom');
    }
  }, [handleError, loadChatRooms]);

  const setActiveChatRoom = useCallback((room: ChatRoomWithInfo | undefined) => {
    dispatch({ type: 'SET_ACTIVE_CHAT_ROOM', payload: room });
  }, []);

  // Message Operations
  const loadChatMessages = useCallback(async (roomId: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_CHAT_LOADING', payload: true });
      const messages = await chatService.getMessages(roomId);
      dispatch({ type: 'SET_CHAT_MESSAGES', payload: messages });
    } catch (error) {
      handleError(error, 'loadChatMessages');
    } finally {
      dispatch({ type: 'SET_CHAT_LOADING', payload: false });
    }
  }, [handleError]);

  const sendMessage = useCallback(async (roomId: string, content: string, type: 'text' | 'image' | 'file' = 'text'): Promise<void> => {
    try {
      const message = await chatService.sendMessage(roomId, content, type);
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: message });
    } catch (error) {
      handleError(error, 'sendMessage');
    }
  }, [handleError]);

  const editMessage = useCallback(async (messageId: string, content: string): Promise<void> => {
    try {
      await chatService.editMessage(messageId, content);
      dispatch({ type: 'UPDATE_CHAT_MESSAGE', payload: { id: messageId, data: { content } } });
    } catch (error) {
      handleError(error, 'editMessage');
    }
  }, [handleError]);

  const deleteMessage = useCallback(async (messageId: string): Promise<void> => {
    try {
      await chatService.deleteMessage(messageId);
      dispatch({ type: 'UPDATE_CHAT_MESSAGE', payload: { id: messageId, data: { isDeleted: true } } });
    } catch (error) {
      handleError(error, 'deleteMessage');
    }
  }, [handleError]);

  const markMessageAsRead = useCallback(async (messageId: string): Promise<void> => {
    try {
      await chatService.markMessageAsRead(messageId);
    } catch (error) {
      handleError(error, 'markMessageAsRead');
    }
  }, [handleError]);

  // Participants
  const loadRoomParticipants = useCallback(async (roomId: string): Promise<void> => {
    try {
      const participants = await chatService.getRoomParticipants(roomId);
      dispatch({ type: 'SET_ROOM_PARTICIPANTS', payload: participants });
    } catch (error) {
      handleError(error, 'loadRoomParticipants');
    }
  }, [handleError]);

  const addParticipant = useCallback(async (roomId: string, userId: UUID): Promise<void> => {
    try {
      await chatService.addParticipant(roomId, userId);
      await loadRoomParticipants(roomId);
    } catch (error) {
      handleError(error, 'addParticipant');
    }
  }, [handleError, loadRoomParticipants]);

  const removeParticipant = useCallback(async (roomId: string, userId: UUID): Promise<void> => {
    try {
      await chatService.removeParticipant(roomId, userId);
      await loadRoomParticipants(roomId);
    } catch (error) {
      handleError(error, 'removeParticipant');
    }
  }, [handleError, loadRoomParticipants]);

  // Activities
  const loadActivities = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const activities = await socialService.getActivityFeed();
      dispatch({ type: 'SET_ACTIVITIES', payload: activities });
    } catch (error) {
      handleError(error, 'loadActivities');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [handleError]);

  const createActivity = useCallback(async (type: string, data: any): Promise<void> => {
    try {
      const activity = await socialService.createActivity(type, data);
      dispatch({ type: 'ADD_ACTIVITY', payload: activity });
    } catch (error) {
      handleError(error, 'createActivity');
    }
  }, [handleError]);

  // Utility
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const refreshSocialData = useCallback(async (): Promise<void> => {
    try {
      await Promise.all([
        getFriends(),
        loadChatRooms(),
        loadActivities()
      ]);
    } catch (error) {
      handleError(error, 'refreshSocialData');
    }
  }, [getFriends, loadChatRooms, loadActivities, handleError]);

  // Context value
  const contextValue: SocialContextType = {
    // State
    ...state,
    
    // Friends Management
    getFriends,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    
    // User Search & Profile
    searchUsers,
    getUserProfile,
    
    // Chat Operations
    loadChatRooms,
    createChatRoom,
    joinChatRoom,
    leaveChatRoom,
    setActiveChatRoom,
    
    // Message Operations
    loadChatMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    markMessageAsRead,
    
    // Participants
    loadRoomParticipants,
    addParticipant,
    removeParticipant,
    
    // Activities
    loadActivities,
    createActivity,
    
    // Utility
    clearError,
    refreshSocialData
  };

  return (
    <SocialContext.Provider value={contextValue}>
      {children}
    </SocialContext.Provider>
  );
};

// Hook to use Social Context
export const useSocialContext = (): SocialContextType => {
  const context = useContext(SocialContext);
  if (!context) {
    throw new Error('useSocialContext must be used within a SocialProvider');
  }
  return context;
};

export default SocialContext;