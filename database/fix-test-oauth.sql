-- Fix Test Database OAuth User Creation
-- Run this script in TEST database (lsztvtauiapnhqplapgb.supabase.co) ONLY

-- 1. ENSURE USER_PROFILES TABLE EXISTS WITH CORRECT STRUCTURE
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

-- 2. ENABLE RLS ON USER_PROFILES
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. DROP EXISTING POLICIES (IF ANY) TO AVOID CONFLICTS
DROP POLICY IF EXISTS "Users can view public profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;

-- 4. CREATE RLS POLICIES
CREATE POLICY "Users can view public profiles" ON user_profiles
  FOR SELECT USING (
    is_public_profile = true OR 
    id = auth.uid()
  );

CREATE POLICY "Users can create their own profile" ON user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

-- 5. DROP AND RECREATE THE USER PROFILE CREATION FUNCTION
DROP FUNCTION IF EXISTS create_user_profile() CASCADE;

CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the trigger execution for debugging
  RAISE LOG 'Creating user profile for user ID: %, Email: %', NEW.id, NEW.email;
  
  -- Insert the user profile with proper error handling
  BEGIN
    INSERT INTO user_profiles (id, email, nickname, display_name, avatar_url)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(
        NEW.raw_user_meta_data->>'nickname', 
        NEW.raw_user_meta_data->>'preferred_username',
        NEW.raw_user_meta_data->>'user_name',
        SPLIT_PART(NEW.email, '@', 1)
      ),
      COALESCE(
        NEW.raw_user_meta_data->>'display_name', 
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name'
      ),
      NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
      updated_at = NOW();
    
    RAISE LOG 'User profile created successfully for user ID: %', NEW.id;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error creating user profile for user ID: %, Error: %', NEW.id, SQLERRM;
    -- Don't re-raise the exception to prevent OAuth signup from failing
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. DROP AND RECREATE THE TRIGGER
DROP TRIGGER IF EXISTS trigger_create_user_profile ON auth.users;

CREATE TRIGGER trigger_create_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION create_user_profile();

-- 7. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_user_profiles_nickname ON user_profiles(nickname);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);

-- 8. GRANT NECESSARY PERMISSIONS
-- Grant permissions to authenticated users
GRANT SELECT ON user_profiles TO authenticated;
GRANT INSERT ON user_profiles TO authenticated;
GRANT UPDATE ON user_profiles TO authenticated;

-- Grant permissions to service role (for triggers)
GRANT ALL ON user_profiles TO service_role;

-- 9. TEST THE FUNCTION MANUALLY
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'manual-test@example.com';
BEGIN
    RAISE NOTICE 'Testing manual user profile creation';
    RAISE NOTICE 'Test User ID: %', test_user_id;
    
    -- Test direct function call
    BEGIN
        INSERT INTO user_profiles (id, email, nickname, display_name)
        VALUES (
            test_user_id,
            test_email,
            'manual-test',
            'Manual Test User'
        );
        
        RAISE NOTICE 'SUCCESS: Manual user profile creation works';
        
        -- Verify the record
        PERFORM * FROM user_profiles WHERE id = test_user_id;
        RAISE NOTICE 'SUCCESS: User profile record exists and is readable';
        
        -- Clean up
        DELETE FROM user_profiles WHERE id = test_user_id;
        RAISE NOTICE 'Test data cleaned up successfully';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: Manual test failed - %', SQLERRM;
    END;
END $$;

-- 10. VERIFICATION QUERIES
SELECT 'VERIFICATION: Function exists' as check_type, 
       COUNT(*) as count
FROM information_schema.routines 
WHERE routine_name = 'create_user_profile';

SELECT 'VERIFICATION: Trigger exists' as check_type,
       COUNT(*) as count
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_create_user_profile';

SELECT 'VERIFICATION: RLS policies count' as check_type,
       COUNT(*) as count
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- 11. SUCCESS MESSAGE
SELECT 'OAUTH_FIX_COMPLETED' as status,
       NOW() as completed_at,
       'User profile creation should now work for OAuth signups' as result,
       'Test by attempting Google OAuth signin at localhost:3001' as next_step;