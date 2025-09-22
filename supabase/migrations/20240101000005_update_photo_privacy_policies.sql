-- Migration: Update RLS policies for photo privacy
-- Description: Add RLS policies that respect the new privacy column for public photo access

-- First, ensure the privacy columns exist (they should from previous migration)
ALTER TABLE trip_photos 
ADD COLUMN IF NOT EXISTS privacy TEXT DEFAULT 'private' CHECK (privacy IN ('private', 'public'));

ALTER TABLE trip_photos 
ADD COLUMN IF NOT EXISTS privacy_approved_at TIMESTAMP WITH TIME ZONE;

-- Drop existing policies to recreate them with privacy support
DROP POLICY IF EXISTS "Users can view photos for accessible trips" ON trip_photos;
DROP POLICY IF EXISTS "Users can view photos for their trips" ON storage.objects;

-- Updated RLS policy for trip_photos table that includes privacy checks
CREATE POLICY "Users can view photos for accessible trips with privacy" ON trip_photos
FOR SELECT USING (
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

-- Updated storage policy that includes privacy checks
CREATE POLICY "Users can view photos based on privacy settings" ON storage.objects
FOR SELECT USING (
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

-- Add policy for anonymous users to view public photos from public trips
CREATE POLICY "Anonymous users can view public photos from public trips" ON trip_photos
FOR SELECT USING (
    privacy = 'public'
    AND EXISTS (
        SELECT 1 FROM trips t 
        WHERE t.id = trip_photos.trip_id 
        AND t.privacy = 'public'
    )
);

-- Add storage policy for anonymous users to view public photos
CREATE POLICY "Anonymous users can view public photo files" ON storage.objects
FOR SELECT USING (
    bucket_id = 'trip-photos' 
    AND EXISTS (
        SELECT 1 FROM trip_photos tp
        JOIN trips t ON t.id = tp.trip_id
        WHERE tp.storage_path = name
        AND tp.privacy = 'public'
        AND t.privacy = 'public'
    )
);

-- Create index on privacy column for better performance
CREATE INDEX IF NOT EXISTS trip_photos_privacy_idx ON trip_photos(privacy);
CREATE INDEX IF NOT EXISTS trip_photos_privacy_trip_idx ON trip_photos(privacy, trip_id);