-- ========================================
-- ADD PRIVACY COLUMN TO TRIP_PHOTOS
-- ========================================
-- This script adds the missing privacy column to trip_photos table
-- that the application expects for photo privacy features
-- ========================================

BEGIN;

-- Add privacy column to trip_photos table
ALTER TABLE trip_photos 
ADD COLUMN IF NOT EXISTS privacy TEXT DEFAULT 'private' CHECK (privacy IN ('private', 'public')),
ADD COLUMN IF NOT EXISTS privacy_approved_at TIMESTAMP WITH TIME ZONE;

-- Update existing photos to have privacy setting (default to private)
UPDATE trip_photos 
SET privacy = 'private' 
WHERE privacy IS NULL;

-- Create index for performance on privacy filtering
CREATE INDEX IF NOT EXISTS idx_trip_photos_privacy 
ON trip_photos(privacy);

-- Create composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_trip_photos_trip_privacy 
ON trip_photos(trip_id, privacy);

COMMIT;

-- Verify the columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'trip_photos' 
AND column_name IN ('privacy', 'privacy_approved_at')
ORDER BY column_name;