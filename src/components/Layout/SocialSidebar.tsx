import React, { useState, useMemo, useEffect } from 'react';
import { useTripContext } from '../../contexts/TripContext';
import { useDestinationContext } from '../../contexts/DestinationContext';
import { useUIContext } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';
import { TripStatus, SocialUserProfile } from '../../types';
import { userStatusService } from '../../services/userStatusService';
import { chatService, ChatRoomWithInfo } from '../../services/chatService';
import { socialService } from '../../services/socialService';
import { supabase } from '../../lib/supabase';
import { 
  User, 
  Users, 
  Heart, 
  MessageCircle, 
  MapPin, 
  Calendar,
  Settings,
  Bell,
  TrendingUp,
  Plus,
  X,
  Plane,
  Trash2
} from 'lucide-react';

interface SocialSidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  onClose: () => void;
}

interface MockUser {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
  mutualFriends?: number;
}

interface ActivityItem {
  id: string;
  type: 'trip_shared' | 'photo_liked' | 'friend_joined' | 'destination_reviewed';
  user: MockUser;
  content: string;
  timestamp: string;
  tripName?: string;
  photoCount?: number;
}

const SocialSidebar: React.FC<SocialSidebarProps> = ({ isOpen, isMobile, onClose }) => {
  const { trips } = useTripContext();
  const { destinations } = useDestinationContext();
  const { updateUIState } = useUIContext();
  const { user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'friends' | 'activity' | 'suggestions' | 'chat'>('friends');
  const [avatarError, setAvatarError] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [nextTrip, setNextTrip] = useState<any>(null);
  const [friends, setFriends] = useState<SocialUserProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [chatRooms, setChatRooms] = useState<ChatRoomWithInfo[]>([]);
  const [loadingChatRooms, setLoadingChatRooms] = useState(false);

  // No more mock data - using live data only

  // Real activity and suggestions data - no more mock data
  const [activityItems] = useState<ActivityItem[]>([]);
  const [suggestedUsers] = useState<MockUser[]>([]);

  // Find next upcoming trip
  const findNextTrip = useMemo(() => {
    const now = new Date();
    const upcomingTrips = trips
      .filter(trip => trip.status === TripStatus.PLANNING && new Date(trip.startDate) > now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    
    return upcomingTrips.length > 0 ? upcomingTrips[0] : null;
  }, [trips]);

  // Update next trip when it changes
  useEffect(() => {
    setNextTrip(findNextTrip);
  }, [findNextTrip]);

  // Initialize user status service when sidebar opens
  useEffect(() => {
    if (isOpen && user) {
      userStatusService.initialize().catch(error => {
        console.error('Failed to initialize user status service:', error);
      });
      
      // Load friends
      loadFriends();
      
      // Load chat rooms
      loadChatRooms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  // Load friends from socialService
  const loadFriends = async () => {
    if (!user) return;
    
    try {
      setLoadingFriends(true);
      console.log('🔄 SocialSidebar: Loading friends for user:', user.id);
      const friendsList = await socialService.getFriends();
      setFriends(friendsList);
      console.log('✅ SocialSidebar: Loaded friends:', friendsList.length);
      console.log('📊 SocialSidebar: Friends details:', friendsList.map(f => ({ id: f.id, nickname: f.nickname, display_name: f.display_name })));
    } catch (error) {
      console.error('❌ SocialSidebar: Error loading friends:', error);
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  };


  // Load chat rooms from database
  const loadChatRooms = async () => {
    if (!user) return;
    
    try {
      setLoadingChatRooms(true);
      const rooms = await chatService.getUserChatRooms();
      setChatRooms(rooms);
      console.log('✅ Chat: Loaded chat rooms for sidebar:', rooms.length);
    } catch (error) {
      console.error('❌ Chat: Error loading chat rooms:', error);
      setChatRooms([]); // Set empty array on error to prevent UI issues
    } finally {
      setLoadingChatRooms(false);
    }
  };

  // Handle deleting a chat room
  const handleDeleteRoom = async (roomId: string) => {
    const roomToDelete = chatRooms.find(room => room.id === roomId);
    const roomName = roomToDelete?.name || 'Unbekannter Chat';
    
    if (!window.confirm(`Möchten Sie den Chat "${roomName}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    try {
      console.log('🔄 SocialSidebar: Deleting room:', roomId);
      
      await chatService.deleteChatRoom(roomId);
      
      console.log('✅ SocialSidebar: Room deleted, refreshing list...');
      
      // Immediately update local state to provide instant feedback
      setChatRooms(prevRooms => prevRooms.filter(room => room.id !== roomId));
      
      // Close chat if currently selected room was deleted  
      updateUIState({ 
        chatOpen: false,
        selectedChatRoomId: undefined 
      });
      
      // Refresh from service to ensure consistency
      setTimeout(async () => {
        try {
          await loadChatRooms();
        } catch (refreshError) {
          console.warn('Could not refresh chat rooms list:', refreshError);
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ SocialSidebar: Error deleting room:', error);
      alert('Fehler beim Löschen des Chats: ' + (error as Error).message);
      
      // Refresh the list in case of error to show current state
      await loadChatRooms();
    }
  };

  // Calculate countdown to next trip
  const calculateCountdown = (targetDate: string) => {
    const now = new Date().getTime();
    const target = new Date(targetDate).getTime();
    const difference = target - now;

    if (difference > 0) {
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      return { days, hours, minutes, seconds };
    }

    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  };

  // Update countdown every second
  useEffect(() => {
    if (!nextTrip) return;

    const updateCountdown = () => {
      const newCountdown = calculateCountdown(nextTrip.startDate);
      setCountdown(newCountdown);
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextTrip]);

  // Calculate user stats from real data - including real friends count
  const userStats = useMemo(() => {
    const completedTrips = trips.filter(trip => trip.status === 'completed').length;
    const visitedDestinations = destinations.filter(dest => dest.status === 'visited').length;
    
    return {
      totalTrips: trips.length,
      completedTrips,
      totalDestinations: destinations.length,
      visitedDestinations,
      // Use real friends count from loaded friends
      friends: friends.length,  // Real friend count from socialService
      following: 0,   // Legacy following count (not used in bidirectional friends)  
      followers: 0    // Legacy follower count (not used in bidirectional friends)
    };
  }, [trips, destinations, friends]);

  const handleNavigateToProfile = () => {
    // Navigate to user's own profile
    updateUIState({ currentView: 'my-profile' });
    if (isMobile) {
      onClose();
    }
  };

  const handleNavigateToSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateUIState({ currentView: 'settings' });
    if (isMobile) {
      onClose();
    }
  };

  const handleOpenChat = (roomId?: string) => {
    updateUIState({ 
      chatOpen: true,
      selectedChatRoomId: roomId 
    });
  };


  const handleStartDirectChat = async (userId: string) => {
    try {
      console.log('🔄 Starting direct chat with user:', userId);
      
      // Import chatService here to avoid circular dependencies
      const { chatService } = await import('../../services/chatService');
      
      // Get or create direct message room
      const directRoom = await chatService.getOrCreateDirectRoom(userId);
      console.log('✅ Direct room created/found:', directRoom.id);
      
      // Open chat with the specific room
      handleOpenChat(directRoom.id);
    } catch (error) {
      console.error('❌ Failed to start direct chat:', error);
      
      // For development, still open the chat interface even if room creation fails
      console.log('🔧 Dev mode: Opening chat interface anyway for testing');
      handleOpenChat();
    }
  };

  const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.warn('⚠️ Avatar failed to load:', e.currentTarget.src);
    console.warn('⚠️ This is normal for Google OAuth avatars due to CORS restrictions.');
    setAvatarError(true);
  };

  const getDisplayName = () => {
    // Priority 1: Use display name from user profile (database)
    const profileDisplayName = userProfile?.display_name;
    
    // Priority 2: Try multiple sources for display name from OAuth
    const oauthDisplayName = user?.user_metadata?.full_name || 
                            user?.user_metadata?.name ||
                            user?.user_metadata?.display_name ||
                            user?.user_metadata?.given_name ||
                            user?.identities?.[0]?.identity_data?.full_name ||
                            user?.identities?.[0]?.identity_data?.name;
    
    // Priority 3: Fallback to email or default
    const emailBaseName = user?.email?.split('@')[0];
    
    const finalDisplayName = profileDisplayName || oauthDisplayName || emailBaseName || 'Reisender';
    
    console.log('🔍 SocialSidebar - Display name sources:', {
      profile_display_name: profileDisplayName,
      full_name: user?.user_metadata?.full_name,
      name: user?.user_metadata?.name,
      display_name: user?.user_metadata?.display_name,
      given_name: user?.user_metadata?.given_name,
      identity_full_name: user?.identities?.[0]?.identity_data?.full_name,
      identity_name: user?.identities?.[0]?.identity_data?.name,
      email_base: emailBaseName,
      final_display_name: finalDisplayName
    });
    
    return finalDisplayName;
  };

  const getUsername = () => {
    // Priority 1: Use nickname from user profile (database) - this is the main username
    const profileNickname = userProfile?.nickname;
    
    // Priority 2: For username from OAuth, prioritize avoiding email addresses
    const oauthUsername = user?.user_metadata?.nickname ||
                         user?.user_metadata?.preferred_username || 
                         user?.user_metadata?.username || 
                         user?.user_metadata?.handle ||
                         user?.identities?.[0]?.identity_data?.nickname ||
                         user?.identities?.[0]?.identity_data?.preferred_username ||
                         user?.identities?.[0]?.identity_data?.username ||
                         user?.identities?.[0]?.identity_data?.handle;
    
    // Priority 3: Only fall back to email if no other options
    const emailBaseName = user?.email?.split('@')[0];
    
    const finalUsername = profileNickname || oauthUsername || emailBaseName || 'user';
    
    console.log('🔍 SocialSidebar - Username sources:', {
      profile_nickname: profileNickname,
      nickname: user?.user_metadata?.nickname,
      preferred_username: user?.user_metadata?.preferred_username,
      username: user?.user_metadata?.username,
      handle: user?.user_metadata?.handle,
      identity_nickname: user?.identities?.[0]?.identity_data?.nickname,
      identity_preferred_username: user?.identities?.[0]?.identity_data?.preferred_username,
      identity_username: user?.identities?.[0]?.identity_data?.username,
      identity_handle: user?.identities?.[0]?.identity_data?.handle,
      email_base: emailBaseName,
      final_username: finalUsername
    });
    
    return finalUsername;
  };

  const getAvatarUrl = () => {
    if (avatarError) return null;
    
    // Priority 1: Check if user has uploaded avatar to Supabase Storage (stored in user profile)
    const supabaseAvatarUrl = userProfile?.avatar_url;
    
    // Priority 2: Check OAuth provider avatar URLs from user metadata
    // Skip Google OAuth avatars that commonly fail due to CORS
    const oauthAvatarUrl = user?.user_metadata?.avatar_url || 
                          user?.user_metadata?.picture ||
                          user?.user_metadata?.image_url ||
                          user?.user_metadata?.profile_picture ||
                          user?.user_metadata?.photo ||
                          user?.user_metadata?.image ||
                          user?.identities?.[0]?.identity_data?.avatar_url ||
                          user?.identities?.[0]?.identity_data?.picture ||
                          user?.identities?.[0]?.identity_data?.image_url ||
                          user?.identities?.[0]?.identity_data?.profile_picture ||
                          user?.identities?.[0]?.identity_data?.photo ||
                          user?.identities?.[0]?.identity_data?.image;
    
    // Filter out problematic Google OAuth avatar URLs
    const isGoogleAvatarUrl = oauthAvatarUrl && oauthAvatarUrl.includes('googleusercontent.com');
    const safeOAuthAvatarUrl = isGoogleAvatarUrl ? null : oauthAvatarUrl;
    
    // Use Supabase avatar first (from DB profile), then fallback to safe OAuth avatar
    const finalAvatarUrl = supabaseAvatarUrl || safeOAuthAvatarUrl;
    
    console.log('🔍 SocialSidebar - Avatar selection:', {
      supabase_avatar: supabaseAvatarUrl,
      oauth_avatar: oauthAvatarUrl,
      is_google_avatar: isGoogleAvatarUrl,
      safe_oauth_avatar: safeOAuthAvatarUrl,
      final_avatar_url: finalAvatarUrl,
      avatar_error_state: avatarError
    });
    
    return finalAvatarUrl;
  };

  const getUserInitials = () => {
    const name = getDisplayName();
    const words = name.split(' ').filter((word: string) => word.length > 0);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const sidebarWidth = isMobile ? '280px' : '320px';
  
  // Set CSS custom property for chat positioning
  useEffect(() => {
    const sidebarWidthValue = isMobile ? 280 : 320;
    document.documentElement.style.setProperty('--social-sidebar-width', `${sidebarWidthValue}px`);
    
    return () => {
      // Clean up on unmount
      document.documentElement.style.removeProperty('--social-sidebar-width');
    };
  }, [isMobile]);

  // Render countdown to next trip
  const renderCountdown = () => {
    if (!nextTrip) return null;

    const { days, hours, minutes, seconds } = countdown;
    const hasCountdown = days > 0 || hours > 0 || minutes > 0 || seconds > 0;

    if (!hasCountdown) return null;

    return (
      <div 
        style={{
          margin: 'var(--space-3) var(--space-4)',
          padding: 'var(--space-3)',
          background: 'linear-gradient(135deg, rgba(74, 144, 164, 0.1) 0%, rgba(135, 169, 107, 0.1) 100%)',
          borderRadius: 'var(--radius-lg)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'rgba(74, 144, 164, 0.2)',
          cursor: 'pointer',
          transition: 'all var(--motion-duration-short) var(--motion-easing-standard)'
        }}
        onClick={() => {
          updateUIState({ 
            currentView: 'list', 
            activeTripId: nextTrip.id,
            selectedTripId: nextTrip.id 
          });
          if (isMobile) {
            onClose();
          }
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(74, 144, 164, 0.15) 0%, rgba(135, 169, 107, 0.15) 100%)';
          e.currentTarget.style.borderColor = 'rgba(74, 144, 164, 0.3)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(74, 144, 164, 0.1) 0%, rgba(135, 169, 107, 0.1) 100%)';
          e.currentTarget.style.borderColor = 'rgba(74, 144, 164, 0.2)';
          e.currentTarget.style.transform = 'translateY(0px)';
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-2)'
        }}>
          <Plane size={16} style={{ color: 'var(--color-primary-ocean)' }} />
          <span style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-text-primary)'
          }}>
            Nächste Reise
          </span>
        </div>

        {/* Trip Name */}
        <div style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--space-2)',
          fontWeight: 'var(--font-weight-medium)'
        }}>
          {nextTrip.name}
        </div>

        {/* Countdown */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-2)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-primary-ocean)',
              lineHeight: '1'
            }}>
              {days}
            </div>
            <div style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
              marginTop: '2px'
            }}>
              Tage
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-primary-ocean)',
              lineHeight: '1'
            }}>
              {hours}
            </div>
            <div style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
              marginTop: '2px'
            }}>
              Std
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-primary-ocean)',
              lineHeight: '1'
            }}>
              {minutes}
            </div>
            <div style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
              marginTop: '2px'
            }}>
              Min
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-primary-ocean)',
              lineHeight: '1'
            }}>
              {seconds}
            </div>
            <div style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
              marginTop: '2px'
            }}>
              Sek
            </div>
          </div>
        </div>

        {/* Start Date */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          justifyContent: 'center'
        }}>
          <Calendar size={12} style={{ color: 'var(--color-text-secondary)' }} />
          <span style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-secondary)'
          }}>
            {new Date(nextTrip.startDate).toLocaleDateString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })}
          </span>
        </div>
      </div>
    );
  };

  // Debug effect to log user data changes and reset avatar error when user changes
  React.useEffect(() => {
    console.log('🔄 SocialSidebar - User data changed:', {
      user: user,
      userProfile: userProfile,
      hasMetadata: !!user?.user_metadata,
      metadata: user?.user_metadata,
      identities: user?.identities,
      email: user?.email,
      avatarError: avatarError
    });
    
    if (user) {
      console.log('🔍 SocialSidebar - Full user object structure:', JSON.stringify(user, null, 2));
      console.log('🔍 SocialSidebar - User profile from database:', userProfile);
      // Reset avatar error when user data changes (new user or user data updated)
      if (avatarError) {
        console.log('🔄 SocialSidebar - Resetting avatar error state for new user data');
        setAvatarError(false);
      }
    }
  }, [user, userProfile, avatarError]); // Watch user, userProfile and avatarError

  const renderUserProfile = () => (
    <div style={{
      padding: 'var(--space-4)',
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: 'var(--color-border)',
      background: 'linear-gradient(135deg, var(--color-primary-sage) 0%, var(--color-primary-ocean) 100%)',
      color: 'white'
    }}>
      {/* User Avatar and Basic Info */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-3)',
          cursor: 'pointer'
        }}
        onClick={handleNavigateToProfile}
      >
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: 'var(--radius-full)',
          background: getAvatarUrl() ? 'transparent' : 'rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: '3px',
          borderStyle: 'solid',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          transition: 'all var(--motion-duration-medium) var(--motion-easing-standard)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {getAvatarUrl() ? (
            <img 
              src={getAvatarUrl()!}
              alt="User Avatar"
              onError={handleAvatarError}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 'var(--radius-full)'
              }}
              onLoad={() => console.log('✅ Avatar loaded successfully')}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'white',
              background: 'linear-gradient(135deg, var(--color-primary-sage), var(--color-primary-ocean))',
              borderRadius: 'var(--radius-full)'
            }}>
              {getUserInitials()}
            </div>
          )}
        </div>
        
        <div style={{ flex: 1 }}>
          <h3 style={{
            margin: 0,
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'white'
          }}>
            {getDisplayName()}
          </h3>
          <p style={{
            margin: 0,
            fontSize: 'var(--text-sm)',
            color: 'rgba(255, 255, 255, 0.8)'
          }}>
            @{getUsername()}
          </p>
        </div>

        <Settings 
          size={20} 
          style={{ 
            color: 'rgba(255, 255, 255, 0.8)',
            cursor: 'pointer',
            transition: 'all var(--motion-duration-short) var(--motion-easing-standard)'
          }}
          onClick={handleNavigateToSettings}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
          }}
        />
      </div>

      {/* User Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) 0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 'var(--text-xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'white'
          }}>
            {userStats.totalTrips}
          </div>
          <div style={{
            fontSize: 'var(--text-xs)',
            color: 'rgba(255, 255, 255, 0.8)'
          }}>
            Reisen
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 'var(--text-xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'white'
          }}>
            {userStats.friends}
          </div>
          <div style={{
            fontSize: 'var(--text-xs)',
            color: 'rgba(255, 255, 255, 0.8)'
          }}>
            Freunde
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 'var(--text-xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'white'
          }}>
            {userStats.visitedDestinations}
          </div>
          <div style={{
            fontSize: 'var(--text-xs)',
            color: 'rgba(255, 255, 255, 0.8)'
          }}>
            Besucht
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabNavigation = () => (
    <div style={{
      display: 'flex',
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: 'var(--color-border)',
      background: 'var(--color-surface)'
    }}>
      {[
        { id: 'chat', label: 'Chat', icon: MessageCircle },
        { id: 'friends', label: 'Freunde', icon: Users },
        { id: 'activity', label: 'Aktivität', icon: Bell },
        { id: 'suggestions', label: 'Tips', icon: Plus }
      ].map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: 1,
              padding: 'var(--space-3)',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottomWidth: '2px',
              borderBottomStyle: 'solid',
              borderBottomColor: isActive ? 'var(--color-primary-sage)' : 'transparent',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: isActive ? 'var(--color-primary-sage)' : 'var(--color-text-secondary)',
              transition: 'all var(--motion-duration-short) var(--motion-easing-standard)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-1)',
              minWidth: 0,
              overflow: 'hidden'
            }}
          >
            <Icon size={16} />
            {!isMobile && (
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0
              }}>
                {tab.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  const renderFriendsList = () => {
    // Use real friends from socialService
    const friendsToShow = friends;

    return (
      <div style={{ padding: 'var(--space-4)' }}>
        <div style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--font-weight-medium)',
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {`Freunde (${friendsToShow.length})`}
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            {/* Debug button - only show in development */}
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={async () => {
                  console.log('🔧 === MANUAL FRIENDS DEBUG ===');
                  try {
                    // Manual debug of friends loading
                    const { data: { user } } = await supabase.auth.getUser();
                    console.log('Current user:', user?.id);
                    
                    // Check friendships table directly
                    const { data: friendshipsDirectData, error: friendshipsDirectError } = await supabase
                      .from('friendships')
                      .select('*')
                      .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`);
                    
                    console.log('Friendships direct data:', friendshipsDirectData, 'Error:', friendshipsDirectError);
                    
                    // Check friendships table using RPC function
                    const { data: friendshipsData, error: friendshipsError } = await supabase
                      .rpc('get_user_friends', { target_user_id: user?.id });
                    
                    console.log('Friendships data:', friendshipsData, 'Error:', friendshipsError);
                    
                    // Re-load friends
                    await loadFriends();
                  } catch (error) {
                    console.error('Debug error:', error);
                  }
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-primary-sage)',
                  cursor: 'pointer',
                  padding: '2px',
                  fontSize: '12px'
                }}
                title="Debug Friends Loading"
              >
                🔧
              </button>
            )}
            <TrendingUp size={16} style={{ color: 'var(--color-primary-sage)' }} />
          </div>
        </div>

        {/* Status Notice */}
        {loadingFriends && (
          <div style={{
            background: 'var(--color-neutral-mist)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            marginBottom: 'var(--space-3)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-secondary)',
            textAlign: 'center'
          }}>
            ⏳ Lade Freunde...
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {friendsToShow.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: 'var(--space-4)',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-sm)'
            }}>
              Noch keine Freunde hinzugefügt
            </div>
          ) : (
            friendsToShow.map(friend => (
          <div
            key={friend.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'all var(--motion-duration-short) var(--motion-easing-standard)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-neutral-mist)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            onClick={() => {
              try {
                // Navigate to friend profile
                
                updateUIState({ 
                  currentView: 'user-profile',
                  selectedUserId: friend.id
                });
                if (isMobile) {
                  onClose();
                }
              } catch (error) {
                console.error('Error navigating to friend profile:', error);
                alert('Fehler beim Öffnen des Profils. Bitte versuchen Sie es erneut.');
              }
            }}
          >
            <div style={{
              position: 'relative',
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-neutral-mist)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              {friend.avatar_url ? (
                <img 
                  src={friend.avatar_url}
                  alt={friend.display_name || friend.nickname}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    const img = e.currentTarget;
                    const fallback = img.parentElement?.querySelector('div:last-child') as HTMLElement;
                    if (fallback) {
                      img.style.display = 'none';
                      fallback.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <div style={{
                width: '100%',
                height: '100%',
                display: friend.avatar_url ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: friend.avatar_url ? 'absolute' : 'static',
                top: 0,
                left: 0
              }}>
                <User size={20} style={{ color: 'var(--color-text-secondary)' }} />
              </div>
              {/* Online status not available for real friends */ false && (
                <div style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  width: '12px',
                  height: '12px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-success)',
                  borderWidth: '2px',
                  borderStyle: 'solid',
                  borderColor: 'var(--color-surface)'
                }} />
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-primary)'
              }}>
                {friend.display_name || friend.nickname}
              </div>
              <div style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-secondary)'
              }}>
                {`@${friend.nickname}`}
              </div>
            </div>

            <MessageCircle 
              size={16} 
              style={{ 
                color: 'var(--color-text-secondary)',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleStartDirectChat(friend.id);
              }}
            />
          </div>
        )))}
        </div>
      </div>
    );
  };

  const renderActivity = () => (
    <div style={{ padding: 'var(--space-4)' }}>
      <div style={{
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--font-weight-medium)',
        color: 'var(--color-text-primary)',
        marginBottom: 'var(--space-3)'
      }}>
        Neueste Aktivitäten
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {activityItems.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-4)',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--text-sm)'
          }}>
            Noch keine Aktivitäten
          </div>
        ) : (
          activityItems.map(activity => (
          <div
            key={activity.id}
            style={{
              display: 'flex',
              gap: 'var(--space-3)',
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'all var(--motion-duration-short) var(--motion-easing-standard)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-neutral-mist)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-neutral-mist)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              overflow: 'hidden'
            }}>
              {activity.user.avatar ? (
                <img 
                  src={activity.user.avatar}
                  alt={activity.user.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    const img = e.currentTarget;
                    const fallback = img.parentElement?.querySelector('div:last-child') as HTMLElement;
                    if (fallback) {
                      img.style.display = 'none';
                      fallback.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <div style={{
                width: '100%',
                height: '100%',
                display: activity.user.avatar ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: activity.user.avatar ? 'absolute' : 'static'
              }}>
                <User size={18} style={{ color: 'var(--color-text-secondary)' }} />
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-primary)',
                marginBottom: '2px'
              }}>
                <strong>{activity.user.name}</strong> {activity.content}
                {activity.tripName && (
                  <span style={{ color: 'var(--color-primary-sage)' }}>
                    {' '}{activity.tripName}
                  </span>
                )}
              </div>
              <div style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-secondary)'
              }}>
                {activity.timestamp}
              </div>
            </div>

            {activity.type === 'photo_liked' && <Heart size={16} style={{ color: 'var(--color-accent-sunset)' }} />}
            {activity.type === 'trip_shared' && <MapPin size={16} style={{ color: 'var(--color-primary-sage)' }} />}
            {activity.type === 'friend_joined' && <Plus size={16} style={{ color: 'var(--color-primary-ocean)' }} />}
          </div>
        )))}
      </div>
    </div>
  );

  const renderSuggestions = () => (
    <div style={{ padding: 'var(--space-4)' }}>
      <div style={{
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--font-weight-medium)',
        color: 'var(--color-text-primary)',
        marginBottom: 'var(--space-3)'
      }}>
        Personen, die du vielleicht kennst
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {suggestedUsers.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-4)',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--text-sm)'
          }}>
            Keine Vorschläge verfügbar
          </div>
        ) : (
          suggestedUsers.map(suggestion => (
          <div
            key={suggestion.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-md)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--color-border)'
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-neutral-mist)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              {suggestion.avatar ? (
                <img 
                  src={suggestion.avatar}
                  alt={suggestion.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    const img = e.currentTarget;
                    const fallback = img.parentElement?.querySelector('div:last-child') as HTMLElement;
                    if (fallback) {
                      img.style.display = 'none';
                      fallback.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <div style={{
                width: '100%',
                height: '100%',
                display: suggestion.avatar ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: suggestion.avatar ? 'absolute' : 'static'
              }}>
                <User size={20} style={{ color: 'var(--color-text-secondary)' }} />
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-primary)'
              }}>
                {suggestion.name}
              </div>
              <div style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-secondary)'
              }}>
                {suggestion.mutualFriends} gemeinsame Freunde
              </div>
            </div>

            <button
              style={{
                padding: 'var(--space-1) var(--space-3)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--color-primary-sage)',
                borderRadius: 'var(--radius-md)',
                background: 'transparent',
                color: 'var(--color-primary-sage)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-weight-medium)',
                cursor: 'pointer',
                transition: 'all var(--motion-duration-short) var(--motion-easing-standard)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-primary-sage)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-primary-sage)';
              }}
              onClick={() => {
                // TODO: Implement follow functionality
                alert(`Mit ${suggestion.name} connecten - Feature kommt bald!`);
              }}
            >
              Connect
            </button>
          </div>
        )))}
      </div>
    </div>
  );

  const renderChat = () => (
    <div style={{ padding: 'var(--space-4)' }}>
      <div style={{
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--font-weight-medium)',
        color: 'var(--color-text-primary)',
        marginBottom: 'var(--space-3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        Nachrichten
        <MessageCircle size={16} style={{ color: 'var(--color-primary-sage)' }} />
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)'
      }}>

        {/* Chat Rooms List */}
        {loadingChatRooms ? (
          <div style={{
            background: 'var(--color-neutral-mist)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              Lade Chats...
            </div>
          </div>
        ) : chatRooms.length > 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)'
          }}>
            <div style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-secondary)'
            }}>
              Aktuelle Chats ({chatRooms.length})
            </div>
            
            {chatRooms.map((room) => (
              <div
                key={room.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'all var(--motion-duration-short) var(--motion-easing-standard)',
                  background: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-neutral-mist)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                onClick={() => {
                  updateUIState({ 
                    chatOpen: true,
                    selectedChatRoomId: room.id 
                  });
                }}
              >
                {/* Room Icon */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-full)',
                  background: room.type === 'direct' ? 'var(--color-primary-ocean)' : 
                           room.type === 'group' ? 'var(--color-primary-sage)' : 
                           'var(--color-warning)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {room.type === 'direct' ? <MessageCircle size={14} color="white" /> :
                   room.type === 'group' ? <Users size={14} color="white" /> :
                   <Plane size={14} color="white" />}
                </div>

                {/* Room Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-primary)',
                    marginBottom: '2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {room.name || chatService.getDisplayName(room, user?.id || '', [])}
                  </div>
                  
                  <div style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-1)'
                  }}>
                    <span>
                      {room.type === 'direct' ? 'Direkt' : 
                       room.type === 'group' ? 'Gruppe' : 'Reise'}
                    </span>
                    {room.participant_count > 0 && (
                      <span>• {room.participant_count} Teilnehmer</span>
                    )}
                    {room.unread_count > 0 && (
                      <span style={{
                        background: 'var(--color-primary-ocean)',
                        color: 'white',
                        fontSize: '10px',
                        borderRadius: 'var(--radius-full)',
                        padding: '2px 6px',
                        fontWeight: 'var(--font-weight-medium)',
                        marginLeft: 'auto'
                      }}>
                        {room.unread_count}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete Button (only for room owners) */}
                {room.created_by === user?.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRoom(room.id);
                    }}
                    style={{
                      padding: 'var(--space-1)',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: 'var(--color-text-secondary)',
                      transition: 'all var(--motion-duration-short) var(--motion-easing-standard)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-error-bg)';
                      e.currentTarget.style.color = 'var(--color-error)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--color-text-secondary)';
                    }}
                    aria-label="Chat löschen"
                    title="Chat löschen"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            background: 'var(--color-neutral-mist)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-1)'
            }}>
              Noch keine Chats
            </div>
            <div style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)'
            }}>
              Starten Sie eine Unterhaltung mit Freunden
            </div>
          </div>
        )}

        {/* Quick Action Hints */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)'
        }}>
          <div style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-secondary)',
            fontWeight: 'var(--font-weight-medium)'
          }}>
            Schnellaktionen:
          </div>
          <div style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-secondary)',
            lineHeight: '1.4'
          }}>
            • Klicken Sie auf 💬 bei Freunden für Direktnachrichten<br />
            • Verwenden Sie "Reisechat eröffnen" in Ihren Reisen<br />
            • Erstellen Sie Gruppenchats für gemeinsame Planungen
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return renderChat();
      case 'friends':
        return renderFriendsList();
      case 'activity':
        return renderActivity();
      case 'suggestions':
        return renderSuggestions();
      default:
        return renderChat();
    }
  };

  if (!isOpen && isMobile) return null;

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 998
          }}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        style={{
          position: isMobile ? 'fixed' : 'relative',
          top: 0,
          left: isMobile ? (isOpen ? 0 : `-${sidebarWidth}`) : 0,
          height: '100%',
          width: sidebarWidth,
          background: 'var(--color-surface)',
          borderRightWidth: '1px',
          borderRightStyle: 'solid',
          borderRightColor: 'var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 999,
          transition: isMobile ? 'left var(--motion-duration-medium) var(--motion-easing-standard)' : 'none',
          boxShadow: isMobile ? 'var(--elevation-5)' : 'none'
        }}
      >
        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={onClose}
            aria-label="Soziale Seitenleiste schließen"
            style={{
              position: 'absolute',
              top: 'var(--space-4)',
              right: 'var(--space-4)',
              background: 'rgba(255, 255, 255, 0.2)',
              borderWidth: '0',
              borderRadius: 'var(--radius-full)',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 1000
            }}
          >
            <X size={16} style={{ color: 'white' }} />
          </button>
        )}

        {/* User Profile Section */}
        {renderUserProfile()}

        {/* Countdown to Next Trip */}
        {renderCountdown()}

        {/* Tab Navigation */}
        {renderTabNavigation()}

        {/* Tab Content */}
        <div style={{
          flex: 1,
          overflow: 'auto'
        }}>
          {renderTabContent()}
        </div>
      </div>

    </>
  );
};

export default SocialSidebar;