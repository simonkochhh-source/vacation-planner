-- Test script to debug the activity feed function

-- 1. Check if user_activities table has any data
SELECT 'user_activities count:' as test, COUNT(*) as count FROM user_activities;

-- 2. Check if user_profiles table has any data
SELECT 'user_profiles count:' as test, COUNT(*) as count FROM user_profiles;

-- 3. Check if follows table has any data
SELECT 'follows count:' as test, COUNT(*) as count FROM follows;

-- 4. Show sample data from user_activities (if any)
SELECT 'Sample user_activities:' as test;
SELECT id, user_id, activity_type, title, created_at FROM user_activities LIMIT 3;

-- 5. Get current user ID (you'll need to replace this with your actual user ID)
-- SELECT auth.uid() as current_user_id;

-- 6. Test the function with a specific user ID (replace with your actual user ID)
-- SELECT * FROM get_activity_feed('your-user-id-here'::UUID, 10);

-- 7. Check if the function exists and its definition
SELECT 
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
WHERE p.proname = 'get_activity_feed';