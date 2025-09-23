-- Social Network Features Migration
-- This file adds tables and features for user following, activity feeds, and enhanced privacy

-- 1. User Following System
CREATE TABLE IF NOT EXISTS follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent self-following and duplicate relationships
  CONSTRAINT no_self_follow CHECK (follower_id != following_id),
  CONSTRAINT unique_follow_relationship UNIQUE (follower_id, following_id)
);

-- 2. User Activity Feed System
CREATE TABLE IF NOT EXISTS user_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
    'trip_created', 
    'trip_completed', 
    'destination_visited', 
    'photo_uploaded',
    'trip_shared',
    'destination_added'
  )),
  related_trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  related_destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
  
  -- Activity metadata (JSON for flexible data storage)
  metadata JSONB DEFAULT '{}',
  
  -- Activity content for feed display
  title TEXT NOT NULL,
  description TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index for efficient feed queries
  CONSTRAINT activity_has_related_item CHECK (
    related_trip_id IS NOT NULL OR related_destination_id IS NOT NULL
  )
);

-- 3. Enhanced Trip Privacy Settings
-- Add 'contacts' privacy level to existing trips table
DO $$ 
BEGIN
  -- Check if the privacy column exists and update the constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trips' AND column_name = 'privacy'
  ) THEN
    -- Drop existing constraint if it exists
    ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_privacy_check;
    
    -- Add new constraint with 'contacts' option
    ALTER TABLE trips ADD CONSTRAINT trips_privacy_check 
    CHECK (privacy IN ('private', 'public', 'contacts'));
  ELSE
    -- If privacy column doesn't exist, create it
    ALTER TABLE trips ADD COLUMN privacy VARCHAR(20) DEFAULT 'private' 
    CHECK (privacy IN ('private', 'public', 'contacts'));
  END IF;
END $$;

-- 4. User Profile Enhancements
-- Add social-related fields to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_public_profile BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trip_count INTEGER DEFAULT 0;

-- 5. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_status ON follows(status);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_trips_privacy ON trips(privacy);

-- 6. Row Level Security (RLS) Policies

-- Follows table policies
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Users can see follow relationships they're involved in
CREATE POLICY "Users can view their follow relationships" ON follows
  FOR SELECT USING (follower_id = auth.uid() OR following_id = auth.uid());

-- Users can create follow requests
CREATE POLICY "Users can create follow requests" ON follows
  FOR INSERT WITH CHECK (follower_id = auth.uid());

-- Users can update follow requests they received (accept/decline)
CREATE POLICY "Users can respond to follow requests" ON follows
  FOR UPDATE USING (following_id = auth.uid());

-- Users can delete their own follow relationships
CREATE POLICY "Users can delete their follow relationships" ON follows
  FOR DELETE USING (follower_id = auth.uid() OR following_id = auth.uid());

-- User activities table policies
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Users can view activities from people they follow or public profiles
CREATE POLICY "Users can view relevant activities" ON user_activities
  FOR SELECT USING (
    -- Own activities
    user_id = auth.uid() OR
    -- Activities from people they follow (accepted follows only)
    user_id IN (
      SELECT following_id FROM follows 
      WHERE follower_id = auth.uid() AND status = 'accepted'
    ) OR
    -- Activities from public profiles
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE is_public_profile = true
    )
  );

-- Users can create their own activities
CREATE POLICY "Users can create their own activities" ON user_activities
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update/delete their own activities
CREATE POLICY "Users can manage their own activities" ON user_activities
  FOR ALL USING (user_id = auth.uid());

-- 7. Helper Functions

-- Function to get user's social stats
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

-- Function to check if user A follows user B
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

-- Function to get activity feed for a user
CREATE OR REPLACE FUNCTION get_activity_feed(user_uuid UUID, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  activity_id UUID,
  user_id UUID,
  user_nickname TEXT,
  user_avatar TEXT,
  activity_type TEXT,
  title TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.id,
    ua.user_id,
    up.nickname,
    up.avatar_url,
    ua.activity_type,
    ua.title,
    ua.description,
    ua.metadata,
    ua.created_at
  FROM user_activities ua
  JOIN user_profiles up ON ua.user_id = up.id
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

-- 8. Triggers for maintaining counts

-- Update follower/following counts when follows change
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

-- Create trigger for follow count updates
DROP TRIGGER IF EXISTS trigger_update_follow_counts ON follows;
CREATE TRIGGER trigger_update_follow_counts
  AFTER INSERT OR UPDATE OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- Update trip counts when trips change
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

-- Create trigger for trip count updates
DROP TRIGGER IF EXISTS trigger_update_trip_counts ON trips;
CREATE TRIGGER trigger_update_trip_counts
  AFTER INSERT OR DELETE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_trip_counts();

-- 9. Sample Data (Optional - for development)
-- Uncomment the following to add some sample activities for testing

/*
-- Sample activities (only run in development)
INSERT INTO user_activities (user_id, activity_type, title, description, metadata) VALUES
(
  (SELECT id FROM auth.users LIMIT 1),
  'trip_created',
  'Neue Reise nach Italien geplant',
  'Eine 2-wöchige Rundreise durch die Toskana',
  '{"destination": "Italien", "duration": 14}'
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'destination_visited',
  'Rom besucht',
  'Das Kolosseum war unglaublich!',
  '{"destination": "Rom", "rating": 5}'
);
*/

-- Migration completed
SELECT 'Social network features migration completed successfully!' AS result;