-- Final Friendship System Integration - No auth.uid() comparisons in policies
-- This version avoids all direct auth.uid() usage in RLS policies

-- 1. Create friendships view (bidirectional relationships)
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

-- 2. Function to check if two users are friends
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

-- 3. Function to create 1:1 chat room between friends
CREATE OR REPLACE FUNCTION get_or_create_friend_chat(friend_user_id UUID)
RETURNS UUID AS $$
DECLARE
  room_id UUID;
  current_user_id UUID;
  smaller_id UUID;
  larger_id UUID;
BEGIN
  -- Get current user - try different approaches
  BEGIN
    SELECT (auth.uid())::UUID INTO current_user_id;
  EXCEPTION WHEN OTHERS THEN
    SELECT auth.uid()::UUID INTO current_user_id;
  END;
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF current_user_id = friend_user_id THEN
    RAISE EXCEPTION 'Cannot create chat room with yourself';
  END IF;
  
  -- Check if users are friends
  IF NOT are_users_friends(current_user_id, friend_user_id) THEN
    RAISE EXCEPTION 'Users must be friends to create a chat room';
  END IF;
  
  -- Ensure consistent ordering for 1:1 chats
  smaller_id := LEAST(current_user_id, friend_user_id);
  larger_id := GREATEST(current_user_id, friend_user_id);
  
  -- Try to find existing direct chat room between these users
  SELECT cr.id INTO room_id
  FROM chat_rooms cr
  JOIN chat_participants cp1 ON cr.id = cp1.chat_room_id AND cp1.user_id = smaller_id
  JOIN chat_participants cp2 ON cr.id = cp2.chat_room_id AND cp2.user_id = larger_id
  WHERE cr.type = 'direct' 
    AND cr.is_private = true
    AND (
      SELECT COUNT(*) FROM chat_participants 
      WHERE chat_room_id = cr.id AND is_active = true
    ) = 2; -- Exactly 2 participants
  
  -- Create room if it doesn't exist
  IF room_id IS NULL THEN
    -- Create the chat room
    INSERT INTO chat_rooms (
      name,
      type, 
      is_private,
      max_participants,
      created_by
    ) VALUES (
      NULL, -- No name for 1:1 chats
      'direct', 
      true,
      2,
      current_user_id
    ) RETURNING id INTO room_id;
    
    -- Add both users as participants
    INSERT INTO chat_participants (chat_room_id, user_id, role, can_send_messages, can_add_participants) VALUES 
      (room_id, current_user_id, 'member', true, false),
      (room_id, friend_user_id, 'member', true, false);
  END IF;
  
  RETURN room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update activity feed function to use friendships
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
      are_users_friends(user_uuid, ua.user_id)
      AND 
      -- Check trip privacy if activity is trip-related
      (
        ua.related_trip_id IS NULL  -- Non-trip activities are always shown from friends
        OR 
        t.privacy = 'public'  -- Public trips are always shown
        OR 
        (
          t.privacy = 'contacts' AND are_users_friends(user_uuid, ua.user_id)
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

-- 5. DO NOT create new policies - keep existing ones
-- The existing chat policies should work fine with the friendship functions
-- Only add the friendship functions without touching RLS policies

-- Success message
SELECT 'Friendship system functions created! Use existing chat policies. 🎉' AS result;