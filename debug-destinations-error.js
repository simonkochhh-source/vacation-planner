const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://kyzbtkkprvegzgzrlhez.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5emJ0a2twcnZlZ3pnenJsaGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NTk4MTksImV4cCI6MjA3MzQzNTgxOX0.7povQC7Tf_8yeREtFscs9uc1ddpq5NsSP4llruueAm8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDestinationsError() {
  console.log('🔍 Debugging destinations query error...');
  
  try {
    // Test basic connection
    console.log('\n1. Testing basic Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('destinations')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Basic connection failed:', testError);
      return;
    }
    console.log('✅ Basic connection works');
    
    // Test the specific query that's failing
    console.log('\n2. Testing the specific failing query...');
    const tripId = '353feb3f-fee9-42bb-aad5-0de59b7eee84';
    const { data: destData, error: destError } = await supabase
      .from('destinations')
      .select('id,trip_id')
      .eq('trip_id', tripId);
    
    if (destError) {
      console.error('❌ Specific query failed:', destError);
      console.error('Error details:', {
        code: destError.code,
        message: destError.message,
        details: destError.details,
        hint: destError.hint
      });
      return;
    }
    
    console.log('✅ Specific query works, found destinations:', destData?.length || 0);
    
    // Check destinations table structure
    console.log('\n3. Checking destinations table structure...');
    const { data: schemaData, error: schemaError } = await supabase
      .from('destinations')
      .select('*')
      .limit(1);
    
    if (schemaError) {
      console.error('❌ Schema check failed:', schemaError);
      return;
    }
    
    if (schemaData && schemaData.length > 0) {
      console.log('✅ Table structure (first row keys):', Object.keys(schemaData[0]));
      console.log('🔍 Has original_destination_id:', 'original_destination_id' in schemaData[0]);
    }
    
    // Test RPC functions if they exist
    console.log('\n4. Testing RPC functions...');
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('copy_destination_to_trip', {
          source_destination_id: 'test-id',
          target_trip_id: 'test-trip-id'
        });
      
      if (rpcError) {
        console.log('ℹ️ RPC function test (expected to fail):', rpcError.message);
      } else {
        console.log('⚠️ RPC function unexpectedly succeeded');
      }
    } catch (e) {
      console.log('ℹ️ RPC function test error (expected):', e.message);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugDestinationsError();