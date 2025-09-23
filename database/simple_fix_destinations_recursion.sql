-- Simple fix for infinite recursion in destinations policies
-- Remove the problematic policy that references destinations table within destinations policy

-- Drop the policy causing infinite recursion
DROP POLICY IF EXISTS "Users can view destination copies" ON destinations;

-- Success message
SELECT 'Problematic policy removed successfully!' AS result;