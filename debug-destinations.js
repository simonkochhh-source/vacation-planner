// Debug script to test destination loading
console.log('🔍 Testing destination loading...');

// Test direct Supabase query
import { supabase } from './src/lib/supabase.js';

console.log('📋 Testing direct Supabase query...');
const testDirectQuery = async () => {
  try {
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log('✅ Direct Supabase query result:', { data, error });
    console.log('📊 Data length:', data?.length);
    
    if (data && data.length > 0) {
      console.log('🎯 First destination:', data[0]);
    }
  } catch (err) {
    console.error('❌ Direct query error:', err);
  }
};

// Test SupabaseService
console.log('🛠️ Testing SupabaseService...');
const testSupabaseService = async () => {
  try {
    // Import SupabaseService dynamically
    const { SupabaseService } = await import('./src/services/supabaseService.js');
    const destinations = await SupabaseService.getDestinations();
    
    console.log('✅ SupabaseService result:', destinations);
    console.log('📊 Destinations length:', destinations?.length);
    console.log('📊 Is array:', Array.isArray(destinations));
    
    if (destinations && destinations.length > 0) {
      console.log('🎯 First destination from service:', destinations[0]);
    }
  } catch (err) {
    console.error('❌ SupabaseService error:', err);
  }
};

// Run tests
testDirectQuery();
testSupabaseService();