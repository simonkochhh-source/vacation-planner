import React from 'react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { MapPin, Calendar, Settings, Search, DollarSign, Menu, Compass, Mountain } from 'lucide-react';
import Button from '../Common/Button';

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

  const handleViewChange = (view: 'list' | 'map' | 'timeline' | 'budget') => {
    updateUIState({ currentView: view, activeView: view });
  };

  const handleSettingsClick = () => {
    updateUIState({ currentView: 'settings' });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateUIState({ searchQuery: e.target.value });
  };

  return (
    <header className="bg-gradient-primary" style={{
      color: 'white',
      padding: 'var(--space-md) 0',
      boxShadow: 'var(--shadow-md)',
      position: 'sticky',
      top: 0,
      zIndex: 50
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
            <div className="flex items-center gap-3">
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
                  {isLargeScreen ? 'Freedom Trail' : 'Trail'}
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
            </div>

            {/* Current Trip Badge */}
            {currentTrip && isLargeScreen && (
              <div style={{
                background: 'var(--color-secondary-sunset)',
                color: 'white',
                padding: 'var(--space-sm) var(--space-md)',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <Compass size={16} />
                {currentTrip.name}
              </div>
            )}
          </div>

          {/* Center Section - Search (Desktop only) */}
          {isLargeScreen && (
            <div style={{ 
              flex: 1, 
              maxWidth: '400px', 
              margin: '0 var(--space-2xl)',
              position: 'relative'
            }}>
              <div style={{ position: 'relative' }}>
                <Search 
                  size={18} 
                  style={{
                    position: 'absolute',
                    left: 'var(--space-md)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-secondary)'
                  }}
                />
                <input
                  type="text"
                  placeholder="Orte, Sehenswürdigkeiten suchen..."
                  value={uiState.searchQuery}
                  onChange={handleSearchChange}
                  className="input"
                  style={{
                    width: '100%',
                    paddingLeft: '3rem',
                    borderRadius: 'var(--radius-full)',
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.95)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-weight-normal)'
                  }}
                />
              </div>
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
            <Search 
              size={16} 
              style={{
                position: 'absolute',
                left: 'var(--space-md)',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-secondary)'
              }}
            />
            <input
              type="text"
              placeholder="Suchen..."
              value={uiState.searchQuery}
              onChange={handleSearchChange}
              className="input"
              style={{
                width: '100%',
                paddingLeft: '2.5rem',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.95)',
                fontSize: 'var(--text-sm)'
              }}
            />
          </div>
        )}
        
        {/* Mobile Current Trip */}
        {currentTrip && !isLargeScreen && (
          <div style={{
            marginTop: 'var(--space-sm)',
            background: 'rgba(255, 255, 255, 0.15)',
            padding: 'var(--space-sm) var(--space-md)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-medium)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)'
          }}>
            <Compass size={14} />
            Aktuelle Reise: {currentTrip.name}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;