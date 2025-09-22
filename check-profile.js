// Quick profile check - paste in browser console
// User ID: 2b0d0227-050a-42c2-962c-476274c0a1b7

async function checkUserProfile() {
  console.log('🔍 Checking user profile...');
  
  try {
    // Access the Supabase client from window (if available)
    const supabaseClient = window.supabase || 
      (window.__SUPABASE_CLIENT__ || 
       (document.querySelector('#root')?.__reactInternalInstance?.memoizedProps?.children?.props?.client));
    
    if (!supabaseClient) {
      console.log('❌ Cannot access Supabase client from browser console');
      console.log('💡 Try running this in React DevTools or check network tab');
      return;
    }
    
    // Check current session
    const { data: { session } } = await supabaseClient.auth.getSession();
    console.log('Session user ID:', session?.user?.id);
    
    // Check if user profile exists
    const { data: profile, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', '2b0d0227-050a-42c2-962c-476274c0a1b7')
      .single();
    
    if (error) {
      console.log('❌ Profile query error:', error.message);
      
      if (error.code === 'PGRST116') {
        console.log('💡 No profile found - user needs to be created in database');
        console.log('🔧 Manual fix: Create user profile in Supabase dashboard');
      }
    } else {
      console.log('✅ Profile found:', profile);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

console.log('Paste this in browser console: checkUserProfile()');