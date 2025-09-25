-- OAuth User Creation Diagnostic Script
-- Run this in Supabase SQL Editor of the TEST database (lsztvtauiapnhqplapgb.supabase.co)

-- 1. VERIFY ENVIRONMENT
SELECT 'TEST DATABASE OAUTH DIAGNOSTICS' as test_type, NOW() as timestamp;

-- 2. CHECK AUTH SCHEMA ACCESS
SELECT 
  'auth.users' as table_name,
  COUNT(*) as record_count,
  'Can access auth.users table' as status
FROM auth.users;

-- 3. CHECK USER_PROFILES TABLE EXISTS
SELECT 
  'user_profiles' as table_name,
  COUNT(*) as record_count,
  CASE 
    WHEN COUNT(*) >= 0 THEN 'Table exists and accessible'
    ELSE 'Table missing or no access'
  END as status
FROM user_profiles;

-- 4. VERIFY USER_PROFILES STRUCTURE
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. CHECK TRIGGER EXISTS
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_create_user_profile';

-- 6. CHECK FUNCTION EXISTS
SELECT 
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'create_user_profile';

-- 7. TEST USER_PROFILES PERMISSIONS
SELECT 
  'Testing INSERT permission on user_profiles' as test,
  current_setting('role') as current_role,
  auth.uid() as current_user_id;

-- 8. CHECK RLS POLICIES
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- 9. CHECK ANY EXISTING OAUTH USERS
SELECT 
  u.id,
  u.email,
  u.provider,
  u.created_at,
  up.nickname,
  up.display_name,
  CASE 
    WHEN up.id IS NOT NULL THEN 'Has profile'
    ELSE 'Missing profile'
  END as profile_status
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
ORDER BY u.created_at DESC
LIMIT 10;

-- 10. MANUAL TRIGGER TEST
-- This simulates what happens during OAuth signup
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'oauth-test@example.com';
BEGIN
    RAISE NOTICE 'Testing user profile creation trigger with test data';
    RAISE NOTICE 'Test User ID: %', test_user_id;
    RAISE NOTICE 'Test Email: %', test_email;
    
    -- Try to insert directly into user_profiles (this should work if permissions are correct)
    BEGIN
        INSERT INTO user_profiles (id, email, nickname, display_name)
        VALUES (
            test_user_id,
            test_email,
            'oauth-test-user',
            'OAuth Test User'
        );
        RAISE NOTICE 'SUCCESS: Direct insert into user_profiles worked';
        
        -- Clean up test data
        DELETE FROM user_profiles WHERE id = test_user_id;
        RAISE NOTICE 'Test data cleaned up';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: Direct insert failed - %', SQLERRM;
    END;
END $$;

-- 11. CHECK OAUTH PROVIDER CONFIGURATION
SELECT 
  'OAuth Provider Check' as check_type,
  'Run this query in Supabase Dashboard Auth settings' as instruction,
  'Verify Google OAuth is enabled and configured' as requirement;

-- 12. ENVIRONMENT VALIDATION
SELECT 
  'Environment Validation' as check_type,
  current_database() as database_name,
  current_setting('server_version') as postgres_version,
  current_setting('application_name') as app_name;

-- 13. FINAL DIAGNOSIS SUMMARY
SELECT 
  'DIAGNOSIS COMPLETE' as status,
  'Check all results above for issues' as next_step,
  'Pay special attention to:' as focus_areas,
  '1. Trigger exists and is active' as check_1,
  '2. Function exists and has correct definition' as check_2,
  '3. RLS policies allow INSERT for authenticated users' as check_3,
  '4. OAuth providers are enabled in Dashboard' as check_4;