-- ========================================
-- FIX PHOTO_URL CONSTRAINT IN TRIP_PHOTOS
-- ========================================
-- This script fixes the photo_url column constraint issue
-- The code doesn't use photo_url but the DB expects it
-- ========================================

BEGIN;

-- Check if photo_url column exists and its constraints
DO $$
BEGIN
    -- First check if the column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_photos' AND column_name = 'photo_url') THEN
        RAISE NOTICE 'Column photo_url exists in trip_photos table';
        
        -- Make photo_url column nullable if it's currently NOT NULL
        ALTER TABLE trip_photos ALTER COLUMN photo_url DROP NOT NULL;
        RAISE NOTICE 'Removed NOT NULL constraint from photo_url column';
        
        -- Optionally, we could drop the column entirely since the code doesn't use it
        -- But let's keep it for now and make it optional
        
    ELSE
        RAISE NOTICE 'Column photo_url does not exist in trip_photos table';
    END IF;
END $$;

-- Alternative approach: Add photo_url column if missing and make it computed from storage_path
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_photos' AND column_name = 'photo_url') THEN
        -- Add photo_url as nullable column
        ALTER TABLE trip_photos ADD COLUMN photo_url TEXT;
        RAISE NOTICE 'Added photo_url column as nullable';
    END IF;
END $$;

-- Update existing records to populate photo_url from storage_path if needed
UPDATE trip_photos 
SET photo_url = CONCAT('https://wcsfytpcdfhnvpksgrjv.supabase.co/storage/v1/object/public/trip-photos/', storage_path)
WHERE photo_url IS NULL AND storage_path IS NOT NULL;

COMMIT;

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'trip_photos' 
AND column_name IN ('photo_url', 'storage_path')
ORDER BY column_name;