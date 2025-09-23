-- Fix trips privacy constraint to include 'contacts' option
-- This script updates the existing trips table to support the new 'contacts' privacy level

-- Drop existing constraint if it exists
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_privacy_check;

-- Add new constraint with 'contacts' option
ALTER TABLE trips ADD CONSTRAINT trips_privacy_check 
CHECK (privacy IN ('private', 'public', 'contacts'));

-- Also update any existing trips that might have null privacy values
UPDATE trips 
SET privacy = 'private' 
WHERE privacy IS NULL;

-- Verify the constraint was applied correctly
-- (This is just for confirmation, you can check this in Supabase dashboard)
SELECT 
  conname as constraint_name,
  consrc as constraint_definition
FROM pg_constraint 
WHERE conname = 'trips_privacy_check';