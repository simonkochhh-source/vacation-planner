import { supabase } from '../lib/supabase';

// User types
export interface UserProfile {
  id: string;
  email: string;
  nickname: string;
  display_name?: string;
  avatar_url?: string;
  language: 'de' | 'en';
  timezone: string;
  is_profile_public: boolean;
  allow_friend_requests: boolean;
  allow_trip_invitations: boolean;
  is_active: boolean;
  is_verified: boolean;
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PublicUserProfile {
  id: string;
  nickname: string;
  display_name?: string;
  avatar_url?: string;
  is_verified: boolean;
  created_at: string;
}

export interface UserSearchResult {
  id: string;
  nickname: string;
  display_name?: string;
  avatar_url?: string;
  is_verified: boolean;
}

export interface UpdateUserProfileData {
  nickname?: string;
  display_name?: string;
  avatar_url?: string | null;
  language?: 'de' | 'en';
  timezone?: string;
  is_profile_public?: boolean;
  allow_friend_requests?: boolean;
  allow_trip_invitations?: boolean;
}

class UserService {
  /**
   * Get current user's full profile
   */
  async getCurrentUserProfile(): Promise<UserProfile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('👤 UserService: No authenticated user');
        return null;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ UserService: Error fetching user profile:', error);
        return null;
      }

      console.log('✅ UserService: User profile fetched successfully');
      return data;
    } catch (error) {
      console.error('❌ UserService: Failed to get current user profile:', error);
      return null;
    }
  }

  /**
   * Get public user profile by ID
   */
  async getPublicUserProfile(userId: string): Promise<PublicUserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('public_users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ UserService: Error fetching public user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ UserService: Failed to get public user profile:', error);
      return null;
    }
  }

  /**
   * Update current user's profile
   */
  async updateUserProfile(updates: UpdateUserProfileData): Promise<UserProfile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user');
      }

      // Get current profile to check for old avatar
      const currentProfile = await this.getCurrentUserProfile();

      // Check if nickname is being updated and is unique
      if (updates.nickname) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('nickname', updates.nickname)
          .neq('id', user.id)
          .single();

        if (existingUser) {
          throw new Error('Nickname ist bereits vergeben');
        }
      }

      // Handle avatar update/removal
      if ('avatar_url' in updates) {
        // If removing avatar (null) or changing to a new one, delete old avatar
        if (currentProfile?.avatar_url && 
            updates.avatar_url !== currentProfile.avatar_url) {
          try {
            await this.deleteAvatar(currentProfile.avatar_url);
          } catch (error) {
            console.warn('⚠️ UserService: Could not delete old avatar:', error);
            // Continue with update even if deletion fails
          }
        }
      }

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ UserService: Error updating user profile:', error);
        throw error;
      }

      console.log('✅ UserService: User profile updated successfully');
      return data;
    } catch (error) {
      console.error('❌ UserService: Failed to update user profile:', error);
      throw error;
    }
  }

  /**
   * Search users by nickname, display name, or email
   */
  async searchUsers(searchTerm: string, limit: number = 10): Promise<UserSearchResult[]> {
    try {
      if (!searchTerm.trim()) {
        return [];
      }

      const term = searchTerm.trim();
      
      // First try the RPC function for nickname/display name search
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('search_users', {
          search_term: term,
          limit_count: limit
        });

      if (rpcError) {
        console.error('❌ UserService: Error in RPC search:', rpcError);
      }

      let results: UserSearchResult[] = rpcData || [];

      // If search term looks like an email, also search by exact email match
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(term) && results.length < limit) {
        const { data: emailData, error: emailError } = await supabase
          .from('users')
          .select('id, nickname, display_name, avatar_url, is_verified')
          .eq('email', term)
          .eq('is_active', true)
          .limit(1);

        if (!emailError && emailData && emailData.length > 0) {
          // Add email match if not already in results
          const emailUser = emailData[0];
          if (!results.some(user => user.id === emailUser.id)) {
            results = [emailUser, ...results];
          }
        }
      }

      console.log(`✅ UserService: Found ${results.length} users for "${term}"`);
      return results.slice(0, limit);
    } catch (error) {
      console.error('❌ UserService: Failed to search users:', error);
      return [];
    }
  }

  /**
   * Get user by nickname
   */
  async getUserByNickname(nickname: string): Promise<PublicUserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('public_users')
        .select('*')
        .eq('nickname', nickname)
        .single();

      if (error) {
        console.error('❌ UserService: Error fetching user by nickname:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ UserService: Failed to get user by nickname:', error);
      return null;
    }
  }

  /**
   * Get user by email address
   */
  async getUserByEmail(email: string): Promise<UserSearchResult | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, nickname, display_name, avatar_url, is_verified')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No user found with this email
          return null;
        }
        console.error('❌ UserService: Error fetching user by email:', error);
        return null;
      }

      console.log('✅ UserService: User found by email');
      return data;
    } catch (error) {
      console.error('❌ UserService: Failed to get user by email:', error);
      return null;
    }
  }

  /**
   * Check if nickname is available
   */
  async isNicknameAvailable(nickname: string, excludeUserId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('users')
        .select('id')
        .eq('nickname', nickname);

      if (excludeUserId) {
        query = query.neq('id', excludeUserId);
      }

      const { error } = await query.single();

      if (error && error.code === 'PGRST116') {
        // No rows returned - nickname is available
        return true;
      }

      if (error) {
        console.error('❌ UserService: Error checking nickname availability:', error);
        return false;
      }

      // User found with this nickname - not available
      return false;
    } catch (error) {
      console.error('❌ UserService: Failed to check nickname availability:', error);
      return false;
    }
  }

  /**
   * Upload avatar image to Supabase storage
   */
  async uploadAvatar(file: File): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      console.log('📷 UserService: Uploading avatar:', fileName);

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ UserService: Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!data?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      console.log('✅ UserService: Avatar uploaded successfully:', data.publicUrl);
      return data.publicUrl;

    } catch (error) {
      console.error('❌ UserService: Failed to upload avatar:', error);
      throw error;
    }
  }

  /**
   * Delete avatar from storage
   */
  async deleteAvatar(avatarUrl: string): Promise<void> {
    try {
      // Extract file path from URL
      const urlParts = avatarUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `avatars/${fileName}`;

      const { error } = await supabase.storage
        .from('avatars')
        .remove([filePath]);

      if (error) {
        console.error('❌ UserService: Delete avatar error:', error);
        // Don't throw error here - avatar might already be deleted
      }

      console.log('✅ UserService: Avatar deleted from storage');
    } catch (error) {
      console.error('❌ UserService: Failed to delete avatar:', error);
      // Don't throw error - this is cleanup
    }
  }

  /**
   * Update user's last seen timestamp
   */
  async updateLastSeen(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return;
      }

      await supabase
        .from('users')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', user.id);

    } catch (error) {
      console.error('❌ UserService: Failed to update last seen:', error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Get multiple users by IDs
   */
  async getUsersByIds(userIds: string[]): Promise<PublicUserProfile[]> {
    try {
      if (userIds.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from('public_users')
        .select('*')
        .in('id', userIds);

      if (error) {
        console.error('❌ UserService: Error fetching users by IDs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ UserService: Failed to get users by IDs:', error);
      return [];
    }
  }

  /**
   * Generate a thematic nickname for Trailkeeper
   */
  generateThematicNickname(): string {
    const travelThemes = [
      'adventurer', 'explorer', 'wanderer', 'nomad', 'traveler', 'hiker', 'camper',
      'roadtripper', 'backpacker', 'globetrotter', 'mountaineer', 'trailblazer'
    ];
    
    const natureWords = [
      'alpine', 'forest', 'canyon', 'summit', 'valley', 'ocean', 'river',
      'peak', 'trail', 'wild', 'scenic', 'coastal', 'desert', 'prairie'
    ];
    
    const adjectives = [
      'epic', 'brave', 'free', 'bold', 'wild', 'swift', 'keen', 'calm',
      'bright', 'clever', 'steady', 'noble', 'wise', 'agile', 'fierce'
    ];
    
    // Generate different patterns
    const patterns = [
      () => {
        const theme = travelThemes[Math.floor(Math.random() * travelThemes.length)];
        const number = Math.floor(Math.random() * 999) + 1;
        return `${theme}${number}`;
      },
      () => {
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const nature = natureWords[Math.floor(Math.random() * natureWords.length)];
        return `${adj}${nature}`;
      },
      () => {
        const nature = natureWords[Math.floor(Math.random() * natureWords.length)];
        const theme = travelThemes[Math.floor(Math.random() * travelThemes.length)];
        return `${nature}${theme}`;
      },
      () => {
        const theme = travelThemes[Math.floor(Math.random() * travelThemes.length)];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const number = Math.floor(Math.random() * 99) + 1;
        return `${theme}${adj}${number}`;
      }
    ];
    
    // Pick a random pattern
    const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
    return selectedPattern();
  }

  /**
   * Generate a suggested nickname from email (fallback)
   */
  generateNicknameFromEmail(email: string): string {
    const baseName = email.split('@')[0].toLowerCase();
    // Remove special characters and keep only alphanumeric
    const cleanName = baseName.replace(/[^a-z0-9]/g, '');
    
    // Ensure minimum length and add thematic suffix
    if (cleanName.length < 3) {
      return this.generateThematicNickname();
    }
    
    // Add travel theme to email-based nickname
    const travelSuffixes = ['trek', 'trail', 'camp', 'roam', 'quest', 'journey'];
    const suffix = travelSuffixes[Math.floor(Math.random() * travelSuffixes.length)];
    
    return cleanName + suffix;
  }

  /**
   * Generate nickname for OAuth users (Google, Apple, etc.)
   */
  generateOAuthNickname(): string {
    return this.generateThematicNickname();
  }

  /**
   * Suggest available nicknames based on a base name
   */
  async suggestAvailableNicknames(baseName: string, count: number = 3): Promise<string[]> {
    const suggestions: string[] = [];
    const cleanBase = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Try base name first
    if (await this.isNicknameAvailable(cleanBase)) {
      suggestions.push(cleanBase);
    }
    
    // Generate variations
    let counter = 1;
    while (suggestions.length < count && counter < 100) {
      const variant = cleanBase + counter;
      if (await this.isNicknameAvailable(variant)) {
        suggestions.push(variant);
      }
      counter++;
    }
    
    // If still not enough, add random suffixes
    while (suggestions.length < count) {
      const randomSuffix = Math.floor(Math.random() * 10000);
      const variant = cleanBase + randomSuffix;
      if (await this.isNicknameAvailable(variant)) {
        suggestions.push(variant);
      }
    }
    
    return suggestions;
  }
}

// Export singleton instance
export const userService = new UserService();
export default userService;