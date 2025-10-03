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
    
    // Test 1: Check follows table
    console.log('\n🔍 === CHECKING FOLLOWS TABLE ===');
    const { data: followsData, error: followsError } = await supabase
      .from('follows')
      .select('*')
      .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`);
    
    console.log('Follows query result:', { 
      data: followsData, 
      error: followsError?.message,
      count: followsData?.length || 0
    });
    
    // Test 2: Check friendships view/table
    console.log('\n🔍 === CHECKING FRIENDSHIPS VIEW ===');
    const { data: friendshipsData, error: friendshipsError } = await supabase
      .from('friendships')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
    
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
    
    // Test 5: Check accepted follows for bidirectional relationships
    console.log('\n🔍 === CHECKING BIDIRECTIONAL RELATIONSHIPS ===');
    const acceptedFollows = followsData?.filter(f => f.status === 'ACCEPTED') || [];
    console.log('Accepted follows:', acceptedFollows);
    
    // Find bidirectional pairs
    const bidirectionalPairs = [];
    for (const follow of acceptedFollows) {
      const reciprocal = acceptedFollows.find(f => 
        f.follower_id === follow.following_id && 
        f.following_id === follow.follower_id
      );
      
      if (reciprocal) {
        const pair = {
          user1: follow.follower_id,
          user2: follow.following_id,
          currentUser: user.id
        };
        
        // Avoid duplicates
        const alreadyExists = bidirectionalPairs.some(p => 
          (p.user1 === pair.user1 && p.user2 === pair.user2) ||
          (p.user1 === pair.user2 && p.user2 === pair.user1)
        );
        
        if (!alreadyExists) {
          bidirectionalPairs.push(pair);
        }
      }
    }
    
    console.log('Bidirectional pairs found:', bidirectionalPairs);
    console.log('Should show as friends count:', bidirectionalPairs.length);
    
    console.log('\n✅ === DEBUG COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
};

console.log('🛠️ Debug utility loaded! Run debugFriends() in console to test friends functionality');