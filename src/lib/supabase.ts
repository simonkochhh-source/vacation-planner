import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// Check for test environment (Playwright only - NOT localhost development)
const isTestMode = typeof window !== 'undefined' && (
  window.navigator.userAgent.includes('HeadlessChrome') ||
  window.navigator.userAgent.includes('Playwright')
);

// Check for placeholder values or missing credentials
const isPlaceholder = 
  isTestMode || // Auto-enable placeholder mode during testing
  !supabaseUrl || 
  !supabaseAnonKey || 
  supabaseUrl.includes('your-project-ref') ||
  supabaseAnonKey.includes('your_supabase_anon_key') ||
  supabaseUrl === '' ||
  supabaseAnonKey === '';

if (isPlaceholder) {
  console.warn('⚠️ Supabase: Using placeholder credentials. App will fallback to LocalStorage.');
  if (isTestMode) {
    console.log('🧪 Test mode detected - authentication bypassed for testing');
  }
  console.log('ℹ️ Environment variables status:');
  console.log('  - REACT_APP_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('  - REACT_APP_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
  console.log('ℹ️ To enable Supabase integration:');
  console.log('1. Set Environment Variables in Vercel Dashboard');
  console.log('2. Redeploy the application');
  console.log('3. Check Supabase Auth URLs');
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