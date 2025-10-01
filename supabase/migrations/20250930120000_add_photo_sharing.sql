-- Add Photo Sharing Feature
-- Creates tables for shared photos, likes, and enhanced activity tracking

-- Create photo_shares table
CREATE TABLE IF NOT EXISTS photo_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    caption TEXT,
    privacy VARCHAR(20) NOT NULL DEFAULT 'public' CHECK (privacy IN ('public', 'contacts', 'private')),
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create photo_likes table
CREATE TABLE IF NOT EXISTS photo_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_share_id UUID NOT NULL REFERENCES photo_shares(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Prevent duplicate likes
    UNIQUE(photo_share_id, user_id),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_photo_shares_user_id ON photo_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_shares_trip_id ON photo_shares(trip_id);
CREATE INDEX IF NOT EXISTS idx_photo_shares_destination_id ON photo_shares(destination_id);
CREATE INDEX IF NOT EXISTS idx_photo_shares_created_at ON photo_shares(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_shares_privacy ON photo_shares(privacy);

CREATE INDEX IF NOT EXISTS idx_photo_likes_photo_share_id ON photo_likes(photo_share_id);
CREATE INDEX IF NOT EXISTS idx_photo_likes_user_id ON photo_likes(user_id);

-- Create updated_at trigger for photo_shares
CREATE OR REPLACE FUNCTION update_photo_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER photo_shares_updated_at
    BEFORE UPDATE ON photo_shares
    FOR EACH ROW
    EXECUTE FUNCTION update_photo_shares_updated_at();

-- Enable RLS
ALTER TABLE photo_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_likes ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies for photo_shares (avoiding complex joins for now)
CREATE POLICY "Users can view public photo shares" ON photo_shares
    FOR SELECT USING (privacy = 'public' OR auth.uid() = user_id);

CREATE POLICY "Users can create their own photo shares" ON photo_shares
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own photo shares" ON photo_shares
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photo shares" ON photo_shares
    FOR DELETE USING (auth.uid() = user_id);

-- Simple RLS Policies for photo_likes
CREATE POLICY "Users can view likes on visible photos" ON photo_likes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM photo_shares ps 
            WHERE ps.id = photo_likes.photo_share_id
            AND (ps.privacy = 'public' OR auth.uid() = ps.user_id)
        )
    );

CREATE POLICY "Users can like visible photos" ON photo_likes
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM photo_shares ps 
            WHERE ps.id = photo_likes.photo_share_id
            AND (ps.privacy = 'public' OR auth.uid() = ps.user_id)
        )
    );

CREATE POLICY "Users can remove their own likes" ON photo_likes
    FOR DELETE USING (auth.uid() = user_id);

-- Create view for photo shares with aggregated data
CREATE OR REPLACE VIEW photo_shares_with_details AS
SELECT 
    ps.*,
    up.nickname as user_nickname,
    up.display_name as user_display_name,
    up.avatar_url as user_avatar_url,
    t.name as trip_name,
    d.name as destination_name,
    d.location as destination_location,
    CASE 
        WHEN d.latitude IS NOT NULL AND d.longitude IS NOT NULL 
        THEN jsonb_build_object('lat', d.latitude, 'lng', d.longitude)
        ELSE NULL 
    END as destination_coordinates,
    COUNT(pl.id) as like_count,
    EXISTS(SELECT 1 FROM photo_likes pl2 WHERE pl2.photo_share_id = ps.id AND pl2.user_id = auth.uid()) as user_liked
FROM photo_shares ps
LEFT JOIN user_profiles up ON ps.user_id = up.id
LEFT JOIN trips t ON ps.trip_id = t.id
LEFT JOIN destinations d ON ps.destination_id = d.id
LEFT JOIN photo_likes pl ON ps.id = pl.photo_share_id
GROUP BY ps.id, up.nickname, up.display_name, up.avatar_url, t.name, d.name, d.location, d.latitude, d.longitude;

COMMENT ON TABLE photo_shares IS 'Stores shared photos from trips/destinations';
COMMENT ON TABLE photo_likes IS 'Stores likes on shared photos';
COMMENT ON VIEW photo_shares_with_details IS 'Photo shares with user, trip, destination details and like counts';