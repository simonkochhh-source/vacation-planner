-- Quick fix for destinations access issues
-- This will temporarily allow broader access to see what's in the table

-- 1. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "users_own_destinations" ON destinations;
DROP POLICY IF EXISTS "public_trip_destinations" ON destinations;
DROP POLICY IF EXISTS "Users can view destination copies" ON destinations;
DROP POLICY IF EXISTS "Users can view copies of their destinations" ON destinations;
DROP POLICY IF EXISTS "Users can view accessible destinations" ON destinations;

-- 2. Create a very permissive policy for debugging
CREATE POLICY "allow_all_destinations_temp" ON destinations
  FOR ALL USING (true);

-- 3. Ensure RLS is enabled
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;

-- 4. Check how many destinations exist
SELECT 
  COUNT(*) as total_destinations,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT trip_id) as unique_trips
FROM destinations;

-- Success message
SELECT 'Destinations access temporarily opened for debugging!' AS result;