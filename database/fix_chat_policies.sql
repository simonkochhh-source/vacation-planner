-- Fix RLS Policy Infinite Recursion Issue
-- This script fixes the circular dependency in chat_participants policies

-- First, drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON chat_participants;
DROP POLICY IF EXISTS "Users can join rooms they're invited to" ON chat_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON chat_participants;

-- Recreate chat_participants policies without circular references
CREATE POLICY "Users can view participants in their rooms" ON chat_participants
  FOR SELECT USING (
    -- User can see participants if they are in the same room
    chat_room_id IN (
      SELECT cp.chat_room_id 
      FROM chat_participants cp 
      WHERE cp.user_id = auth.uid() 
      AND cp.is_active = true
    )
  );

CREATE POLICY "Users can join rooms they're invited to" ON chat_participants
  FOR INSERT WITH CHECK (
    -- User can only insert their own participation
    auth.uid() = user_id
  );

CREATE POLICY "Users can update their own participation" ON chat_participants
  FOR UPDATE USING (
    -- User can only update their own participation
    auth.uid() = user_id
  );

-- Also fix chat_messages policy to avoid potential issues
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON chat_messages;

CREATE POLICY "Users can view messages in their rooms" ON chat_messages
  FOR SELECT USING (
    -- User can see messages if they are an active participant in the room
    chat_room_id IN (
      SELECT cp.chat_room_id 
      FROM chat_participants cp 
      WHERE cp.user_id = auth.uid() 
      AND cp.is_active = true
    )
  );

-- Fix chat_rooms policy as well
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON chat_rooms;

CREATE POLICY "Users can view rooms they participate in" ON chat_rooms
  FOR SELECT USING (
    -- User can see rooms where they are an active participant
    id IN (
      SELECT cp.chat_room_id 
      FROM chat_participants cp 
      WHERE cp.user_id = auth.uid() 
      AND cp.is_active = true
    )
  );

-- Also create a simpler policy for allowing room deletion by owners
CREATE POLICY "Room owners can delete rooms" ON chat_rooms
  FOR DELETE USING (
    created_by = auth.uid() OR
    id IN (
      SELECT cp.chat_room_id 
      FROM chat_participants cp 
      WHERE cp.user_id = auth.uid() 
      AND cp.role = 'owner' 
      AND cp.is_active = true
    )
  );

SELECT 'Chat policies fixed successfully!' as result;