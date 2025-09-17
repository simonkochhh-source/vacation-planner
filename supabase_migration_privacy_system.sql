-- Migration to add privacy system columns to trips table
-- Execute this in Supabase SQL Editor

-- Add privacy column with enum type
DO $$ 
BEGIN
    -- Create privacy enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_privacy') THEN
        CREATE TYPE trip_privacy AS ENUM ('private', 'public');
    END IF;
END $$;

-- Add missing columns to trips table
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS privacy trip_privacy DEFAULT 'private',
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS tagged_users UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Update existing trips to have owner_id set to user_id if not already set
-- Cast user_id to UUID type to avoid type mismatch errors
UPDATE trips 
SET owner_id = user_id::UUID 
WHERE owner_id IS NULL;

-- Add index for better performance on privacy queries
CREATE INDEX IF NOT EXISTS idx_trips_privacy ON trips(privacy);
CREATE INDEX IF NOT EXISTS idx_trips_owner_id ON trips(owner_id);

-- Add RLS (Row Level Security) policies for privacy system
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own trips" ON trips;
DROP POLICY IF EXISTS "Users can view public trips" ON trips;
DROP POLICY IF EXISTS "Users can view trips they are tagged in" ON trips;
DROP POLICY IF EXISTS "Users can insert their own trips" ON trips;
DROP POLICY IF EXISTS "Users can update their own trips" ON trips;
DROP POLICY IF EXISTS "Users can update trips they are tagged in" ON trips;
DROP POLICY IF EXISTS "Users can delete their own trips" ON trips;

-- Create new RLS policies for the privacy system
-- Users can view their own trips
CREATE POLICY "Users can view their own trips" ON trips
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = owner_id);

-- Users can view public trips
CREATE POLICY "Users can view public trips" ON trips
    FOR SELECT USING (privacy = 'public');

-- Users can view trips they are tagged in
CREATE POLICY "Users can view trips they are tagged in" ON trips
    FOR SELECT USING (auth.uid() = ANY(tagged_users));

-- Users can insert their own trips
CREATE POLICY "Users can insert their own trips" ON trips
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own trips or trips they own
CREATE POLICY "Users can update their own trips" ON trips
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = owner_id);

-- Users can update trips they are tagged in (limited permissions)
CREATE POLICY "Users can update trips they are tagged in" ON trips
    FOR UPDATE USING (auth.uid() = ANY(tagged_users));

-- Users can delete their own trips
CREATE POLICY "Users can delete their own trips" ON trips
    FOR DELETE USING (auth.uid() = user_id OR auth.uid() = owner_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON trips TO authenticated;
GRANT USAGE ON SEQUENCE trips_id_seq TO authenticated;

-- Create helpful view for trip permissions (optional)
CREATE OR REPLACE VIEW trip_permissions AS
SELECT 
    t.*,
    CASE 
        WHEN auth.uid() = t.user_id OR auth.uid() = t.owner_id THEN 'owner'
        WHEN auth.uid() = ANY(t.tagged_users) THEN 'tagged'
        WHEN t.privacy = 'public' THEN 'public'
        ELSE 'none'
    END AS user_permission,
    CASE 
        WHEN auth.uid() = t.user_id OR auth.uid() = t.owner_id THEN true
        WHEN auth.uid() = ANY(t.tagged_users) THEN true
        WHEN t.privacy = 'public' THEN true
        ELSE false
    END AS can_view,
    CASE 
        WHEN auth.uid() = t.user_id OR auth.uid() = t.owner_id THEN true
        WHEN auth.uid() = ANY(t.tagged_users) THEN true
        ELSE false
    END AS can_edit,
    CASE 
        WHEN auth.uid() = t.user_id OR auth.uid() = t.owner_id THEN true
        ELSE false
    END AS can_delete
FROM trips t;

-- Grant select permission on the view
GRANT SELECT ON trip_permissions TO authenticated;

-- Add comment to document the migration
COMMENT ON COLUMN trips.privacy IS 'Trip privacy setting: private (owner and tagged users only) or public (visible to all)';
COMMENT ON COLUMN trips.owner_id IS 'User ID of the trip owner (can be different from creator)';
COMMENT ON COLUMN trips.tagged_users IS 'Array of user IDs who have access to this trip';
COMMENT ON COLUMN trips.tags IS 'Array of tags for categorizing and searching trips';