-- EMERGENCY FIX: Remove ALL policies from destinations table and create clean ones
-- This will fix any infinite recursion issues

-- 1. Drop ALL existing policies on destinations table
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    -- Get all policies for destinations table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'destinations' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON destinations', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- 2. Create clean, simple policies without recursion
-- Basic policy: Users can only see their own destinations
CREATE POLICY "users_own_destinations" ON destinations
  FOR ALL USING (user_id = auth.uid());

-- Public trip policy: Users can see destinations from public trips
CREATE POLICY "public_trip_destinations" ON destinations
  FOR SELECT USING (
    trip_id IN (
      SELECT id FROM trips WHERE privacy = 'public'
    )
  );

-- Success message
SELECT 'All destination policies cleared and recreated safely!' AS result;