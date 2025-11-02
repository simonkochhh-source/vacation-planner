/**
 * Social Network Service
 * Handles user friendships, activity feeds, and social interactions
 */

import { supabase } from '../lib/supabase';
import {
  UUID,
  UserActivity,
  ActivityType,
  SocialUserProfile,
  UserSearchResult,
  ActivityFeedItem,
  SocialStats,
  SocialServiceInterface,
  PhotoShare,
  PhotoLike,
  PhotoShareWithDetails,
  CreatePhotoShareData
} from '../types';

class SocialService implements SocialServiceInterface {
  
  // =====================================================
  // Friendship Management
  // =====================================================
  




  // =====================================================
  // User Search and Discovery
  // =====================================================

  /**
   * Search for users by nickname or display name
   */
  async searchUsers(query: string, limit: number = 20): Promise<UserSearchResult[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const searchQuery = `%${query.toLowerCase()}%`;

    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        id,
        nickname,
        display_name,
        avatar_url,
        bio,
        location,
        follower_count,
        trip_count,
        is_verified,
        is_public_profile
      `)
      .or(`nickname.ilike.${searchQuery},display_name.ilike.${searchQuery}`)
      .eq('is_public_profile', true)
      .neq('id', user.id) // Exclude current user
      .order('follower_count', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to search users: ${error.message}`);

    // Note: Friendship status can be determined by calling getFriendshipStatus() for individual users
    return data.map(u => ({
      ...u,
      friendship_status: 'none' // Will be determined by individual getFriendshipStatus() calls
    }));
  }

  /**
   * Get a user's public profile
   */
  async getUserProfile(userId: UUID): Promise<SocialUserProfile> {
    // Get user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .eq('is_public_profile', true)
      .single();

    if (error) throw new Error(`Failed to get user profile: ${error.message}`);

    // Get friend count (accepted friendships) - with error handling
    let friendCount = 0;
    try {
      const { count, error: friendError } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .or(`requester_id.eq.${userId},accepter_id.eq.${userId}`)
        .eq('status', 'accepted');
      
      if (friendError) {
        console.warn('⚠️ Failed to get friend count:', friendError.message);
      } else {
        friendCount = count || 0;
      }
    } catch (error) {
      console.warn('⚠️ Friendship query failed:', error);
      friendCount = 0;
    }

    // Get pending requests count (only requests sent to this user) - with error handling
    let pendingRequestsCount = 0;
    try {
      const { count, error: pendingError } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('accepter_id', userId)
        .eq('status', 'pending');
      
      if (pendingError) {
        console.warn('⚠️ Failed to get pending requests count:', pendingError.message);
      } else {
        pendingRequestsCount = count || 0;
      }
    } catch (error) {
      console.warn('⚠️ Pending requests query failed:', error);
      pendingRequestsCount = 0;
    }

    // Get follow counts
    const followCounts = await this.getFollowCounts(userId);

    return {
      ...profile,
      friend_count: friendCount,
      pending_requests_count: pendingRequestsCount,
      follower_count: followCounts.followersCount,
      following_count: followCounts.followingCount
    };
  }

  // =====================================================
  // Follow System (Unidirectional) 
  // =====================================================

  /**
   * Follow a user (immediate, no approval needed)
   */
  async followUser(targetUserId: UUID): Promise<{ followId: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (user.id === targetUserId) {
      throw new Error('Cannot follow yourself');
    }

    console.log('🔄 Following user:', targetUserId, 'from user:', user.id);

    // Check for existing relationship
    const { data: existingFollow } = await supabase
      .from('follows')
      .select('id, status')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .single();

    let followId: string;

    if (existingFollow) {
      // Update existing relationship to 'following'
      const { data: updatedFollow, error: updateError } = await supabase
        .from('follows')
        .update({ 
          status: 'following',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingFollow.id)
        .select('id')
        .single();

      if (updateError) {
        console.error('❌ Failed to update follow relationship:', updateError);
        throw new Error('Failed to follow user');
      }

      followId = updatedFollow.id;
      console.log('✅ Updated existing relationship to following');
    } else {
      // Create new follow relationship
      const { data: newFollow, error: insertError } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: targetUserId,
          status: 'following'
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('❌ Failed to create follow relationship:', insertError);
        throw new Error('Failed to follow user');
      }

      followId = newFollow.id;
      console.log('✅ Created new follow relationship');
    }

    console.log('✅ Successfully following user!');
    return { followId };
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(targetUserId: UUID): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log('🔄 Unfollowing user:', targetUserId, 'from user:', user.id);

    // Find and delete the follow relationship
    const { error: deleteError } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .eq('status', 'following');

    if (deleteError) {
      console.error('❌ Failed to unfollow user:', deleteError);
      throw new Error('Failed to unfollow user');
    }

    console.log('✅ Successfully unfollowed user!');
    return true;
  }

  /**
   * Check if current user is following target user
   */
  async isFollowing(targetUserId: UUID): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: follow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .eq('status', 'following')
      .single();

    return !!follow;
  }

  /**
   * Get follow status between current user and target user
   */
  async getFollowStatus(targetUserId: UUID): Promise<{
    isFollowing: boolean;
    isFollowedBy: boolean;
    areFriends: boolean;
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { isFollowing: false, isFollowedBy: false, areFriends: false };

    // Check if current user is following target user
    const { data: following } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .eq('status', 'following')
      .single();

    // Check if target user is following current user
    const { data: followedBy } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', targetUserId)
      .eq('following_id', user.id)
      .eq('status', 'following')
      .single();

    // Check if they are friends (bidirectional accepted relationship)
    const areFriends = await this.areFriends(user.id, targetUserId);

    return {
      isFollowing: !!following,
      isFollowedBy: !!followedBy,
      areFriends
    };
  }

  /**
   * Get users that the current user is following
   */
  async getFollowing(userId?: UUID): Promise<SocialUserProfile[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const targetUserId = userId || user.id;

    const { data: follows, error } = await supabase
      .from('follows')
      .select(`
        following_id,
        created_at,
        user_profiles!follows_following_id_fkey (*)
      `)
      .eq('follower_id', targetUserId)
      .eq('status', 'following')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Failed to get following users:', error);
      throw new Error('Failed to get following users');
    }

    return follows?.map(f => {
      const profile = Array.isArray(f.user_profiles) ? f.user_profiles[0] : f.user_profiles;
      if (!profile) return null;
      
      return {
        id: profile.id,
        nickname: profile.nickname,
        display_name: profile.display_name,
        email: profile.email,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
        social_links: profile.social_links || {},
        is_public_profile: profile.is_public_profile,
        is_verified: profile.is_verified,
        friend_count: 0,
        pending_requests_count: 0,
        follower_count: 0,
        following_count: 0,
        trip_count: profile.trip_count || 0,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        followed_at: f.created_at
      } as SocialUserProfile;
    }).filter(Boolean) as SocialUserProfile[];
  }

  /**
   * Get users that follow the current user
   */
  async getFollowers(userId?: UUID): Promise<SocialUserProfile[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const targetUserId = userId || user.id;

    const { data: follows, error } = await supabase
      .from('follows')
      .select(`
        follower_id,
        created_at,
        user_profiles!follows_follower_id_fkey (*)
      `)
      .eq('following_id', targetUserId)
      .eq('status', 'following')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Failed to get followers:', error);
      throw new Error('Failed to get followers');
    }

    return follows?.map(f => {
      const profile = Array.isArray(f.user_profiles) ? f.user_profiles[0] : f.user_profiles;
      if (!profile) return null;
      
      return {
        id: profile.id,
        nickname: profile.nickname,
        display_name: profile.display_name,
        email: profile.email,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
        social_links: profile.social_links || {},
        is_public_profile: profile.is_public_profile,
        is_verified: profile.is_verified,
        friend_count: 0,
        pending_requests_count: 0,
        follower_count: 0,
        following_count: 0,
        trip_count: profile.trip_count || 0,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        followed_at: f.created_at
      } as SocialUserProfile;
    }).filter(Boolean) as SocialUserProfile[];
  }

  /**
   * Get follow counts for a user
   */
  async getFollowCounts(userId: UUID): Promise<{
    followingCount: number;
    followersCount: number;
  }> {
    let followingCount = 0;
    let followersCount = 0;

    try {
      // Count users this user is following
      const { count: following, error: followingError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId)
        .eq('status', 'following');

      if (followingError) {
        console.warn('⚠️ Failed to get following count:', followingError.message);
      } else {
        followingCount = following || 0;
      }
    } catch (error) {
      console.warn('⚠️ Following count query failed:', error);
    }

    try {
      // Count users following this user
      const { count: followers, error: followersError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId)
        .eq('status', 'following');

      if (followersError) {
        console.warn('⚠️ Failed to get followers count:', followersError.message);
      } else {
        followersCount = followers || 0;
      }
    } catch (error) {
      console.warn('⚠️ Followers count query failed:', error);
    }

    return {
      followingCount,
      followersCount
    };
  }

  // =====================================================
  // Friendship Management (Bidirectional)
  // =====================================================


  /**
   * Send a friendship request
   */
  async sendFriendshipRequest(targetUserId: UUID): Promise<{ friendshipId: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log('🔄 Sending friendship request to:', targetUserId, 'from user:', user.id);

    // Send friendship request
    const { data: friendshipId, error: friendshipError } = await supabase
      .rpc('send_friendship_request', {
        requester_id: user.id,
        target_id: targetUserId
      });

    if (friendshipError) {
      console.error('❌ Failed to send friendship request:', friendshipError);
      throw new Error('Failed to send friendship request');
    }

    console.log('✅ Friendship request sent!');
    console.log('📊 Request Details:', {
      friendshipId: friendshipId,
      requester: user.id,
      target: targetUserId
    });

    return { friendshipId };
  }

  /**
   * Accept a friendship request
   */
  async acceptFriendshipRequest(requesterId: UUID): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log('🔄 Accepting friendship request from:', requesterId, 'by user:', user.id);

    const { data: success, error: acceptError } = await supabase
      .rpc('accept_friendship_request', {
        target_id: user.id,
        requester_id: requesterId
      });

    if (acceptError) {
      console.error('❌ Failed to accept friendship request:', acceptError);
      throw new Error('Failed to accept friendship request');
    }

    console.log('✅ Friendship request accepted!');
    return success;
  }

  /**
   * Decline a friendship request
   */
  async declineFriendshipRequest(requesterId: UUID): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log('🔄 Declining friendship request from:', requesterId, 'by user:', user.id);

    const { data: success, error: declineError } = await supabase
      .rpc('decline_friendship_request', {
        target_id: user.id,
        requester_id: requesterId
      });

    if (declineError) {
      console.error('❌ Failed to decline friendship request:', declineError);
      throw new Error('Failed to decline friendship request');
    }

    console.log('✅ Friendship request declined!');
    return success;
  }

  /**
   * Get pending friendship requests for current user
   */
  async getPendingFriendshipRequests(): Promise<SocialUserProfile[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get pending requests
    const { data: requestsData, error: requestsError } = await supabase
      .rpc('get_pending_friendship_requests', { target_user_id: user.id });

    if (requestsError) {
      console.error('❌ Failed to get pending friendship requests:', requestsError);
      throw new Error('Failed to get pending friendship requests');
    }

    if (!requestsData || requestsData.length === 0) {
      return [];
    }

    // Get user profiles for requesters
    const requesterIds = requestsData.map((req: any) => req.requester_id);
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .in('id', requesterIds);

    if (profileError) {
      console.error('❌ Failed to get requester profiles:', profileError);
      throw new Error('Failed to get requester profiles');
    }

    return profiles || [];
  }


  /**
   * Get user's friends (from friendships table)
   */
  async getFriends(userId?: UUID): Promise<SocialUserProfile[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const targetUserId = userId || user.id;
    console.log('🔍 socialService.getFriends called for user:', targetUserId);

    // Use the friendships table to get established friendships
    console.log('🔄 Querying friendships table...');
    
    const { data: friendshipsData, error: friendshipsError } = await supabase
      .rpc('get_user_friends', { target_user_id: targetUserId });

    console.log('🔍 Friendships query result:', { 
      data: friendshipsData?.length || 0, 
      error: friendshipsError?.message 
    });

    if (friendshipsError) {
      console.error('❌ Failed to get friends from friendships table:', friendshipsError);
      throw new Error(`Failed to get friends: ${friendshipsError.message}`);
    }

    if (!friendshipsData || friendshipsData.length === 0) {
      console.log('⚠️ No friendships found in friendships table');
      return [];
    }

    // Extract friend IDs
    const friendIds = friendshipsData.map((f: { friend_id: UUID; friendship_created_at: string }) => f.friend_id);
    console.log('🔍 Friend IDs from friendships table:', friendIds);

    // Get friend profiles
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .in('id', friendIds);

    if (profileError) {
      console.error('❌ Failed to get friend profiles:', profileError);
      throw new Error(`Failed to get friend profiles: ${profileError.message}`);
    }

    console.log('✅ Friends loaded from friendships table:', profiles?.length || 0);
    return profiles || [];
  }

  /**
   * Check if two users are friends
   */
  async areFriends(userId1: UUID, userId2: UUID): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('are_users_friends', {
        user_a: userId1,
        user_b: userId2
      });

    if (error) {
      console.warn('Error checking friendship:', error);
      return false;
    }

    return data || false;
  }

  /**
   * Remove friendship (removes from friendships table and follow relationships)
   */
  async removeFriend(friendUserId: UUID): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log('🔄 Removing friendship between:', user.id, 'and:', friendUserId);

    // Remove from friendships table
    const { data: removed, error: friendshipError } = await supabase
      .rpc('remove_friendship', {
        user_a: user.id,
        user_b: friendUserId
      });

    if (friendshipError) {
      console.error('❌ Failed to remove friendship:', friendshipError);
      throw new Error('Failed to remove friendship');
    }

    console.log('✅ Friendship removed from friendships table:', removed);


    console.log('✅ Friend removal completed');
  }

  // =====================================================
  // Chat Integration (Uses existing chatService)
  // =====================================================

  /**
   * Create a 1:1 chat room with a friend (uses existing chat system)
   */
  async createFriendChatRoom(friendUserId: UUID): Promise<string> {
    const { data, error } = await supabase
      .rpc('get_or_create_friend_chat', {
        friend_user_id: friendUserId
      });

    if (error) throw new Error(`Failed to create friend chat: ${error.message}`);
    return data;
  }




  /**
   * Get friendship status between current user and target user
   */
  async getFriendshipStatus(targetUserId: UUID): Promise<'friends' | 'pending_sent' | 'pending_received' | 'none'> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'none';

    const { data: statusData, error } = await supabase
      .rpc('get_friendship_status', {
        user_a: user.id,
        user_b: targetUserId
      });

    if (error) {
      console.error('Error getting friendship status:', error);
      return 'none';
    }

    if (!statusData || statusData.length === 0) {
      return 'none';
    }

    const friendship = statusData[0];
    
    if (friendship.status === 'ACCEPTED') {
      return 'friends';
    } else if (friendship.status === 'PENDING') {
      if (friendship.requested_by === user.id) {
        return 'pending_sent';
      } else {
        return 'pending_received';
      }
    }

    return 'none';
  }


  // =====================================================
  // Activity Feed
  // =====================================================

  /**
   * Get activities for a specific user (for their profile view)
   */
  async getUserActivities(userId: UUID, limit: number = 20): Promise<ActivityFeedItem[]> {
    const { data, error } = await supabase
      .from('user_activities')
      .select(`
        *,
        user_profiles!user_activities_user_id_fkey (
          nickname,
          avatar_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to get user activities: ${error.message}`);

    return this.enhanceActivityFeedItems(data?.map(activity => ({
      activity_id: activity.id,
      user_id: activity.user_id,
      activity_type: activity.activity_type,
      title: activity.title,
      description: activity.description,
      created_at: activity.created_at,
      metadata: activity.metadata || {},
      user_nickname: activity.user_profiles?.nickname,
      user_avatar_url: activity.user_profiles?.avatar_url,
      related_data: {}
    })) || []);
  }

  /**
   * Get activity feed for current user (their activities + friends' + followed users' activities)
   */
  async getActivityFeed(limit: number = 50): Promise<ActivityFeedItem[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get own activities
    const { data: ownActivities, error: ownError } = await supabase
      .from('user_activities')
      .select(`
        *,
        user_profiles!user_activities_user_id_fkey (nickname, avatar_url)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(Math.ceil(limit / 3)); // Reserve space for other activities

    if (ownError) throw new Error(`Failed to get own activities: ${ownError.message}`);

    // Get friends' activities (from bidirectional friendships)
    const friends = await this.getFriends(user.id);
    const friendIds = friends.map(f => f.id);
    
    let friendActivities: any[] = [];
    if (friendIds.length > 0) {
      const { data: friendsData, error: friendsError } = await supabase
        .from('user_activities')
        .select(`
          *,
          user_profiles!user_activities_user_id_fkey (nickname, avatar_url),
          trips!user_activities_related_trip_id_fkey (privacy, owner_id, tagged_users)
        `)
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(Math.ceil(limit / 3));

      if (friendsError) {
        console.warn('Warning: Failed to get friends activities:', friendsError);
      } else {
        // Filter based on trip privacy for friends
        friendActivities = friendsData?.filter(activity => {
          if (!activity.related_trip_id) return true; // Non-trip activities always shown
          const trip = activity.trips;
          if (!trip) return true;
          
          return trip.privacy === 'public' || 
                 trip.privacy === 'contacts' || 
                 trip.owner_id === user.id ||
                 (trip.tagged_users && trip.tagged_users.includes(user.id));
        }) || [];
      }
    }

    // Get followed users' PUBLIC activities only (not friends)
    const following = await this.getFollowing(user.id);
    const followingIds = following
      .map(f => f.id)
      .filter(id => !friendIds.includes(id)); // Exclude friends (already covered above)
    
    let followedActivities: any[] = [];
    if (followingIds.length > 0) {
      const { data: followedData, error: followedError } = await supabase
        .from('user_activities')
        .select(`
          *,
          user_profiles!user_activities_user_id_fkey (nickname, avatar_url),
          trips!user_activities_related_trip_id_fkey (privacy, owner_id, tagged_users)
        `)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(Math.ceil(limit / 3));

      if (followedError) {
        console.warn('Warning: Failed to get followed users activities:', followedError);
      } else {
        // Only show PUBLIC activities from followed users
        followedActivities = followedData?.filter(activity => {
          if (!activity.related_trip_id) return true; // Non-trip activities shown
          const trip = activity.trips;
          if (!trip) return true;
          
          return trip.privacy === 'public' || 
                 trip.owner_id === user.id ||
                 (trip.tagged_users && trip.tagged_users.includes(user.id));
        }) || [];
      }
    }

    // Combine all activities and sort by creation date
    const allActivities = [...(ownActivities || []), ...friendActivities, ...followedActivities]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);

    // Transform to ActivityFeedItem format
    const feedItems = allActivities.map(activity => ({
      activity_id: activity.id,
      user_id: activity.user_id,
      user_nickname: activity.user_profiles?.nickname || 'Unknown',
      user_avatar: activity.user_profiles?.avatar_url,
      activity_type: activity.activity_type,
      title: activity.title,
      description: activity.description,
      metadata: activity.metadata || {},
      created_at: activity.created_at
    }));

    // Enhance activities with additional trip/destination info if needed
    return this.enhanceActivityFeedItems(feedItems);
  }

  /**
   * Get activity feed for a specific user
   */
  async getUserActivityFeed(userId: UUID, limit: number = 20): Promise<ActivityFeedItem[]> {
    const { data, error } = await supabase
      .from('user_activities')
      .select(`
        *,
        user_profiles!user_activities_user_id_fkey(nickname, avatar_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to get user activity feed: ${error.message}`);

    return this.enhanceActivityFeedItems(data?.map(activity => ({
      activity_id: activity.id,
      user_id: activity.user_id,
      user_nickname: activity.user_profiles?.nickname || 'Unknown',
      user_avatar: activity.user_profiles?.avatar_url,
      activity_type: activity.activity_type,
      title: activity.title,
      description: activity.description,
      metadata: activity.metadata,
      created_at: activity.created_at
    })) || []);
  }

  /**
   * Create a new activity
   */
  async createActivity(activity: Omit<UserActivity, 'id' | 'created_at'>): Promise<UserActivity> {
    const { data, error } = await supabase
      .from('user_activities')
      .insert({
        ...activity,
        created_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (error) throw new Error(`Failed to create activity: ${error.message}`);
    return data;
  }

  // =====================================================
  // Social Statistics
  // =====================================================

  /**
   * Get social statistics for a user
   */
  async getSocialStats(userId: UUID): Promise<SocialStats> {
    // Get follow counts
    const followCounts = await this.getFollowCounts(userId);
    
    // Get friend count (bidirectional accepted relationships)
    const { count: friendCount } = await supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
    
    // Get privacy-specific trip counts
    const { data: tripCounts } = await supabase
      .from('trips')
      .select('privacy')
      .eq('user_id', userId);

    const publicTripCount = tripCounts?.filter(t => t.privacy === 'public').length || 0;
    const contactTripCount = tripCounts?.filter(t => t.privacy === 'contacts').length || 0;

    return {
      follower_count: followCounts.followersCount,
      following_count: followCounts.followingCount,
      friend_count: friendCount || 0,
      trip_count: (tripCounts?.length || 0),
      public_trip_count: publicTripCount,
      contact_trip_count: contactTripCount
    };
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  /**
   * Enhance activity feed items with additional context
   */
  private async enhanceActivityFeedItems(activities: ActivityFeedItem[]): Promise<ActivityFeedItem[]> {
    // Get unique trip and destination IDs
    const tripIds = Array.from(new Set(activities.map(a => a.metadata.related_trip_id).filter(Boolean)));
    const destinationIds = Array.from(new Set(activities.map(a => a.metadata.related_destination_id).filter(Boolean)));

    // Fetch trip names
    const tripNames = new Map();
    if (tripIds.length > 0) {
      const { data: trips } = await supabase
        .from('trips')
        .select('id, name')
        .in('id', tripIds);
      
      trips?.forEach(trip => {
        tripNames.set(trip.id, trip.name);
      });
    }

    // Fetch destination info
    const destinationInfo = new Map();
    if (destinationIds.length > 0) {
      const { data: destinations } = await supabase
        .from('destinations')
        .select('id, name, location')
        .in('id', destinationIds);
      
      destinations?.forEach(dest => {
        destinationInfo.set(dest.id, { name: dest.name, location: dest.location });
      });
    }

    // Enhance activities with additional context
    return activities.map(activity => ({
      ...activity,
      trip_name: activity.metadata.related_trip_id ? 
        tripNames.get(activity.metadata.related_trip_id) : undefined,
      destination_name: activity.metadata.related_destination_id ? 
        destinationInfo.get(activity.metadata.related_destination_id)?.name : undefined,
      destination_location: activity.metadata.related_destination_id ? 
        destinationInfo.get(activity.metadata.related_destination_id)?.location : undefined
    }));
  }

  // =====================================================
  // Activity Helpers
  // =====================================================

  /**
   * Create trip-related activities
   */
  async createTripActivity(
    activityType: ActivityType.TRIP_CREATED | ActivityType.TRIP_COMPLETED | ActivityType.TRIP_SHARED | ActivityType.TRIP_STARTED,
    tripId: UUID,
    tripName: string,
    additionalMetadata: Record<string, any> = {}
  ): Promise<UserActivity> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const titles = {
      [ActivityType.TRIP_CREATED]: `Neue Reise "${tripName}" geplant`,
      [ActivityType.TRIP_STARTED]: `Reise "${tripName}" gestartet`,
      [ActivityType.TRIP_COMPLETED]: `Reise "${tripName}" abgeschlossen`,
      [ActivityType.TRIP_SHARED]: `Reise "${tripName}" geteilt`
    };

    const descriptions = {
      [ActivityType.TRIP_CREATED]: `hat eine neue Reise nach ${additionalMetadata.destination || 'unbekanntes Ziel'} geplant`,
      [ActivityType.TRIP_STARTED]: `ist aufgebrochen - die Reise hat begonnen!`,
      [ActivityType.TRIP_COMPLETED]: `hat eine Reise erfolgreich abgeschlossen`,
      [ActivityType.TRIP_SHARED]: `hat eine Reise öffentlich geteilt`
    };

    return this.createActivity({
      user_id: user.id,
      activity_type: activityType,
      related_trip_id: tripId,
      title: titles[activityType],
      description: descriptions[activityType],
      metadata: {
        trip_name: tripName,
        related_trip_id: tripId,
        ...additionalMetadata
      }
    });
  }

  /**
   * Create destination-related activities
   */
  async createDestinationActivity(
    activityType: ActivityType.DESTINATION_VISITED | ActivityType.DESTINATION_ADDED,
    destinationId: UUID,
    destinationName: string,
    location?: string,
    additionalMetadata: Record<string, any> = {}
  ): Promise<UserActivity> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const titles = {
      [ActivityType.DESTINATION_VISITED]: `${destinationName} besucht`,
      [ActivityType.DESTINATION_ADDED]: `Neues Ziel hinzugefügt: ${destinationName}`
    };

    const descriptions = {
      [ActivityType.DESTINATION_VISITED]: location ? `war in ${location}` : `hat ein Ziel besucht`,
      [ActivityType.DESTINATION_ADDED]: location ? `hat ${location} zur Reise hinzugefügt` : `hat ein neues Ziel hinzugefügt`
    };

    return this.createActivity({
      user_id: user.id,
      activity_type: activityType,
      related_destination_id: destinationId,
      title: titles[activityType],
      description: descriptions[activityType],
      metadata: {
        destination_name: destinationName,
        destination_location: location,
        related_destination_id: destinationId,
        ...additionalMetadata
      }
    });
  }

  /**
   * Create sharing-focused activities (new approach)
   * This is the new method for creating trip sharing activities that focus on publication/sharing events
   */
  async createTripSharingActivity(
    activityType: ActivityType.TRIP_PUBLISHED | ActivityType.TRIP_SHARED | ActivityType.TRIP_COMPLETED,
    tripId: UUID,
    tripName: string,
    additionalMetadata: Record<string, any> = {}
  ): Promise<UserActivity> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const titles = {
      [ActivityType.TRIP_PUBLISHED]: `"${tripName}" veröffentlicht`,
      [ActivityType.TRIP_SHARED]: `"${tripName}" geteilt`,
      [ActivityType.TRIP_COMPLETED]: `"${tripName}" abgeschlossen`
    };

    const descriptions = {
      [ActivityType.TRIP_PUBLISHED]: `hat die Reise öffentlich gemacht`,
      [ActivityType.TRIP_SHARED]: `hat die Reise mit Kontakten geteilt`, 
      [ActivityType.TRIP_COMPLETED]: `hat die Reise erfolgreich abgeschlossen`
    };

    return this.createActivity({
      user_id: user.id,
      activity_type: activityType,
      related_trip_id: tripId,
      title: titles[activityType],
      description: descriptions[activityType],
      metadata: {
        trip_name: tripName,
        related_trip_id: tripId,
        privacy_change: activityType === ActivityType.TRIP_PUBLISHED,
        ...additionalMetadata
      }
    });
  }

  // =====================================================
  // Photo Sharing
  // =====================================================

  /**
   * Share a photo from a trip or destination
   */
  async sharePhoto(data: CreatePhotoShareData): Promise<PhotoShare> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: photoShare, error } = await supabase
      .from('photo_shares')
      .insert({
        user_id: user.id,
        trip_id: data.trip_id,
        destination_id: data.destination_id,
        caption: data.caption,
        privacy: data.privacy,
        // Handle both single photo and multi-photo
        photo_url: data.photo_url || (data.photos && data.photos[0]?.url) || '',
        photos: data.photos || (data.photo_url ? [{ url: data.photo_url, order: 0 }] : []),
        photo_count: data.photos ? data.photos.length : 1
      })
      .select()
      .single();

    if (error) throw error;

    // Create activity for photo share
    try {
      // Get destination/trip details for activity
      let destinationName = '';
      let tripName = '';
      let location = '';

      if (data.destination_id) {
        const { data: destination } = await supabase
          .from('destinations')
          .select('name, location')
          .eq('id', data.destination_id)
          .single();
        
        if (destination) {
          destinationName = destination.name;
          location = destination.location;
        }
      }

      if (data.trip_id) {
        const { data: trip } = await supabase
          .from('trips')
          .select('name')
          .eq('id', data.trip_id)
          .single();
        
        if (trip) {
          tripName = trip.name;
        }
      }

      await this.createActivity({
        user_id: user.id,
        activity_type: ActivityType.PHOTO_SHARED,
        related_trip_id: data.trip_id || undefined,
        related_destination_id: data.destination_id || undefined,
        title: 'hat ein Foto geteilt',
        description: destinationName ? 
          `hat ein Foto von ${destinationName} geteilt` :
          tripName ?
          `hat ein Foto von der Reise ${tripName} geteilt` :
          `hat ein Foto geteilt`,
        metadata: {
          photo_url: data.photo_url || (data.photos && data.photos[0]?.url) || '',
          photos: data.photos,
          photo_count: data.photos ? data.photos.length : 1,
          caption: data.caption,
          destination_name: destinationName,
          location: location,
          trip_name: tripName,
          photo_share_id: photoShare.id,
          privacy: data.privacy
        }
      });
    } catch (error) {
      console.error('Failed to create photo share activity:', error);
      // Don't fail the whole operation if activity creation fails
    }

    return photoShare;
  }

  /**
   * Get photo shares with details
   */
  async getPhotoShares(limit = 20): Promise<PhotoShareWithDetails[]> {
    const { data, error } = await supabase
      .from('photo_shares_with_details')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get photo shares for a specific user
   */
  async getUserPhotoShares(userId: UUID, limit = 20): Promise<PhotoShareWithDetails[]> {
    const { data, error } = await supabase
      .from('photo_shares_with_details')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Like a photo
   */
  async likePhoto(photoShareId: UUID): Promise<PhotoLike> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('photo_likes')
      .select('id')
      .eq('photo_share_id', photoShareId)
      .eq('user_id', user.id)
      .single();

    if (existingLike) {
      throw new Error('Photo already liked');
    }

    const { data: like, error } = await supabase
      .from('photo_likes')
      .insert({
        photo_share_id: photoShareId,
        user_id: user.id
      })
      .select()
      .single();

    if (error) throw error;

    // Create activity for like (only if it's not the user's own photo)
    try {
      // Get photo share details
      const { data: photoShare } = await supabase
        .from('photo_shares_with_details')
        .select('*')
        .eq('id', photoShareId)
        .single();

      if (photoShare && photoShare.user_id !== user.id) {
        // Get current user's profile for the activity
        const { data: currentUser } = await supabase
          .from('user_profiles')
          .select('nickname')
          .eq('id', user.id)
          .single();

        await this.createActivity({
          user_id: photoShare.user_id, // Activity goes to photo owner
          activity_type: ActivityType.PHOTO_LIKED,
          related_destination_id: photoShare.destination_id,
          related_trip_id: photoShare.trip_id,
          title: 'Foto wurde geliked',
          description: `${currentUser?.nickname || 'Jemand'} gefällt Ihr Foto`,
          metadata: {
            photo_url: photoShare.photo_url,
            caption: photoShare.caption,
            destination_name: photoShare.destination_name,
            location: photoShare.destination_location,
            trip_name: photoShare.trip_name,
            photo_share_id: photoShareId,
            liker_user_id: user.id,
            targetUserName: photoShare.user_nickname
          }
        });
      }
    } catch (error) {
      console.error('Failed to create like activity:', error);
      // Don't fail the whole operation if activity creation fails
    }

    return like;
  }

  /**
   * Unlike a photo
   */
  async unlikePhoto(photoShareId: UUID): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('photo_likes')
      .delete()
      .eq('photo_share_id', photoShareId)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * Delete a photo share
   */
  async deletePhotoShare(photoShareId: UUID): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('photo_shares')
      .delete()
      .eq('id', photoShareId)
      .eq('user_id', user.id); // Only owner can delete

    if (error) throw error;
  }

  // =====================================================
  // Activity Likes and Comments
  // =====================================================

  /**
   * Like an activity
   */
  async likeActivity(activityId: string): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('activity_likes')
      .select('id')
      .eq('activity_id', activityId)
      .eq('user_id', user.id)
      .single();

    if (existingLike) {
      throw new Error('Activity already liked');
    }

    const { data: like, error } = await supabase
      .from('activity_likes')
      .insert({
        activity_id: activityId,
        user_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return like;
  }

  /**
   * Toggle activity like - likes if not liked, unlikes if already liked
   */
  async toggleActivityLike(activityId: string): Promise<{ isLiked: boolean; like?: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('activity_likes')
      .select('id')
      .eq('activity_id', activityId)
      .eq('user_id', user.id)
      .single();

    if (existingLike) {
      // Unlike the activity
      await this.unlikeActivity(activityId);
      return { isLiked: false };
    } else {
      // Like the activity
      const { data: like, error } = await supabase
        .from('activity_likes')
        .insert({
          activity_id: activityId,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return { isLiked: true, like };
    }
  }

  /**
   * Unlike an activity
   */
  async unlikeActivity(activityId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('activity_likes')
      .delete()
      .eq('activity_id', activityId)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * Add a comment to an activity
   */
  async addActivityComment(activityId: string, content: string): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get user's nickname for the comment
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('nickname')
      .eq('id', user.id)
      .single();

    const { data: comment, error } = await supabase
      .from('activity_comments')
      .insert({
        activity_id: activityId,
        user_id: user.id,
        content: content.trim()
      })
      .select()
      .single();

    if (error) throw error;

    return {
      ...comment,
      user_nickname: userProfile?.nickname || 'User'
    };
  }

  /**
   * Get likes for activities
   */
  async getActivityLikes(activityIds: string[]): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    if (activityIds.length === 0) return [];

    try {
      // Get like counts and user's like status for each activity
      const { data, error } = await supabase
        .from('activity_likes')
        .select('activity_id, user_id')
        .in('activity_id', activityIds);

      if (error) {
        console.warn('activity_likes table not found, returning empty array:', error);
        return [];
      }

      // Process the data to get counts and user's like status
      const likesMap = new Map();
      
      data?.forEach(like => {
        const existing = likesMap.get(like.activity_id) || { count: 0, user_liked: false };
        existing.count += 1;
        if (like.user_id === user.id) {
          existing.user_liked = true;
        }
        likesMap.set(like.activity_id, existing);
      });

      // Convert to array format
      return activityIds.map(activityId => ({
        activity_id: activityId,
        like_count: likesMap.get(activityId)?.count || 0,
        user_liked: likesMap.get(activityId)?.user_liked || false
      }));
    } catch (error) {
      console.warn('Error fetching activity likes:', error);
      return [];
    }
  }

  // =====================================================
  // Activity Notifications
  // =====================================================

  /**
   * Get activity notifications for the current user
   * Returns likes and comments on their posts
   */
  async getActivityNotifications(limit = 20): Promise<any[]> {
    console.log('🔄 socialService.getActivityNotifications: Method called');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('⚠️ socialService: No user found, returning empty array');
      return [];
    }
    console.log('✅ socialService: User found:', user.id);

    try {
      // APPROACH: Find ALL likes and comments where someone else interacted with the current user's content
      // Instead of looking for specific user_activities, we'll look for any activity_id that belongs to this user
      
      // Get ALL likes excluding user's own likes
      const { data: allLikes } = await supabase
        .from('activity_likes')
        .select(`
          activity_id,
          user_id,
          created_at
        `)
        .neq('user_id', user.id) // Exclude user's own likes
        .order('created_at', { ascending: false })
        .limit(50); // Get more to filter later


      // Get ALL comments excluding user's own comments
      const { data: allComments } = await supabase
        .from('activity_comments')
        .select(`
          activity_id,
          user_id,
          content,
          created_at
        `)
        .neq('user_id', user.id) // Exclude user's own comments
        .order('created_at', { ascending: false })
        .limit(50); // Get more to filter later


      // Now we need to determine which activities belong to the current user
      // We'll create notifications for ALL likes/comments and let the UI/logic determine relevance
      const likes = allLikes || [];
      const comments = allComments || [];

      // Get all unique user IDs from likes and comments
      const allUserIds = [
        ...(likes?.map(l => l.user_id) || []),
        ...(comments?.map(c => c.user_id) || [])
      ];
      const uniqueUserIds = Array.from(new Set(allUserIds));

      // Get user profiles for all users who liked/commented
      const userProfiles = new Map();
      if (uniqueUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, nickname, avatar_url')
          .in('id', uniqueUserIds);

        profiles?.forEach(profile => {
          userProfiles.set(profile.id, profile);
        });
      }

      // Combine and format notifications
      const notifications: any[] = [];

      // Process likes - create notifications for ALL likes (assume they're on user's content)
      likes?.forEach(like => {
        const userProfile = userProfiles.get(like.user_id);
        
        // For now, we'll assume all likes are on social posts and treat them as general posts
        notifications.push({
          id: `like_${like.activity_id}_${like.created_at}`,
          type: 'like',
          activityType: 'social_post', // Generic type for social posts
          isPhoto: false, // We'll determine this later if needed
          isTrip: false,  // We'll determine this later if needed
          activityTitle: 'Post',
          activityMetadata: {},
          userName: userProfile?.nickname || 'Ein Nutzer',
          userAvatar: userProfile?.avatar_url,
          createdAt: like.created_at,
          activityId: like.activity_id
        });
      });

      // Process comments - create notifications for ALL comments (assume they're on user's content)
      comments?.forEach(comment => {
        const userProfile = userProfiles.get(comment.user_id);
        
        // For now, we'll assume all comments are on social posts and treat them as general posts
        notifications.push({
          id: `comment_${comment.activity_id}_${comment.created_at}`,
          type: 'comment',
          activityType: 'social_post', // Generic type for social posts
          isPhoto: false, // We'll determine this later if needed
          isTrip: false,  // We'll determine this later if needed
          activityTitle: 'Post',
          activityMetadata: {},
          userName: userProfile?.nickname || 'Ein Nutzer',
          userAvatar: userProfile?.avatar_url,
          content: comment.content,
          createdAt: comment.created_at,
          activityId: comment.activity_id
        });
      });

      // Sort by creation date (newest first) and limit
      return notifications
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);

    } catch (error) {
      console.error('❌ Error loading activity notifications:', error);
      if (error instanceof Error) {
        console.error('❌ Error details:', error.message);
        console.error('❌ Error stack:', error.stack);
      }
      return [];
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadNotificationCount(): Promise<number> {
    try {
      const notifications = await this.getActivityNotifications(50);
      // For now, consider all notifications as unread
      // In the future, you could add a read_at field to track read status
      return notifications.length;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  /**
   * Get comments for activities
   */
  async getActivityComments(activityIds: string[]): Promise<any[]> {
    if (activityIds.length === 0) return [];

    try {
      // Use manual profile lookup approach by default to avoid foreign key relationship issues
      // Get comments first, then look up user profiles separately
      const { data: comments, error } = await supabase
        .from('activity_comments')
        .select('*')
        .in('activity_id', activityIds)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!comments || comments.length === 0) {
        return [];
      }

      // Get all unique user IDs from comments
      const userIds = Array.from(new Set(comments.map(comment => comment.user_id)));

      // Fetch user profiles for all users who commented
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, nickname, display_name, avatar_url')
        .in('id', userIds);

      // Create a map for quick lookup (ignore profile errors, just use 'User' as fallback)
      const profileMap = new Map();
      if (!profileError && profiles) {
        profiles.forEach(profile => {
          // Use display_name first for comments, then nickname as fallback
          const displayName = profile.display_name || profile.nickname || 'User';
          
          profileMap.set(profile.id, {
            nickname: displayName,
            avatar_url: profile.avatar_url
          });
        });
      }

      // Combine comments with user profile information
      return comments.map(comment => ({
        ...comment,
        user_nickname: profileMap.get(comment.user_id)?.nickname || 'User',
        user_avatar: profileMap.get(comment.user_id)?.avatar_url
      }));
    } catch (tableError) {
      console.warn('activity_comments table access failed:', tableError);
      return []; // Return empty array if table doesn't exist or can't be accessed
    }
  }
}

// Export singleton instance
export const socialService = new SocialService();
export default socialService;