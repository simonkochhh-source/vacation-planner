// Script to create Supabase database schema
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_ANON_KEY; // In production use SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSchema() {
  console.log('Creating database schema...');
  
  // Create trips table
  const { error: tripsError } = await supabase.rpc('exec_sql', {
    sql: `
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
    `
  });
  
  if (tripsError) {
    console.error('Error creating trips table:', tripsError);
  } else {
    console.log('✓ Trips table created');
  }

  // Create destinations table  
  const { error: destError } = await supabase.rpc('exec_sql', {
    sql: `
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
    `
  });

  if (destError) {
    console.error('Error creating destinations table:', destError);
  } else {
    console.log('✓ Destinations table created');
  }
}

async function insertSampleData() {
  console.log('Inserting sample data...');
  
  // Insert sample trip
  const { data: tripData, error: tripError } = await supabase
    .from('trips')
    .insert([
      {
        name: 'Italien Rundreise 2024',
        description: 'Eine wundervolle Reise durch Italien',
        start_date: '2024-06-15',
        end_date: '2024-06-30',
        budget: 2500.00,
        status: 'planned'
      }
    ])
    .select()
    .single();

  if (tripError) {
    console.error('Error inserting trip:', tripError);
    return;
  }

  console.log('✓ Sample trip inserted:', tripData.name);

  // Insert sample destinations
  const { error: destError } = await supabase
    .from('destinations')
    .insert([
      {
        trip_id: tripData.id,
        name: 'Kolosseum Rom',
        location: 'Rom, Italien',
        category: 'sightseeing',
        status: 'planned',
        priority: 5,
        estimated_cost: 25.00,
        sort_order: 1
      },
      {
        trip_id: tripData.id,
        name: 'Vatikanische Museen',
        location: 'Vatikanstadt',
        category: 'sightseeing', 
        status: 'planned',
        priority: 4,
        estimated_cost: 30.00,
        sort_order: 2
      }
    ]);

  if (destError) {
    console.error('Error inserting destinations:', destError);
  } else {
    console.log('✓ Sample destinations inserted');
  }
}

async function main() {
  try {
    await createSchema();
    await insertSampleData();
    console.log('✅ Database setup completed!');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
  }
}

main();