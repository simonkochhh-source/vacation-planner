-- Add Follow System: Unidirectional follows alongside bidirectional friendships
-- This extends the existing follows table to support immediate follows without approval

-- 1. Extend follows table status to include 'following' for immediate follows
-- Current statuses: 'pending' (friendship request), 'accepted' (mutual friendship), 'declined'
-- New status: 'following' (immediate, unidirectional follow - no approval needed)

-- Drop existing CHECK constraint and recreate with new status
ALTER TABLE follows DROP CONSTRAINT IF EXISTS follows_status_check;
ALTER TABLE follows ADD CONSTRAINT follows_status_check 
  CHECK (status IN ('pending', 'accepted', 'declined', 'following'));

-- 2. Create function to follow a user (immediate, no approval)
CREATE OR REPLACE FUNCTION follow_user(follower_uuid UUID, target_uuid UUID)
RETURNS UUID AS $$
DECLARE
  follow_id UUID;
  existing_follow_id UUID;
BEGIN
  -- Check if user is trying to follow themselves
  IF follower_uuid = target_uuid THEN
    RAISE EXCEPTION 'Cannot follow yourself';
  END IF;
  
  -- Check for existing relationship
  SELECT id INTO existing_follow_id 
  FROM follows 
  WHERE follower_id = follower_uuid AND following_id = target_uuid;
  
  -- If relationship already exists, update it to 'following'
  IF existing_follow_id IS NOT NULL THEN
    UPDATE follows 
    SET status = 'following', updated_at = NOW()
    WHERE id = existing_follow_id;
    RETURN existing_follow_id;
  END IF;
  
  -- Create new follow relationship
  INSERT INTO follows (follower_id, following_id, status)
  VALUES (follower_uuid, target_uuid, 'following')
  RETURNING id INTO follow_id;
  
  RETURN follow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function to unfollow a user
CREATE OR REPLACE FUNCTION unfollow_user(follower_uuid UUID, target_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  follow_record RECORD;
BEGIN
  -- Find the follow relationship
  SELECT * INTO follow_record
  FROM follows 
  WHERE follower_id = follower_uuid AND following_id = target_uuid AND status = 'following';
  
  -- If no follow relationship found, return false
  IF follow_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Delete the follow relationship
  DELETE FROM follows WHERE id = follow_record.id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to get follow status between two users
CREATE OR REPLACE FUNCTION get_follow_status(user_a UUID, user_b UUID)
RETURNS TABLE (
  is_following BOOLEAN,
  is_followed_by BOOLEAN,
  are_friends BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Is user_a following user_b?
    EXISTS(
      SELECT 1 FROM follows 
      WHERE follower_id = user_a AND following_id = user_b AND status = 'following'
    ) AS is_following,
    -- Is user_a followed by user_b?
    EXISTS(
      SELECT 1 FROM follows 
      WHERE follower_id = user_b AND following_id = user_a AND status = 'following'  
    ) AS is_followed_by,
    -- Are they friends (mutual accepted friendship)?
    EXISTS(
      SELECT 1 FROM follows f1
      JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
      WHERE f1.follower_id = user_a AND f1.following_id = user_b 
      AND f1.status = 'accepted' AND f2.status = 'accepted'
    ) AS are_friends;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to get users that a specific user is following
CREATE OR REPLACE FUNCTION get_following_users(user_uuid UUID)
RETURNS TABLE (
  user_id UUID,
  nickname TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  is_verified BOOLEAN,
  followed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.nickname,
    up.display_name,
    up.avatar_url,
    up.bio,
    up.location,
    up.is_verified,
    f.created_at
  FROM follows f
  JOIN user_profiles up ON f.following_id = up.id
  WHERE f.follower_id = user_uuid AND f.status = 'following'
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to get users that follow a specific user  
CREATE OR REPLACE FUNCTION get_followers(user_uuid UUID)
RETURNS TABLE (
  user_id UUID,
  nickname TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  is_verified BOOLEAN,
  followed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.nickname,
    up.display_name,
    up.avatar_url,
    up.bio,
    up.location,
    up.is_verified,
    f.created_at
  FROM follows f
  JOIN user_profiles up ON f.follower_id = up.id
  WHERE f.following_id = user_uuid AND f.status = 'following'
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update activity feed function to include followed users' public activities
-- This function will include activities from users the current user is following (unidirectional)
DROP FUNCTION IF EXISTS get_activity_feed_with_follows(UUID, INTEGER);
CREATE OR REPLACE FUNCTION get_activity_feed_with_follows(user_uuid UUID, limit_count INTEGER DEFAULT 20)
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
    -- Activities from friends (bidirectional relationship)
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
    OR
    -- Activities from followed users (unidirectional) - only PUBLIC content
    (
      EXISTS(
        SELECT 1 FROM follows f 
        WHERE f.follower_id = user_uuid 
        AND f.following_id = ua.user_id 
        AND f.status = 'following'
      )
      AND 
      -- Only show public activities from followed users (not friends)
      (
        ua.related_trip_id IS NULL  -- Non-trip activities
        OR 
        t.privacy = 'public'  -- Only public trips from followed users
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

-- 8. Add follow counts to user profiles
-- Update user profile stats to include follow counts
CREATE OR REPLACE FUNCTION get_user_follow_stats(user_uuid UUID)
RETURNS TABLE (
  following_count INTEGER,
  followers_count INTEGER,
  friends_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Count of users this user is following
    (SELECT COUNT(*)::INTEGER FROM follows WHERE follower_id = user_uuid AND status = 'following') AS following_count,
    -- Count of users following this user
    (SELECT COUNT(*)::INTEGER FROM follows WHERE following_id = user_uuid AND status = 'following') AS followers_count,
    -- Count of mutual friendships (bidirectional accepted)
    (SELECT COUNT(*)::INTEGER FROM friendships WHERE user1_id = user_uuid OR user2_id = user_uuid) AS friends_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Add RLS policies for follow system
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create follows" ON follows;
DROP POLICY IF EXISTS "Users can view relevant follows" ON follows;
DROP POLICY IF EXISTS "Users can delete their own follows" ON follows;

-- Users can follow others
CREATE POLICY "Users can create follows" ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id AND status = 'following');

-- Users can view their own follows and follows involving them
CREATE POLICY "Users can view relevant follows" ON follows
  FOR SELECT USING (
    auth.uid() = follower_id OR 
    auth.uid() = following_id
  );

-- Users can delete their own follows (unfollow)
CREATE POLICY "Users can delete their own follows" ON follows
  FOR DELETE USING (
    auth.uid() = follower_id AND status = 'following'
  );

-- Success message
SELECT 'Follow system successfully added! Users can now follow others without approval. 🔄' AS result;