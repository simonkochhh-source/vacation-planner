-- ========================================
-- FIX STORAGE POLICIES FOR TRIP PHOTOS
-- ========================================
-- This script fixes the storage policies that are preventing photo uploads
-- ========================================

BEGIN;

-- First, ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('trip-photos', 'trip-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can upload photos for their trips" ON storage.objects;
DROP POLICY IF EXISTS "Users can view photos for their trips" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for trip photos" ON storage.objects;

-- Create improved storage policies

-- 1. Allow users to upload photos for their trips
-- Path structure: userId/tripId/destinationId/filename
CREATE POLICY "Users can upload photos for their trips" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'trip-photos' 
    AND auth.uid() IS NOT NULL
    AND auth.uid()::text = split_part(name, '/', 1)
    AND EXISTS (
        SELECT 1 FROM trips t 
        WHERE t.id = split_part(name, '/', 2)::uuid
        AND (t.owner_id = auth.uid() OR auth.uid() = ANY(t.tagged_users))
    )
);

-- 2. Allow users to view photos they have access to
CREATE POLICY "Users can view photos for accessible trips" ON storage.objects
FOR SELECT USING (
    bucket_id = 'trip-photos' 
    AND (
        -- User owns the file
        auth.uid()::text = split_part(name, '/', 1)
        OR
        -- User has access to the trip
        EXISTS (
            SELECT 1 FROM trips t 
            WHERE t.id = split_part(name, '/', 2)::uuid
            AND (
                t.privacy = 'public' 
                OR t.owner_id = auth.uid() 
                OR auth.uid() = ANY(t.tagged_users)
            )
        )
    )
);

-- 3. Allow users to delete their own photos
CREATE POLICY "Users can delete their own photos" ON storage.objects
FOR DELETE USING (
    bucket_id = 'trip-photos' 
    AND auth.uid()::text = split_part(name, '/', 1)
);

-- 4. Allow public read access for public trip photos
CREATE POLICY "Public read access for trip photos" ON storage.objects
FOR SELECT USING (
    bucket_id = 'trip-photos'
    AND EXISTS (
        SELECT 1 FROM trips t 
        WHERE t.id = split_part(name, '/', 2)::uuid
        AND t.privacy = 'public'
    )
);

-- Also ensure RLS is enabled on storage.objects (should be by default)
-- Note: This might fail if already enabled, which is fine
DO $$
BEGIN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Verify bucket settings
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'trip-photos';

COMMIT;

-- Test the policy by showing what storage policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%trip%';

DO $$
BEGIN
    RAISE NOTICE 'Storage policies for trip-photos have been updated successfully!';
END $$;