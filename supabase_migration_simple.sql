-- Simple migration to add privacy system columns to trips table
-- Execute this in Supabase SQL Editor if the full migration is too complex

-- Add missing columns to trips table
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS privacy TEXT DEFAULT 'private' CHECK (privacy IN ('private', 'public')),
ADD COLUMN IF NOT EXISTS owner_id UUID,
ADD COLUMN IF NOT EXISTS tagged_users TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Update existing trips to have owner_id set to user_id if not already set
-- Cast user_id to UUID type to avoid type mismatch errors
UPDATE trips 
SET owner_id = user_id::UUID 
WHERE owner_id IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trips_privacy ON trips(privacy);
CREATE INDEX IF NOT EXISTS idx_trips_owner_id ON trips(owner_id);