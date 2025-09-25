-- Production vs Test Database Comparison Script
-- Run this script in BOTH databases to compare configurations

-- PART 1: BASIC DATABASE INFO
SELECT 'DATABASE_INFO' as section, 
       current_database() as database_name,
       current_setting('server_version') as postgres_version,
       NOW() as check_timestamp;

-- PART 2: AUTH SCHEMA VERIFICATION
SELECT 'AUTH_SCHEMA' as section,
       table_name,
       COUNT(*) as record_count
FROM information_schema.tables 
WHERE table_schema = 'auth'
GROUP BY table_name
ORDER BY table_name;

-- PART 3: USER_PROFILES TABLE STRUCTURE
SELECT 'USER_PROFILES_STRUCTURE' as section,
       column_name,
       data_type,
       is_nullable,
       column_default,
       character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- PART 4: TRIGGERS ON AUTH.USERS
SELECT 'AUTH_TRIGGERS' as section,
       trigger_name,
       event_manipulation,
       action_timing,
       action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
  AND event_object_schema = 'auth';

-- PART 5: USER PROFILE CREATION FUNCTION
SELECT 'USER_PROFILE_FUNCTION' as section,
       routine_name,
       routine_type,
       specific_name,
       routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%user_profile%'
   OR routine_name LIKE '%create_user%';

-- PART 6: RLS POLICIES ON USER_PROFILES
SELECT 'RLS_POLICIES' as section,
       policyname,
       cmd,
       permissive,
       roles,
       qual,
       with_check
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- PART 7: EXISTING USER DATA
SELECT 'USER_DATA_SAMPLE' as section,
       u.provider,
       COUNT(*) as user_count,
       COUNT(up.id) as profiles_count,
       ROUND(COUNT(up.id)::numeric / COUNT(*)::numeric * 100, 2) as profile_coverage_percent
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
GROUP BY u.provider
ORDER BY user_count DESC;

-- PART 8: RECENT AUTH ATTEMPTS
SELECT 'RECENT_AUTH_ACTIVITY' as section,
       u.provider,
       u.email,
       u.created_at,
       CASE WHEN up.id IS NOT NULL THEN 'Has Profile' ELSE 'Missing Profile' END as profile_status,
       u.confirmed_at,
       u.last_sign_in_at
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
ORDER BY u.created_at DESC
LIMIT 10;

-- PART 9: PERMISSIONS CHECK
SELECT 'PERMISSIONS_TEST' as section,
       'Testing table access permissions' as test_type,
       current_setting('role') as current_role;

-- Test if we can access user_profiles table
SELECT 'USER_PROFILES_ACCESS' as section,
       CASE 
         WHEN COUNT(*) >= 0 THEN 'READ_ACCESS_OK'
         ELSE 'READ_ACCESS_DENIED'
       END as access_status,
       COUNT(*) as total_profiles
FROM user_profiles;

-- PART 10: SCHEMA EXTENSIONS
SELECT 'EXTENSIONS' as section,
       extname,
       extversion
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pgjwt')
ORDER BY extname;

-- PART 11: AUTH CONFIGURATION PLACEHOLDERS
-- Note: Actual OAuth provider settings are not accessible via SQL
-- These must be checked manually in Supabase Dashboard
SELECT 'OAUTH_PROVIDERS_CHECK' as section,
       'MANUAL_VERIFICATION_REQUIRED' as status,
       'Check Supabase Dashboard > Authentication > Providers' as instruction,
       'Verify Google OAuth is enabled with correct Client ID/Secret' as google_oauth,
       'Verify redirect URLs match: https://[project-ref].supabase.co/auth/v1/callback' as redirect_urls;

-- PART 12: SITE URL CONFIGURATION
-- Note: Site URL configuration is also in Dashboard settings
SELECT 'SITE_URL_CHECK' as section,
       'MANUAL_VERIFICATION_REQUIRED' as status,
       'Check Supabase Dashboard > Authentication > Settings' as instruction,
       'Site URL should be: http://localhost:3001' as expected_site_url,
       'Additional redirect URLs should include localhost:3001' as additional_urls;

-- PART 13: ENVIRONMENT SUMMARY
SELECT 'ENVIRONMENT_SUMMARY' as section,
       current_database() as db_name,
       CASE 
         WHEN current_database() LIKE '%kyzbtkkprvegzgzrlhez%' THEN 'PRODUCTION'
         WHEN current_database() LIKE '%lsztvtauiapnhqplapgb%' THEN 'TEST/DEV'
         ELSE 'UNKNOWN'
       END as environment_type,
       'Run this script in both environments to compare' as instruction;