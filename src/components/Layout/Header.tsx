import React from 'react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { Settings, Menu } from 'lucide-react';
import Button from '../Common/Button';
import HeaderBrand from './HeaderBrand';
import HeaderNavigation from './HeaderNavigation';
import HeaderSearch from './HeaderSearch';
import { useResponsive } from '../../hooks/useResponsive';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { uiState, updateUIState } = useSupabaseApp();
  const { isMobile } = useResponsive();
  const isLargeScreen = !isMobile;

  const handleViewChange = (view: 'list' | 'map' | 'timeline' | 'budget' | 'search' | 'photos') => {
    updateUIState({ currentView: view, activeView: view });
  };

  const handleSettingsClick = () => {
    updateUIState({ currentView: 'settings' });
  };

  const handleLogoClick = () => {
    updateUIState({ currentView: 'landing' });
  };

  const handleNavigateToItem = (type: 'destination' | 'trip', id: string) => {
    if (type === 'destination') {
      updateUIState({ 
        currentView: 'timeline',
        activeView: 'timeline',
        activeDestination: id
      });
    } else if (type === 'trip') {
      updateUIState({ 
        currentView: 'search',
        activeView: 'search',
        selectedTripId: id,
        showTripDetails: true,
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
    searchQuery: uiState.searchQuery,
    onSearchChange: handleSearchChange,
    onNavigate: handleNavigateToItem,
    onShowSearchPage: handleShowSearchPage
  });

  return (
    <header className="bg-gradient-primary" style={{
      color: 'white',
      padding: 'var(--space-md) 0',
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
              <Button
                variant="ghost"
                size="sm"
                onClick={onMenuClick}
                className="header-menu-button"
                title="Menu öffnen"
              >
                <Menu size={20} />
              </Button>
            )}
            
            {/* Brand Component */}
            <HeaderBrand onLogoClick={handleLogoClick} />
          </div>

          {/* Center Section - Desktop Search */}
          {isLargeScreen && searchHandlers.DesktopSearch()}

          {/* Right Section - Navigation & Settings */}
          <div className="flex items-center gap-2">
            <HeaderNavigation 
              currentView={uiState.currentView}
              onViewChange={handleViewChange}
            />

            {/* Settings Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSettingsClick}
              className="header-settings-button"
              title="Einstellungen"
            >
              <Settings size={18} />
            </Button>
          </div>
        </div>
        
        {/* Mobile Search Section */}
        {searchHandlers.MobileSearch()}
      </div>
    </header>
  );
};

export default Header;