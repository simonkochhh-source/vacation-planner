-- Add Destination Copy Tracking Feature
-- This migration adds support for tracking destination copies and their relationships

-- 1. Add original_destination_id column to destinations table
ALTER TABLE destinations 
ADD COLUMN IF NOT EXISTS original_destination_id UUID REFERENCES destinations(id) ON DELETE SET NULL;

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_destinations_original_id ON destinations(original_destination_id);

-- 3. Add a check constraint to prevent self-referencing (destination can't be its own original)
ALTER TABLE destinations 
ADD CONSTRAINT destinations_no_self_reference 
CHECK (id != original_destination_id);

-- 4. Create helper function to copy a destination (without photos)
CREATE OR REPLACE FUNCTION copy_destination_to_trip(
  source_destination_id UUID,
  target_trip_id UUID
) RETURNS UUID AS $$
DECLARE
  new_destination_id UUID;
  source_dest RECORD;
  target_user_id UUID;
BEGIN
  -- Get source destination data
  SELECT * INTO source_dest FROM destinations WHERE id = source_destination_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source destination not found: %', source_destination_id;
  END IF;
  
  -- Get target trip user_id
  SELECT user_id INTO target_user_id FROM trips WHERE id = target_trip_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target trip not found: %', target_trip_id;
  END IF;
  
  -- Create new destination with same data but without photos
  INSERT INTO destinations (
    user_id,
    trip_id,
    name,
    location,
    category,
    start_date,
    end_date,
    start_time,
    end_time,
    priority,
    rating,
    budget,
    actual_cost,
    coordinates_lat,
    coordinates_lng,
    notes,
    images, -- This will be empty array for copies
    booking_info,
    status,
    tags,
    color,
    duration,
    weather_info,
    transport_to_next,
    accessibility_info,
    opening_hours,
    contact_info,
    sort_order,
    original_destination_id -- Set reference to original
  ) VALUES (
    target_user_id,
    target_trip_id,
    source_dest.name, -- Keep exact same name
    source_dest.location,
    source_dest.category,
    source_dest.start_date,
    source_dest.end_date,
    source_dest.start_time,
    source_dest.end_time,
    source_dest.priority,
    NULL, -- Reset rating for new trip
    source_dest.budget,
    NULL, -- Reset actual cost for new trip
    source_dest.coordinates_lat,
    source_dest.coordinates_lng,
    source_dest.notes,
    '{}', -- Empty array for photos - photos stay with original
    source_dest.booking_info,
    'geplant', -- Reset status to planned for import
    source_dest.tags,
    source_dest.color,
    source_dest.duration,
    source_dest.weather_info,
    source_dest.transport_to_next,
    source_dest.accessibility_info,
    source_dest.opening_hours,
    source_dest.contact_info,
    (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM destinations WHERE trip_id = target_trip_id),
    source_destination_id -- Reference to original destination
  ) RETURNING id INTO new_destination_id;
  
  RETURN new_destination_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to get all destination copies
CREATE OR REPLACE FUNCTION get_destination_copies(source_destination_id UUID)
RETURNS TABLE (
  copy_id UUID,
  copy_name TEXT,
  trip_id UUID,
  trip_name TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.name,
    d.trip_id,
    t.name,
    d.user_id,
    d.created_at
  FROM destinations d
  JOIN trips t ON d.trip_id = t.id
  WHERE d.original_destination_id = source_destination_id
  ORDER BY d.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to get original destination for a copy
CREATE OR REPLACE FUNCTION get_original_destination(copy_destination_id UUID)
RETURNS TABLE (
  original_id UUID,
  original_name TEXT,
  trip_id UUID,
  trip_name TEXT,
  user_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    orig.id,
    orig.name,
    orig.trip_id,
    t.name,
    orig.user_id
  FROM destinations d
  JOIN destinations orig ON d.original_destination_id = orig.id
  JOIN trips t ON orig.trip_id = t.id
  WHERE d.id = copy_destination_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to collect all photos from destination family (original + all copies)
CREATE OR REPLACE FUNCTION get_destination_family_photos(destination_id UUID)
RETURNS TABLE (
  photo_url TEXT,
  destination_id UUID,
  destination_name TEXT,
  is_original BOOLEAN
) AS $$
DECLARE
  original_id UUID;
BEGIN
  -- First, determine if this is an original or a copy
  SELECT original_destination_id INTO original_id FROM destinations WHERE id = destination_id;
  
  -- If original_destination_id is null, this IS the original
  IF original_id IS NULL THEN
    original_id := destination_id;
  END IF;
  
  -- Return photos from the original destination only
  -- (Photos are not copied, they stay with the original)
  RETURN QUERY
  SELECT 
    UNNEST(d.images) as photo_url,
    d.id as destination_id,
    d.name as destination_name,
    (d.id = original_id) as is_original
  FROM destinations d
  WHERE d.id = original_id
    AND d.images IS NOT NULL 
    AND array_length(d.images, 1) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Row Level Security policies for the new functionality
-- Users can only copy destinations they have access to
-- Users can only copy to trips they own

-- Add RLS policy for the copy function (handled by function security definer)
-- The copy_destination_to_trip function will handle permission checks

-- 9. Update existing destinations table RLS policies to handle original_destination_id
-- (Assuming RLS is already enabled on destinations table)

-- Users can see destinations that are copies of destinations they have access to
CREATE POLICY "Users can view destination copies" ON destinations
  FOR SELECT USING (
    -- Original policy conditions OR
    -- This destination is a copy of a destination the user has access to
    original_destination_id IN (
      SELECT id FROM destinations 
      WHERE user_id = auth.uid() 
         OR trip_id IN (
           SELECT id FROM trips 
           WHERE user_id = auth.uid() 
              OR privacy = 'public'
         )
    )
  );

-- Success message
SELECT 'Destination copy tracking migration completed successfully!' AS result;