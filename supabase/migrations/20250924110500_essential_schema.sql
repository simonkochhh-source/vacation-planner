-- Essential Schema Migration for Test Database
-- Only the core tables needed for basic functionality

-- 1. Ensure user_profiles table exists
CREATE TABLE IF NOT EXISTS user_profiles (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can view public profiles" ON user_profiles;
CREATE POLICY "Users can view public profiles" ON user_profiles
  FOR SELECT USING (
    is_public_profile = true OR 
    id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;
CREATE POLICY "Users can create their own profile" ON user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

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
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_create_user_profile ON auth.users;
CREATE TRIGGER trigger_create_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Create profiles for existing users (if any)
INSERT INTO user_profiles (id, email, nickname, display_name)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'nickname', SPLIT_PART(email, '@', 1)) as nickname,
  COALESCE(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name') as display_name
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_nickname ON user_profiles(nickname);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_public ON user_profiles(is_public_profile);

-- Success message
SELECT 'Essential schema migration completed!' AS result;