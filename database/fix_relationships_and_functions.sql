-- Fix relationships and functions for social features

-- 1. Add proper foreign key relationships from follows to user_profiles
ALTER TABLE follows 
DROP CONSTRAINT IF EXISTS follows_follower_id_fkey;

ALTER TABLE follows 
ADD CONSTRAINT follows_follower_id_fkey 
FOREIGN KEY (follower_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

ALTER TABLE follows 
DROP CONSTRAINT IF EXISTS follows_following_id_fkey;

ALTER TABLE follows 
ADD CONSTRAINT follows_following_id_fkey 
FOREIGN KEY (following_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- 2. Add proper foreign key relationship from user_activities to user_profiles
ALTER TABLE user_activities 
DROP CONSTRAINT IF EXISTS user_activities_user_id_fkey;

ALTER TABLE user_activities 
ADD CONSTRAINT user_activities_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- 3. Fix the get_activity_feed function with correct return structure
DROP FUNCTION IF EXISTS get_activity_feed(UUID, INTEGER);

CREATE OR REPLACE FUNCTION get_activity_feed(user_uuid UUID, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  activity_type TEXT,
  title TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  user_nickname TEXT,
  user_avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.id,
    ua.user_id,
    ua.activity_type,
    ua.title,
    ua.description,
    ua.metadata,
    ua.created_at,
    up.nickname,
    up.avatar_url
  FROM user_activities ua
  LEFT JOIN user_profiles up ON ua.user_id = up.id
  WHERE 
    -- Own activities or activities from followed users
    ua.user_id = user_uuid OR
    ua.user_id IN (
      SELECT following_id FROM follows 
      WHERE follower_id = user_uuid AND status = 'accepted'
    )
  ORDER BY ua.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update the trigger functions to use user_profiles correctly
DROP FUNCTION IF EXISTS update_follow_counts() CASCADE;

CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'accepted' THEN
    -- Increase counts for accepted follow
    UPDATE user_profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE user_profiles SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'accepted' AND NEW.status = 'accepted' THEN
    -- Follow request was accepted
    UPDATE user_profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE user_profiles SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'accepted' AND NEW.status != 'accepted' THEN
    -- Follow was removed or declined
    UPDATE user_profiles SET following_count = following_count - 1 WHERE id = NEW.follower_id;
    UPDATE user_profiles SET follower_count = follower_count - 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'accepted' THEN
    -- Accepted follow was deleted
    UPDATE user_profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
    UPDATE user_profiles SET follower_count = follower_count - 1 WHERE id = OLD.following_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger for follow count updates
DROP TRIGGER IF EXISTS trigger_update_follow_counts ON follows;
CREATE TRIGGER trigger_update_follow_counts
  AFTER INSERT OR UPDATE OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- 5. Update trip count function to use user_profiles
DROP FUNCTION IF EXISTS update_trip_counts() CASCADE;

CREATE OR REPLACE FUNCTION update_trip_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_profiles SET trip_count = trip_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_profiles SET trip_count = trip_count - 1 WHERE id = OLD.user_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger for trip count updates
DROP TRIGGER IF EXISTS trigger_update_trip_counts ON trips;
CREATE TRIGGER trigger_update_trip_counts
  AFTER INSERT OR DELETE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_trip_counts();

-- 6. Update other helper functions
DROP FUNCTION IF EXISTS get_user_social_stats(UUID);

CREATE OR REPLACE FUNCTION get_user_social_stats(user_uuid UUID)
RETURNS TABLE (
  follower_count BIGINT,
  following_count BIGINT,
  trip_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM follows WHERE following_id = user_uuid AND status = 'accepted'),
    (SELECT COUNT(*) FROM follows WHERE follower_id = user_uuid AND status = 'accepted'),
    (SELECT COUNT(*) FROM trips WHERE user_id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update is_following function
DROP FUNCTION IF EXISTS is_following(UUID, UUID);

CREATE OR REPLACE FUNCTION is_following(follower_uuid UUID, following_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT COALESCE(status, 'none') 
    FROM follows 
    WHERE follower_id = follower_uuid AND following_id = following_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT 'Relationships and functions fixed successfully!' AS result;