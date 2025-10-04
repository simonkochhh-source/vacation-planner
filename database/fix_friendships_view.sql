-- Fix Friendships View and System
-- This migration ensures the friendships view correctly shows bidirectional relationships

-- 1. Drop existing friendships view if it exists
DROP VIEW IF EXISTS friendships;

-- 2. Create the friendships view that shows bidirectional relationships
CREATE VIEW friendships AS
SELECT 
    LEAST(f1.follower_id, f1.following_id) as user1_id,
    GREATEST(f1.follower_id, f1.following_id) as user2_id,
    MIN(f1.created_at) as friendship_created_at,
    LEAST(f1.follower_id::text, f1.following_id::text) || '-' || GREATEST(f1.follower_id::text, f1.following_id::text) as friendship_id
FROM follows f1
JOIN follows f2 ON (
    f1.follower_id = f2.following_id 
    AND f1.following_id = f2.follower_id
)
WHERE f1.status = 'ACCEPTED' 
    AND f2.status = 'ACCEPTED'
GROUP BY LEAST(f1.follower_id, f1.following_id), GREATEST(f1.follower_id, f1.following_id);

-- 3. Create helper function to check if users are friends
CREATE OR REPLACE FUNCTION are_users_friends(user1 UUID, user2 UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if there's a bidirectional accepted relationship
  RETURN EXISTS (
    SELECT 1 FROM friendships 
    WHERE (user1_id = user1 AND user2_id = user2) 
       OR (user1_id = user2 AND user2_id = user1)
  );
END;
$$;

-- 4. Create function to get friends for a user
CREATE OR REPLACE FUNCTION get_user_friends(target_user_id UUID)
RETURNS TABLE (
  friend_id UUID,
  friendship_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN f.user1_id = target_user_id THEN f.user2_id 
      ELSE f.user1_id 
    END as friend_id,
    f.friendship_created_at
  FROM friendships f
  WHERE f.user1_id = target_user_id OR f.user2_id = target_user_id;
END;
$$;

-- 5. Test data: Create a test bidirectional friendship for debugging
-- This is commented out, but can be used to test the system
/*
-- Example: Create bidirectional friendship between two test users
-- Replace with actual user IDs from your database

INSERT INTO follows (follower_id, following_id, status, created_at) 
VALUES 
  ('2b0d0227-050a-42c2-962c-476274c0a1b7', '9c26f983-07ed-4f5b-a1bd-4c461c84ca98', 'ACCEPTED', NOW()),
  ('9c26f983-07ed-4f5b-a1bd-4c461c84ca98', '2b0d0227-050a-42c2-962c-476274c0a1b7', 'ACCEPTED', NOW())
ON CONFLICT (follower_id, following_id) DO UPDATE SET
  status = 'ACCEPTED',
  updated_at = NOW();
*/

-- 6. Grant permissions
GRANT SELECT ON friendships TO authenticated;

-- Success message
SELECT 'Friendships view and functions created successfully!' as result;