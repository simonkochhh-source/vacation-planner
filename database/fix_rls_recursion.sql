-- CRITICAL FIX: Remove infinite recursion in RLS policies
-- This must be executed in Supabase SQL Editor immediately

-- 1. Drop problematic policies that cause recursion
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON chat_participants;
DROP POLICY IF EXISTS "Users can join rooms they're invited to" ON chat_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON chat_participants;
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON chat_rooms;

-- 2. Create simple, non-recursive policies

-- Chat Participants: Simple ownership-based access
CREATE POLICY "Users can manage their own participation" ON chat_participants
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view all participants" ON chat_participants
  FOR SELECT USING (true);

-- Chat Rooms: Simple access for authenticated users
CREATE POLICY "Authenticated users can view all rooms" ON chat_rooms
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create rooms" ON chat_rooms
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room creators can update rooms" ON chat_rooms
  FOR UPDATE USING (auth.uid() = created_by);

-- Chat Messages: Simple access for authenticated users
CREATE POLICY "Authenticated users can view all messages" ON chat_messages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can send messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can edit their own messages" ON chat_messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Chat Notifications: User-specific access
CREATE POLICY "Users can view their own notifications" ON chat_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON chat_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Message Reactions: User-specific access
CREATE POLICY "Users can manage their own reactions" ON message_reactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view all reactions" ON message_reactions
  FOR SELECT USING (true);

SELECT 'RLS policies fixed - infinite recursion resolved!' as result;