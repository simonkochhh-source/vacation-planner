/**
 * Social Network Service
 * Handles user following, activity feeds, and social interactions
 */

import { supabase } from '../lib/supabase';
import {
  UUID,
  Follow,
  FollowStatus,
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
  // Follow Management
  // =====================================================
  
  /**
   * Send a follow request to another user
   */
  async followUser(targetUserId: UUID): Promise<Follow> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if relationship already exists
    const { data: existing } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .single();

    if (existing) {
      throw new Error('Follow relationship already exists');
    }

    const { data, error } = await supabase
      .from('follows')
      .insert({
        follower_id: user.id,
        following_id: targetUserId,
        status: FollowStatus.PENDING
      })
      .select('*')
      .single();

    if (error) throw new Error(`Failed to create follow request: ${error.message}`);
    
    // Create activity for follow request
    await this.createActivity({
      user_id: user.id,
      activity_type: ActivityType.TRIP_SHARED, // We can add FOLLOW_REQUEST later
      title: `Follow-Anfrage gesendet`,
      description: `Du hast eine Follow-Anfrage gesendet`,
      metadata: { target_user_id: targetUserId }
    });

    return data;
  }

  /**
   * Unfollow a user (or cancel follow request)
   */
  async unfollowUser(targetUserId: UUID): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId);

    if (error) throw new Error(`Failed to unfollow user: ${error.message}`);
  }

  /**
   * Accept a follow request
   */
  async acceptFollowRequest(followId: UUID): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get the follow request details before accepting
    const { data: followData } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('id', followId)
      .eq('following_id', user.id)
      .single();

    const { error } = await supabase
      .from('follows')
      .update({ status: FollowStatus.ACCEPTED, updated_at: new Date().toISOString() })
      .eq('id', followId)
      .eq('following_id', user.id); // Only the person being followed can accept

    if (error) throw new Error(`Failed to accept follow request: ${error.message}`);

    // Create activity for the user who initiated the follow
    if (followData?.follower_id) {
      try {
        const { data: targetUserProfile } = await supabase
          .from('user_profiles')
          .select('nickname')
          .eq('user_id', user.id)
          .single();

        await this.createActivity({
          user_id: followData.follower_id,
          activity_type: ActivityType.USER_FOLLOWED,
          title: 'Neuer Follower',
          description: `Du folgst jetzt ${targetUserProfile?.nickname || 'einem Nutzer'}`,
          metadata: { 
            target_user_id: user.id,
            target_user_name: targetUserProfile?.nickname || 'Unbekannt'
          }
        });
      } catch (activityError) {
        console.warn('Failed to create follow activity:', activityError);
      }
    }
  }

  /**
   * Decline a follow request
   */
  async declineFollowRequest(followId: UUID): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('follows')
      .update({ status: FollowStatus.DECLINED, updated_at: new Date().toISOString() })
      .eq('id', followId)
      .eq('following_id', user.id); // Only the person being followed can decline

    if (error) throw new Error(`Failed to decline follow request: ${error.message}`);
  }

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

    // Get follow status for each user
    const userIds = data.map(u => u.id);
    const { data: followData } = await supabase
      .from('follows')
      .select('following_id, status')
      .eq('follower_id', user.id)
      .in('following_id', userIds);

    const followMap = new Map();
    followData?.forEach(f => {
      followMap.set(f.following_id, f.status);
    });

    return data.map(u => ({
      ...u,
      follow_status: followMap.get(u.id) || 'none'
    }));
  }

  /**
   * Get a user's public profile
   */
  async getUserProfile(userId: UUID): Promise<SocialUserProfile> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .eq('is_public_profile', true)
      .single();

    if (error) throw new Error(`Failed to get user profile: ${error.message}`);
    return data;
  }

  // =====================================================
  // Friendship Management (Bidirectional)
  // =====================================================

  /**
   * Send a friend request (creates follow relationship)
   */
  async sendFriendRequest(targetUserId: UUID): Promise<Follow> {
    return this.followUser(targetUserId);
  }

  /**
   * Accept a friend request (creates bidirectional friendship)
   */
  async acceptFriendRequest(requesterId: UUID): Promise<{ accepted: Follow; reciprocal: Follow }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Accept the incoming request
    const accepted = await this.acceptFollowRequest(requesterId);

    // Create reciprocal follow relationship to establish friendship
    let reciprocal: Follow;
    try {
      reciprocal = await this.followUser(requesterId);
      // Immediately accept the reciprocal relationship
      const { data } = await supabase
        .from('follows')
        .update({ status: FollowStatus.ACCEPTED })
        .eq('follower_id', user.id)
        .eq('following_id', requesterId)
        .select('*')
        .single();
      
      if (data) reciprocal = data;
    } catch (error) {
      // If reciprocal relationship already exists, just accept it
      const { data } = await supabase
        .from('follows')
        .update({ status: FollowStatus.ACCEPTED })
        .eq('follower_id', user.id)
        .eq('following_id', requesterId)
        .select('*')
        .single();
      
      if (!data) throw new Error('Failed to create or update reciprocal relationship');
      reciprocal = data;
    }

    return { accepted, reciprocal };
  }

  /**
   * Get user's friends (bidirectional accepted follows)
   */
  async getFriends(userId?: UUID): Promise<SocialUserProfile[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const targetUserId = userId || user.id;

    const { data, error } = await supabase
      .from('friendships')
      .select(`
        user1_id,
        user2_id,
        friendship_created_at
      `)
      .or(`user1_id.eq.${targetUserId},user2_id.eq.${targetUserId}`);

    if (error) throw new Error(`Failed to get friends: ${error.message}`);

    // Get friend user IDs
    const friendIds = data.map(f => 
      f.user1_id === targetUserId ? f.user2_id : f.user1_id
    );

    if (friendIds.length === 0) return [];

    // Get friend profiles
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .in('id', friendIds);

    if (profileError) throw new Error(`Failed to get friend profiles: ${profileError.message}`);

    return profiles || [];
  }

  /**
   * Check if two users are friends
   */
  async areFriends(userId1: UUID, userId2: UUID): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('are_users_friends', {
        user1: userId1,
        user2: userId2
      });

    if (error) {
      console.warn('Error checking friendship:', error);
      return false;
    }

    return data || false;
  }

  /**
   * Remove friendship (removes both follow relationships)
   */
  async removeFriend(friendUserId: UUID): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Remove both follow relationships
    await Promise.all([
      supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', friendUserId),
      supabase
        .from('follows')
        .delete()
        .eq('follower_id', friendUserId)
        .eq('following_id', user.id)
    ]);
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

  // =====================================================
  // Follow Relationships (Legacy)
  // =====================================================

  /**
   * Get a user's followers
   */
  async getFollowers(userId: UUID): Promise<SocialUserProfile[]> {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        user_profiles!follows_follower_id_fkey(*)
      `)
      .eq('following_id', userId)
      .eq('status', FollowStatus.ACCEPTED);

    if (error) throw new Error(`Failed to get followers: ${error.message}`);
    
    return (data?.map(f => f.user_profiles).filter(Boolean) || []) as unknown as SocialUserProfile[];
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(userId: UUID): Promise<SocialUserProfile[]> {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        user_profiles!follows_following_id_fkey(*)
      `)
      .eq('follower_id', userId)
      .eq('status', FollowStatus.ACCEPTED);

    if (error) throw new Error(`Failed to get following: ${error.message}`);
    
    return (data?.map(f => f.user_profiles).filter(Boolean) || []) as unknown as SocialUserProfile[];
  }

  /**
   * Get pending follow requests for the current user
   */
  async getFollowRequests(): Promise<Follow[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('follows')
      .select(`
        *,
        user_profiles!follows_follower_id_fkey(nickname, display_name, avatar_url)
      `)
      .eq('following_id', user.id)
      .eq('status', FollowStatus.PENDING)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get follow requests: ${error.message}`);
    return data || [];
  }

  /**
   * Get follow status between current user and target user
   */
  async getFollowStatus(targetUserId: UUID): Promise<FollowStatus | 'none'> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'none';

    const { data, error } = await supabase
      .from('follows')
      .select('status')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .single();

    if (error || !data) return 'none';
    return data.status as FollowStatus;
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
   * Get activity feed for current user (their activities + followed users' activities)
   */
  async getActivityFeed(limit: number = 50): Promise<ActivityFeedItem[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Use the database function for efficient feed generation
    const { data, error } = await supabase
      .rpc('get_activity_feed', {
        user_uuid: user.id,
        limit_count: limit
      });

    if (error) throw new Error(`Failed to get activity feed: ${error.message}`);

    // Enhance activities with additional trip/destination info if needed
    return this.enhanceActivityFeedItems(data || []);
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
    // Use the database function for efficient stats calculation
    const { data, error } = await supabase
      .rpc('get_user_social_stats', { user_uuid: userId });

    if (error) throw new Error(`Failed to get social stats: ${error.message}`);

    const stats = data?.[0];
    
    // Get privacy-specific trip counts
    const { data: tripCounts } = await supabase
      .from('trips')
      .select('privacy')
      .eq('user_id', userId);

    const publicTripCount = tripCounts?.filter(t => t.privacy === 'public').length || 0;
    const contactTripCount = tripCounts?.filter(t => t.privacy === 'contacts').length || 0;

    return {
      follower_count: stats?.follower_count || 0,
      following_count: stats?.following_count || 0,
      trip_count: stats?.trip_count || 0,
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
}

// Export singleton instance
export const socialService = new SocialService();
export default socialService;