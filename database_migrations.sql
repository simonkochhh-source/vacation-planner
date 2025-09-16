-- Add user_id columns to existing tables for multi-user support
-- Run these SQL commands in your Supabase SQL Editor

-- 1. Add user_id column to trips table
ALTER TABLE trips 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Add user_id column to destinations table  
ALTER TABLE destinations
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_destinations_user_id ON destinations(user_id);
CREATE INDEX IF NOT EXISTS idx_destinations_trip_user ON destinations(trip_id, user_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for trips table
-- Users can only see their own trips
CREATE POLICY "Users can view own trips" ON trips
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own trips  
CREATE POLICY "Users can insert own trips" ON trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own trips
CREATE POLICY "Users can update own trips" ON trips
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own trips
CREATE POLICY "Users can delete own trips" ON trips
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Create RLS policies for destinations table
-- Users can only see destinations from their own trips
CREATE POLICY "Users can view own destinations" ON destinations
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert destinations to their own trips
CREATE POLICY "Users can insert own destinations" ON destinations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own destinations
CREATE POLICY "Users can update own destinations" ON destinations
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own destinations
CREATE POLICY "Users can delete own destinations" ON destinations
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Create a function to automatically set user_id on insert
CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create triggers to automatically set user_id
CREATE TRIGGER set_trips_user_id
  BEFORE INSERT ON trips
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_destinations_user_id
  BEFORE INSERT ON destinations  
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

-- 9. For existing data in demo mode, update with a placeholder user ID
-- (This will be overwritten when real users start using the system)
-- UPDATE trips SET user_id = 'demo-user-placeholder' WHERE user_id IS NULL;
-- UPDATE destinations SET user_id = 'demo-user-placeholder' WHERE user_id IS NULL;

COMMENT ON COLUMN trips.user_id IS 'References the authenticated user who owns this trip';
COMMENT ON COLUMN destinations.user_id IS 'References the authenticated user who owns this destination';