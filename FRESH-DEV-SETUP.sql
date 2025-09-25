-- ========================================
-- FRESH DEV PROJECT SETUP - COMPLETE SCHEMA
-- ========================================
-- Production-proven schema for new Dev Supabase project
-- Execute this ONCE in your new Dev project SQL editor
-- ========================================

BEGIN;

-- ========================================
-- 1. USER PROFILES TABLE (Critical for OAuth)
-- ========================================

CREATE TABLE user_profiles (
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
  is_verified BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 2. TRIPS TABLE
-- ========================================

CREATE TABLE trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  budget DECIMAL(10,2) DEFAULT 0,
  participants JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
  privacy VARCHAR(20) DEFAULT 'private' CHECK (privacy IN ('private', 'public', 'contacts')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tagged_users JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]'
);

-- ========================================
-- 3. DESTINATIONS TABLE
-- ========================================

CREATE TABLE destinations (
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
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 4. FOLLOWS TABLE (Social Features)
-- ========================================

CREATE TABLE follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id),
  CONSTRAINT unique_follow_relationship UNIQUE (follower_id, following_id)
);

-- ========================================
-- 5. USER ACTIVITIES TABLE (Activity Feed)
-- ========================================

CREATE TABLE user_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
    'trip_created', 'trip_completed', 'destination_visited', 
    'photo_uploaded', 'trip_shared', 'destination_added'
  )),
  related_trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  related_destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 6. TRIP PHOTOS TABLE
-- ========================================

CREATE TABLE trip_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  destination_id UUID REFERENCES destinations(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  is_public BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 7. INDEXES FOR PERFORMANCE
-- ========================================

-- User Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_nickname ON user_profiles(nickname);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_public ON user_profiles(is_public_profile);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);

-- Trips Indexes
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_owner_id ON trips(owner_id);
CREATE INDEX IF NOT EXISTS idx_trips_privacy ON trips(privacy);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at);

-- Destinations Indexes
CREATE INDEX IF NOT EXISTS idx_destinations_trip_id ON destinations(trip_id);
CREATE INDEX IF NOT EXISTS idx_destinations_user_id ON destinations(user_id);
CREATE INDEX IF NOT EXISTS idx_destinations_category ON destinations(category);
CREATE INDEX IF NOT EXISTS idx_destinations_order ON destinations(trip_id, order_index);
CREATE INDEX IF NOT EXISTS idx_destinations_location ON destinations(latitude, longitude);

-- Social Indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_status ON follows(status);

-- Activity Feed Indexes
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);

-- Trip Photos Indexes
CREATE INDEX IF NOT EXISTS idx_trip_photos_trip_id ON trip_photos(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_photos_user_id ON trip_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_photos_destination_id ON trip_photos(destination_id);

-- ========================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_photos ENABLE ROW LEVEL SECURITY;

-- USER PROFILES RLS POLICIES
CREATE POLICY "Users can view public profiles" ON user_profiles
  FOR SELECT USING (is_public_profile = true OR id = auth.uid());

CREATE POLICY "Users can create their own profile" ON user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can delete their own profile" ON user_profiles
  FOR DELETE USING (id = auth.uid());

-- TRIPS RLS POLICIES
CREATE POLICY "Users can view trips" ON trips
  FOR SELECT USING (privacy = 'public' OR user_id = auth.uid() OR owner_id = auth.uid());

CREATE POLICY "Users can create trips" ON trips
  FOR INSERT WITH CHECK (user_id = auth.uid() AND owner_id = auth.uid());

CREATE POLICY "Users can update their own trips" ON trips
  FOR UPDATE USING (user_id = auth.uid() OR owner_id = auth.uid());

CREATE POLICY "Users can delete their own trips" ON trips
  FOR DELETE USING (user_id = auth.uid() OR owner_id = auth.uid());

-- DESTINATIONS RLS POLICIES
CREATE POLICY "Users can view destinations" ON destinations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = destinations.trip_id 
      AND (trips.privacy = 'public' OR trips.user_id = auth.uid() OR trips.owner_id = auth.uid())
    )
  );

CREATE POLICY "Users can create destinations" ON destinations
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = destinations.trip_id 
      AND (trips.user_id = auth.uid() OR trips.owner_id = auth.uid())
    )
  );

CREATE POLICY "Users can update destinations" ON destinations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = destinations.trip_id 
      AND (trips.user_id = auth.uid() OR trips.owner_id = auth.uid())
    )
  );

-- FOLLOWS RLS POLICIES
CREATE POLICY "Users can view their follows" ON follows
  FOR SELECT USING (follower_id = auth.uid() OR following_id = auth.uid());

CREATE POLICY "Users can create follows" ON follows
  FOR INSERT WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can update follows" ON follows
  FOR UPDATE USING (follower_id = auth.uid() OR following_id = auth.uid());

CREATE POLICY "Users can delete follows" ON follows
  FOR DELETE USING (follower_id = auth.uid());

-- USER ACTIVITIES RLS POLICIES
CREATE POLICY "Users can view activities" ON user_activities
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = user_activities.user_id 
      AND user_profiles.is_public_profile = true
    ) OR
    EXISTS (
      SELECT 1 FROM follows 
      WHERE follows.following_id = user_activities.user_id 
      AND follows.follower_id = auth.uid() 
      AND follows.status = 'accepted'
    )
  );

CREATE POLICY "Users can create activities" ON user_activities
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update activities" ON user_activities
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete activities" ON user_activities
  FOR DELETE USING (user_id = auth.uid());

-- TRIP PHOTOS RLS POLICIES
CREATE POLICY "own_photos_select" ON trip_photos
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "public_photos_select" ON trip_photos
  FOR SELECT 
  USING (
    is_public = true 
    AND trip_id IN (SELECT id FROM trips WHERE privacy = 'public')
  );

CREATE POLICY "insert_own_photos" ON trip_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND trip_id IN (SELECT id FROM trips WHERE owner_id = auth.uid())
  );

CREATE POLICY "update_own_photos" ON trip_photos
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "delete_own_photos" ON trip_photos
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ========================================
-- 9. CRITICAL OAUTH FUNCTIONS
-- ========================================

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

-- Trigger to create profile when user signs up
DROP TRIGGER IF EXISTS trigger_create_user_profile ON auth.users;
CREATE TRIGGER trigger_create_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Updated At Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- User Profiles Updated At
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trips Updated At
DROP TRIGGER IF EXISTS update_trips_updated_at ON trips;
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trip Photos Updated At
DROP TRIGGER IF EXISTS update_trip_photos_updated_at ON trip_photos;
CREATE TRIGGER update_trip_photos_updated_at
  BEFORE UPDATE ON trip_photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create profiles for existing users (if any)
INSERT INTO user_profiles (id, email, nickname, display_name)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'nickname', SPLIT_PART(email, '@', 1)) as nickname,
  COALESCE(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name') as display_name
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles);

COMMIT;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

SELECT 'FRESH DEV PROJECT SETUP COMPLETE! Ready for OAuth testing!' as result;