-- Debug migration - check existing table structure first
-- Run this to understand the current table structure

-- Check trips table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'trips' 
ORDER BY ordinal_position;

-- Check if we have any existing data
SELECT COUNT(*) as trip_count FROM trips;

-- Check first few rows to understand the data
SELECT id, name, user_id::text as user_id_as_text 
FROM trips 
LIMIT 5;