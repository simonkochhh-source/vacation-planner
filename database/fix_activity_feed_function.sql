-- Fix get_activity_feed function to match expected TypeScript structure
-- This corrects the column naming and ordering mismatch between database function and frontend expectations

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

-- Success message
SELECT 'Activity feed function fixed successfully!' AS result;