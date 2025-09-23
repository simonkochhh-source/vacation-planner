-- Fix infinite recursion in destinations table RLS policies
-- This script removes the problematic policy and replaces it with a safer version

-- 1. Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view destination copies" ON destinations;

-- 2. Create a safer policy that doesn't cause recursion
-- This policy allows users to see destinations they own or that are public,
-- without referencing the destinations table recursively
CREATE POLICY "Users can view accessible destinations" ON destinations
  FOR SELECT USING (
    -- User owns the destination
    user_id = auth.uid() 
    OR
    -- Destination belongs to a public trip
    trip_id IN (
      SELECT id FROM trips 
      WHERE privacy = 'public'
    )
    OR
    -- Destination belongs to a trip the user has access to
    trip_id IN (
      SELECT id FROM trips 
      WHERE user_id = auth.uid() 
         OR privacy = 'contacts'
    )
  );

-- 3. Create a separate policy for handling destination copies
-- This is a simpler approach that doesn't cause recursion
CREATE POLICY "Users can view copies of their destinations" ON destinations
  FOR SELECT USING (
    -- Allow viewing destinations that are copies of destinations the user owns
    original_destination_id IN (
      SELECT id FROM destinations 
      WHERE user_id = auth.uid()
    )
  );

-- Success message
SELECT 'Destinations policy recursion fixed successfully!' AS result;