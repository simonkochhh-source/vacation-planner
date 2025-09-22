-- Migration: Fix photo RLS policies with privacy support
-- Description: Clean up and recreate all photo policies with proper privacy handling

-- Enable RLS on trip_photos table (in case it's not enabled)
ALTER TABLE trip_photos ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view photos for accessible trips" ON trip_photos;
DROP POLICY IF EXISTS "Users can view photos for accessible trips with privacy" ON trip_photos;
DROP POLICY IF EXISTS "Users can insert photos for their trips" ON trip_photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON trip_photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON trip_photos;
DROP POLICY IF EXISTS "Anonymous users can view public photos from public trips" ON trip_photos;

-- Drop storage policies
DROP POLICY IF EXISTS "Users can view photos for their trips" ON storage.objects;
DROP POLICY IF EXISTS "Users can view photos based on privacy settings" ON storage.objects;
DROP POLICY IF EXISTS "Anonymous users can view public photo files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload photos for their trips" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;

-- CREATE NEW CLEAN POLICIES FOR trip_photos table

-- 1. SELECT policy for authenticated users
CREATE POLICY "authenticated_users_photo_select" ON trip_photos
FOR SELECT TO authenticated
USING (
    -- Own photos (always visible)
    user_id = auth.uid()
    OR (
        -- Photos from public trips with privacy set to public
        privacy = 'public'
        AND EXISTS (
            SELECT 1 FROM trips t 
            WHERE t.id = trip_photos.trip_id 
            AND t.privacy = 'public'
        )
    )
    OR (
        -- Photos from trips user has access to (regardless of photo privacy)
        EXISTS (
            SELECT 1 FROM trips t 
            WHERE t.id = trip_photos.trip_id 
            AND (t.owner_id = auth.uid() OR auth.uid() = ANY(t.tagged_users))
        )
    )
);

-- 2. SELECT policy for anonymous users (public photos only)
CREATE POLICY "anonymous_users_photo_select" ON trip_photos
FOR SELECT TO anon
USING (
    privacy = 'public'
    AND EXISTS (
        SELECT 1 FROM trips t 
        WHERE t.id = trip_photos.trip_id 
        AND t.privacy = 'public'
    )
);

-- 3. INSERT policy for authenticated users
CREATE POLICY "authenticated_users_photo_insert" ON trip_photos
FOR INSERT TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM trips t 
        WHERE t.id = trip_photos.trip_id 
        AND (t.owner_id = auth.uid() OR auth.uid() = ANY(t.tagged_users))
    )
);

-- 4. UPDATE policy for authenticated users (own photos only)
CREATE POLICY "authenticated_users_photo_update" ON trip_photos
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 5. DELETE policy for authenticated users (own photos only)
CREATE POLICY "authenticated_users_photo_delete" ON trip_photos
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- CREATE NEW CLEAN POLICIES FOR storage.objects

-- 1. SELECT policy for authenticated users
CREATE POLICY "authenticated_users_storage_select" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'trip-photos' 
    AND (
        -- Own photos (user owns the file)
        auth.uid()::text = split_part(name, '/', 1)
        OR (
            -- Public photos from public trips
            EXISTS (
                SELECT 1 FROM trip_photos tp
                JOIN trips t ON t.id = tp.trip_id
                WHERE tp.storage_path = name
                AND tp.privacy = 'public'
                AND t.privacy = 'public'
            )
        )
        OR (
            -- Photos from trips user has access to
            EXISTS (
                SELECT 1 FROM trip_photos tp
                JOIN trips t ON t.id = tp.trip_id
                WHERE tp.storage_path = name
                AND (t.owner_id = auth.uid() OR auth.uid() = ANY(t.tagged_users))
            )
        )
    )
);

-- 2. SELECT policy for anonymous users
CREATE POLICY "anonymous_users_storage_select" ON storage.objects
FOR SELECT TO anon
USING (
    bucket_id = 'trip-photos' 
    AND EXISTS (
        SELECT 1 FROM trip_photos tp
        JOIN trips t ON t.id = tp.trip_id
        WHERE tp.storage_path = name
        AND tp.privacy = 'public'
        AND t.privacy = 'public'
    )
);

-- 3. INSERT policy for authenticated users
CREATE POLICY "authenticated_users_storage_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'trip-photos' 
    AND auth.uid()::text = split_part(name, '/', 1)
);

-- 4. DELETE policy for authenticated users
CREATE POLICY "authenticated_users_storage_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'trip-photos' 
    AND auth.uid()::text = split_part(name, '/', 1)
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS trip_photos_privacy_idx ON trip_photos(privacy);
CREATE INDEX IF NOT EXISTS trip_photos_privacy_public_idx ON trip_photos(privacy, trip_id) WHERE privacy = 'public';