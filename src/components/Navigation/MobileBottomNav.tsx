import React from 'react';
import { 
  Home, 
  Map, 
  Calendar, 
  Camera, 
  User,
  MessageCircle,
  Search,
  Settings
} from 'lucide-react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { useResponsive } from '../../hooks/useResponsive';

interface MobileBottomNavProps {
  onChatToggle?: () => void;
  showChatBadge?: boolean;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ 
  onChatToggle, 
  showChatBadge = false 
}) => {
  const { uiState, updateUIState } = useSupabaseApp();
  const { isMobile } = useResponsive();

  // Don't render on desktop
  if (!isMobile) return null;

  const currentView = uiState.currentView || uiState.activeView;

  const navItems = [
    {
      id: 'landing',
      icon: Home,
      label: 'Startseite',
      view: 'landing'
    },
    {
      id: 'trips',
      icon: Calendar,
      label: 'Reisen',
      view: 'trips'
    },
    {
      id: 'map',
      icon: Map,
      label: 'Karte',
      view: 'map'
    },
    {
      id: 'search',
      icon: Search,
      label: 'Suchen',
      view: 'search'
    },
    {
      id: 'photos',
      icon: Camera,
      label: 'Fotos',
      view: 'photos'
    }
  ];

  const handleNavigation = (view: string) => {
    updateUIState({ currentView: view as any });
  };

  const NavButton: React.FC<{
    icon: React.ElementType;
    label: string;
    isActive: boolean;
    onClick: () => void;
    badge?: boolean;
  }> = ({ icon: Icon, label, isActive, onClick, badge }) => (
    <button
      onClick={onClick}
      className="mobile-nav-button"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-2)',
        background: 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        transition: 'all var(--motion-duration-short) var(--motion-easing-standard)',
        color: isActive ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
        minHeight: 'var(--comfortable-touch-target)',
        minWidth: 'var(--comfortable-touch-target)',
        position: 'relative',
        flex: 1
      }}
      aria-label={label}
    >
      <div style={{
        position: 'relative',
        marginBottom: 'var(--space-1)'
      }}>
        <Icon 
          size={20} 
          style={{
            transition: 'transform var(--motion-duration-short)'
          }}
        />
        {badge && (
          <div style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: 'var(--color-error-50)',
            border: '2px solid var(--color-surface)'
          }} />
        )}
      </div>
      <span style={{
        fontSize: 'var(--font-size-xs)',
        fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
        lineHeight: 'var(--line-height-tight)'
      }}>
        {label}
      </span>
    </button>
  );

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-outline-variant)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: 'var(--space-2) var(--space-1)',
        paddingBottom: 'max(var(--space-2), env(safe-area-inset-bottom))', // iOS safe area
        zIndex: 1000,
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(20px)',
        backgroundColor: 'color-mix(in srgb, var(--color-surface) 90%, transparent)'
      }}
      role="navigation"
      aria-label="Hauptnavigation"
    >
      {navItems.map((item) => (
        <NavButton
          key={item.id}
          icon={item.icon}
          label={item.label}
          isActive={currentView === item.view}
          onClick={() => handleNavigation(item.view)}
        />
      ))}
      
      {/* Chat Button */}
      <NavButton
        icon={MessageCircle}
        label="Chat"
        isActive={false}
        onClick={onChatToggle || (() => {})}
        badge={showChatBadge}
      />
    </nav>
  );
};

export default MobileBottomNav;