-- Fix Storage Bucket Policies for trip-photos
-- This creates the missing storage policies that allow photo access

-- First, ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'trip-photos', 
    'trip-photos', 
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

-- Drop any existing storage policies to start fresh
DROP POLICY IF EXISTS "Users can upload photos for their trips" ON storage.objects;
DROP POLICY IF EXISTS "Users can view photos for their trips" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view photos based on privacy settings" ON storage.objects;
DROP POLICY IF EXISTS "Anonymous users can view public photo files" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "anonymous_users_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_storage_delete" ON storage.objects;
DROP POLICY IF EXISTS "storage_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "storage_select_anonymous" ON storage.objects;
DROP POLICY IF EXISTS "storage_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_authenticated" ON storage.objects;

-- Create new, simple storage policies

-- 1. Anyone can view files in trip-photos bucket (since bucket is public)
-- This is the simplest approach - let the bucket's public setting handle access
CREATE POLICY "public_bucket_access" ON storage.objects
FOR SELECT
USING (bucket_id = 'trip-photos');

-- 2. Authenticated users can upload to their own folder
CREATE POLICY "users_upload_own_photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'trip-photos'
    AND (auth.uid())::text = split_part(name, '/', 1)
);

-- 3. Users can delete their own photos
CREATE POLICY "users_delete_own_photos" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'trip-photos'
    AND (auth.uid())::text = split_part(name, '/', 1)
);

-- 4. Users can update their own photos (for metadata)
CREATE POLICY "users_update_own_photos" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'trip-photos'
    AND (auth.uid())::text = split_part(name, '/', 1)
);