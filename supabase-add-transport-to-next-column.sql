-- Add transport_to_next column to destinations table
-- This field stores information about how to get to the next destination

ALTER TABLE destinations ADD COLUMN IF NOT EXISTS transport_to_next JSONB;

-- Add comment to explain the column
COMMENT ON COLUMN destinations.transport_to_next IS 'Transportation information to next destination (JSON format)';

-- Optional: Set a default value for existing records
UPDATE destinations 
SET transport_to_next = NULL
WHERE transport_to_next IS NULL;