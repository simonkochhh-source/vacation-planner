// Test utility for photo privacy updates
import { supabase } from '../lib/supabase';

export async function testDirectPrivacyUpdate() {
  try {
    console.log('🧪 Testing direct privacy update...');
    
    // Get first photo to test with
    const { data: photos, error: fetchError } = await supabase
      .from('trip_photos')
      .select('*')
      .limit(1);
    
    if (fetchError) {
      console.error('❌ Failed to fetch test photo:', fetchError);
      return;
    }
    
    if (!photos || photos.length === 0) {
      console.log('⚠️ No photos found for testing');
      return;
    }
    
    const testPhoto = photos[0];
    console.log('📸 Test photo:', testPhoto);
    
    // Test update
    const { data: updateResult, error: updateError } = await supabase
      .from('trip_photos')
      .update({ 
        privacy: 'public',
        privacy_approved_at: new Date().toISOString()
      })
      .eq('id', testPhoto.id)
      .select();
    
    if (updateError) {
      console.error('❌ Update failed:', updateError);
    } else {
      console.log('✅ Update successful:', updateResult);
    }
    
    // Verify update
    const { data: verifyResult, error: verifyError } = await supabase
      .from('trip_photos')
      .select('*')
      .eq('id', testPhoto.id)
      .single();
    
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
    } else {
      console.log('🔍 Verification result:', verifyResult);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Add to window for console access
(window as any).testPrivacyUpdate = testDirectPrivacyUpdate;