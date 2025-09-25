-- Complete Test Database Schema Migration
-- This file contains all tables, functions, and policies needed for the vacation planner app

-- First, create the core tables structure

-- 1. Trips Table
CREATE TABLE IF NOT EXISTS trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  privacy VARCHAR(20) DEFAULT 'private' CHECK (privacy IN ('private', 'public', 'contacts')),
  budget_total DECIMAL(10,2) DEFAULT 0,
  budget_spent DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'EUR',
  status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Destinations Table
CREATE TABLE IF NOT EXISTS destinations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  category VARCHAR(50) DEFAULT 'sightseeing',
  start_date DATE,
  end_date DATE,
  start_time TIME,
  duration_minutes INTEGER,
  cost DECIMAL(10,2) DEFAULT 0,
  actual_cost DECIMAL(10,2),
  payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_visited BOOLEAN DEFAULT false,
  image_url TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_verified BOOLEAN DEFAULT false
);

-- 3. User Profiles Table (complete definition)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Profile Information
  nickname TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  
  -- Contact Information
  email TEXT,
  location TEXT,
  website TEXT,
  social_links JSONB DEFAULT '{}',
  
  -- Social Settings
  is_public_profile BOOLEAN DEFAULT true,
  
  -- Social Statistics (maintained by triggers)
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  trip_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Follows Table (Social Network)
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

-- 5. User Activities Table (Activity Feed)
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

-- 6. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_privacy ON trips(privacy);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_destinations_trip_id ON destinations(trip_id);
CREATE INDEX IF NOT EXISTS idx_destinations_user_id ON destinations(user_id);
CREATE INDEX IF NOT EXISTS idx_destinations_category ON destinations(category);
CREATE INDEX IF NOT EXISTS idx_destinations_order ON destinations(trip_id, order_index);
CREATE INDEX IF NOT EXISTS idx_user_profiles_nickname ON user_profiles(nickname);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_public ON user_profiles(is_public_profile);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_status ON follows(status);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);

-- 7. Enable Row Level Security (RLS)
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for Trips
-- Users can view their own trips and public trips
CREATE POLICY "Users can view accessible trips" ON trips
  FOR SELECT USING (
    user_id = auth.uid() OR
    privacy = 'public' OR
    (privacy = 'contacts' AND user_id IN (
      SELECT following_id FROM follows 
      WHERE follower_id = auth.uid() AND status = 'accepted'
      UNION
      SELECT follower_id FROM follows 
      WHERE following_id = auth.uid() AND status = 'accepted'
    ))
  );

-- Users can create their own trips
CREATE POLICY "Users can create their own trips" ON trips
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own trips
CREATE POLICY "Users can update their own trips" ON trips
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own trips
CREATE POLICY "Users can delete their own trips" ON trips
  FOR DELETE USING (user_id = auth.uid());

-- 9. RLS Policies for Destinations
-- Users can view destinations from trips they have access to
CREATE POLICY "Users can view accessible destinations" ON destinations
  FOR SELECT USING (
    user_id = auth.uid() OR
    trip_id IN (
      SELECT id FROM trips WHERE 
        user_id = auth.uid() OR
        privacy = 'public' OR
        (privacy = 'contacts' AND user_id IN (
          SELECT following_id FROM follows 
          WHERE follower_id = auth.uid() AND status = 'accepted'
          UNION
          SELECT follower_id FROM follows 
          WHERE following_id = auth.uid() AND status = 'accepted'
        ))
    )
  );

-- Users can create destinations for their own trips
CREATE POLICY "Users can create destinations for their trips" ON destinations
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND 
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

-- Users can update their own destinations
CREATE POLICY "Users can update their own destinations" ON destinations
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own destinations
CREATE POLICY "Users can delete their own destinations" ON destinations
  FOR DELETE USING (user_id = auth.uid());

-- 10. RLS Policies for User Profiles
-- Users can view public profiles or their own profile
CREATE POLICY "Users can view public profiles" ON user_profiles
  FOR SELECT USING (
    is_public_profile = true OR 
    id = auth.uid()
  );

-- Users can insert their own profile
CREATE POLICY "Users can create their own profile" ON user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

-- Users can delete their own profile
CREATE POLICY "Users can delete their own profile" ON user_profiles
  FOR DELETE USING (id = auth.uid());

-- 11. RLS Policies for Follows
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

-- 12. RLS Policies for User Activities
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

-- 13. Functions

-- Function to automatically create user profile when user signs up
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, nickname, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nickname', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- Function to update follower/following counts when follows change
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

-- Function to update trip counts when trips change
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

-- 14. Triggers

-- Trigger to create profile when user signs up
DROP TRIGGER IF EXISTS trigger_create_user_profile ON auth.users;
CREATE TRIGGER trigger_create_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Triggers to update updated_at timestamps
DROP TRIGGER IF EXISTS trigger_update_trips_updated_at ON trips;
CREATE TRIGGER trigger_update_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_destinations_updated_at ON destinations;
CREATE TRIGGER trigger_update_destinations_updated_at
  BEFORE UPDATE ON destinations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trigger_update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for follow count updates
DROP TRIGGER IF EXISTS trigger_update_follow_counts ON follows;
CREATE TRIGGER trigger_update_follow_counts
  AFTER INSERT OR UPDATE OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- Trigger for trip count updates
DROP TRIGGER IF EXISTS trigger_update_trip_counts ON trips;
CREATE TRIGGER trigger_update_trip_counts
  AFTER INSERT OR DELETE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_trip_counts();

-- 15. Create profiles for existing users (if any)
INSERT INTO user_profiles (id, email, nickname, display_name)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'nickname', SPLIT_PART(email, '@', 1)) as nickname,
  COALESCE(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name') as display_name
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;

-- Success message
SELECT 'Complete test database schema migration completed successfully!' AS result;