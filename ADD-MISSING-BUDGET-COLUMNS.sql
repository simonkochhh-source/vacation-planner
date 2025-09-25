-- ========================================
-- ADD MISSING BUDGET AND OTHER COLUMNS
-- ========================================
-- This script adds the missing columns that the application expects
-- Target: Development Database (lsztvtauiapnhqplapgb.supabase.co)
-- ========================================

BEGIN;

-- Add missing columns to destinations table
ALTER TABLE destinations 
ADD COLUMN IF NOT EXISTS budget DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
ADD COLUMN IF NOT EXISTS coordinates_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS coordinates_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS images TEXT[],
ADD COLUMN IF NOT EXISTS booking_info TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'geplant' CHECK (status IN ('geplant', 'besucht', 'uebersprungen', 'in_bearbeitung')),
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS weather_info JSONB,
ADD COLUMN IF NOT EXISTS transport_to_next JSONB,
ADD COLUMN IF NOT EXISTS accessibility_info TEXT,
ADD COLUMN IF NOT EXISTS opening_hours JSONB,
ADD COLUMN IF NOT EXISTS contact_info JSONB,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_destination_id UUID,
ADD COLUMN IF NOT EXISTS end_time TIME,
ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 120;

-- Migrate existing data if needed
UPDATE destinations 
SET 
  location = COALESCE(address, ''),
  coordinates_lat = latitude,
  coordinates_lng = longitude,
  duration = COALESCE(duration_minutes, 120)
WHERE location IS NULL OR coordinates_lat IS NULL OR coordinates_lng IS NULL;

-- Ensure cost column is named correctly (rename if needed)
-- The app expects 'budget' but DB has 'cost'
-- We'll keep both for compatibility

COMMIT;

-- Verify the columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'destinations' 
ORDER BY column_name;