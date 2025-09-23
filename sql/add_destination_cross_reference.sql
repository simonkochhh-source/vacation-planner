-- Add cross-reference support for destination copies
-- This allows linking copied destinations to their original source
-- and enables shared photo collections between related destinations

-- Add column to track original destination for copies
ALTER TABLE destinations 
ADD COLUMN copied_from_id UUID REFERENCES destinations(id) ON DELETE SET NULL;

-- Add index for performance when querying copied destinations
CREATE INDEX idx_destinations_copied_from_id ON destinations(copied_from_id);

-- Add column to track if this destination is an original or copy
ALTER TABLE destinations 
ADD COLUMN is_original BOOLEAN DEFAULT true;

-- Update existing destinations to be marked as originals
UPDATE destinations SET is_original = true WHERE is_original IS NULL;

-- Make is_original column NOT NULL after setting defaults
ALTER TABLE destinations ALTER COLUMN is_original SET NOT NULL;

-- Add constraint to ensure copied destinations reference valid originals
ALTER TABLE destinations 
ADD CONSTRAINT check_copy_reference 
CHECK (
  (copied_from_id IS NULL AND is_original = true) OR 
  (copied_from_id IS NOT NULL AND is_original = false)
);

-- Create view for getting destination families (original + all copies)
CREATE OR REPLACE VIEW destination_families AS
WITH RECURSIVE destination_tree AS (
  -- Base case: Original destinations
  SELECT 
    id,
    id as original_id,
    copied_from_id,
    name,
    location,
    category,
    created_at,
    is_original,
    0 as depth
  FROM destinations 
  WHERE is_original = true
  
  UNION ALL
  
  -- Recursive case: Copies of destinations
  SELECT 
    d.id,
    dt.original_id,
    d.copied_from_id,
    d.name,
    d.location,
    d.category,
    d.created_at,
    d.is_original,
    dt.depth + 1
  FROM destinations d
  INNER JOIN destination_tree dt ON d.copied_from_id = dt.id
  WHERE d.is_original = false
)
SELECT * FROM destination_tree;

-- Create function to get all related destinations (for photo sharing)
CREATE OR REPLACE FUNCTION get_related_destinations(destination_id UUID)
RETURNS TABLE(
  id UUID,
  name VARCHAR,
  location VARCHAR,
  category VARCHAR,
  is_original BOOLEAN,
  trip_id UUID
) AS $$
BEGIN
  RETURN QUERY
  WITH destination_family AS (
    -- Get the original destination ID
    SELECT CASE 
      WHEN d.is_original THEN d.id 
      ELSE d.copied_from_id 
    END as original_id
    FROM destinations d 
    WHERE d.id = destination_id
  )
  SELECT 
    d.id,
    d.name,
    d.location,
    d.category::VARCHAR,
    d.is_original,
    td.trip_id
  FROM destinations d
  LEFT JOIN trip_destinations td ON td.destination_id = d.id
  WHERE 
    (d.is_original = true AND d.id = (SELECT original_id FROM destination_family)) OR
    (d.is_original = false AND d.copied_from_id = (SELECT original_id FROM destination_family));
END;
$$ LANGUAGE plpgsql;

-- Create function to get shared photo count for destination family
CREATE OR REPLACE FUNCTION get_destination_family_photo_count(destination_id UUID)
RETURNS INTEGER AS $$
DECLARE
  photo_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT p.id) INTO photo_count
  FROM photos p
  INNER JOIN get_related_destinations(destination_id) rd ON p.destination_id = rd.id;
  
  RETURN COALESCE(photo_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Add comment to table for documentation
COMMENT ON COLUMN destinations.copied_from_id IS 'References the original destination this was copied from. NULL for original destinations.';
COMMENT ON COLUMN destinations.is_original IS 'Indicates if this is an original destination (true) or a copy (false).';

-- Create trigger to automatically set is_original based on copied_from_id
CREATE OR REPLACE FUNCTION set_destination_original_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If copied_from_id is set, this is not an original
  IF NEW.copied_from_id IS NOT NULL THEN
    NEW.is_original := false;
  ELSE
    NEW.is_original := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_destination_original_status
  BEFORE INSERT OR UPDATE ON destinations
  FOR EACH ROW
  EXECUTE FUNCTION set_destination_original_status();

-- Grant necessary permissions
GRANT SELECT ON destination_families TO authenticated;
GRANT EXECUTE ON FUNCTION get_related_destinations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_destination_family_photo_count(UUID) TO authenticated;