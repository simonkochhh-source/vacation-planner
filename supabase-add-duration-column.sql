-- Add duration column to destinations table
-- Duration is in minutes and represents how long a visitor typically spends at the destination

ALTER TABLE destinations ADD COLUMN IF NOT EXISTS duration INTEGER;

-- Add comment to explain the column
COMMENT ON COLUMN destinations.duration IS 'Duration in minutes for visiting this destination';

-- Optional: Set a default value for existing records (2 hours = 120 minutes)
UPDATE destinations 
SET duration = 120 
WHERE duration IS NULL;

-- Optional: Add a check constraint to ensure reasonable values (1 minute to 7 days)
ALTER TABLE destinations ADD CONSTRAINT check_duration_range 
CHECK (duration IS NULL OR (duration >= 1 AND duration <= 10080));