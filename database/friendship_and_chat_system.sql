-- Friendship and Chat System Migration
-- Convert follower system to bidirectional friendship system with chat functionality

-- 1. Update follows table to friendships table structure
-- First, let's modify the existing follows table to support bidirectional friendships

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_follows_follower_status ON follows(follower_id, status);
CREATE INDEX IF NOT EXISTS idx_follows_following_status ON follows(following_id, status);

-- Create a view that shows mutual friendships (bidirectional accepted follows)
CREATE OR REPLACE VIEW friendships AS
SELECT DISTINCT
  LEAST(f1.follower_id, f1.following_id) as user1_id,
  GREATEST(f1.follower_id, f1.following_id) as user2_id,
  GREATEST(f1.created_at, f2.created_at) as friendship_created_at,
  GREATEST(f1.updated_at, f2.updated_at) as friendship_updated_at
FROM follows f1
JOIN follows f2 ON (
  f1.follower_id = f2.following_id 
  AND f1.following_id = f2.follower_id
  AND f1.status = 'accepted' 
  AND f2.status = 'accepted'
);

COMMENT ON VIEW friendships IS 'Shows bidirectional friendships where both users follow each other with accepted status';

-- 2. Create chat system tables

-- Chat rooms (can be 1:1 or group chats)
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT, -- NULL for 1:1 chats, set for group chats
  description TEXT,
  is_group BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- For 1:1 chats, we can store both user IDs for easier queries
  user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Ensure 1:1 chats have exactly 2 users and unique pairs
  CONSTRAINT valid_1v1_chat CHECK (
    (is_group = true AND user1_id IS NULL AND user2_id IS NULL) OR
    (is_group = false AND user1_id IS NOT NULL AND user2_id IS NOT NULL AND user1_id != user2_id)
  ),
  CONSTRAINT unique_1v1_chat UNIQUE (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id))
);

-- Chat participants (for group chats and permission management)
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(room_id, user_id)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  metadata JSONB DEFAULT '{}', -- For attachments, etc.
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure content is not empty for text messages
  CONSTRAINT non_empty_content CHECK (
    message_type != 'text' OR (content IS NOT NULL AND length(trim(content)) > 0)
  )
);

-- Message reactions (likes, etc.)
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction VARCHAR(10) NOT NULL, -- emoji or reaction type
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(message_id, user_id, reaction)
);

-- Chat notifications
CREATE TABLE IF NOT EXISTS chat_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('new_message', 'mention', 'new_participant')),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_rooms_participants ON chat_rooms(user1_id, user2_id) WHERE is_group = false;
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_room ON chat_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_notifications_user_unread ON chat_notifications(user_id, read_at) WHERE read_at IS NULL;

-- 4. Enable RLS on all chat tables
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_notifications ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for chat system

-- Chat rooms policies
CREATE POLICY "Users can view rooms they participate in" ON chat_rooms
  FOR SELECT USING (
    created_by = auth.uid() OR
    user1_id = auth.uid() OR 
    user2_id = auth.uid() OR
    EXISTS(SELECT 1 FROM chat_participants WHERE room_id = chat_rooms.id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create rooms" ON chat_rooms
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room creators can update rooms" ON chat_rooms
  FOR UPDATE USING (auth.uid() = created_by);

-- Chat participants policies  
CREATE POLICY "Users can view participants in their rooms" ON chat_participants
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS(
      SELECT 1 FROM chat_rooms cr 
      WHERE cr.id = chat_participants.room_id 
      AND (cr.user1_id = auth.uid() OR cr.user2_id = auth.uid() OR cr.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can join rooms they're invited to" ON chat_participants
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS(
      SELECT 1 FROM chat_rooms cr 
      WHERE cr.id = room_id 
      AND (cr.user1_id = auth.uid() OR cr.user2_id = auth.uid() OR cr.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can update their own participation" ON chat_participants
  FOR UPDATE USING (user_id = auth.uid());

-- Chat messages policies
CREATE POLICY "Users can view messages in their rooms" ON chat_messages
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM chat_rooms cr 
      WHERE cr.id = chat_messages.room_id 
      AND (
        cr.user1_id = auth.uid() OR 
        cr.user2_id = auth.uid() OR 
        EXISTS(SELECT 1 FROM chat_participants cp WHERE cp.room_id = cr.id AND cp.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can send messages" ON chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS(
      SELECT 1 FROM chat_rooms cr 
      WHERE cr.id = room_id 
      AND (
        cr.user1_id = auth.uid() OR 
        cr.user2_id = auth.uid() OR 
        EXISTS(SELECT 1 FROM chat_participants cp WHERE cp.room_id = cr.id AND cp.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can edit their own messages" ON chat_messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Message reactions policies
CREATE POLICY "Users can manage their own reactions" ON message_reactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view all reactions" ON message_reactions
  FOR SELECT USING (true);

-- Chat notifications policies
CREATE POLICY "Users can view their own notifications" ON chat_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON chat_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 6. Helper functions

-- Function to get or create 1:1 chat room between two friends
CREATE OR REPLACE FUNCTION get_or_create_chat_room(friend_user_id UUID)
RETURNS UUID AS $$
DECLARE
  room_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current user
  SELECT auth.uid() INTO current_user_id;
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF current_user_id = friend_user_id THEN
    RAISE EXCEPTION 'Cannot create chat room with yourself';
  END IF;
  
  -- Check if users are friends (bidirectional follow relationship)
  IF NOT EXISTS(
    SELECT 1 FROM friendships 
    WHERE (user1_id = current_user_id AND user2_id = friend_user_id) 
       OR (user1_id = friend_user_id AND user2_id = current_user_id)
  ) THEN
    RAISE EXCEPTION 'Users must be friends to create a chat room';
  END IF;
  
  -- Try to find existing room
  SELECT id INTO room_id
  FROM chat_rooms 
  WHERE is_group = false 
    AND ((user1_id = current_user_id AND user2_id = friend_user_id) 
         OR (user1_id = friend_user_id AND user2_id = current_user_id));
  
  -- Create room if it doesn't exist
  IF room_id IS NULL THEN
    INSERT INTO chat_rooms (
      is_group, 
      created_by, 
      user1_id, 
      user2_id
    ) VALUES (
      false, 
      current_user_id, 
      LEAST(current_user_id, friend_user_id),
      GREATEST(current_user_id, friend_user_id)
    ) RETURNING id INTO room_id;
    
    -- Add both users as participants
    INSERT INTO chat_participants (room_id, user_id) VALUES 
      (room_id, current_user_id),
      (room_id, friend_user_id);
  END IF;
  
  RETURN room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if two users are friends
CREATE OR REPLACE FUNCTION are_users_friends(user1 UUID, user2 UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM friendships 
    WHERE (user1_id = user1 AND user2_id = user2) 
       OR (user1_id = user2 AND user2_id = user1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update activity feed function to use friendship view
DROP FUNCTION IF EXISTS get_activity_feed(UUID, INTEGER);
CREATE OR REPLACE FUNCTION get_activity_feed(user_uuid UUID, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  activity_id UUID,
  user_id UUID,
  user_nickname TEXT,
  user_avatar TEXT,
  activity_type VARCHAR(50),
  title TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.id AS activity_id,
    ua.user_id,
    up.nickname AS user_nickname,
    up.avatar_url AS user_avatar,
    ua.activity_type,
    ua.title,
    ua.description,
    ua.metadata,
    ua.created_at
  FROM user_activities ua
  LEFT JOIN user_profiles up ON ua.user_id = up.id
  LEFT JOIN trips t ON ua.related_trip_id = t.id
  WHERE 
    -- Own activities are always shown
    ua.user_id = user_uuid 
    OR
    -- Activities from friends with trip privacy checks
    (
      EXISTS(
        SELECT 1 FROM friendships f 
        WHERE (f.user1_id = user_uuid AND f.user2_id = ua.user_id) 
           OR (f.user1_id = ua.user_id AND f.user2_id = user_uuid)
      )
      AND 
      -- Check trip privacy if activity is trip-related
      (
        ua.related_trip_id IS NULL  -- Non-trip activities are always shown from friends
        OR 
        t.privacy = 'public'  -- Public trips are always shown
        OR 
        (
          t.privacy = 'contacts' AND EXISTS(
            SELECT 1 FROM friendships f 
            WHERE (f.user1_id = user_uuid AND f.user2_id = ua.user_id) 
               OR (f.user1_id = ua.user_id AND f.user2_id = user_uuid)
          )
        )  -- Contact trips shown to friends
        OR
        t.owner_id = user_uuid  -- User is trip owner
        OR
        user_uuid = ANY(t.tagged_users)  -- User is tagged in trip
      )
    )
    -- Include activities where current user is trip owner/tagged (even if not friends with activity creator)
    OR
    (
      t.owner_id = user_uuid 
      OR 
      user_uuid = ANY(t.tagged_users)
    )
  ORDER BY ua.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT 'Friendship and chat system created successfully! 🎉' AS result;