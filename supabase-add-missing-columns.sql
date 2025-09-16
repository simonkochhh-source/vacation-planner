-- Add all missing columns to destinations table
-- This script adds all the columns that are used in the app but missing from the database

-- Add weather_info column
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS weather_info JSONB;
COMMENT ON COLUMN destinations.weather_info IS 'Weather information for this destination (JSON format)';

-- Add transport_to_next column  
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS transport_to_next JSONB;
COMMENT ON COLUMN destinations.transport_to_next IS 'Transportation information to next destination (JSON format)';

-- Add duration column (in minutes)
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS duration INTEGER;
COMMENT ON COLUMN destinations.duration IS 'Duration in minutes for visiting this destination';

-- Add opening_hours column
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS opening_hours TEXT;
COMMENT ON COLUMN destinations.opening_hours IS 'Opening hours information for this destination';

-- Add priority column
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;
COMMENT ON COLUMN destinations.priority IS 'Priority level for this destination (1-5)';

-- Add rating column
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1);
COMMENT ON COLUMN destinations.rating IS 'User rating for this destination (1.0-5.0)';

-- Add accessibility_info column
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS accessibility_info TEXT;
COMMENT ON COLUMN destinations.accessibility_info IS 'Accessibility information for this destination';

-- Add contact_info column
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS contact_info JSONB;
COMMENT ON COLUMN destinations.contact_info IS 'Contact information for this destination (JSON format)';

-- Set default values for existing records
UPDATE destinations 
SET 
    weather_info = NULL,
    transport_to_next = NULL,
    duration = 120,
    opening_hours = NULL,
    priority = 1,
    rating = NULL,
    accessibility_info = NULL,
    contact_info = NULL
WHERE duration IS NULL;