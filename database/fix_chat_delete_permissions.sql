-- FIX CHAT DELETE PERMISSIONS
-- This script adds proper DELETE policies for chat rooms

-- Drop existing policies that might interfere
DROP POLICY IF EXISTS "Users can create rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Room creators can update rooms" ON chat_rooms;

-- Recreate policies with proper DELETE support
CREATE POLICY "Users can create rooms" ON chat_rooms
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room creators can update rooms" ON chat_rooms
  FOR UPDATE USING (auth.uid() = created_by);

-- Add explicit DELETE policy for room owners
DROP POLICY IF EXISTS "Room creators can delete rooms" ON chat_rooms;
CREATE POLICY "Room creators can delete rooms" ON chat_rooms
  FOR DELETE USING (auth.uid() = created_by);

-- Test the setup
SELECT 'Chat room DELETE permissions updated successfully!' as result;