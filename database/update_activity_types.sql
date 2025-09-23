-- Update user_activities table constraint to include new activity types

-- Drop existing constraint
ALTER TABLE user_activities DROP CONSTRAINT IF EXISTS user_activities_activity_type_check;

-- Add new constraint with all activity types
ALTER TABLE user_activities ADD CONSTRAINT user_activities_activity_type_check 
CHECK (activity_type IN (
  'trip_created', 
  'trip_started',
  'trip_completed', 
  'destination_visited', 
  'photo_uploaded',
  'trip_shared',
  'destination_added',
  'user_followed'
));

-- Success message
SELECT 'Activity types constraint updated successfully!' AS result;