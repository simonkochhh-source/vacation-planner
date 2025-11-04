-- =====================================================
-- DEV DATABASE REPAIR SCRIPT (FIXED)
-- =====================================================
-- Purpose: Complete repair and setup of dev Supabase database
-- Target Database: lsztvtauiapnhqplapgb.supabase.co (Dev/Test)
-- Date: November 4, 2025
-- 
-- IMPORTANT: This script completely repairs the database structure
-- Run this in Supabase SQL Editor to fix all issues
-- =====================================================

-- Start transaction
BEGIN;

-- =====================================================
-- 1. CLEAN UP AND RESET
-- =====================================================

-- Drop existing problematic policies to start fresh
DROP POLICY IF EXISTS "trips_select_own" ON trips;
DROP POLICY IF EXISTS "trips_select_public" ON trips;
DROP POLICY IF EXISTS "trips_select_tagged" ON trips;
DROP POLICY IF EXISTS "trips_insert_policy" ON trips;
DROP POLICY IF EXISTS "trips_update_policy" ON trips;
DROP POLICY IF EXISTS "trips_delete_policy" ON trips;

DROP POLICY IF EXISTS "destinations_select_policy" ON destinations;
DROP POLICY IF EXISTS "destinations_insert_policy" ON destinations;
DROP POLICY IF EXISTS "destinations_update_policy" ON destinations;
DROP POLICY IF EXISTS "destinations_delete_policy" ON destinations;

-- =====================================================
-- 2. ENSURE CORRECT TABLE STRUCTURE
-- =====================================================

-- Create trips table with correct structure for app compatibility
CREATE TABLE IF NOT EXISTS trips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    budget DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
    cover_image TEXT,
    privacy VARCHAR(20) DEFAULT 'private' CHECK (privacy IN ('private', 'public', 'contacts')),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Arrays as JSONB for app compatibility
    destinations JSONB DEFAULT '[]'::jsonb,
    participants JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    tagged_users JSONB DEFAULT '[]'::jsonb,
    
    -- Vehicle configuration
    vehicle_config JSONB,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create destinations table with correct structure
CREATE TABLE IF NOT EXISTS destinations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    coordinates JSONB,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'museum', 'restaurant', 'attraction', 'hotel', 'transport', 
        'nature', 'entertainment', 'shopping', 'cultural', 'sports', 'other'
    )),
    priority INTEGER CHECK (priority >= 1 AND priority <= 5),
    budget DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    notes TEXT,
    booking_info TEXT,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'visited', 'skipped', 'in_progress')),
    color VARCHAR(7),
    duration DECIMAL(4,2),
    order_index INTEGER,
    
    -- Timeline features
    start_time TIME,
    end_time TIME,
    visit_date DATE,
    description TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    
    -- Additional data as JSONB
    photos JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    weather_info JSONB,
    transport_to_next JSONB,
    
    -- Additional fields
    website TEXT,
    phone_number TEXT,
    address TEXT,
    opening_hours TEXT,
    return_destination_id UUID REFERENCES destinations(id),
    copied_from_id UUID REFERENCES destinations(id),
    is_original BOOLEAN DEFAULT true,
    
    -- Compatibility fields for app
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sort_order INTEGER,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. ADD MISSING COLUMNS SAFELY
-- =====================================================

-- Add missing columns to trips table
DO $$
BEGIN
    -- Check each column and add if missing
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'destinations') THEN
        ALTER TABLE trips ADD COLUMN destinations JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'participants') THEN
        ALTER TABLE trips ADD COLUMN participants JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'tags') THEN
        ALTER TABLE trips ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'tagged_users') THEN
        ALTER TABLE trips ADD COLUMN tagged_users JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'actual_cost') THEN
        ALTER TABLE trips ADD COLUMN actual_cost DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'cover_image') THEN
        ALTER TABLE trips ADD COLUMN cover_image TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'privacy') THEN
        ALTER TABLE trips ADD COLUMN privacy VARCHAR(20) DEFAULT 'private';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'owner_id') THEN
        ALTER TABLE trips ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'vehicle_config') THEN
        ALTER TABLE trips ADD COLUMN vehicle_config JSONB;
    END IF;
END $$;

-- Add missing columns to destinations table
DO $$
BEGIN
    -- App compatibility columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'user_id') THEN
        ALTER TABLE destinations ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'sort_order') THEN
        ALTER TABLE destinations ADD COLUMN sort_order INTEGER;
    END IF;
    
    -- All other destination columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'coordinates') THEN
        ALTER TABLE destinations ADD COLUMN coordinates JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'priority') THEN
        ALTER TABLE destinations ADD COLUMN priority INTEGER CHECK (priority >= 1 AND priority <= 5);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'actual_cost') THEN
        ALTER TABLE destinations ADD COLUMN actual_cost DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'photos') THEN
        ALTER TABLE destinations ADD COLUMN photos JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'booking_info') THEN
        ALTER TABLE destinations ADD COLUMN booking_info TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'tags') THEN
        ALTER TABLE destinations ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'color') THEN
        ALTER TABLE destinations ADD COLUMN color VARCHAR(7);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'duration') THEN
        ALTER TABLE destinations ADD COLUMN duration DECIMAL(4,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'order_index') THEN
        ALTER TABLE destinations ADD COLUMN order_index INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'start_time') THEN
        ALTER TABLE destinations ADD COLUMN start_time TIME;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'end_time') THEN
        ALTER TABLE destinations ADD COLUMN end_time TIME;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'visit_date') THEN
        ALTER TABLE destinations ADD COLUMN visit_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'description') THEN
        ALTER TABLE destinations ADD COLUMN description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'rating') THEN
        ALTER TABLE destinations ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'weather_info') THEN
        ALTER TABLE destinations ADD COLUMN weather_info JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'transport_to_next') THEN
        ALTER TABLE destinations ADD COLUMN transport_to_next JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'website') THEN
        ALTER TABLE destinations ADD COLUMN website TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'phone_number') THEN
        ALTER TABLE destinations ADD COLUMN phone_number TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'address') THEN
        ALTER TABLE destinations ADD COLUMN address TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'opening_hours') THEN
        ALTER TABLE destinations ADD COLUMN opening_hours TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'return_destination_id') THEN
        ALTER TABLE destinations ADD COLUMN return_destination_id UUID REFERENCES destinations(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'copied_from_id') THEN
        ALTER TABLE destinations ADD COLUMN copied_from_id UUID REFERENCES destinations(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'is_original') THEN
        ALTER TABLE destinations ADD COLUMN is_original BOOLEAN DEFAULT true;
    END IF;
END $$;

-- =====================================================
-- 4. CREATE ESSENTIAL INDEXES
-- =====================================================

-- Basic performance indexes
CREATE INDEX IF NOT EXISTS idx_trips_owner_id ON trips(owner_id);
CREATE INDEX IF NOT EXISTS idx_trips_privacy ON trips(privacy);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at);

CREATE INDEX IF NOT EXISTS idx_destinations_trip_id ON destinations(trip_id);
CREATE INDEX IF NOT EXISTS idx_destinations_user_id ON destinations(user_id);
CREATE INDEX IF NOT EXISTS idx_destinations_sort_order ON destinations(sort_order);
CREATE INDEX IF NOT EXISTS idx_destinations_order_index ON destinations(order_index);
CREATE INDEX IF NOT EXISTS idx_destinations_category ON destinations(category);
CREATE INDEX IF NOT EXISTS idx_destinations_status ON destinations(status);

-- JSONB indexes for performance
CREATE INDEX IF NOT EXISTS idx_trips_tags_gin ON trips USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_destinations_coordinates_gin ON destinations USING GIN(coordinates);

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. CREATE WORKING RLS POLICIES
-- =====================================================

-- TRIPS POLICIES

-- Users can see their own trips
CREATE POLICY "trips_own_access" ON trips
FOR ALL TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Users can see public trips (read-only)
CREATE POLICY "trips_public_read" ON trips
FOR SELECT TO authenticated
USING (privacy = 'public');

-- DESTINATIONS POLICIES

-- Users can access destinations for their own trips
CREATE POLICY "destinations_own_trips" ON destinations
FOR ALL TO authenticated
USING (
    user_id = auth.uid() 
    OR trip_id IN (SELECT id FROM trips WHERE owner_id = auth.uid())
)
WITH CHECK (
    user_id = auth.uid() 
    OR trip_id IN (SELECT id FROM trips WHERE owner_id = auth.uid())
);

-- Users can read destinations from public trips
CREATE POLICY "destinations_public_read" ON destinations
FOR SELECT TO authenticated
USING (
    trip_id IN (SELECT id FROM trips WHERE privacy = 'public')
);

-- =====================================================
-- 7. CREATE ESSENTIAL TRIGGERS
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update timestamps
DROP TRIGGER IF EXISTS update_trips_updated_at ON trips;
CREATE TRIGGER update_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_destinations_updated_at ON destinations;
CREATE TRIGGER update_destinations_updated_at
    BEFORE UPDATE ON destinations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Function to sync user_id with trip owner for destinations
CREATE OR REPLACE FUNCTION sync_destination_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Set user_id to trip owner for app compatibility
    IF NEW.user_id IS NULL THEN
        SELECT owner_id INTO NEW.user_id FROM trips WHERE id = NEW.trip_id;
    END IF;
    
    -- Set sort_order if not provided
    IF NEW.sort_order IS NULL THEN
        NEW.sort_order := COALESCE(NEW.order_index, 0);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_destination_user_id_trigger ON destinations;
CREATE TRIGGER sync_destination_user_id_trigger
    BEFORE INSERT OR UPDATE ON destinations
    FOR EACH ROW
    EXECUTE FUNCTION sync_destination_user_id();

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON trips TO authenticated;
GRANT ALL ON destinations TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- 9. VERIFICATION QUERIES (NO TEST DATA)
-- =====================================================

-- Show table structures
SELECT 
    'TRIPS TABLE STRUCTURE' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'trips'
ORDER BY ordinal_position;

SELECT 
    'DESTINATIONS TABLE STRUCTURE' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'destinations'
ORDER BY ordinal_position;

-- Show created policies
SELECT 
    'RLS POLICIES' as info,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('trips', 'destinations')
ORDER BY tablename, policyname;

-- Show existing data counts
SELECT 'EXISTING DATA - TRIPS' as info, COUNT(*) as trip_count FROM trips;
SELECT 'EXISTING DATA - DESTINATIONS' as info, COUNT(*) as destination_count FROM destinations;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT 'Dev database repair completed successfully! Tables, policies, and triggers are ready.' as result;

-- =====================================================
-- NOTES
-- =====================================================

/*
🎯 WHAT THIS SCRIPT FIXED:

1. ✅ Corrected table structure for app compatibility
2. ✅ Added user_id and sort_order columns for destinations
3. ✅ Fixed RLS policies to be simple and working
4. ✅ Created essential indexes for performance
5. ✅ Added triggers for data consistency
6. ✅ Used JSONB for arrays (app compatible)
7. ✅ Removed problematic test data creation

📊 VERIFY THE FIX:

After running this script, the app should be able to:
- ✅ Connect to the database without errors
- ✅ Load trips and destinations
- ✅ Create new trips and destinations
- ✅ Handle AI route generation properly

🔧 APP ENVIRONMENT CHECK:

Make sure your .env files have the correct Supabase URL:
- REACT_APP_SUPABASE_URL=https://lsztvtauiapnhqplapgb.supabase.co
- Not: https://placeholder.supabase.co

*/