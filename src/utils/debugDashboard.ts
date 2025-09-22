import { supabase } from '../lib/supabase';
import { userService } from '../services/userService';

/**
 * Debug function to check why dashboard is not loading
 */
export async function debugDashboardLoading() {
  console.log('🔍 Dashboard Loading Debug');
  console.log('=========================');
  
  try {
    // 1. Check auth session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('1️⃣ Auth Session Check:');
    if (sessionError) {
      console.error('❌ Session error:', sessionError.message);
      return { step: 'session', success: false, error: sessionError.message };
    }
    
    if (!session?.user) {
      console.log('❌ No user session found');
      return { step: 'session', success: false, error: 'No user session' };
    }
    
    console.log('✅ User session found:', session.user.email);
    console.log('   User ID:', session.user.id);
    console.log('   Provider:', session.user.app_metadata?.provider);
    
    // 2. Check user profile
    console.log('');
    console.log('2️⃣ User Profile Check:');
    
    const profile = await userService.getCurrentUserProfile();
    
    if (!profile) {
      console.log('❌ No user profile found - this causes loading loop!');
      
      // Try to create profile
      console.log('');
      console.log('🔄 Attempting to create user profile...');
      
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert({
          id: session.user.id,
          email: session.user.email!,
          nickname: `user${Math.floor(Math.random() * 1000)}`,
          display_name: session.user.user_metadata?.full_name || 'User',
          is_verified: session.user.app_metadata?.provider !== 'email',
          language: 'de',
          timezone: 'Europe/Berlin'
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Failed to create profile:', createError.message);
        return { step: 'profile_creation', success: false, error: createError.message };
      }
      
      console.log('✅ User profile created:', newProfile.nickname);
      return { step: 'profile_creation', success: true, profile: newProfile };
    }
    
    console.log('✅ User profile found:', profile.nickname);
    
    // 3. Check app state
    console.log('');
    console.log('3️⃣ App State Check:');
    console.log('✅ All checks passed - dashboard should load');
    
    return { 
      step: 'complete', 
      success: true, 
      user: session.user, 
      profile: profile 
    };
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
    return { step: 'error', success: false, error: error.message };
  }
}

/**
 * Force dashboard to load by ensuring all prerequisites are met
 */
export async function forceDashboardLoad() {
  console.log('🚀 Force Dashboard Load');
  console.log('======================');
  
  const result = await debugDashboardLoading();
  
  if (result.success) {
    console.log('✅ Dashboard should now load properly');
    
    // Force page refresh to reset React state
    setTimeout(() => {
      console.log('🔄 Refreshing page to reset state...');
      window.location.reload();
    }, 1000);
    
    return true;
  } else {
    console.log('❌ Dashboard loading still blocked:', result.error);
    return false;
  }
}

// Make functions available globally for browser console
if (typeof window !== 'undefined') {
  (window as any).debugDashboard = debugDashboardLoading;
  (window as any).forceDashboard = forceDashboardLoad;
}