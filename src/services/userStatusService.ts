import { supabase } from '../lib/supabase';

// User Status Types
export type UserStatus = 'online' | 'offline' | 'away';

export interface UserStatusInfo {
  user_id: string;
  status: UserStatus;
  last_seen_at: string;
  status_message?: string;
  updated_at: string;
}

export interface UserWithStatus {
  id: string;
  nickname?: string;
  display_name?: string;
  avatar_url?: string;
  status: UserStatus;
  last_seen_at: string;
  status_message?: string;
}

class UserStatusService {
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private currentStatus: UserStatus = 'offline';
  private statusListeners: ((statuses: UserStatusInfo[]) => void)[] = [];

  /**
   * Initialize user status tracking
   */
  async initialize(): Promise<void> {
    try {
      console.log('🟢 UserStatus: Initializing status service...');
      
      // Set user as online when service starts
      await this.setStatus('online');
      
      // Start heartbeat to maintain online status
      this.startHeartbeat();
      
      // Set up real-time subscription for status updates
      this.setupRealtimeSubscription();
      
      // Handle page visibility changes
      this.setupVisibilityHandlers();
      
      // Handle beforeunload to set offline status
      this.setupUnloadHandler();
      
      console.log('✅ UserStatus: Service initialized successfully');
    } catch (error) {
      console.error('❌ UserStatus: Failed to initialize:', error);
    }
  }

  /**
   * Set current user's status
   */
  async setStatus(status: UserStatus, statusMessage?: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('⚠️ UserStatus: No authenticated user');
        return;
      }

      console.log(`🔄 UserStatus: Setting status to ${status}${statusMessage ? ` with message: ${statusMessage}` : ''}`);

      const { error } = await supabase
        .from('user_status')
        .upsert({
          user_id: user.id,
          status,
          status_message: statusMessage || null,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ UserStatus: Failed to update status:', error);
        throw error;
      }

      this.currentStatus = status;
      console.log(`✅ UserStatus: Status updated to ${status}`);
    } catch (error) {
      console.error('❌ UserStatus: Error setting status:', error);
      throw error;
    }
  }

  /**
   * Get current user's status
   */
  async getCurrentStatus(): Promise<UserStatusInfo | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_status')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ UserStatus: Error getting current status:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ UserStatus: Error getting current status:', error);
      return null;
    }
  }

  /**
   * Get status for multiple users
   */
  async getUserStatuses(userIds: string[]): Promise<UserStatusInfo[]> {
    try {
      if (userIds.length === 0) return [];

      const { data, error } = await supabase
        .from('user_status')
        .select('*')
        .in('user_id', userIds);

      if (error) {
        console.error('❌ UserStatus: Error getting user statuses:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ UserStatus: Error getting user statuses:', error);
      return [];
    }
  }

  /**
   * Get online users with profile information
   */
  async getOnlineUsersWithProfiles(): Promise<UserWithStatus[]> {
    try {
      const { data, error } = await supabase
        .from('user_status')
        .select(`
          user_id,
          status,
          last_seen_at,
          status_message,
          users!inner (
            nickname,
            display_name,
            avatar_url
          )
        `)
        .in('status', ['online', 'away'])
        .order('last_seen_at', { ascending: false });

      if (error) {
        console.error('❌ UserStatus: Error getting online users:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.user_id,
        nickname: item.users?.nickname,
        display_name: item.users?.display_name,
        avatar_url: item.users?.avatar_url,
        status: item.status as UserStatus,
        last_seen_at: item.last_seen_at,
        status_message: item.status_message
      }));
    } catch (error) {
      console.error('❌ UserStatus: Error getting online users:', error);
      return [];
    }
  }

  /**
   * Get status for specific users with profile info
   */
  async getUsersWithStatus(userIds: string[]): Promise<UserWithStatus[]> {
    try {
      if (userIds.length === 0) return [];

      const { data, error } = await supabase
        .from('user_status')
        .select(`
          user_id,
          status,
          last_seen_at,
          status_message,
          users!inner (
            nickname,
            display_name,
            avatar_url
          )
        `)
        .in('user_id', userIds);

      if (error) {
        console.error('❌ UserStatus: Error getting users with status:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.user_id,
        nickname: item.users?.nickname,
        display_name: item.users?.display_name,
        avatar_url: item.users?.avatar_url,
        status: item.status as UserStatus,
        last_seen_at: item.last_seen_at,
        status_message: item.status_message
      }));
    } catch (error) {
      console.error('❌ UserStatus: Error getting users with status:', error);
      return [];
    }
  }

  /**
   * Update last seen timestamp (heartbeat)
   */
  async updateLastSeen(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || this.currentStatus === 'offline') return;

      const { error } = await supabase
        .from('user_status')
        .update({
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ UserStatus: Error updating last seen:', error);
      }
    } catch (error) {
      console.error('❌ UserStatus: Error updating last seen:', error);
    }
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: (statuses: UserStatusInfo[]) => void): () => void {
    this.statusListeners.push(callback);
    
    return () => {
      const index = this.statusListeners.indexOf(callback);
      if (index > -1) {
        this.statusListeners.splice(index, 1);
      }
    };
  }

  /**
   * Start heartbeat to maintain online status
   */
  private startHeartbeat(): void {
    // Update last seen every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.updateLastSeen();
    }, 30000);

    console.log('💓 UserStatus: Heartbeat started (30s interval)');
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('💓 UserStatus: Heartbeat stopped');
    }
  }

  /**
   * Setup real-time subscription for status updates
   */
  private setupRealtimeSubscription(): void {
    try {
      supabase
        .channel('user-status-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_status'
          },
          (payload) => {
            console.log('📡 UserStatus: Real-time status change:', payload);
            
            // Notify all listeners
            this.statusListeners.forEach(listener => {
              // For now, we'll just pass the changed record
              // In a full implementation, you might fetch all relevant statuses
              listener([payload.new as UserStatusInfo]);
            });
          }
        )
        .subscribe();

      console.log('📡 UserStatus: Real-time subscription established');
    } catch (error) {
      console.error('❌ UserStatus: Error setting up real-time subscription:', error);
    }
  }

  /**
   * Handle page visibility changes (away/online)
   */
  private setupVisibilityHandlers(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden - set to away
        this.setStatus('away');
        this.stopHeartbeat();
      } else {
        // Page is visible - set to online
        this.setStatus('online');
        this.startHeartbeat();
      }
    });

    // Handle window focus/blur as well
    window.addEventListener('focus', () => {
      if (this.currentStatus !== 'offline') {
        this.setStatus('online');
        this.startHeartbeat();
      }
    });

    window.addEventListener('blur', () => {
      if (this.currentStatus !== 'offline') {
        this.setStatus('away');
      }
    });

    console.log('👁️ UserStatus: Visibility handlers set up');
  }

  /**
   * Handle page unload to set offline status
   */
  private setupUnloadHandler(): void {
    const handleUnload = () => {
      // Use sendBeacon for reliable offline status on page unload
      this.setStatusOfflineBeacon();
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    console.log('🚪 UserStatus: Unload handlers set up');
  }

  /**
   * Set offline status using beacon (for reliable page unload)
   */
  private async setStatusOfflineBeacon(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Try to use sendBeacon for reliable delivery
      if ('sendBeacon' in navigator && typeof navigator.sendBeacon === 'function') {
        const data = JSON.stringify({
          user_id: user.id,
          status: 'offline',
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        // This would need a special endpoint that accepts beacon data
        // For now, we'll fall back to regular update
      }

      // Fallback to regular update (may not complete if page unloads quickly)
      await this.setStatus('offline');
    } catch (error) {
      console.error('❌ UserStatus: Error setting offline status on unload:', error);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopHeartbeat();
    this.statusListeners = [];
    console.log('🧹 UserStatus: Service cleaned up');
  }

  /**
   * Get status color for UI display - returns CSS custom property
   */
  getStatusColor(status: UserStatus): string {
    switch (status) {
      case 'online':
        return 'var(--color-success-50)'; // Green from design tokens
      case 'away':
        return 'var(--color-warning-50)'; // Yellow/Orange from design tokens
      case 'offline':
        return 'var(--color-neutral-50)'; // Gray from design tokens
      default:
        return 'var(--color-neutral-50)';
    }
  }

  /**
   * Get status display text
   */
  getStatusText(status: UserStatus): string {
    switch (status) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Abwesend';
      case 'offline':
        return 'Offline';
      default:
        return 'Unbekannt';
    }
  }

  /**
   * Format last seen time for display
   */
  formatLastSeen(lastSeenAt: string): string {
    const lastSeen = new Date(lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return 'Gerade eben';
    } else if (diffMins < 60) {
      return `Vor ${diffMins} Min.`;
    } else if (diffHours < 24) {
      return `Vor ${diffHours} Std.`;
    } else if (diffDays < 7) {
      return `Vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
    } else {
      return lastSeen.toLocaleDateString('de-DE');
    }
  }
}

// Export singleton instance
export const userStatusService = new UserStatusService();
export default userStatusService;