import React from 'react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { MapPin, Calendar, Settings, DollarSign, Menu, Mountain } from 'lucide-react';
import Button from '../Common/Button';
import IntelligentSearch from '../Search/IntelligentSearch';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { currentTrip, uiState, updateUIState } = useSupabaseApp();
  const [isLargeScreen, setIsLargeScreen] = React.useState(false);

  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth > 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleViewChange = (view: 'list' | 'map' | 'timeline' | 'budget' | 'search') => {
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
      // Navigate to timeline view with destination focus
      updateUIState({ 
        currentView: 'timeline',
        activeView: 'timeline',
        activeDestination: id
      });
    } else if (type === 'trip') {
      // Navigate to search page with trip details opened
      updateUIState({ 
        currentView: 'search',
        activeView: 'search',
        selectedTripId: id,
        showTripDetails: true,
        searchQuery: '' // Clear search query to show trip details
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
          {/* Left Section - Brand & Current Trip */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            {onMenuClick && (
              <button
                onClick={onMenuClick}
                className="btn-ghost"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  padding: 'var(--space-sm)',
                  minWidth: 'auto'
                }}
                title="Menu öffnen"
              >
                <Menu size={20} />
              </button>
            )}
            
            {/* Brand */}
            <button
              onClick={handleLogoClick}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
                padding: 'var(--space-xs)',
                borderRadius: 'var(--radius-md)',
                transition: 'all var(--transition-fast)',
                color: 'inherit'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Zur Startseite"
            >
              <div style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: 'var(--space-sm)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Mountain size={24} />
              </div>
              <div>
                <h1 style={{ 
                  fontFamily: 'var(--font-heading)',
                  fontSize: isLargeScreen ? 'var(--text-xl)' : 'var(--text-lg)',
                  fontWeight: 'var(--font-weight-semibold)',
                  margin: 0,
                  lineHeight: 1.2
                }}>
                  {isLargeScreen ? 'Trailkeeper' : 'Keeper'}
                </h1>
                {isLargeScreen && (
                  <p style={{ 
                    fontSize: 'var(--text-xs)', 
                    margin: 0, 
                    opacity: 0.8,
                    fontWeight: 'var(--font-weight-normal)'
                  }}>
                    Vacation Planner
                  </p>
                )}
              </div>
            </button>

          </div>

          {/* Center Section - Search (Desktop only) */}
          {isLargeScreen && (
            <div style={{ 
              flex: 1, 
              maxWidth: '400px', 
              margin: '0 var(--space-2xl)',
              position: 'relative'
            }}>
              <IntelligentSearch
                value={uiState.searchQuery}
                onChange={(value) => updateUIState({ searchQuery: value })}
                onNavigate={handleNavigateToItem}
                onShowSearchPage={handleShowSearchPage}
                placeholder="Ziele, Reisen suchen..."
                className="input"
                style={{
                  width: '100%',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  background: 'rgba(255, 255, 255, 0.95)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-normal)'
                }}
              />
            </div>
          )}

          {/* Right Section - Navigation & Actions */}
          <div className="flex items-center gap-2">
            {/* Quick Navigation */}
            <div className="flex items-center gap-1" style={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              borderRadius: 'var(--radius-md)',
              padding: '4px'
            }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleViewChange('map')}
                style={{
                  background: uiState.currentView === 'map' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                  color: 'white',
                  minWidth: 'auto',
                  padding: 'var(--space-sm)'
                }}
                title="Karte"
              >
                <MapPin size={18} />
                {isLargeScreen && <span style={{ fontSize: 'var(--text-sm)' }}>Karte</span>}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleViewChange('timeline')}
                style={{
                  background: uiState.currentView === 'timeline' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                  color: 'white',
                  minWidth: 'auto',
                  padding: 'var(--space-sm)'
                }}
                title="Timeline"
              >
                <Calendar size={18} />
                {isLargeScreen && <span style={{ fontSize: 'var(--text-sm)' }}>Timeline</span>}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleViewChange('budget')}
                style={{
                  background: uiState.currentView === 'budget' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                  color: 'white',
                  minWidth: 'auto',
                  padding: 'var(--space-sm)'
                }}
                title="Budget"
              >
                <DollarSign size={18} />
                {isLargeScreen && <span style={{ fontSize: 'var(--text-sm)' }}>Budget</span>}
              </Button>
              
            </div>

            {/* Settings */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSettingsClick}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                minWidth: 'auto',
                padding: 'var(--space-sm)'
              }}
              title="Einstellungen"
            >
              <Settings size={18} />
            </Button>
          </div>
        </div>
        
        {/* Mobile Search Bar */}
        {!isLargeScreen && (
          <div style={{ 
            marginTop: 'var(--space-md)',
            position: 'relative'
          }}>
            <IntelligentSearch
              value={uiState.searchQuery}
              onChange={(value) => updateUIState({ searchQuery: value })}
              onNavigate={handleNavigateToItem}
              onShowSearchPage={handleShowSearchPage}
              placeholder="Ziele, Reisen suchen..."
              className="input"
              style={{
                width: '100%',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.95)',
                fontSize: 'var(--text-sm)'
              }}
              isMobile={true}
            />
          </div>
        )}
        
      </div>
    </header>
  );
};

export default Header;