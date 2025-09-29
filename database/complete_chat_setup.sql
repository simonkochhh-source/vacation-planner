-- COMPLETE CHAT SYSTEM SETUP
-- Execute this ENTIRE script in Supabase SQL Editor

-- First, create the basic chat schema
-- Create user_status table if not exists
CREATE TABLE IF NOT EXISTS user_status (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away')),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status_message TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_rooms table if not exists
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  description TEXT,
  type VARCHAR(20) NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'trip')),
  trip_id UUID, -- Note: Removed REFERENCES trips(id) for now to avoid dependency issues
  is_private BOOLEAN NOT NULL DEFAULT true,
  max_participants INTEGER DEFAULT 50,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_participants table if not exists
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  can_send_messages BOOLEAN NOT NULL DEFAULT true,
  can_add_participants BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  notification_sound BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(chat_room_id, user_id)
);

-- Create chat_messages table if not exists
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'location', 'system')),
  metadata JSONB DEFAULT '{}',
  is_edited BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  reply_to UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_notifications table if not exists
CREATE TABLE IF NOT EXISTS chat_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  notification_type VARCHAR(20) NOT NULL DEFAULT 'message' CHECK (notification_type IN ('message', 'mention', 'room_update')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create message_reactions table if not exists
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, reaction)
);

-- Create essential indexes
CREATE INDEX IF NOT EXISTS idx_user_status_status ON user_status(status);
CREATE INDEX IF NOT EXISTS idx_user_status_last_seen ON user_status(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON chat_rooms(type);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by ON chat_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_room_id ON chat_participants(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_active ON chat_participants(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_room_id ON chat_messages(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to ON chat_messages(reply_to) WHERE reply_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_notifications_user_id ON chat_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_notifications_unread ON chat_notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);

-- Enable RLS on all tables
ALTER TABLE user_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Drop any problematic policies that cause recursion
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON chat_participants;
DROP POLICY IF EXISTS "Users can join rooms they're invited to" ON chat_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON chat_participants;
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON chat_rooms;

-- Create simple, non-recursive RLS policies

-- User Status policies
DROP POLICY IF EXISTS "Users can manage their own status" ON user_status;
CREATE POLICY "Users can manage their own status" ON user_status
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view all user statuses" ON user_status;
CREATE POLICY "Users can view all user statuses" ON user_status
  FOR SELECT USING (auth.role() = 'authenticated');

-- Chat Participants policies (simple, no recursion)
DROP POLICY IF EXISTS "Users can manage their own participation" ON chat_participants;
CREATE POLICY "Users can manage their own participation" ON chat_participants
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view all participants" ON chat_participants;
CREATE POLICY "Users can view all participants" ON chat_participants
  FOR SELECT USING (auth.role() = 'authenticated');

-- Chat Rooms policies (simple access for authenticated users)
DROP POLICY IF EXISTS "Authenticated users can view all rooms" ON chat_rooms;
CREATE POLICY "Authenticated users can view all rooms" ON chat_rooms
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can create rooms" ON chat_rooms;
CREATE POLICY "Users can create rooms" ON chat_rooms
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Room creators can update rooms" ON chat_rooms;
CREATE POLICY "Room creators can update rooms" ON chat_rooms
  FOR UPDATE USING (auth.uid() = created_by);

-- Chat Messages policies (simple access for authenticated users)
DROP POLICY IF EXISTS "Authenticated users can view all messages" ON chat_messages;
CREATE POLICY "Authenticated users can view all messages" ON chat_messages
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can send messages" ON chat_messages;
CREATE POLICY "Users can send messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can edit their own messages" ON chat_messages;
CREATE POLICY "Users can edit their own messages" ON chat_messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Chat Notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON chat_notifications;
CREATE POLICY "Users can view their own notifications" ON chat_notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON chat_notifications;
CREATE POLICY "Users can update their own notifications" ON chat_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Message Reactions policies
DROP POLICY IF EXISTS "Users can manage their own reactions" ON message_reactions;
CREATE POLICY "Users can manage their own reactions" ON message_reactions
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view all reactions" ON message_reactions;
CREATE POLICY "Users can view all reactions" ON message_reactions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create or replace functions for better performance
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_user_status_updated_at ON user_status;
CREATE TRIGGER update_user_status_updated_at BEFORE UPDATE ON user_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_rooms_updated_at ON chat_rooms;
CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON chat_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON chat_messages;
CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON chat_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a test user in users table if needed (for development)
-- Note: This assumes you have a users table or auth.users is available
INSERT INTO auth.users (id, email, raw_user_meta_data) 
VALUES ('00000000-0000-0000-0000-000000000001', 'test@example.com', '{"nickname": "Test User", "display_name": "Test User"}')
ON CONFLICT (id) DO NOTHING;

-- Insert sample data for testing
INSERT INTO user_status (user_id, status) 
VALUES ('00000000-0000-0000-0000-000000000001', 'online')
ON CONFLICT (user_id) DO NOTHING;

-- Success message
SELECT 'Chat system setup complete! All tables, indexes, and policies created successfully.' as result;