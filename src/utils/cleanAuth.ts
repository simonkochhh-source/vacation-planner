import { supabase } from '../lib/supabase';

/**
 * Clean authentication state and ensure fresh login
 * This prevents auto-login and forces users to authenticate properly
 */
export async function cleanAuthState(): Promise<void> {
  try {
    console.log('🧹 Cleaning authentication state...');
    
    // Sign out any existing session
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      console.error('⚠️ Error during sign out:', signOutError.message);
    } else {
      console.log('✅ Supabase session cleared');
    }
    
    // Clear local storage items that might persist auth state
    const authKeys = [
      'supabase.auth.token',
      'supabase.auth.expires_at',
      'supabase.auth.refresh_token',
      'sb-' + window.location.hostname.replace(/\./g, '-') + '-auth-token'
    ];
    
    authKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
    console.log('✅ Local storage cleaned');
    
    // Force refresh to ensure clean state
    console.log('🔄 Authentication state cleaned successfully');
    
  } catch (error) {
    console.error('❌ Error cleaning auth state:', error);
  }
}

/**
 * Check if user has valid authentication without auto-login
 */
export async function checkAuthStatus(): Promise<{
  isAuthenticated: boolean;
  user: any | null;
  needsReauth: boolean;
}> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Error checking auth status:', error);
      return {
        isAuthenticated: false,
        user: null,
        needsReauth: true
      };
    }
    
    const isAuthenticated = !!session?.user;
    
    console.log('🔍 Auth status check:', {
      isAuthenticated,
      userId: session?.user?.id || 'none',
      email: session?.user?.email || 'none'
    });
    
    return {
      isAuthenticated,
      user: session?.user || null,
      needsReauth: !isAuthenticated
    };
    
  } catch (error) {
    console.error('❌ Unexpected error checking auth:', error);
    return {
      isAuthenticated: false,
      user: null,
      needsReauth: true
    };
  }
}

/**
 * Get current user profile dynamically based on authenticated user
 */
export async function getCurrentUserDynamically() {
  try {
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('👤 No authenticated user found');
      return null;
    }
    
    console.log('👤 Current user:', {
      id: user.id,
      email: user.email,
      provider: user.app_metadata?.provider || 'email'
    });
    
    // Get user profile from users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Error fetching user profile:', profileError);
      return null;
    }
    
    console.log('✅ User profile loaded:', {
      nickname: profile?.nickname,
      email: profile?.email,
      verified: profile?.is_verified
    });
    
    return {
      authUser: user,
      profile: profile
    };
    
  } catch (error) {
    console.error('❌ Error getting current user:', error);
    return null;
  }
}