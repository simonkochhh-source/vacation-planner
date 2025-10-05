import React from 'react';
import { useUIContext } from '../../contexts/UIContext';
import { Settings, Menu } from 'lucide-react';
import ModernButton from '../UI/ModernButton';
import HeaderBrand from './HeaderBrand';
import HeaderNavigation from './HeaderNavigation';
import HeaderSearch from './HeaderSearch';
import FriendshipRequestsDropdown from '../Social/FollowRequestsDropdown';
import AvatarUpload from '../User/AvatarUpload';
import { useResponsive } from '../../hooks/useResponsive';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { updateUIState, searchQuery, currentView } = useUIContext();
  const { user, userProfile } = useAuth();
  const { isMobile } = useResponsive();
  const isLargeScreen = !isMobile;

  const handleViewChange = (view: 'list' | 'map' | 'timeline' | 'budget' | 'search' | 'photos') => {
    updateUIState({ currentView: view, activeView: view });
  };

  const handleSettingsClick = () => {
    updateUIState({ currentView: 'settings' });
  };

  const handleMyProfileClick = () => {
    updateUIState({ currentView: 'my-profile' });
  };

  const handleLogoClick = () => {
    updateUIState({ currentView: 'landing' });
  };

  const handleNavigateToItem = (type: 'destination' | 'trip' | 'user', id: string) => {
    if (type === 'destination') {
      updateUIState({ 
        currentView: 'search',
        activeView: 'search',
        selectedDestinationId: id,
        showDestinationDetails: true,
        searchQuery: ''
      });
    } else if (type === 'trip') {
      updateUIState({ 
        currentView: 'search',
        activeView: 'search',
        selectedTripId: id,
        showTripDetails: true,
        searchQuery: ''
      });
    } else if (type === 'user') {
      // Navigate to user profile page
      updateUIState({ 
        currentView: 'user-profile',
        activeView: 'user-profile',
        selectedUserId: id,
        searchQuery: ''
      });
    }
  };

  const handleShowSearchPage = (query: string) => {
    updateUIState({ 
      currentView: 'search',
      activeView: 'search',
      searchQuery: query 
    });
  };

  const handleSearchChange = (value: string) => {
    updateUIState({ searchQuery: value });
  };

  // Initialize search component handlers
  const searchHandlers = HeaderSearch({
    searchQuery: searchQuery,
    onSearchChange: handleSearchChange,
    onNavigate: handleNavigateToItem,
    onShowSearchPage: handleShowSearchPage
  });

  return (
    <header className={`bg-gradient-primary ${isMobile ? 'header-mobile' : ''}`} style={{
      color: 'white',
      padding: isMobile 
        ? `calc(var(--space-2) + var(--safe-area-inset-top, 0px)) 0 var(--space-2) 0` 
        : 'var(--space-md) 0',
      boxShadow: 'var(--shadow-md)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div className="container">
        <div className="flex items-center justify-between">
          {/* Left Section - Mobile Menu & Brand */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            {onMenuClick && (
              <ModernButton
                variant="text"
                size="sm"
                onClick={onMenuClick}
                className="header-menu-button"
                title="Menu öffnen"
                leftIcon={<Menu size={20} />}
                style={{ 
                  color: 'white',
                  minWidth: 'var(--touch-target-min-size)'
                }}
              >
                Menu
              </ModernButton>
            )}
            
            {/* Brand Component */}
            <HeaderBrand onLogoClick={handleLogoClick} />
          </div>

          {/* Center Section - Desktop Search */}
          {isLargeScreen && searchHandlers.DesktopSearch()}

          {/* Right Section - Navigation & Settings */}
          <div className="flex items-center gap-2">
            <HeaderNavigation 
              currentView={currentView}
              onViewChange={handleViewChange}
            />

            {/* Friendship Requests Dropdown - Only show if user is logged in */}
            {user && <FriendshipRequestsDropdown />}

            {/* My Profile Avatar - Only show if user is logged in */}
            {user && (
              <button
                onClick={handleMyProfileClick}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  padding: 'var(--space-1)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                aria-label="Mein Profil & Einstellungen"
                title="Mein Profil & Einstellungen"
              >
                <AvatarUpload
                  currentAvatarUrl={userProfile?.avatar_url}
                  size="small"
                  editable={false}
                />
              </button>
            )}
          </div>
        </div>
        
        {/* Mobile Search Section */}
        {searchHandlers.MobileSearch()}
      </div>
    </header>
  );
};

export default Header;