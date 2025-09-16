// Direct database setup using Supabase client
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey ? '***' + supabaseKey.slice(-4) : 'NOT SET');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertSampleData() {
  console.log('🚀 Starting database setup...');
  
  try {
    // First, try to insert a sample trip
    console.log('📝 Inserting sample trip...');
    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .insert([
        {
          name: 'Italien Rundreise 2024',
          description: 'Eine wundervolle Reise durch Italien mit den wichtigsten Sehenswürdigkeiten',
          start_date: '2024-06-15',
          end_date: '2024-06-30',
          budget: 2500.00,
          status: 'planned'
        }
      ])
      .select()
      .single();

    if (tripError) {
      console.error('❌ Error inserting trip:', tripError.message);
      console.log('💡 This likely means the trips table doesn\'t exist yet.');
      console.log('🔧 Please create the tables manually in Supabase dashboard first.');
      return false;
    }

    console.log('✅ Sample trip inserted:', tripData.name);

    // Insert sample destinations
    console.log('📍 Inserting sample destinations...');
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
          sort_order: 1,
          notes: 'Das berühmte römische Amphitheater'
        },
        {
          trip_id: tripData.id,
          name: 'Vatikanische Museen',
          location: 'Vatikanstadt',
          category: 'sightseeing', 
          status: 'planned',
          priority: 4,
          estimated_cost: 30.00,
          sort_order: 2,
          notes: 'Besichtigung der päpstlichen Kunstsammlung'
        },
        {
          trip_id: tripData.id,
          name: 'Trevi-Brunnen',
          location: 'Rom, Italien',
          category: 'sightseeing',
          status: 'planned',
          priority: 3,
          estimated_cost: 0.00,
          sort_order: 3,
          notes: 'Der berühmte Barockbrunnen in Rom'
        }
      ]);

    if (destError) {
      console.error('❌ Error inserting destinations:', destError.message);
      return false;
    }

    console.log('✅ Sample destinations inserted');
    
    // Test data retrieval
    console.log('🔍 Testing data retrieval...');
    const { data: trips, error: getError } = await supabase
      .from('trips')
      .select('*, destinations(*)')
      .limit(5);

    if (getError) {
      console.error('❌ Error retrieving data:', getError.message);
      return false;
    }

    console.log('✅ Data retrieval successful!');
    console.log('📊 Found', trips.length, 'trips');
    trips.forEach(trip => {
      console.log(`   - ${trip.name} (${trip.destinations?.length || 0} destinations)`);
    });

    return true;

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return false;
  }
}

async function main() {
  const success = await insertSampleData();
  if (success) {
    console.log('🎉 Database setup completed successfully!');
  } else {
    console.log('❌ Database setup failed. Please check the console output above.');
  }
}

main();