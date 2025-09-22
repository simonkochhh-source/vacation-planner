-- Migration: Add photo storage support
-- Description: Creates photos table and storage bucket for trip photos

-- Create photos table
CREATE TABLE IF NOT EXISTS trip_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    destination_id UUID NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
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
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX trip_photos_trip_id_idx ON trip_photos(trip_id);
CREATE INDEX trip_photos_destination_id_idx ON trip_photos(destination_id);
CREATE INDEX trip_photos_user_id_idx ON trip_photos(user_id);
CREATE INDEX trip_photos_taken_at_idx ON trip_photos(taken_at);

-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('trip-photos', 'trip-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for trip photos
CREATE POLICY "Users can upload photos for their trips" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'trip-photos' 
    AND auth.uid()::text = split_part(name, '/', 1)
);

CREATE POLICY "Users can view photos for their trips" ON storage.objects
FOR SELECT USING (
    bucket_id = 'trip-photos' 
    AND (
        auth.uid()::text = split_part(name, '/', 1)
        OR EXISTS (
            SELECT 1 FROM trips t 
            WHERE t.id = split_part(name, '/', 2)::uuid
            AND (t.privacy = 'public' OR t.owner_id = auth.uid()::uuid OR auth.uid()::uuid = ANY(t.tagged_users))
        )
    )
);

CREATE POLICY "Users can delete their own photos" ON storage.objects
FOR DELETE USING (
    bucket_id = 'trip-photos' 
    AND auth.uid()::text = split_part(name, '/', 1)
);

-- RLS policies for trip_photos table
ALTER TABLE trip_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view photos for accessible trips" ON trip_photos
FOR SELECT USING (
    user_id = auth.uid()::uuid
    OR EXISTS (
        SELECT 1 FROM trips t 
        WHERE t.id = trip_photos.trip_id 
        AND (t.privacy = 'public' OR t.owner_id = auth.uid()::uuid OR auth.uid()::uuid = ANY(t.tagged_users))
    )
);

CREATE POLICY "Users can insert photos for their trips" ON trip_photos
FOR INSERT WITH CHECK (
    user_id = auth.uid()::uuid
    AND EXISTS (
        SELECT 1 FROM trips t 
        WHERE t.id = trip_photos.trip_id 
        AND (t.owner_id = auth.uid()::uuid OR auth.uid()::uuid = ANY(t.tagged_users))
    )
);

CREATE POLICY "Users can update their own photos" ON trip_photos
FOR UPDATE USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can delete their own photos" ON trip_photos
FOR DELETE USING (user_id = auth.uid()::uuid);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trip_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_trip_photos_updated_at
    BEFORE UPDATE ON trip_photos
    FOR EACH ROW
    EXECUTE FUNCTION update_trip_photos_updated_at();