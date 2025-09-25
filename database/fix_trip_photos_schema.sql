-- ========================================
-- FIX TRIP_PHOTOS TABLE SCHEMA
-- ========================================
-- This script ensures all required columns exist in trip_photos table
-- ========================================

BEGIN;

-- First check what columns exist currently
-- (This is for informational purposes - will show in output)
DO $$
BEGIN
    RAISE NOTICE 'Checking current trip_photos table structure...';
END $$;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'trip_photos' 
ORDER BY ordinal_position;

-- Add any missing columns to trip_photos table
ALTER TABLE trip_photos 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
ADD COLUMN IF NOT EXISTS trip_id UUID,
ADD COLUMN IF NOT EXISTS destination_id UUID,
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS file_type TEXT,
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS caption TEXT,
ADD COLUMN IF NOT EXISTS location_name TEXT,
ADD COLUMN IF NOT EXISTS coordinates JSONB,
ADD COLUMN IF NOT EXISTS taken_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS privacy TEXT DEFAULT 'private' CHECK (privacy IN ('private', 'public')),
ADD COLUMN IF NOT EXISTS privacy_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    -- Check and add trip_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'trip_photos_trip_id_fkey' 
        AND table_name = 'trip_photos'
    ) THEN
        ALTER TABLE trip_photos 
        ADD CONSTRAINT trip_photos_trip_id_fkey 
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;
    END IF;

    -- Check and add destination_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'trip_photos_destination_id_fkey' 
        AND table_name = 'trip_photos'
    ) THEN
        ALTER TABLE trip_photos 
        ADD CONSTRAINT trip_photos_destination_id_fkey 
        FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE;
    END IF;

    -- Check and add user_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'trip_photos_user_id_fkey' 
        AND table_name = 'trip_photos'
    ) THEN
        ALTER TABLE trip_photos 
        ADD CONSTRAINT trip_photos_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Set NOT NULL constraints where appropriate (only if columns have data)
DO $$
BEGIN
    -- Only set NOT NULL if all existing records have values
    IF (SELECT COUNT(*) FROM trip_photos WHERE trip_id IS NULL) = 0 THEN
        ALTER TABLE trip_photos ALTER COLUMN trip_id SET NOT NULL;
    END IF;
    
    IF (SELECT COUNT(*) FROM trip_photos WHERE destination_id IS NULL) = 0 THEN
        ALTER TABLE trip_photos ALTER COLUMN destination_id SET NOT NULL;
    END IF;
    
    IF (SELECT COUNT(*) FROM trip_photos WHERE user_id IS NULL) = 0 THEN
        ALTER TABLE trip_photos ALTER COLUMN user_id SET NOT NULL;
    END IF;
    
    IF (SELECT COUNT(*) FROM trip_photos WHERE file_name IS NULL OR file_name = '') = 0 THEN
        ALTER TABLE trip_photos ALTER COLUMN file_name SET NOT NULL;
    END IF;
    
    IF (SELECT COUNT(*) FROM trip_photos WHERE storage_path IS NULL OR storage_path = '') = 0 THEN
        ALTER TABLE trip_photos ALTER COLUMN storage_path SET NOT NULL;
    END IF;
END $$;

-- Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_trip_photos_trip_id ON trip_photos(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_photos_destination_id ON trip_photos(destination_id);
CREATE INDEX IF NOT EXISTS idx_trip_photos_user_id ON trip_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_photos_taken_at ON trip_photos(taken_at);
CREATE INDEX IF NOT EXISTS idx_trip_photos_privacy ON trip_photos(privacy);
CREATE INDEX IF NOT EXISTS idx_trip_photos_trip_privacy ON trip_photos(trip_id, privacy);

-- Update existing photos to have privacy setting (default to private)
UPDATE trip_photos 
SET privacy = 'private' 
WHERE privacy IS NULL;

-- Enable RLS if not already enabled
ALTER TABLE trip_photos ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Final verification - show the complete table structure
DO $$
BEGIN
    RAISE NOTICE 'Final trip_photos table structure:';
END $$;

SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'trip_photos' 
ORDER BY ordinal_position;