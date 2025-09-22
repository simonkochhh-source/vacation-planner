import { User } from '@supabase/supabase-js';

/**
 * Check if user is an OAuth user (Google, Apple, etc.)
 */
export function isOAuthUser(user: User | null): boolean {
  if (!user) return false;
  
  const provider = user.app_metadata?.provider;
  return !!(provider && provider !== 'email');
}

/**
 * Get OAuth provider name
 */
export function getOAuthProvider(user: User | null): string | null {
  if (!user) return null;
  
  return user.app_metadata?.provider || null;
}

/**
 * Check if user needs password (email users only)
 */
export function userNeedsPassword(user: User | null): boolean {
  if (!user) return false;
  
  const provider = user.app_metadata?.provider;
  return !provider || provider === 'email';
}

/**
 * Get user's display name from metadata
 */
export function getUserDisplayName(user: User | null): string | null {
  if (!user) return null;
  
  return user.user_metadata?.full_name || 
         user.user_metadata?.name || 
         user.user_metadata?.display_name || 
         null;
}

/**
 * Get user's avatar URL from metadata
 */
export function getUserAvatarUrl(user: User | null): string | null {
  if (!user) return null;
  
  return user.user_metadata?.avatar_url || 
         user.user_metadata?.picture || 
         null;
}

/**
 * Check if user's email is verified
 */
export function isUserEmailVerified(user: User | null): boolean {
  if (!user) return false;
  
  // OAuth users are automatically verified
  if (isOAuthUser(user)) return true;
  
  // Email users need email confirmation
  return !!user.email_confirmed_at;
}

/**
 * Get formatted provider name for display
 */
export function getProviderDisplayName(provider: string | null): string {
  if (!provider) return 'E-Mail';
  
  switch (provider.toLowerCase()) {
    case 'google':
      return 'Google';
    case 'apple':
      return 'Apple';
    case 'github':
      return 'GitHub';
    case 'facebook':
      return 'Facebook';
    case 'twitter':
      return 'Twitter';
    case 'discord':
      return 'Discord';
    default:
      return provider.charAt(0).toUpperCase() + provider.slice(1);
  }
}