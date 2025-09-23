-- Create a test activity to verify the function works

-- Get the current user ID (you'll need to replace this with your actual user ID)
-- First, let's see all users to find the correct ID
SELECT 'Current users:' as info;
SELECT id, email FROM auth.users LIMIT 5;

-- Insert a test activity (replace 'your-user-id' with actual user ID from above)
-- INSERT INTO user_activities (user_id, activity_type, title, description, metadata)
-- VALUES (
--   'your-user-id-here'::UUID,
--   'trip_created',
--   'Test-Reise nach München geplant',
--   'Eine tolle Testaktivität für das Social Feed',
--   '{"test": true, "related_trip_id": null}'::jsonb
-- );

-- Test the function with the user ID (replace with actual user ID)
-- SELECT 'Testing get_activity_feed function:' as info;
-- SELECT * FROM get_activity_feed('your-user-id-here'::UUID, 5);

-- Check what activities exist
SELECT 'Existing activities:' as info;
SELECT * FROM user_activities LIMIT 5;