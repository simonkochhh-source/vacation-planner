-- =====================================================
-- SUPABASE STORAGE SYNCHRONIZATION SCRIPT
-- =====================================================
-- Purpose: Complete 1:1 storage synchronization between Production and Dev
-- Date: September 24, 2025
-- 
-- IMPORTANT: This script should be run on the DEV database to match Production
-- Database: lsztvtauiapnhqplapgb.supabase.co (Dev/Test)
--
-- Usage:
-- 1. Connect to Dev database via Supabase Dashboard SQL Editor
-- 2. Execute this entire script
-- 3. Manually create avatar policies in Storage Settings (see instructions below)
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ENABLE STORAGE EXTENSION
-- =====================================================

-- Ensure storage extension is enabled
CREATE EXTENSION IF NOT EXISTS "supabase_storage" SCHEMA storage;

-- Enable RLS on storage objects (critical for security)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. CREATE STORAGE BUCKETS
-- =====================================================

-- Clean up any existing buckets first (for fresh sync)
DELETE FROM storage.buckets WHERE name IN ('avatars', 'trip-photos', 'destination-images', 'documents');

-- Avatar Storage Bucket (Public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at)
VALUES (
  'avatars',
  'avatars', 
  true,
  5242880, -- 5MB limit for avatars
  '["image/jpeg", "image/png", "image/webp"]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  updated_at = NOW();

-- Trip Photos Storage Bucket (Public bucket with private content via RLS)  
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at)
VALUES (
  'trip-photos',
  'trip-photos',
  true,
  10485760, -- 10MB limit for trip photos
  '["image/jpeg", "image/png", "image/webp", "image/gif"]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  updated_at = NOW();

-- Destination Images Bucket (Public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at)
VALUES (
  'destination-images',
  'destination-images',
  true,
  10485760, -- 10MB limit
  '["image/jpeg", "image/png", "image/webp"]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  updated_at = NOW();

-- Documents Bucket (Private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB limit for documents
  '["application/pdf", "image/jpeg", "image/png", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  updated_at = NOW();

-- =====================================================
-- 3. STORAGE POLICIES - AVATARS
-- =====================================================

-- Clean up existing avatar policies
DROP POLICY IF EXISTS "Users can upload own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "avatar_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "avatar_view_policy" ON storage.objects;
DROP POLICY IF EXISTS "avatar_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "avatar_delete_policy" ON storage.objects;

-- Avatar upload policy (authenticated users can upload their own avatar)
CREATE POLICY "avatar_upload_policy" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Avatar view policy (everyone can view avatars - public bucket)
CREATE POLICY "avatar_view_policy" ON storage.objects
FOR SELECT 
USING (bucket_id = 'avatars');

-- Avatar update policy (users can update their own avatars)
CREATE POLICY "avatar_update_policy" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Avatar delete policy (users can delete their own avatars)
CREATE POLICY "avatar_delete_policy" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- 4. STORAGE POLICIES - TRIP PHOTOS
-- =====================================================

-- Clean up existing trip photo policies
DROP POLICY IF EXISTS "Users can upload photos for their trips" ON storage.objects;
DROP POLICY IF EXISTS "Users can view photos for their trips" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
DROP POLICY IF EXISTS "trip_photo_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "trip_photo_view_policy" ON storage.objects;
DROP POLICY IF EXISTS "trip_photo_delete_policy" ON storage.objects;

-- Trip photo upload policy
CREATE POLICY "trip_photo_upload_policy" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'trip-photos' 
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- Trip photo view policy (complex privacy logic)
CREATE POLICY "trip_photo_view_policy" ON storage.objects
FOR SELECT 
USING (
  bucket_id = 'trip-photos' 
  AND (
    -- Users can always see their own photos
    auth.uid()::text = split_part(name, '/', 1)
    OR 
    -- Public photos from public trips are visible to all
    EXISTS (
      SELECT 1 FROM trips t 
      WHERE t.id = split_part(name, '/', 2)::uuid
      AND t.privacy = 'public'
    )
  )
);

-- Trip photo delete policy
CREATE POLICY "trip_photo_delete_policy" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'trip-photos' 
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- =====================================================
-- 5. STORAGE POLICIES - DESTINATION IMAGES
-- =====================================================

-- Clean up existing destination image policies
DROP POLICY IF EXISTS "destination_image_view_policy" ON storage.objects;
DROP POLICY IF EXISTS "destination_image_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "destination_image_delete_policy" ON storage.objects;

-- Public viewing (everyone can see destination images)
CREATE POLICY "destination_image_view_policy" ON storage.objects
FOR SELECT 
USING (bucket_id = 'destination-images');

-- Upload policy (authenticated users can upload destination images)
CREATE POLICY "destination_image_upload_policy" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'destination-images');

-- Delete policy (only uploaders can delete their own images)
CREATE POLICY "destination_image_delete_policy" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'destination-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- 6. STORAGE POLICIES - DOCUMENTS
-- =====================================================

-- Clean up existing document policies
DROP POLICY IF EXISTS "document_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "document_view_policy" ON storage.objects;
DROP POLICY IF EXISTS "document_delete_policy" ON storage.objects;

-- Document upload policy (users can upload to their own folder)
CREATE POLICY "document_upload_policy" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Document view policy (users can only view their own documents)
CREATE POLICY "document_view_policy" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Document delete policy (users can delete their own documents)
CREATE POLICY "document_delete_policy" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- 7. CREATE TRIP_PHOTOS TABLE (if not exists)
-- =====================================================

-- Create trip_photos table for metadata storage
CREATE TABLE IF NOT EXISTS trip_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- File information
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    storage_path TEXT NOT NULL UNIQUE,
    
    -- Photo metadata
    caption TEXT,
    location_name TEXT,
    coordinates JSONB, -- {lat: number, lng: number}
    taken_at TIMESTAMP WITH TIME ZONE,
    privacy VARCHAR(20) DEFAULT 'private' CHECK (privacy IN ('private', 'public')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS trip_photos_trip_id_idx ON trip_photos(trip_id);
CREATE INDEX IF NOT EXISTS trip_photos_destination_id_idx ON trip_photos(destination_id);
CREATE INDEX IF NOT EXISTS trip_photos_user_id_idx ON trip_photos(user_id);
CREATE INDEX IF NOT EXISTS trip_photos_taken_at_idx ON trip_photos(taken_at);
CREATE INDEX IF NOT EXISTS trip_photos_privacy_idx ON trip_photos(privacy);

-- =====================================================
-- 8. RLS POLICIES FOR TRIP_PHOTOS TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE trip_photos ENABLE ROW LEVEL SECURITY;

-- Clean up existing table policies
DROP POLICY IF EXISTS "own_photos_select" ON trip_photos;
DROP POLICY IF EXISTS "public_photos_authenticated_select" ON trip_photos;
DROP POLICY IF EXISTS "public_photos_anonymous_select" ON trip_photos;
DROP POLICY IF EXISTS "insert_own_photos" ON trip_photos;
DROP POLICY IF EXISTS "update_own_photos" ON trip_photos;
DROP POLICY IF EXISTS "delete_own_photos" ON trip_photos;

-- Users can see their own photos
CREATE POLICY "own_photos_select" ON trip_photos
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Authenticated users can see public photos from public trips
CREATE POLICY "public_photos_authenticated_select" ON trip_photos
FOR SELECT TO authenticated
USING (
    privacy = 'public' 
    AND trip_id IN (
        SELECT id FROM trips WHERE privacy = 'public'
    )
);

-- Anonymous users can see public photos from public trips
CREATE POLICY "public_photos_anonymous_select" ON trip_photos
FOR SELECT TO anon
USING (
    privacy = 'public' 
    AND trip_id IN (
        SELECT id FROM trips WHERE privacy = 'public'
    )
);

-- Users can insert photos for their trips
CREATE POLICY "insert_own_photos" ON trip_photos
FOR INSERT TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND trip_id IN (
        SELECT id FROM trips 
        WHERE owner_id = auth.uid()
    )
);

-- Users can update their own photos
CREATE POLICY "update_own_photos" ON trip_photos
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own photos
CREATE POLICY "delete_own_photos" ON trip_photos
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- 9. TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trip_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_trip_photos_updated_at ON trip_photos;
CREATE TRIGGER update_trip_photos_updated_at
    BEFORE UPDATE ON trip_photos
    FOR EACH ROW
    EXECUTE FUNCTION update_trip_photos_updated_at();

-- =====================================================
-- 10. VERIFICATION QUERIES
-- =====================================================

-- Verify buckets were created
DO $$
BEGIN
    RAISE NOTICE 'Storage buckets created:';
    PERFORM pg_sleep(0.1);
END $$;

SELECT 
    name,
    public,
    file_size_limit,
    array_length(array(SELECT jsonb_array_elements_text(allowed_mime_types)), 1) as mime_types_count,
    created_at
FROM storage.buckets 
WHERE name IN ('avatars', 'trip-photos', 'destination-images', 'documents')
ORDER BY name;

-- Verify storage policies
DO $$
BEGIN
    RAISE NOTICE 'Storage policies created:';
    PERFORM pg_sleep(0.1);
END $$;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;

-- Verify trip_photos table
DO $$
BEGIN
    RAISE NOTICE 'Trip photos table structure:';
    PERFORM pg_sleep(0.1);
END $$;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'trip_photos'
ORDER BY ordinal_position;

COMMIT;

-- =====================================================
-- POST-EXECUTION MANUAL STEPS
-- =====================================================

/*

🎯 IMPORTANT: Manual Steps Required After Running This Script

1. VERIFY EXECUTION
   - Check that all 4 storage buckets were created
   - Verify that all storage policies are active
   - Confirm trip_photos table exists with proper structure

2. TEST STORAGE ACCESS
   - Upload test avatar: avatars/{user_id}/avatar.jpg
   - Upload test trip photo: trip-photos/{user_id}/{trip_id}/photo.jpg
   - Verify access permissions work as expected

3. APPLICATION INTEGRATION
   - Update environment variables if needed
   - Test file upload components
   - Verify photo gallery functionality

4. PERFORMANCE MONITORING
   - Monitor storage usage
   - Check query performance on trip_photos table
   - Consider CDN integration for public assets

5. SECURITY REVIEW
   - Test RLS policies with different user roles
   - Verify anonymous access restrictions
   - Test file size and MIME type restrictions

📁 Expected File Paths:
- Avatars: /avatars/{user_id}/avatar.{ext}
- Trip Photos: /trip-photos/{user_id}/{trip_id}/{photo_id}.{ext}
- Destination Images: /destination-images/{category}/{image_id}.{ext}
- Documents: /documents/{user_id}/{document_name}.{ext}

🔒 Security Features:
- ✅ File size limits enforced
- ✅ MIME type restrictions active
- ✅ RLS policies prevent unauthorized access
- ✅ User isolation via folder structure
- ✅ Public/private content separation

📊 Monitoring Queries:
SELECT bucket_id, COUNT(*) as file_count, SUM(COALESCE(metadata->>'size', '0')::bigint) as total_size
FROM storage.objects 
GROUP BY bucket_id;

*/