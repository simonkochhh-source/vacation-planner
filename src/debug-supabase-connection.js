// Direct test of Supabase connection - run this in browser console

console.log('🧪 Testing Supabase connection directly...');

// Check environment variables
console.log('Environment check:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL);
console.log('- Has ANON_KEY:', !!process.env.REACT_APP_SUPABASE_ANON_KEY);

// Import Supabase client directly
import { supabase } from './lib/supabase';

console.log('Testing Supabase client...');

// Test connection with simple query
async function testSupabaseConnection() {
  try {
    console.log('🔍 Testing basic connection...');
    
    // Test 1: Check if client is created
    console.log('Supabase client created:', !!supabase);
    
    // Test 2: Try to query trips table
    const { data, error, count } = await supabase
      .from('trips')
      .select('*', { count: 'exact' });
    
    if (error) {
      console.error('❌ Query error:', error);
      return false;
    }
    
    console.log('✅ Query successful!');
    console.log('- Data:', data);
    console.log('- Count:', count);
    console.log('- Found trips:', data?.length || 0);
    
    // Test 3: Try to create a test destination
    console.log('🧪 Testing destination creation...');
    
    const testDestination = {
      trip_id: null, // This should cause an error if trip_id is required
      name: 'Direct Test Restaurant',
      location: 'Berlin, Germany',
      category: 'restaurant',
      start_date: '2025-01-15',
      end_date: '2025-01-15',
      status: 'planned'
    };
    
    const { data: destData, error: destError } = await supabase
      .from('destinations')
      .insert(testDestination)
      .select()
      .single();
    
    if (destError) {
      console.error('❌ Destination creation error:', destError);
      console.error('This might explain why destinations are not being created!');
    } else {
      console.log('✅ Destination created successfully:', destData);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return false;
  }
}

// Run the test
testSupabaseConnection();