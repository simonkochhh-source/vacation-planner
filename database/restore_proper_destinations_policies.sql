-- Restore proper Row Level Security policies for destinations table
-- This replaces the temporary "allow all" policy with secure, comprehensive policies

-- 1. Drop the temporary permissive policy
DROP POLICY IF EXISTS "allow_all_destinations_temp" ON destinations;

-- 2. Drop any existing policies to ensure clean slate
DROP POLICY IF EXISTS "users_own_destinations" ON destinations;
DROP POLICY IF EXISTS "public_trip_destinations" ON destinations;
DROP POLICY IF EXISTS "Users can view destination copies" ON destinations;
DROP POLICY IF EXISTS "Users can view copies of their destinations" ON destinations;
DROP POLICY IF EXISTS "Users can view accessible destinations" ON destinations;

-- 3. Create comprehensive policies

-- Policy 1: Users can view and manage their own destinations
CREATE POLICY "users_own_destinations" ON destinations
  FOR ALL USING (user_id = auth.uid());

-- Policy 2: Users can view destinations from public trips
CREATE POLICY "public_trip_destinations" ON destinations
  FOR SELECT USING (
    trip_id IN (
      SELECT id FROM trips 
      WHERE privacy = 'public'
    )
  );

-- Policy 3: Users can view destinations from trips shared with them
-- This covers trips where the user is the owner or has contact access
CREATE POLICY "shared_trip_destinations" ON destinations
  FOR SELECT USING (
    trip_id IN (
      SELECT id FROM trips 
      WHERE user_id = auth.uid() 
         OR (privacy = 'contacts' AND user_id IN (
           -- Check if the trip owner is in the user's contacts
           -- following_id is who you are following (target)
           SELECT following_id FROM follows 
           WHERE follower_id = auth.uid() AND status = 'accepted'
           UNION
           -- follower_id is who is following you
           SELECT follower_id FROM follows 
           WHERE following_id = auth.uid() AND status = 'accepted'
         ))
    )
  );

-- Policy 4: Allow users to create destinations in their own trips
CREATE POLICY "users_can_create_destinations" ON destinations
  FOR INSERT WITH CHECK (
    user_id = auth.uid() 
    AND trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );

-- Policy 5: Allow users to update their own destinations
CREATE POLICY "users_can_update_own_destinations" ON destinations
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 6: Allow users to delete their own destinations
CREATE POLICY "users_can_delete_own_destinations" ON destinations
  FOR DELETE USING (user_id = auth.uid());

-- 4. Ensure RLS is enabled
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;

-- 5. Verify the setup
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
WHERE tablename = 'destinations'
ORDER BY policyname;

-- Success message
SELECT 'Destinations policies restored successfully!' AS result;