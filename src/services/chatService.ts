import { supabase } from '../lib/supabase';
import { UserWithStatus } from './userStatusService';

// Chat Types
export type ChatRoomType = 'direct' | 'group' | 'trip';
export type MessageType = 'text' | 'image' | 'file' | 'location' | 'system';
export type ParticipantRole = 'owner' | 'admin' | 'member';

export interface ChatRoom {
  id: string;
  name?: string;
  description?: string;
  type: ChatRoomType;
  trip_id?: string;
  is_private: boolean;
  max_participants: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChatParticipant {
  id: string;
  chat_room_id: string;
  user_id: string;
  role: ParticipantRole;
  can_send_messages: boolean;
  can_add_participants: boolean;
  joined_at: string;
  last_read_at: string;
  is_active: boolean;
  notifications_enabled: boolean;
  notification_sound: boolean;
}

export interface ChatMessage {
  id: string;
  chat_room_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  metadata?: Record<string, any>;
  is_edited: boolean;
  edited_at?: string;
  is_deleted: boolean;
  deleted_at?: string;
  reply_to?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageWithSender extends ChatMessage {
  sender: {
    id: string;
    nickname?: string;
    display_name?: string;
    avatar_url?: string;
    email?: string;
  };
  reply_message?: {
    id: string;
    content: string;
    sender_id: string;
    sender_nickname?: string;
  };
}

export interface ChatRoomWithInfo extends ChatRoom {
  latest_message?: string;
  latest_message_at?: string;
  unread_count: number;
  participant_count: number;
  participants?: ChatParticipant[];
}

export interface CreateChatRoomParams {
  name?: string;
  description?: string;
  type: ChatRoomType;
  trip_id?: string;
  is_private?: boolean;
  max_participants?: number;
  participant_user_ids?: string[];
}

export interface SendMessageParams {
  chat_room_id: string;
  content: string;
  message_type?: MessageType;
  metadata?: Record<string, any>;
  reply_to?: string;
}

export interface ChatNotification {
  id: string;
  user_id: string;
  chat_room_id: string;
  message_id: string;
  is_read: boolean;
  read_at?: string;
  is_push_sent: boolean;
  is_email_sent: boolean;
  created_at: string;
}

class ChatService {
  private messageListeners: Map<string, ((message: ChatMessageWithSender) => void)[]> = new Map();
  private roomListeners: ((rooms: ChatRoomWithInfo[]) => void)[] = [];
  private subscriptions: Map<string, any> = new Map();
  private mockChatRooms: ChatRoomWithInfo[] = [];
  private isUsingMockData = false;

  /**
   * Initialize chat service and set up global subscriptions
   */
  async initialize(): Promise<void> {
    try {
      console.log('🟢 Chat: Initializing chat service...');
      
      // Set up global room updates subscription
      this.setupRoomUpdatesSubscription();
      
      console.log('✅ Chat: Service initialized successfully');
    } catch (error) {
      console.error('❌ Chat: Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Create a new chat room
   */
  async createChatRoom(params: CreateChatRoomParams): Promise<ChatRoom> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('🔄 Chat: Creating chat room:', params);

      // Create the chat room
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name: params.name,
          description: params.description,
          type: params.type,
          trip_id: params.trip_id,
          is_private: params.is_private ?? true,
          max_participants: params.max_participants ?? 50,
          created_by: user.id
        })
        .select()
        .single();

      if (roomError) {
        console.error('❌ Chat: Error creating room:', roomError);
        throw roomError;
      }

      // Add creator as owner
      await this.addParticipant(room.id, user.id, 'owner');

      // Add additional participants if specified
      if (params.participant_user_ids && params.participant_user_ids.length > 0) {
        for (const userId of params.participant_user_ids) {
          if (userId !== user.id) {
            await this.addParticipant(room.id, userId, 'member');
          }
        }
      }

      console.log('✅ Chat: Room created successfully:', room.id);
      return room;
    } catch (error) {
      console.error('❌ Chat: Error creating chat room:', error);
      throw error;
    }
  }

  /**
   * Create or get existing direct message room between two users
   */
  async getOrCreateDirectRoom(otherUserId: string): Promise<ChatRoom> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('🔄 Chat: Getting/creating direct room with user:', otherUserId);

      // Check if direct room already exists between these users
      const { data: existingRooms, error: searchError } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          chat_participants!inner(user_id)
        `)
        .eq('type', 'direct')
        .eq('chat_participants.is_active', true);

      if (searchError) throw searchError;

      // Find room where both users are participants
      const directRoom = existingRooms?.find(room => {
        const participantIds = room.chat_participants.map((p: any) => p.user_id);
        return participantIds.length === 2 && 
               participantIds.includes(user.id) && 
               participantIds.includes(otherUserId);
      });

      if (directRoom) {
        console.log('✅ Chat: Found existing direct room:', directRoom.id);
        return directRoom;
      }

      // Create new direct room
      const newRoom = await this.createChatRoom({
        type: 'direct',
        is_private: true,
        max_participants: 2,
        participant_user_ids: [otherUserId]
      });

      console.log('✅ Chat: Created new direct room:', newRoom.id);
      return newRoom;
    } catch (error) {
      console.error('❌ Chat: Error getting/creating direct room:', error);
      throw error;
    }
  }

  /**
   * Create trip-specific chat room
   */
  async createTripChatRoom(tripId: string, tripName: string, participantIds: string[]): Promise<ChatRoom> {
    try {
      console.log('🔄 Chat: Creating trip chat for trip:', tripId);

      const room = await this.createChatRoom({
        name: `${tripName} - Reisechat`,
        description: `Chat für die Reise "${tripName}"`,
        type: 'trip',
        trip_id: tripId,
        is_private: true,
        max_participants: 20,
        participant_user_ids: participantIds
      });

      // Send system message
      await this.sendMessage({
        chat_room_id: room.id,
        content: `Der Reisechat für "${tripName}" wurde eröffnet! 🎉`,
        message_type: 'system'
      });

      console.log('✅ Chat: Trip chat created:', room.id);
      return room;
    } catch (error) {
      console.error('❌ Chat: Error creating trip chat:', error);
      throw error;
    }
  }

  /**
   * Add participant to chat room
   */
  async addParticipant(chatRoomId: string, userId: string, role: ParticipantRole = 'member'): Promise<ChatParticipant> {
    try {
      const { data, error } = await supabase
        .from('chat_participants')
        .insert({
          chat_room_id: chatRoomId,
          user_id: userId,
          role,
          can_send_messages: true,
          can_add_participants: role !== 'member',
          is_active: true,
          notifications_enabled: true,
          notification_sound: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Chat: Error adding participant:', error);
      throw error;
    }
  }

  /**
   * Send a message to a chat room
   */
  async sendMessage(params: SendMessageParams): Promise<ChatMessage> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('🔄 Chat: Sending message to room:', params.chat_room_id);

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          chat_room_id: params.chat_room_id,
          sender_id: user.id,
          content: params.content,
          message_type: params.message_type || 'text',
          metadata: params.metadata || {},
          reply_to: params.reply_to
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Chat: Error sending message:', error);
        throw error;
      }

      console.log('✅ Chat: Message sent:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Chat: Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get messages for a chat room with pagination
   */
  async getMessages(chatRoomId: string, limit: number = 50, before?: string): Promise<ChatMessageWithSender[]> {
    try {
      // First try to get messages from database (simple query first)
      let query = supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_room_id', chatRoomId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (before) {
        query = query.lt('created_at', before);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('⚠️ Chat: Database not ready, using mock data:', error.message);
        
        // Return mock messages for development
        return [
          {
            id: '1',
            chat_room_id: chatRoomId,
            sender_id: 'mock-user-1',
            content: 'Willkommen im Chat! Das ist eine Test-Nachricht.',
            message_type: 'text',
            metadata: {},
            is_edited: false,
            edited_at: undefined,
            is_deleted: false,
            deleted_at: undefined,
            reply_to: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sender: {
              id: 'mock-user-1',
              nickname: 'Test User',
              display_name: 'Test User',
              avatar_url: undefined
            },
            reply_message: undefined
          },
          {
            id: '2',
            chat_room_id: chatRoomId,
            sender_id: 'mock-user-2',
            content: 'Hallo! Wie geht es dir?',
            message_type: 'text',
            metadata: {},
            is_edited: false,
            edited_at: undefined,
            is_deleted: false,
            deleted_at: undefined,
            reply_to: undefined,
            created_at: new Date(Date.now() + 1000).toISOString(),
            updated_at: new Date(Date.now() + 1000).toISOString(),
            sender: {
              id: 'mock-user-2',
              nickname: 'Demo User',
              display_name: 'Demo User', 
              avatar_url: undefined
            },
            reply_message: undefined
          }
        ];
      }

      // Transform real data if available
      const messages: ChatMessageWithSender[] = [];
      
      // Get unique sender IDs
      const senderIds = Array.from(new Set((data || []).map(msg => msg.sender_id)));
      
      // Fetch user profiles for all senders
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, nickname, display_name, avatar_url, email')
        .in('id', senderIds);
        
      if (profilesError) {
        console.warn('⚠️ Chat: Could not load user profiles:', profilesError.message);
      }
      
      // Create a lookup map for profiles
      const profileMap = new Map();
      (profiles || []).forEach(profile => {
        profileMap.set(profile.id, profile);
      });
      
      for (const msg of data || []) {
        const senderProfile = profileMap.get(msg.sender_id);
        
        const transformedMessage = {
          ...msg,
          sender: senderProfile || {
            id: msg.sender_id,
            nickname: null,
            display_name: null,
            avatar_url: null
          },
          reply_message: msg.reply_to ? {
            id: msg.reply_to,
            content: 'Replied message',
            sender_id: msg.sender_id,
            sender_nickname: senderProfile?.nickname || senderProfile?.display_name || 'Unbekannt'
          } : undefined
        };
        messages.push(transformedMessage);
      }

      return messages.reverse();
    } catch (error) {
      console.error('❌ Chat: Error getting messages:', error);
      // Return empty array to prevent UI crashes
      return [];
    }
  }

  /**
   * Get user's chat rooms with info
   */
  async getUserChatRooms(): Promise<ChatRoomWithInfo[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Try to get chat rooms from database with participant info
      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          chat_participants!inner(user_id, role, is_active)
        `)
        .eq('chat_participants.user_id', user.id)
        .eq('chat_participants.is_active', true);

      if (error) {
        console.warn('⚠️ Chat: Database not ready, using mock chat rooms:', error.message);
        console.warn('Error details:', error);
        this.isUsingMockData = true;
        
        // Initialize mock data if not already done
        if (this.mockChatRooms.length === 0) {
          this.mockChatRooms = [
            {
              id: 'mock-1',
              name: 'Test Chat',
              description: 'Ein Test-Chat für die Entwicklung',
              type: 'group',
              trip_id: undefined,
              is_private: false,
              max_participants: 10,
              created_by: user.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              participant_count: 2,
              unread_count: 0,
              latest_message: 'Hallo! Wie geht es dir?',
              latest_message_at: new Date().toISOString()
            },
            {
              id: 'mock-2',
              name: 'Direktnachricht',
              description: undefined,
              type: 'direct',
              trip_id: undefined,
              is_private: true,
              max_participants: 2,
              created_by: user.id,
              created_at: new Date(Date.now() - 86400000).toISOString(),
              updated_at: new Date(Date.now() - 86400000).toISOString(),
              participant_count: 2,
              unread_count: 1,
              latest_message: 'Hey, wie läuft die Reiseplanung?',
              latest_message_at: new Date(Date.now() - 3600000).toISOString()
            }
          ];
        }
        
        return [...this.mockChatRooms];
      }

      this.isUsingMockData = false;
      
      console.log('✅ Chat: Loaded real chat rooms from database:', data?.length || 0);
      console.log('🔍 Chat: Real rooms data:', data);
      
      // Transform real data if available
      return (data || []).map(room => ({
        ...room,
        participant_count: room.chat_participants?.length || 1,
        unread_count: 0,
        latest_message: 'Chat bereit...',
        latest_message_at: room.updated_at
      }));
    } catch (error) {
      console.error('❌ Chat: Error getting user chat rooms:', error);
      return [];
    }
  }

  /**
   * Mark messages as read in a chat room
   */
  async markMessagesAsRead(chatRoomId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update notifications as read - try with read_at, fallback without it
      let notifError = null;
      
      // First attempt with read_at (for newer schema)
      const updateWithReadAt = await supabase
        .from('chat_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('chat_room_id', chatRoomId)
        .eq('is_read', false);

      if (updateWithReadAt.error && updateWithReadAt.error.message?.includes('read_at')) {
        // Fallback for older schema without read_at column
        console.log('🔄 Chat: Fallback to update without read_at column');
        const updateWithoutReadAt = await supabase
          .from('chat_notifications')
          .update({
            is_read: true
          })
          .eq('user_id', user.id)
          .eq('chat_room_id', chatRoomId)
          .eq('is_read', false);
        
        notifError = updateWithoutReadAt.error;
      } else {
        notifError = updateWithReadAt.error;
      }

      if (notifError) {
        console.error('❌ Chat: Error marking notifications as read:', notifError);
      }

      // Update participant last_read_at (this will be handled by trigger)
      console.log('✅ Chat: Messages marked as read in room:', chatRoomId);
    } catch (error) {
      console.error('❌ Chat: Error marking messages as read:', error);
    }
  }

  /**
   * Get unread message count for user
   */
  async getUnreadMessageCount(): Promise<Map<string, number>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return new Map();

      const { data, error } = await supabase.rpc('get_unread_message_count', {
        user_uuid: user.id
      });

      if (error) throw error;

      const unreadMap = new Map<string, number>();
      (data || []).forEach((item: any) => {
        unreadMap.set(item.chat_room_id, item.unread_count);
      });

      return unreadMap;
    } catch (error) {
      console.error('❌ Chat: Error getting unread counts:', error);
      return new Map();
    }
  }

  /**
   * Subscribe to new messages in a specific chat room
   */
  subscribeToMessages(chatRoomId: string, callback: (message: ChatMessageWithSender) => void): () => void {
    const key = `messages-${chatRoomId}`;
    
    // Add callback to listeners
    if (!this.messageListeners.has(key)) {
      this.messageListeners.set(key, []);
    }
    this.messageListeners.get(key)!.push(callback);

    // Set up subscription if not exists
    if (!this.subscriptions.has(key)) {
      const subscription = supabase
        .channel(`messages-${chatRoomId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `chat_room_id=eq.${chatRoomId}`
          },
          async (payload) => {
            console.log('📡 Chat: New message received:', payload);
            
            // Fetch full message with sender info
            const { data: fullMessage } = await supabase
              .from('chat_messages')
              .select(`
                *,
                sender:users!inner(
                  id,
                  nickname,
                  display_name,
                  avatar_url
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (fullMessage) {
              const messageWithSender: ChatMessageWithSender = {
                ...fullMessage,
                sender: {
                  id: fullMessage.sender.id,
                  nickname: fullMessage.sender.nickname,
                  display_name: fullMessage.sender.display_name,
                  avatar_url: fullMessage.sender.avatar_url
                }
              };

              // Notify all listeners
              this.messageListeners.get(key)?.forEach(listener => {
                listener(messageWithSender);
              });
            }
          }
        )
        .subscribe();

      this.subscriptions.set(key, subscription);
      console.log('📡 Chat: Subscribed to messages for room:', chatRoomId);
    }

    // Return unsubscribe function
    return () => {
      const listeners = this.messageListeners.get(key);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
        
        // If no more listeners, cleanup subscription
        if (listeners.length === 0) {
          this.messageListeners.delete(key);
          const subscription = this.subscriptions.get(key);
          if (subscription) {
            subscription.unsubscribe();
            this.subscriptions.delete(key);
            console.log('📡 Chat: Unsubscribed from messages for room:', chatRoomId);
          }
        }
      }
    };
  }

  /**
   * Subscribe to chat room updates
   */
  subscribeToRoomUpdates(callback: (rooms: ChatRoomWithInfo[]) => void): () => void {
    this.roomListeners.push(callback);
    
    return () => {
      const index = this.roomListeners.indexOf(callback);
      if (index > -1) {
        this.roomListeners.splice(index, 1);
      }
    };
  }

  /**
   * Setup global room updates subscription
   */
  private setupRoomUpdatesSubscription(): void {
    try {
      supabase
        .channel('chat-room-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_messages'
          },
          async () => {
            // When any message is sent, refresh room list for all listeners
            if (this.roomListeners.length > 0) {
              const rooms = await this.getUserChatRooms();
              this.roomListeners.forEach(listener => listener(rooms));
            }
          }
        )
        .subscribe();

      console.log('📡 Chat: Global room updates subscription established');
    } catch (error) {
      console.error('❌ Chat: Error setting up room updates subscription:', error);
    }
  }

  /**
   * Leave a chat room
   */
  async leaveRoom(chatRoomId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('chat_participants')
        .update({ is_active: false })
        .eq('chat_room_id', chatRoomId)
        .eq('user_id', user.id);

      if (error) throw error;

      console.log('✅ Chat: Left room:', chatRoomId);
    } catch (error) {
      console.error('❌ Chat: Error leaving room:', error);
      throw error;
    }
  }

  /**
   * Delete a message (mark as deleted)
   */
  async deleteMessage(messageId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('chat_messages')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          content: '[Nachricht gelöscht]'
        })
        .eq('id', messageId)
        .eq('sender_id', user.id); // Only allow deleting own messages

      if (error) throw error;

      console.log('✅ Chat: Message deleted:', messageId);
    } catch (error) {
      console.error('❌ Chat: Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Edit a message
   */
  async editMessage(messageId: string, newContent: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('chat_messages')
        .update({
          content: newContent,
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('sender_id', user.id); // Only allow editing own messages

      if (error) throw error;

      console.log('✅ Chat: Message edited:', messageId);
    } catch (error) {
      console.error('❌ Chat: Error editing message:', error);
      throw error;
    }
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();
    this.messageListeners.clear();
    this.roomListeners = [];
    console.log('🧹 Chat: Service cleaned up');
  }

  /**
   * Format message timestamp for display
   */
  formatMessageTime(timestamp: string): string {
    const messageDate = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return 'Gerade eben';
    } else if (diffMins < 60) {
      return `${diffMins} Min.`;
    } else if (diffHours < 24) {
      return messageDate.toLocaleTimeString('de-DE', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays < 7) {
      return messageDate.toLocaleDateString('de-DE', { 
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return messageDate.toLocaleDateString('de-DE');
    }
  }

  /**
   * Get display name for chat room
   */
  getDisplayName(room: ChatRoom, currentUserId: string, participants?: ChatParticipant[]): string {
    if (room.name) {
      return room.name;
    }

    if (room.type === 'direct' && participants) {
      // For direct messages, show the other person's name
      const otherParticipant = participants.find(p => p.user_id !== currentUserId);
      if (otherParticipant) {
        return 'Direktnachricht'; // Will be enhanced with user profile lookup
      }
    }

    return `${room.type === 'group' ? 'Gruppe' : room.type === 'trip' ? 'Reise' : 'Chat'}`;
  }

  /**
   * Get room participants with user details
   */
  async getRoomParticipants(chatRoomId: string): Promise<UserWithStatus[]> {
    try {
      const { data, error } = await supabase
        .from('chat_participants')
        .select(`
          user_id,
          role,
          is_active,
          user_profiles:user_id (
            id,
            nickname,
            display_name,
            avatar_url,
            email
          )
        `)
        .eq('chat_room_id', chatRoomId)
        .eq('is_active', true);

      if (error) {
        console.warn('⚠️ Chat: Could not load participants, using mock data:', error);
        return []; // Return empty array if we can't load participants
      }

      // Transform the data to match UserWithStatus interface
      return (data || []).map((participant: any) => ({
        id: participant.user_profiles?.id || participant.user_id,
        nickname: participant.user_profiles?.nickname,
        display_name: participant.user_profiles?.display_name,
        avatar_url: participant.user_profiles?.avatar_url,
        status: 'offline' as const, // Default status - would need real-time status service
        last_seen_at: new Date().toISOString() // Default to current time
      }));
    } catch (error) {
      console.error('❌ Chat: Error getting room participants:', error);
      return [];
    }
  }

  /**
   * Delete a chat room (only if user is owner)
   */
  async deleteChatRoom(chatRoomId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('🔄 Chat: Deleting chat room:', chatRoomId);

      // Handle mock data deletion
      if (this.isUsingMockData || chatRoomId.startsWith('mock-')) {
        console.log('🔄 Chat: Deleting mock chat room:', chatRoomId);
        
        const roomIndex = this.mockChatRooms.findIndex(room => room.id === chatRoomId);
        if (roomIndex === -1) {
          throw new Error('Chat room not found');
        }

        const room = this.mockChatRooms[roomIndex];
        if (room.created_by !== user.id) {
          throw new Error('Nur der Chat-Ersteller kann den Chat löschen');
        }

        // Remove from mock data
        this.mockChatRooms.splice(roomIndex, 1);
        
        console.log('✅ Chat: Mock room deleted successfully');
        return;
      }

      // Handle real database deletion
      try {
        console.log('🔍 Chat: Fetching room details for:', chatRoomId);
        
        // Check if user is the room owner
        const { data: room, error: roomError } = await supabase
          .from('chat_rooms')
          .select('id, created_by, name, type')
          .eq('id', chatRoomId)
          .single();

        if (roomError) {
          console.error('❌ Chat: Error fetching room:', roomError);
          console.error('Room ID:', chatRoomId, 'User ID:', user.id);
          throw new Error(`Chat-Room konnte nicht gefunden werden: ${roomError.message}`);
        }

        console.log('📋 Chat: Room details:', room);

        if (room.created_by !== user.id) {
          console.error('❌ Chat: Permission denied. Room creator:', room.created_by, 'Current user:', user.id);
          throw new Error('Nur der Chat-Ersteller kann den Chat löschen');
        }

        console.log('🗑️ Chat: Attempting to delete room from database...');

        // Delete the room (CASCADE will handle participants, messages, etc.)
        const { data: deleteResult, error: deleteError } = await supabase
          .from('chat_rooms')
          .delete()
          .eq('id', chatRoomId)
          .eq('created_by', user.id) // Extra security check
          .select(); // Return the deleted rows

        console.log('📤 Chat: Delete result:', deleteResult);
        console.log('❓ Chat: Delete error:', deleteError);

        if (deleteError) {
          console.error('❌ Chat: Database delete error details:', {
            message: deleteError.message,
            details: deleteError.details,
            hint: deleteError.hint,
            code: deleteError.code
          });
          throw new Error(`Fehler beim Löschen des Chats: ${deleteError.message}`);
        }

        if (!deleteResult || deleteResult.length === 0) {
          console.warn('⚠️ Chat: No rows were deleted. Possible RLS policy issue.');
          throw new Error('Chat konnte nicht gelöscht werden. Möglicherweise fehlen Berechtigung.');
        }

        console.log('✅ Chat: Real room deleted successfully:', deleteResult);
      } catch (dbError) {
        console.error('❌ Chat: Database error, trying mock deletion:', dbError);
        
        // Fallback to mock deletion if database fails
        const roomIndex = this.mockChatRooms.findIndex(room => room.id === chatRoomId);
        if (roomIndex >= 0) {
          this.mockChatRooms.splice(roomIndex, 1);
          console.log('✅ Chat: Fallback mock deletion successful');
          return;
        }
        
        throw dbError;
      }
    } catch (error) {
      console.error('❌ Chat: Error deleting chat room:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const chatService = new ChatService();
export default chatService;