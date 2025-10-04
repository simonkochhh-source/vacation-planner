/**
 * Debug utility to test friends functionality
 * Run this in the browser console to debug friends loading
 */

// Debug friends functionality
window.debugFriends = async function() {
  console.log('🔍 === FRIENDS DEBUG UTILITY ===');
  
  try {
    // Import supabase
    const { supabase } = await import('../lib/supabase');
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Not authenticated:', authError);
      return;
    }
    
    console.log('✅ Current user:', user.id);
    
    // Test 1: Check friendships table directly
    console.log('\n🔍 === CHECKING FRIENDSHIPS TABLE (DIRECT) ===');
    const { data: friendshipsDirectData, error: friendshipsDirectError } = await supabase
      .from('friendships')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
    
    console.log('Friendships direct query result:', { 
      data: friendshipsDirectData, 
      error: friendshipsDirectError?.message,
      count: friendshipsDirectData?.length || 0
    });
    
    // Test 2: Check friendships table using RPC function
    console.log('\n🔍 === CHECKING FRIENDSHIPS TABLE ===');
    const { data: friendshipsData, error: friendshipsError } = await supabase
      .rpc('get_user_friends', { target_user_id: user.id });
    
    console.log('Friendships query result:', { 
      data: friendshipsData, 
      error: friendshipsError?.message,
      count: friendshipsData?.length || 0
    });
    
    // Test 3: Check user_profiles table
    console.log('\n🔍 === CHECKING USER_PROFILES TABLE ===');
    const { data: profilesData, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, nickname, display_name')
      .limit(5);
    
    console.log('User profiles sample:', { 
      data: profilesData, 
      error: profilesError?.message,
      count: profilesData?.length || 0
    });
    
    // Test 4: Test socialService.getFriends()
    console.log('\n🔍 === TESTING SOCIALSERVICE.GETFRIENDS() ===');
    try {
      const { socialService } = await import('../services/socialService');
      const friends = await socialService.getFriends();
      console.log('socialService.getFriends() result:', friends);
      console.log('Friends count:', friends.length);
    } catch (serviceError) {
      console.error('❌ socialService.getFriends() error:', serviceError);
    }
    
    // Test 5: Check accepted friendships
    console.log('\n🔍 === CHECKING ACCEPTED FRIENDSHIPS ===');
    const acceptedFriendships = friendshipsDirectData?.filter(f => f.status === 'ACCEPTED') || [];
    console.log('Accepted friendships:', acceptedFriendships);
    
    // Count friendships involving current user
    const userFriendships = acceptedFriendships.filter(f => 
      f.user1_id === user.id || f.user2_id === user.id
    );
    
    console.log('User friendships found:', userFriendships);
    console.log('Should show as friends count:', userFriendships.length);
    
    console.log('\n✅ === DEBUG COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
};

console.log('🛠️ Debug utility loaded! Run debugFriends() in console to test friends functionality');