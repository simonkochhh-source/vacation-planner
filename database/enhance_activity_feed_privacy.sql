-- Enhance Activity Feed Function with Trip Privacy Checks
-- This extends the get_activity_feed function to respect trip privacy settings
-- Activities are only shown if:
-- 1. User is the activity owner
-- 2. User follows the activity owner (accepted)
-- 3. Related trip privacy allows viewing (public/contacts with follow relationship)

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
    -- Activities from followed users with trip privacy checks
    (
      ua.user_id IN (
        SELECT following_id FROM follows 
        WHERE follower_id = user_uuid AND status = 'accepted'
      )
      AND 
      -- Check trip privacy if activity is trip-related
      (
        ua.related_trip_id IS NULL  -- Non-trip activities are always shown from followed users
        OR 
        t.privacy = 'public'  -- Public trips are always shown
        OR 
        (
          t.privacy = 'contacts' AND ua.user_id IN (
            SELECT following_id FROM follows 
            WHERE follower_id = user_uuid AND status = 'accepted'
          )
        )  -- Contact trips shown if user follows trip owner
        OR
        t.owner_id = user_uuid  -- User is trip owner
        OR
        user_uuid = ANY(t.tagged_users)  -- User is tagged in trip
      )
    )
    -- Include activities where current user is trip owner/tagged (even if not following activity creator)
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

-- Add comment explaining the privacy logic
COMMENT ON FUNCTION get_activity_feed IS 'Returns activity feed with trip privacy checks: shows own activities, activities from followed users respecting trip privacy (public/contacts), and activities on trips where user is owner/tagged';

-- Success message
SELECT 'Activity feed function enhanced with trip privacy checks!' AS result;