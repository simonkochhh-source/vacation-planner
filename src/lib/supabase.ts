import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// Check for placeholder values or missing credentials
const isPlaceholder = 
  !supabaseUrl || 
  !supabaseAnonKey || 
  supabaseUrl.includes('your-project-ref') ||
  supabaseAnonKey.includes('your_supabase_anon_key');

if (isPlaceholder) {
  console.warn('⚠️ Supabase: Using placeholder credentials. App will fallback to LocalStorage.');
  console.log('ℹ️ To enable Supabase integration:');
  console.log('1. Create a Supabase project at https://supabase.com');
  console.log('2. Update .env file with real credentials');
  console.log('3. Restart the development server');
}

// Create Supabase client - use placeholder values if real credentials are not available
const clientUrl = isPlaceholder ? 'https://placeholder.supabase.co' : supabaseUrl;
const clientKey = isPlaceholder ? 'placeholder-key' : supabaseAnonKey;

// Configure Auth options to handle dynamic redirect URLs and allow multiple sessions
const authOptions = {
  auth: {
    flowType: 'pkce' as const,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Dynamic redirect URL based on current environment
    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined,
    // Use consistent storage key but allow debug mode
    debug: true
  },
  // Add client info to prevent warnings
  global: {
    headers: {
      'X-Client-Info': 'trailkeeper-app'
    }
  }
};

export const supabase = createClient(clientUrl, clientKey, authOptions);

// Export flag to check if using placeholder credentials
export const isUsingPlaceholderCredentials = isPlaceholder;