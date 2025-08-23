import React from 'react';
import { useApp } from '../../stores/AppContext';
import { Menu, MapPin, List, Calendar, Settings, Search, Clock, DollarSign } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { currentTrip, uiState, updateUIState } = useApp();

  const handleViewChange = (view: 'list' | 'map' | 'timeline' | 'scheduling' | 'budget') => {
    updateUIState({ currentView: view });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateUIState({ searchQuery: e.target.value });
  };

  return (
    <header style={{
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      color: 'white',
      padding: '1rem 1.5rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Left Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={onToggleSidebar}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            <Menu size={20} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🏖️</span>
            <h1 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              margin: 0,
              display: 'none'
            }}>
              Vacation Planner
            </h1>
          </div>

          {currentTrip && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              fontSize: '0.875rem'
            }}>
              📍 {currentTrip.name}
            </div>
          )}
        </div>

        {/* Center Section - Search */}
        <div style={{ 
          flex: 1, 
          maxWidth: '400px', 
          margin: '0 2rem',
          position: 'relative'
        }}>
          <div style={{ position: 'relative' }}>
            <Search 
              size={18} 
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9CA3AF'
              }}
            />
            <input
              type="text"
              placeholder="Orte, Sehenswürdigkeiten suchen..."
              value={uiState.searchQuery}
              onChange={handleSearchChange}
              style={{
                width: '100%',
                padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                border: 'none',
                borderRadius: '25px',
                background: 'rgba(255, 255, 255, 0.9)',
                color: '#374151',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Right Section - View Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* View Toggle Buttons */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '0.25rem',
            display: 'flex',
            gap: '0.25rem'
          }}>
            {[
              { view: 'list' as const, icon: List, label: 'Liste' },
              { view: 'map' as const, icon: MapPin, label: 'Karte' },
              { view: 'timeline' as const, icon: Calendar, label: 'Timeline' },
              { view: 'scheduling' as const, icon: Clock, label: 'Zeitplanung' },
              { view: 'budget' as const, icon: DollarSign, label: 'Budget' }
            ].map(({ view, icon: Icon, label }) => (
              <button
                key={view}
                onClick={() => handleViewChange(view)}
                style={{
                  background: uiState.currentView === view 
                    ? 'rgba(255, 255, 255, 0.2)' 
                    : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: uiState.currentView === view ? '600' : '400',
                  transition: 'all 0.2s'
                }}
                title={label}
                onMouseOver={(e) => {
                  if (uiState.currentView !== view) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  }
                }}
                onMouseOut={(e) => {
                  if (uiState.currentView !== view) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <Icon size={16} />
                <span style={{ display: 'none' }}>{label}</span>
              </button>
            ))}
          </div>

          {/* Settings Button */}
          <button
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Einstellungen"
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;