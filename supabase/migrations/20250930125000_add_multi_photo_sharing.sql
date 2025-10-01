-- Extend Photo Sharing for Multi-Photo Posts
-- Allow multiple photos per share with carousel functionality

-- Add photos array to photo_shares table
ALTER TABLE photo_shares 
ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS photo_count INTEGER DEFAULT 1;

-- Update existing single photo_url entries to photos array
UPDATE photo_shares 
SET 
    photos = jsonb_build_array(jsonb_build_object('url', photo_url, 'order', 0)),
    photo_count = 1
WHERE photos = '[]'::jsonb AND photo_url IS NOT NULL;

-- Create index for photos array
CREATE INDEX IF NOT EXISTS idx_photo_shares_photos ON photo_shares USING GIN (photos);
CREATE INDEX IF NOT EXISTS idx_photo_shares_photo_count ON photo_shares(photo_count);

-- Update view to include photo array data
DROP VIEW IF EXISTS photo_shares_with_details;
CREATE VIEW photo_shares_with_details AS
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

-- Add comment
COMMENT ON COLUMN photo_shares.photos IS 'Array of photo objects with url and order: [{"url": "...", "order": 0, "caption": "..."}]';
COMMENT ON COLUMN photo_shares.photo_count IS 'Number of photos in this share for quick filtering';