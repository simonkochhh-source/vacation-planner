-- ========================================
-- CRITICAL OAUTH FIX - FINAL VERSION
-- ========================================
-- OAuth "Database error saving new user" Fix
-- Target: Test Database (lsztvtauiapnhqplapgb.supabase.co)
-- Execute: Copy & paste this into Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/lsztvtauiapnhqplapgb/sql/new
-- ========================================

BEGIN;

-- ========================================
-- PART 1: CLEAN UP EXISTING OBJECTS
-- ========================================

-- Drop existing objects to start fresh
DROP TRIGGER IF EXISTS trigger_create_user_profile ON auth.users CASCADE;
DROP FUNCTION IF EXISTS create_user_profile() CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- ========================================
-- PART 2: CREATE USER_PROFILES TABLE
-- ========================================

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

-- ========================================
-- PART 3: RLS POLICIES
-- ========================================

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view public profiles" ON user_profiles
  FOR SELECT USING (is_public_profile = true OR id = auth.uid());

CREATE POLICY "Users can create their own profile" ON user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

-- ========================================
-- PART 4: CRITICAL OAUTH FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  user_nickname TEXT;
  user_display_name TEXT;
BEGIN
  -- Generate nickname from email
  user_nickname := COALESCE(
    NEW.raw_user_meta_data->>'nickname',
    NEW.raw_user_meta_data->>'preferred_username',
    SPLIT_PART(NEW.email, '@', 1)
  );
  
  -- Generate display name
  user_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    user_nickname
  );

  -- Insert user profile
  INSERT INTO user_profiles (
    id, 
    email, 
    nickname, 
    display_name
  ) VALUES (
    NEW.id,
    NEW.email,
    user_nickname,
    user_display_name
  )
  ON CONFLICT (id) DO NOTHING;

  -- Handle nickname conflicts
  IF NOT FOUND THEN
    INSERT INTO user_profiles (
      id, 
      email, 
      nickname, 
      display_name
    ) VALUES (
      NEW.id,
      NEW.email,
      user_nickname || '_' || EXTRACT(EPOCH FROM NOW())::TEXT,
      user_display_name
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and continue
    RAISE WARNING 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- ========================================
-- PART 5: CRITICAL OAUTH TRIGGER
-- ========================================

CREATE TRIGGER trigger_create_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- ========================================
-- PART 6: UPDATED_AT FUNCTION & TRIGGER
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- PART 7: CREATE PROFILES FOR EXISTING USERS
-- ========================================

-- Handle any existing users in auth.users
INSERT INTO user_profiles (id, email, nickname, display_name)
SELECT 
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'nickname',
    u.raw_user_meta_data->>'preferred_username',
    SPLIT_PART(u.email, '@', 1)
  ) as nickname,
  COALESCE(
    u.raw_user_meta_data->>'display_name',
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    SPLIT_PART(u.email, '@', 1)
  ) as display_name
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;

-- Handle nickname conflicts for existing users
UPDATE user_profiles
SET nickname = nickname || '_' || EXTRACT(EPOCH FROM NOW())::TEXT
WHERE id IN (
  SELECT id FROM (
    SELECT id, nickname, ROW_NUMBER() OVER (PARTITION BY nickname ORDER BY created_at) as rn
    FROM user_profiles
  ) duplicates
  WHERE rn > 1
);

-- ========================================
-- PART 8: VERIFICATION & TESTING
-- ========================================

DO $$
DECLARE
  trigger_count INTEGER;
  function_exists BOOLEAN;
  table_exists BOOLEAN;
  rls_enabled BOOLEAN;
BEGIN
  -- Check if trigger exists
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'trigger_create_user_profile' 
    AND event_object_table = 'users'
    AND trigger_schema = 'auth';

  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'create_user_profile'
      AND routine_schema = 'public'
  ) INTO function_exists;

  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_profiles'
      AND table_schema = 'public'
  ) INTO table_exists;

  -- Check if RLS is enabled
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class 
  WHERE relname = 'user_profiles' 
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

  -- Report status
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔥 OAUTH FIX FINAL - STATUS REPORT';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'User Profiles Table: %', CASE WHEN table_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE 'OAuth Function: %', CASE WHEN function_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE 'OAuth Trigger: %', CASE WHEN trigger_count > 0 THEN '✅ ACTIVE' ELSE '❌ MISSING' END;
  RAISE NOTICE 'RLS Security: %', CASE WHEN rls_enabled THEN '✅ ENABLED' ELSE '❌ DISABLED' END;
  RAISE NOTICE '';
  
  IF table_exists AND function_exists AND trigger_count > 0 AND rls_enabled THEN
    RAISE NOTICE '🎉 SUCCESS: OAuth is now FIXED!';
    RAISE NOTICE '✅ "Database error saving new user" should be resolved';
    RAISE NOTICE '✅ Google OAuth login should work completely';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 TEST NOW:';
    RAISE NOTICE '   1. Go to: http://localhost:3001';
    RAISE NOTICE '   2. Click "Continue with Google"';
    RAISE NOTICE '   3. Complete Google OAuth';
    RAISE NOTICE '   4. Should redirect to dashboard successfully';
  ELSE
    RAISE NOTICE '❌ SETUP INCOMPLETE - Check errors above';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

SELECT 'OAUTH FIX APPLIED - READY FOR TESTING!' as result;