import { supabase } from '../lib/supabase';
import { userService } from '../services/userService';

/**
 * Migrate existing OAuth user to users table
 * This is specifically for users who authenticated before the user table was created
 */
export async function migrateExistingOAuthUser(userId: string): Promise<boolean> {
  try {
    console.log('🔄 Migrating existing OAuth user:', userId);
    
    // Check if user already exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (existingUser) {
      console.log('✅ User already exists in users table');
      return true;
    }
    
    // Get current auth user data
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || user.id !== userId) {
      console.error('❌ Could not get auth user data:', authError);
      return false;
    }
    
    console.log('👤 Found auth user:', {
      id: user.id,
      email: user.email,
      provider: user.app_metadata?.provider
    });
    
    // Generate thematic nickname
    let nickname = userService.generateThematicNickname();
    
    // Ensure nickname is unique
    let attempts = 0;
    while (attempts < 5) {
      const isAvailable = await userService.isNicknameAvailable(nickname);
      if (isAvailable) break;
      
      nickname = userService.generateThematicNickname();
      attempts++;
    }
    
    // If still not unique, add random suffix
    if (attempts >= 5) {
      nickname = nickname + Math.floor(Math.random() * 1000);
    }
    
    // Create user profile
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email!,
        nickname: nickname,
        display_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        is_verified: true, // OAuth users are automatically verified
        language: user.user_metadata?.locale || 'de',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Failed to create user profile:', insertError);
      return false;
    }
    
    console.log('✅ Successfully migrated user:', newUser);
    return true;
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return false;
  }
}

/**
 * Check and migrate current user if needed
 */
export async function checkAndMigrateCurrentUser(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('👤 No authenticated user found');
      return false;
    }
    
    // Try to get user profile
    const profile = await userService.getCurrentUserProfile();
    
    if (profile) {
      console.log('✅ User profile exists:', profile.nickname);
      return true;
    }
    
    // If no profile exists, try to migrate
    console.log('🔄 No user profile found, attempting migration...');
    return await migrateExistingOAuthUser(user.id);
    
  } catch (error) {
    console.error('❌ Check and migrate failed:', error);
    return false;
  }
}