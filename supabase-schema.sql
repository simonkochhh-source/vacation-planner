-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE destination_category AS ENUM (
  'restaurant',
  'museum', 
  'sehenswuerdigkeit',
  'hotel',
  'aktivitaet',
  'transport',
  'shopping',
  'nachtleben',
  'natur',
  'kultur',
  'sport',
  'wellness',
  'business',
  'sonstiges'
);

CREATE TYPE destination_status AS ENUM (
  'geplant',
  'besucht', 
  'uebersprungen',
  'in_bearbeitung'
);

CREATE TYPE trip_status AS ENUM (
  'geplant',
  'aktiv',
  'abgeschlossen',
  'storniert'
);

-- Create trips table
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget DECIMAL(10,2),
  participants TEXT[],
  status trip_status DEFAULT 'geplant',
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT trips_end_date_after_start CHECK (end_date >= start_date),
  CONSTRAINT trips_budget_positive CHECK (budget IS NULL OR budget >= 0)
);

-- Create destinations table
CREATE TABLE destinations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(200) NOT NULL,
  category destination_category NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  priority INTEGER DEFAULT 1,
  rating INTEGER,
  budget DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  coordinates_lat DECIMAL(10, 8),
  coordinates_lng DECIMAL(11, 8),
  notes TEXT,
  images TEXT[],
  booking_info TEXT,
  status destination_status DEFAULT 'geplant',
  tags TEXT[],
  color VARCHAR(7), -- Hex color code
  duration INTEGER, -- Duration in minutes
  weather_info JSONB,
  transport_to_next JSONB,
  accessibility_info TEXT,
  opening_hours JSONB,
  contact_info JSONB,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT destinations_end_date_after_start CHECK (end_date >= start_date),
  CONSTRAINT destinations_budget_positive CHECK (budget IS NULL OR budget >= 0),
  CONSTRAINT destinations_actual_cost_positive CHECK (actual_cost IS NULL OR actual_cost >= 0),
  CONSTRAINT destinations_priority_valid CHECK (priority >= 1 AND priority <= 5),
  CONSTRAINT destinations_rating_valid CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  CONSTRAINT destinations_coordinates_valid CHECK (
    (coordinates_lat IS NULL AND coordinates_lng IS NULL) OR 
    (coordinates_lat IS NOT NULL AND coordinates_lng IS NOT NULL AND
     coordinates_lat >= -90 AND coordinates_lat <= 90 AND
     coordinates_lng >= -180 AND coordinates_lng <= 180)
  ),
  CONSTRAINT destinations_color_valid CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT destinations_duration_positive CHECK (duration IS NULL OR duration > 0)
);

-- Create indexes for performance
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_dates ON trips(start_date, end_date);
CREATE INDEX idx_destinations_trip_id ON destinations(trip_id);
CREATE INDEX idx_destinations_status ON destinations(status);
CREATE INDEX idx_destinations_category ON destinations(category);
CREATE INDEX idx_destinations_dates ON destinations(start_date, end_date);
CREATE INDEX idx_destinations_coordinates ON destinations(coordinates_lat, coordinates_lng);
CREATE INDEX idx_destinations_sort_order ON destinations(sort_order);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_trips_updated_at 
  BEFORE UPDATE ON trips 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_destinations_updated_at 
  BEFORE UPDATE ON destinations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) - Enable for future user authentication
-- ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;

-- Sample data for testing
INSERT INTO trips (name, description, start_date, end_date, budget) VALUES 
('Berlin Städtereise', 'Wochenendtrip nach Berlin', '2024-03-15', '2024-03-17', 500.00);

-- Get the trip ID for sample destinations
INSERT INTO destinations (
  trip_id, name, location, category, start_date, end_date, 
  start_time, end_time, priority, budget, coordinates_lat, coordinates_lng,
  notes, tags, color
) VALUES (
  (SELECT id FROM trips WHERE name = 'Berlin Städtereise' LIMIT 1),
  'Brandenburger Tor', 
  'Pariser Platz, 10117 Berlin', 
  'sehenswuerdigkeit',
  '2024-03-15',
  '2024-03-15',
  '10:00',
  '11:00',
  5,
  0,
  52.5162746,
  13.3777041,
  'Historisches Wahrzeichen Berlins',
  ARRAY['geschichte', 'wahrzeichen'],
  '#2563eb'
);