const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://kyzbtkkprvegzgzrlhez.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5emJ0a2twcnZlZ3pnenJsaGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NTk4MTksImV4cCI6MjA3MzQzNTgxOX0.7povQC7Tf_8yeREtFscs9uc1ddpq5NsSP4llruueAm8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDestinationsDisplay() {
  console.log('🔍 Debugging destinations display issue...');
  
  try {
    // 1. Check current RLS policies
    console.log('\n1. Checking current RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'destinations');
    
    if (policiesError) {
      console.error('❌ Failed to get policies:', policiesError);
    } else {
      console.log('✅ Current policies:', policies?.map(p => p.policyname));
    }

    // 2. Test destinations query without auth (to see raw data)
    console.log('\n2. Testing raw destinations query...');
    const { data: rawDestinations, error: rawError } = await supabase
      .from('destinations')
      .select('*')
      .limit(5);
    
    if (rawError) {
      console.error('❌ Raw query failed:', rawError);
    } else {
      console.log('✅ Raw destinations found:', rawDestinations?.length || 0);
      if (rawDestinations && rawDestinations.length > 0) {
        console.log('Sample destination:', {
          id: rawDestinations[0].id,
          name: rawDestinations[0].name,
          user_id: rawDestinations[0].user_id,
          trip_id: rawDestinations[0].trip_id
        });
      }
    }

    // 3. Test the specific trip query that might be used
    console.log('\n3. Testing trip-specific destinations query...');
    const tripId = '9df143b4-9390-4cfc-8c49-df83adf8be8';
    const { data: tripDestinations, error: tripError } = await supabase
      .from('destinations')
      .select('*')
      .eq('trip_id', tripId);
    
    if (tripError) {
      console.error('❌ Trip query failed:', tripError);
    } else {
      console.log('✅ Trip destinations found:', tripDestinations?.length || 0);
    }

    // 4. Check if RLS is enabled
    console.log('\n4. Checking RLS status...');
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: 'destinations' })
      .single();
    
    if (tableError) {
      console.log('ℹ️ Could not get table info (function might not exist)');
    } else {
      console.log('Table info:', tableInfo);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugDestinationsDisplay();