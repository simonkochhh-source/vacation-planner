-- Safe migration that handles different data types and scenarios
-- Execute this step by step in Supabase SQL Editor

-- Step 1: Add missing columns to trips table (safe to run multiple times)
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS privacy TEXT DEFAULT 'private' CHECK (privacy IN ('private', 'public')),
ADD COLUMN IF NOT EXISTS owner_id UUID,
ADD COLUMN IF NOT EXISTS tagged_users TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Step 2: Update owner_id safely (handles various user_id types)
-- This handles cases where user_id might be TEXT, UUID, or other types
DO $$
BEGIN
    -- Try to update owner_id from user_id with different type conversions
    BEGIN
        -- First try: assume user_id is already UUID
        UPDATE trips 
        SET owner_id = user_id 
        WHERE owner_id IS NULL AND user_id IS NOT NULL;
    EXCEPTION WHEN others THEN
        BEGIN
            -- Second try: assume user_id is TEXT and convert to UUID
            UPDATE trips 
            SET owner_id = user_id::UUID 
            WHERE owner_id IS NULL AND user_id IS NOT NULL;
        EXCEPTION WHEN others THEN
            -- If both fail, set a default UUID or leave NULL
            -- You can set this to a specific user ID if needed
            RAISE NOTICE 'Could not convert user_id to owner_id. Manual intervention may be required.';
        END;
    END;
END $$;

-- Step 3: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trips_privacy ON trips(privacy);
CREATE INDEX IF NOT EXISTS idx_trips_owner_id ON trips(owner_id);

-- Step 4: Show results
SELECT 
    COUNT(*) as total_trips,
    COUNT(owner_id) as trips_with_owner,
    COUNT(CASE WHEN privacy = 'private' THEN 1 END) as private_trips,
    COUNT(CASE WHEN privacy = 'public' THEN 1 END) as public_trips
FROM trips;