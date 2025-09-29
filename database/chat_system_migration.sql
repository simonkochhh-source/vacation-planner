-- ===================================
-- TRAILKEEPER CHAT SYSTEM MIGRATION
-- ===================================
-- Comprehensive chat system with 1:1 chats, group chats, and trip chats
-- Includes real-time messaging, online status, and notifications

-- Enable real-time for chat functionality
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE user_status;

-- ===================================
-- 1. USER STATUS TABLE
-- ===================================
-- Track online/offline/away status for users
CREATE TABLE IF NOT EXISTS user_status (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away')),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status_message TEXT, -- Custom status message like "On vacation in Paris"
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- 2. CHAT ROOMS TABLE  
-- ===================================
-- Supports 1:1 chats, group chats, and trip-specific chats
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255), -- Null for 1:1 chats, named for groups/trips
  description TEXT,
  type VARCHAR(20) NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'trip')),
  
  -- Trip integration
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE, -- Only for trip chats
  
  -- Room settings
  is_private BOOLEAN NOT NULL DEFAULT true,
  max_participants INTEGER DEFAULT 50,
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure trip chats are linked to trips
  CONSTRAINT trip_chat_constraint CHECK (
    (type = 'trip' AND trip_id IS NOT NULL) OR 
    (type != 'trip' AND trip_id IS NULL)
  )
);

-- ===================================
-- 3. CHAT PARTICIPANTS TABLE
-- ===================================
-- Manages who can access which chat rooms
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Participant role and permissions
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  can_send_messages BOOLEAN NOT NULL DEFAULT true,
  can_add_participants BOOLEAN NOT NULL DEFAULT false,
  
  -- Participant status
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- For unread message tracking
  is_active BOOLEAN NOT NULL DEFAULT true, -- Can leave/be removed
  
  -- Notification preferences
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  notification_sound BOOLEAN NOT NULL DEFAULT true,
  
  -- Unique constraint: one user per chat room
  UNIQUE(chat_room_id, user_id)
);

-- ===================================
-- 4. CHAT MESSAGES TABLE
-- ===================================
-- Stores all chat messages with rich content support
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Message content
  content TEXT NOT NULL,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'location', 'system')),
  
  -- Rich content metadata
  metadata JSONB DEFAULT '{}', -- For file info, image dimensions, location coords, etc.
  
  -- Message status
  is_edited BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Threading support (optional)
  reply_to UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- 5. MESSAGE REACTIONS TABLE (Optional Enhancement)
-- ===================================
-- Allow users to react to messages with emojis
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL, -- Unicode emoji
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One reaction per user per message per emoji
  UNIQUE(message_id, user_id, emoji)
);

-- ===================================
-- 6. CHAT NOTIFICATIONS TABLE
-- ===================================
-- Track unread messages and notifications
CREATE TABLE IF NOT EXISTS chat_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  
  -- Notification status
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Notification delivery
  is_push_sent BOOLEAN NOT NULL DEFAULT false,
  is_email_sent BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one notification per user per message
  UNIQUE(user_id, message_id)
);

-- ===================================
-- INDEXES FOR PERFORMANCE
-- ===================================

-- Chat rooms indexes
CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON chat_rooms(type);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_trip_id ON chat_rooms(trip_id) WHERE trip_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by ON chat_rooms(created_by);

-- Chat participants indexes
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_room_id ON chat_participants(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_active ON chat_participants(is_active) WHERE is_active = true;

-- Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_room_id ON chat_messages(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to ON chat_messages(reply_to) WHERE reply_to IS NOT NULL;

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_chat_notifications_user_id ON chat_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_notifications_unread ON chat_notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_chat_notifications_chat_room ON chat_notifications(chat_room_id);

-- User status indexes
CREATE INDEX IF NOT EXISTS idx_user_status_status ON user_status(status);
CREATE INDEX IF NOT EXISTS idx_user_status_last_seen ON user_status(last_seen_at DESC);

-- ===================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================

-- Enable RLS on all tables
ALTER TABLE user_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_notifications ENABLE ROW LEVEL SECURITY;

-- User Status Policies
CREATE POLICY "Users can view all user statuses" ON user_status
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own status" ON user_status
  FOR ALL USING (auth.uid() = user_id);

-- Chat Rooms Policies
CREATE POLICY "Users can view rooms they participate in" ON chat_rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE chat_room_id = id 
      AND user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can create chat rooms" ON chat_rooms
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room admins can update rooms" ON chat_rooms
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE chat_room_id = id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

-- Chat Participants Policies
CREATE POLICY "Users can view participants in their rooms" ON chat_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp 
      WHERE cp.chat_room_id = chat_room_id 
      AND cp.user_id = auth.uid() 
      AND cp.is_active = true
    )
  );

CREATE POLICY "Users can join rooms they're invited to" ON chat_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" ON chat_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- Chat Messages Policies
CREATE POLICY "Users can view messages in their rooms" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE chat_room_id = chat_messages.chat_room_id 
      AND user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can send messages to their rooms" ON chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE chat_room_id = chat_messages.chat_room_id 
      AND user_id = auth.uid() 
      AND is_active = true 
      AND can_send_messages = true
    )
  );

CREATE POLICY "Users can edit their own messages" ON chat_messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Message Reactions Policies
CREATE POLICY "Users can view reactions in their rooms" ON message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN chat_participants cp ON cm.chat_room_id = cp.chat_room_id
      WHERE cm.id = message_reactions.message_id 
      AND cp.user_id = auth.uid() 
      AND cp.is_active = true
    )
  );

CREATE POLICY "Users can manage their own reactions" ON message_reactions
  FOR ALL USING (auth.uid() = user_id);

-- Chat Notifications Policies
CREATE POLICY "Users can view their own notifications" ON chat_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON chat_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ===================================
-- FUNCTIONS AND TRIGGERS
-- ===================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_status_updated_at 
  BEFORE UPDATE ON user_status 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_rooms_updated_at 
  BEFORE UPDATE ON chat_rooms 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at 
  BEFORE UPDATE ON chat_messages 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create chat notifications
CREATE OR REPLACE FUNCTION create_chat_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notifications for all active participants except the sender
  INSERT INTO chat_notifications (user_id, chat_room_id, message_id)
  SELECT 
    cp.user_id,
    NEW.chat_room_id,
    NEW.id
  FROM chat_participants cp
  WHERE cp.chat_room_id = NEW.chat_room_id
    AND cp.user_id != NEW.sender_id  -- Don't notify the sender
    AND cp.is_active = true
    AND cp.notifications_enabled = true;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to create notifications for new messages
CREATE TRIGGER create_message_notification 
  AFTER INSERT ON chat_messages 
  FOR EACH ROW EXECUTE FUNCTION create_chat_notification();

-- Function to automatically update last_read_at when user views messages
CREATE OR REPLACE FUNCTION update_last_read()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_read_at for the user in this chat room
  UPDATE chat_participants 
  SET last_read_at = NOW()
  WHERE chat_room_id = NEW.chat_room_id 
    AND user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update last_read_at when notifications are marked as read
CREATE TRIGGER update_participant_last_read 
  AFTER UPDATE ON chat_notifications 
  FOR EACH ROW 
  WHEN (OLD.is_read = false AND NEW.is_read = true)
  EXECUTE FUNCTION update_last_read();

-- ===================================
-- INITIAL DATA SETUP
-- ===================================

-- Create user status entries for existing users
INSERT INTO user_status (user_id, status, last_seen_at)
SELECT id, 'offline', NOW()
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ===================================
-- HELPER FUNCTIONS FOR FRONTEND
-- ===================================

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count(user_uuid UUID)
RETURNS TABLE(chat_room_id UUID, unread_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cn.chat_room_id,
    COUNT(*) as unread_count
  FROM chat_notifications cn
  WHERE cn.user_id = user_uuid 
    AND cn.is_read = false
  GROUP BY cn.chat_room_id;
END;
$$ language 'plpgsql';

-- Function to get user's chat rooms with latest message info
CREATE OR REPLACE FUNCTION get_user_chat_rooms(user_uuid UUID)
RETURNS TABLE(
  room_id UUID,
  room_name VARCHAR,
  room_type VARCHAR,
  trip_id UUID,
  latest_message TEXT,
  latest_message_at TIMESTAMP WITH TIME ZONE,
  unread_count BIGINT,
  participant_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.id as room_id,
    cr.name as room_name,
    cr.type as room_type,
    cr.trip_id,
    cm.content as latest_message,
    cm.created_at as latest_message_at,
    COALESCE(unread.unread_count, 0) as unread_count,
    COUNT(cp.user_id) as participant_count
  FROM chat_rooms cr
  JOIN chat_participants cp ON cr.id = cp.chat_room_id
  LEFT JOIN LATERAL (
    SELECT content, created_at
    FROM chat_messages
    WHERE chat_room_id = cr.id
    ORDER BY created_at DESC
    LIMIT 1
  ) cm ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as unread_count
    FROM chat_notifications
    WHERE chat_room_id = cr.id 
      AND user_id = user_uuid 
      AND is_read = false
  ) unread ON true
  WHERE cp.user_id = user_uuid 
    AND cp.is_active = true
  GROUP BY cr.id, cr.name, cr.type, cr.trip_id, cm.content, cm.created_at, unread.unread_count
  ORDER BY cm.created_at DESC NULLS LAST;
END;
$$ language 'plpgsql';

-- ===================================
-- COMMENTS FOR DOCUMENTATION
-- ===================================

COMMENT ON TABLE user_status IS 'Tracks real-time online/offline/away status for users';
COMMENT ON TABLE chat_rooms IS 'Chat rooms supporting 1:1, group, and trip-specific chats';
COMMENT ON TABLE chat_participants IS 'Manages user participation and permissions in chat rooms';
COMMENT ON TABLE chat_messages IS 'Stores all chat messages with rich content support';
COMMENT ON TABLE message_reactions IS 'Emoji reactions to messages';
COMMENT ON TABLE chat_notifications IS 'Tracks unread messages and notification delivery';

-- ===================================
-- GRANTS FOR AUTHENTICATED USERS
-- ===================================

-- Grant appropriate permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON user_status TO authenticated;
GRANT SELECT, INSERT, UPDATE ON chat_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE ON chat_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON message_reactions TO authenticated;
GRANT SELECT, UPDATE ON chat_notifications TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ===================================
-- MIGRATION COMPLETE
-- ===================================

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Trailkeeper Chat System Migration completed successfully!';
  RAISE NOTICE 'Features enabled:';
  RAISE NOTICE '- Real-time messaging';
  RAISE NOTICE '- Online/offline/away status';
  RAISE NOTICE '- 1:1 and group chats';
  RAISE NOTICE '- Trip-specific chats';
  RAISE NOTICE '- Message reactions';
  RAISE NOTICE '- Unread notifications';
  RAISE NOTICE '- Row-level security';
END $$;