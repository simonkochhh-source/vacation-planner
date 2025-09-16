-- Simple schema for vacation planner
-- Run this in Supabase SQL Editor: https://hvyqkvgsjdojjbfxtlnz.supabase.co/project/default/sql/new

-- Create trips table
CREATE TABLE IF NOT EXISTS trips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    budget DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'planned',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create destinations table
CREATE TABLE IF NOT EXISTS destinations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    category VARCHAR(50) DEFAULT 'sightseeing',
    status VARCHAR(20) DEFAULT 'planned',
    priority INTEGER DEFAULT 1,
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    start_date DATE,
    end_date DATE,
    sort_order INTEGER DEFAULT 0,
    notes TEXT,
    photos TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_destinations_trip_id ON destinations(trip_id);
CREATE INDEX IF NOT EXISTS idx_destinations_sort_order ON destinations(sort_order);

-- Insert sample data
INSERT INTO trips (name, description, start_date, end_date, budget, status) VALUES 
('Italien Rundreise 2024', 'Eine wundervolle Reise durch Italien mit den wichtigsten Sehenswürdigkeiten', '2024-06-15', '2024-06-30', 2500.00, 'planned'),
('Städtetrip Barcelona', 'Kurzer Städtetrip nach Barcelona', '2024-04-20', '2024-04-25', 800.00, 'completed');

-- Insert sample destinations (using subqueries to get trip IDs)
INSERT INTO destinations (trip_id, name, location, category, status, priority, estimated_cost, sort_order, notes) 
SELECT 
  t.id,
  'Kolosseum Rom',
  'Rom, Italien',
  'sightseeing',
  'planned',
  5,
  25.00,
  1,
  'Das berühmte römische Amphitheater'
FROM trips t WHERE t.name = 'Italien Rundreise 2024';

INSERT INTO destinations (trip_id, name, location, category, status, priority, estimated_cost, sort_order, notes) 
SELECT 
  t.id,
  'Vatikanische Museen',
  'Vatikanstadt',
  'sightseeing',
  'planned',
  4,
  30.00,
  2,
  'Besichtigung der päpstlichen Kunstsammlung'
FROM trips t WHERE t.name = 'Italien Rundreise 2024';

INSERT INTO destinations (trip_id, name, location, category, status, priority, estimated_cost, sort_order, notes) 
SELECT 
  t.id,
  'Trevi-Brunnen',
  'Rom, Italien',
  'sightseeing',
  'planned',
  3,
  0.00,
  3,
  'Der berühmte Barockbrunnen in Rom'
FROM trips t WHERE t.name = 'Italien Rundreise 2024';

INSERT INTO destinations (trip_id, name, location, category, status, priority, estimated_cost, sort_order, notes) 
SELECT 
  t.id,
  'Sagrada Familia',
  'Barcelona, Spanien',
  'sightseeing',
  'visited',
  5,
  26.00,
  1,
  'Antoni Gaudís unvollendetes Meisterwerk'
FROM trips t WHERE t.name = 'Städtetrip Barcelona';

INSERT INTO destinations (trip_id, name, location, category, status, priority, estimated_cost, sort_order, notes) 
SELECT 
  t.id,
  'Park Güell',
  'Barcelona, Spanien',
  'sightseeing',
  'visited',
  4,
  10.00,
  2,
  'Gaudís farbenfroher Park'
FROM trips t WHERE t.name = 'Städtetrip Barcelona';