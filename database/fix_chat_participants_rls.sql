-- Fix chat_participants RLS policies to allow adding other users to chats
-- This enables direct chat creation and group chat management

-- Drop existing problematic policy
DROP POLICY IF EXISTS "Users can manage their own participation" ON chat_participants;

-- Create new policies that allow proper chat management

-- 1. Users can view all participants (needed for chat functionality)
CREATE POLICY "Users can view all participants" ON chat_participants
  FOR SELECT USING (true);

-- 2. Users can add themselves to any chat
CREATE POLICY "Users can add themselves to chats" ON chat_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Chat room creators can add other users to their rooms
CREATE POLICY "Room creators can add participants" ON chat_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_rooms 
      WHERE chat_rooms.id = chat_participants.chat_room_id 
      AND chat_rooms.created_by = auth.uid()
    )
  );

-- 4. Users can update their own participation status
CREATE POLICY "Users can update their own participation" ON chat_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- 5. Room creators can update participant roles in their rooms
CREATE POLICY "Room creators can manage participants" ON chat_participants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM chat_rooms 
      WHERE chat_rooms.id = chat_participants.chat_room_id 
      AND chat_rooms.created_by = auth.uid()
    )
  );

-- 6. Users can remove themselves from chats
CREATE POLICY "Users can remove themselves from chats" ON chat_participants
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Room creators can remove participants from their rooms
CREATE POLICY "Room creators can remove participants" ON chat_participants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM chat_rooms 
      WHERE chat_rooms.id = chat_participants.chat_room_id 
      AND chat_rooms.created_by = auth.uid()
    )
  );

SELECT 'Chat participants RLS policies updated successfully!' as result;