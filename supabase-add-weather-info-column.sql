-- Add weather_info column to destinations table
-- This field stores weather information for the destination

ALTER TABLE destinations ADD COLUMN IF NOT EXISTS weather_info JSONB;

-- Add comment to explain the column
COMMENT ON COLUMN destinations.weather_info IS 'Weather information for this destination (JSON format)';

-- Optional: Set a default value for existing records
UPDATE destinations 
SET weather_info = NULL
WHERE weather_info IS NULL;