-- ========================================
-- SIMPLE STORAGE POLICY FIX
-- ========================================
-- This creates simple, permissive policies to fix immediate upload issues
-- ========================================

BEGIN;

-- Ensure bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('trip-photos', 'trip-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can upload photos for their trips" ON storage.objects;
DROP POLICY IF EXISTS "Users can view photos for their trips" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for trip photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view photos for accessible trips" ON storage.objects;

-- Create simple, working policies

-- 1. Allow authenticated users to upload to trip-photos bucket
CREATE POLICY "Authenticated users can upload trip photos" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'trip-photos' 
    AND auth.uid() IS NOT NULL
);

-- 2. Allow authenticated users to read from trip-photos bucket  
CREATE POLICY "Authenticated users can read trip photos" ON storage.objects
FOR SELECT USING (
    bucket_id = 'trip-photos'
    AND auth.uid() IS NOT NULL
);

-- 3. Allow users to delete their own photos (by user ID in path)
CREATE POLICY "Users can delete own trip photos" ON storage.objects
FOR DELETE USING (
    bucket_id = 'trip-photos' 
    AND auth.uid() IS NOT NULL
    AND auth.uid()::text = split_part(name, '/', 1)
);

-- 4. Public read access for everyone (since bucket is public)
CREATE POLICY "Public can read trip photos" ON storage.objects
FOR SELECT USING (bucket_id = 'trip-photos');

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Simple storage policies created successfully!';
END $$;