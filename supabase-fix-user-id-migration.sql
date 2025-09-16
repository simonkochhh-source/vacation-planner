-- Migration: Add user_id columns and migrate existing data
-- Run this in Supabase SQL Editor

-- STEP 1: Add user_id columns (if they don't exist yet)
-- Add user_id column to trips table
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add user_id column to destinations table  
ALTER TABLE destinations 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- STEP 2: Check current state
-- Show trips without user_id
SELECT id, name, created_at, user_id 
FROM trips 
WHERE user_id IS NULL;

-- Show destinations without user_id  
SELECT id, name, trip_id, created_at, user_id
FROM destinations
WHERE user_id IS NULL;

-- STEP 2: Get your current user_id
-- You need to replace 'YOUR_USER_ID_HERE' with your actual authenticated user ID
-- You can get this from: SELECT auth.uid(); when you're logged in

-- STEP 4: Update trips with missing user_id
-- ⚠️  REPLACE 'YOUR_USER_ID_HERE' with your actual user ID before running!
/*
UPDATE trips 
SET user_id = 'YOUR_USER_ID_HERE'
WHERE user_id IS NULL;
*/

-- STEP 5: Update destinations with missing user_id  
-- ⚠️  REPLACE 'YOUR_USER_ID_HERE' with your actual user ID before running!
/*
UPDATE destinations 
SET user_id = 'YOUR_USER_ID_HERE' 
WHERE user_id IS NULL;
*/

-- STEP 6: Add constraints and indexes for better performance
-- Make user_id NOT NULL after migration (optional but recommended)
/*
ALTER TABLE trips ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE destinations ALTER COLUMN user_id SET NOT NULL;
*/

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_destinations_user_id ON destinations(user_id);

-- STEP 7: Verify the fix
-- Check that all trips now have user_id
SELECT COUNT(*) as trips_without_user_id
FROM trips 
WHERE user_id IS NULL;

-- Check that all destinations now have user_id
SELECT COUNT(*) as destinations_without_user_id
FROM destinations
WHERE user_id IS NULL;

-- STEP 8: Check your data after migration
-- Show your trips
SELECT id, name, user_id, created_at 
FROM trips 
ORDER BY created_at DESC;

-- Show your destinations
SELECT id, name, trip_id, user_id, created_at
FROM destinations 
ORDER BY created_at DESC;