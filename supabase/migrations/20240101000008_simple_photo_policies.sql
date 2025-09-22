-- Migration: Simple photo RLS policies that actually work
-- Description: Create working policies without complex UUID casting issues

-- Enable RLS
ALTER TABLE trip_photos ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view photos for accessible trips" ON trip_photos;
DROP POLICY IF EXISTS "Users can view photos for accessible trips with privacy" ON trip_photos;
DROP POLICY IF EXISTS "Users can insert photos for their trips" ON trip_photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON trip_photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON trip_photos;
DROP POLICY IF EXISTS "Anonymous users can view public photos from public trips" ON trip_photos;
DROP POLICY IF EXISTS "authenticated_users_photo_select" ON trip_photos;
DROP POLICY IF EXISTS "anonymous_users_photo_select" ON trip_photos;
DROP POLICY IF EXISTS "authenticated_users_photo_insert" ON trip_photos;
DROP POLICY IF EXISTS "authenticated_users_photo_update" ON trip_photos;
DROP POLICY IF EXISTS "authenticated_users_photo_delete" ON trip_photos;
DROP POLICY IF EXISTS "photo_select_authenticated" ON trip_photos;
DROP POLICY IF EXISTS "photo_select_anonymous" ON trip_photos;
DROP POLICY IF EXISTS "photo_insert_authenticated" ON trip_photos;
DROP POLICY IF EXISTS "photo_update_authenticated" ON trip_photos;
DROP POLICY IF EXISTS "photo_delete_authenticated" ON trip_photos;

-- Simple policies that work

-- 1. Users can see their own photos
CREATE POLICY "own_photos_select" ON trip_photos
FOR SELECT
USING (user_id = auth.uid());

-- 2. Users can see public photos from public trips (for authenticated users)
CREATE POLICY "public_photos_authenticated_select" ON trip_photos
FOR SELECT TO authenticated
USING (
    privacy = 'public' 
    AND trip_id IN (
        SELECT id FROM trips WHERE privacy = 'public'
    )
);

-- 3. Anonymous users can see public photos from public trips
CREATE POLICY "public_photos_anonymous_select" ON trip_photos
FOR SELECT TO anon
USING (
    privacy = 'public' 
    AND trip_id IN (
        SELECT id FROM trips WHERE privacy = 'public'
    )
);

-- 4. Users can insert photos for their trips
CREATE POLICY "insert_own_photos" ON trip_photos
FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND trip_id IN (
        SELECT id FROM trips 
        WHERE owner_id = auth.uid()
    )
);

-- 5. Users can update their own photos
CREATE POLICY "update_own_photos" ON trip_photos
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 6. Users can delete their own photos
CREATE POLICY "delete_own_photos" ON trip_photos
FOR DELETE
USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS trip_photos_privacy_idx ON trip_photos(privacy);
CREATE INDEX IF NOT EXISTS trip_photos_user_id_idx ON trip_photos(user_id);
CREATE INDEX IF NOT EXISTS trip_photos_trip_id_idx ON trip_photos(trip_id);