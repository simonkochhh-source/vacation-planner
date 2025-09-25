-- ========================================
-- EXACT PRODUCTION OAUTH FIX
-- ========================================
-- 1:1 Copy from Production Database Schema
-- Target: Test Database (lsztvtauiapnhqplapgb.supabase.co)
-- Execute: Copy & paste this into Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/lsztvtauiapnhqplapgb/sql/new
-- ========================================

BEGIN;

-- Drop existing objects to ensure clean slate
DROP TRIGGER IF EXISTS trigger_create_user_profile ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile() CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- User profiles table (EXACT copy from production)
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

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view public profiles or their own
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_nickname ON user_profiles(nickname);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_public ON user_profiles(is_public_profile);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);

-- Function to automatically create user profile when user signs up
-- EXACT COPY FROM PRODUCTION
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

-- Trigger to create profile when user signs up
-- EXACT COPY FROM PRODUCTION
DROP TRIGGER IF EXISTS trigger_create_user_profile ON auth.users;
CREATE TRIGGER trigger_create_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on profile updates
CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_user_profiles_updated_at();

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

COMMIT;

-- Verification
DO $$
DECLARE
  trigger_exists BOOLEAN;
  function_exists BOOLEAN;
  table_exists BOOLEAN;
BEGIN
  -- Check trigger
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'trigger_create_user_profile'
  ) INTO trigger_exists;
  
  -- Check function
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'create_user_profile'
  ) INTO function_exists;
  
  -- Check table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_profiles'
  ) INTO table_exists;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ EXACT PRODUCTION COPY APPLIED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Table: %', CASE WHEN table_exists THEN 'EXISTS ✅' ELSE 'MISSING ❌' END;
  RAISE NOTICE 'Function: %', CASE WHEN function_exists THEN 'EXISTS ✅' ELSE 'MISSING ❌' END;
  RAISE NOTICE 'Trigger: %', CASE WHEN trigger_exists THEN 'EXISTS ✅' ELSE 'MISSING ❌' END;
  
  IF table_exists AND function_exists AND trigger_exists THEN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 SUCCESS: OAuth should work exactly like Production!';
    RAISE NOTICE '🧪 Test Google Login now on localhost:3001';
  ELSE
    RAISE NOTICE '❌ Something is missing - check above';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

SELECT 'PRODUCTION OAUTH SCHEMA APPLIED SUCCESSFULLY!' as result;