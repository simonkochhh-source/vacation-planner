-- Step 1: Add user_id columns to tables
-- Run this in Supabase SQL Editor

-- First, check current table structure
\d trips;
\d destinations;

-- Add user_id column to trips table
ALTER TABLE trips 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Add user_id column to destinations table  
ALTER TABLE destinations 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Verify columns were added
\d trips;
\d destinations;