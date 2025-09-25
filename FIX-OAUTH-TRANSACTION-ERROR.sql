-- ========================================
-- FIX OAUTH TRANSACTION ERROR
-- ========================================
-- This fixes the "transaction aborted" error in the development database
-- Execute this in your Supabase SQL editor for the TEST project:
-- URL: https://supabase.com/dashboard/project/wcsfytpcdfhnvpksgrjv/sql/new
-- ========================================

-- STEP 1: Clean up any broken transactions and locks
SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND query != '<IDLE>';

-- STEP 2: Drop existing problematic trigger and function
DROP TRIGGER IF EXISTS trigger_create_user_profile ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile();

-- STEP 3: Ensure user_profiles table exists with correct structure
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
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 4: Enable RLS if not already enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- STEP 5: Drop and recreate RLS policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view public profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON user_profiles;

CREATE POLICY "Users can view public profiles" ON user_profiles
  FOR SELECT USING (is_public_profile = true OR id = auth.uid());

CREATE POLICY "Users can create their own profile" ON user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can delete their own profile" ON user_profiles
  FOR DELETE USING (id = auth.uid());

-- STEP 6: Create improved trigger function with better error handling
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  user_nickname TEXT;
  user_display_name TEXT;
BEGIN
  -- Extract nickname with fallback
  user_nickname := COALESCE(
    NEW.raw_user_meta_data->>'nickname',
    NEW.raw_user_meta_data->>'preferred_username', 
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1)
  );
  
  -- Extract display name with fallback
  user_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    user_nickname
  );
  
  -- Insert with conflict handling
  INSERT INTO user_profiles (id, email, nickname, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    user_nickname,
    user_display_name
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nickname = COALESCE(EXCLUDED.nickname, user_profiles.nickname),
    display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
    updated_at = NOW();
    
  -- Handle unique nickname conflicts
  EXCEPTION 
    WHEN unique_violation THEN
      -- If nickname conflict, append random suffix
      INSERT INTO user_profiles (id, email, nickname, display_name)
      VALUES (
        NEW.id,
        NEW.email,
        user_nickname || '_' || substr(NEW.id::TEXT, 1, 8),
        user_display_name
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
        
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 7: Create the trigger
CREATE TRIGGER trigger_create_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- STEP 8: Create profiles for existing users (if any)
INSERT INTO user_profiles (id, email, nickname, display_name)
SELECT 
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'nickname',
    u.raw_user_meta_data->>'preferred_username',
    u.raw_user_meta_data->>'name',
    SPLIT_PART(u.email, '@', 1)
  ) || CASE 
    WHEN EXISTS (SELECT 1 FROM user_profiles WHERE nickname = COALESCE(
      u.raw_user_meta_data->>'nickname',
      u.raw_user_meta_data->>'preferred_username', 
      u.raw_user_meta_data->>'name',
      SPLIT_PART(u.email, '@', 1)
    )) THEN '_' || substr(u.id::TEXT, 1, 8)
    ELSE ''
  END as nickname,
  COALESCE(
    u.raw_user_meta_data->>'display_name',
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    SPLIT_PART(u.email, '@', 1)
  ) as display_name
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;

-- STEP 9: Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_nickname ON user_profiles(nickname);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- STEP 10: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON user_profiles TO authenticated;
GRANT SELECT ON user_profiles TO anon;

SELECT 'OAuth transaction error fixed! Try Google login again.' as result;