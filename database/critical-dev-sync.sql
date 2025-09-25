-- CRITICAL DEV SYNC - Manual Application Required
-- Apply this directly in Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/lsztvtauiapnhqplapgb/sql/new

-- ========================================
-- CRITICAL: OAuth Fix Schema
-- ========================================

BEGIN;

-- Drop incomplete tables
DROP TABLE IF EXISTS user_activities CASCADE;
DROP TABLE IF EXISTS follows CASCADE;
DROP TABLE IF EXISTS destinations CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS trip_photos CASCADE;

-- 1. USER PROFILES (CRITICAL for OAuth)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  email TEXT,
  location TEXT,
  website TEXT,
  social_links JSONB DEFAULT '{}',
  is_public_profile BOOLEAN DEFAULT true,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  trip_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TRIPS TABLE
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

-- 3. DESTINATIONS TABLE
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

-- 4. FOLLOWS TABLE
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

-- 5. USER ACTIVITIES TABLE
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

-- 6. TRIP PHOTOS TABLE (Enhanced with storage integration)
CREATE TABLE trip_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- File information (storage integration)
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  
  -- Photo metadata
  caption TEXT,
  location_name TEXT,
  coordinates JSONB, -- {lat: number, lng: number}
  taken_at TIMESTAMP WITH TIME ZONE,
  privacy VARCHAR(20) DEFAULT 'private' CHECK (privacy IN ('private', 'public')),
  
  -- Legacy compatibility
  photo_url TEXT, -- Will be generated from storage_path
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_user_profiles_nickname ON user_profiles(nickname);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_public ON user_profiles(is_public_profile);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_owner_id ON trips(owner_id);
CREATE INDEX IF NOT EXISTS idx_trips_privacy ON trips(privacy);
CREATE INDEX IF NOT EXISTS idx_destinations_trip_id ON destinations(trip_id);
CREATE INDEX IF NOT EXISTS idx_destinations_user_id ON destinations(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_photos_trip_id ON trip_photos(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_photos_privacy ON trip_photos(privacy);
CREATE INDEX IF NOT EXISTS idx_trip_photos_taken_at ON trip_photos(taken_at);

-- ENABLE RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_photos ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
CREATE POLICY "Users can view public profiles" ON user_profiles
  FOR SELECT USING (is_public_profile = true OR id = auth.uid());

CREATE POLICY "Users can create their own profile" ON user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can view trips" ON trips
  FOR SELECT USING (privacy = 'public' OR user_id = auth.uid() OR owner_id = auth.uid());

CREATE POLICY "Users can create trips" ON trips
  FOR INSERT WITH CHECK (user_id = auth.uid() AND owner_id = auth.uid());

CREATE POLICY "Users can update their own trips" ON trips
  FOR UPDATE USING (user_id = auth.uid() OR owner_id = auth.uid());

-- CRITICAL FUNCTION FOR OAUTH
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, nickname, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nickname', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CRITICAL TRIGGER FOR OAUTH
DROP TRIGGER IF EXISTS trigger_create_user_profile ON auth.users;
CREATE TRIGGER trigger_create_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Create profiles for existing users
INSERT INTO user_profiles (id, email, nickname, display_name)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'nickname', SPLIT_PART(email, '@', 1)) as nickname,
  COALESCE(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name') as display_name
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- CRITICAL: Storage Configuration
-- ========================================

-- Enable storage extension
CREATE EXTENSION IF NOT EXISTS "supabase_storage" SCHEMA storage;

-- Enable RLS on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create essential storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, '["image/jpeg", "image/png", "image/webp"]'::jsonb),
  ('trip-photos', 'trip-photos', true, 10485760, '["image/jpeg", "image/png", "image/webp", "image/gif"]'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Avatar storage policies
CREATE POLICY "avatar_upload_policy" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatar_view_policy" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatar_delete_policy" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trip photo storage policies
CREATE POLICY "trip_photo_upload_policy" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'trip-photos' AND auth.uid()::text = split_part(name, '/', 1));

CREATE POLICY "trip_photo_view_policy" ON storage.objects
FOR SELECT USING (
  bucket_id = 'trip-photos' 
  AND (
    auth.uid()::text = split_part(name, '/', 1)
    OR EXISTS (
      SELECT 1 FROM trips t 
      WHERE t.id = split_part(name, '/', 2)::uuid AND t.privacy = 'public'
    )
  )
);

CREATE POLICY "trip_photo_delete_policy" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'trip-photos' AND auth.uid()::text = split_part(name, '/', 1));

-- Enhanced trip_photos table policies
CREATE POLICY "own_photos_select" ON trip_photos
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "public_photos_select" ON trip_photos
FOR SELECT USING (
  privacy = 'public' 
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
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete_own_photos" ON trip_photos
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Trigger for trip_photos updated_at
CREATE OR REPLACE FUNCTION update_trip_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trip_photos_updated_at
    BEFORE UPDATE ON trip_photos
    FOR EACH ROW
    EXECUTE FUNCTION update_trip_photos_updated_at();

COMMIT;

SELECT 'CRITICAL DEV SYNC COMPLETED! OAuth and Storage are now configured.' as result;