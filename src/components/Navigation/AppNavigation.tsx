import React from 'react';
import { Home, MapPin, Plane, Camera, Search } from 'lucide-react';
import { useUIContext } from '../../contexts/UIContext';
import { useResponsive } from '../../hooks/useResponsive';

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  view: string;
  description?: string;
}

export const navigationItems: NavigationItem[] = [
  {
    id: 'whats-new',
    label: "What's new?",
    icon: <Home size={20} />,
    view: 'landing',
    description: 'Neuigkeiten und Updates'
  },
  {
    id: 'trips',
    label: 'Reisen',
    icon: <Plane size={20} />,
    view: 'trips',
    description: 'Alle deine Reisen'
  },
  {
    id: 'map',
    label: 'Karte',
    icon: <MapPin size={20} />,
    view: 'map',
    description: 'Interaktive Kartenansicht'
  },
  {
    id: 'photos',
    label: 'Fotos',
    icon: <Camera size={20} />,
    view: 'photos',
    description: 'Reisefotos und Erinnerungen'
  }
];

// Extended navigation items for mobile header (includes all main views)
export const mobileNavigationItems: NavigationItem[] = [
  {
    id: 'whats-new',
    label: "News",
    icon: <Home size={18} />,
    view: 'landing',
    description: 'Neuigkeiten und Updates'
  },
  {
    id: 'trips',
    label: 'Trips',
    icon: <Plane size={18} />,
    view: 'trips',
    description: 'Alle deine Reisen'
  },
  {
    id: 'search',
    label: 'Search',
    icon: <Search size={18} />,
    view: 'search',
    description: 'Suche nach Destinationen und Trips'
  },
  {
    id: 'map',
    label: 'Map',
    icon: <MapPin size={18} />,
    view: 'map',
    description: 'Interaktive Kartenansicht'
  },
  {
    id: 'photos',
    label: 'Photos',
    icon: <Camera size={18} />,
    view: 'photos',
    description: 'Reisefotos und Erinnerungen'
  }
];

interface AppNavigationProps {
  variant?: 'sidebar' | 'bottom' | 'header';
  className?: string;
  showLabels?: boolean;
}

const AppNavigation: React.FC<AppNavigationProps> = ({ 
  variant = 'sidebar', 
  className = '',
  showLabels = true 
}) => {
  const { currentView, activeView, updateUIState } = useUIContext();
  const { isMobile } = useResponsive();
  const view = currentView || activeView || 'landing';
  
  // Use mobile navigation items for header variant on mobile devices
  const items = (variant === 'header' && isMobile) ? mobileNavigationItems : navigationItems;

  const handleNavClick = (view: string) => {
    updateUIState({ currentView: view as any });
  };

  const getNavStyles = () => {
    const baseStyles = {
      display: 'flex',
      gap: 'var(--space-2)',
      padding: 'var(--space-4)',
    };

    switch (variant) {
      case 'bottom':
        return {
          ...baseStyles,
          flexDirection: 'row' as const,
          justifyContent: 'space-around',
          alignItems: 'center',
          backgroundColor: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          borderLeft: 'none',
          borderRight: 'none',
          borderBottom: 'none',
          position: 'fixed' as const,
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: 'var(--space-3) var(--space-4)',
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)'
        };
      case 'header':
        return {
          ...baseStyles,
          flexDirection: 'row' as const,
          alignItems: 'center',
          gap: isMobile ? 'var(--space-1)' : 'var(--space-2)',
          padding: 0,
          background: 'transparent',
          overflow: isMobile ? 'auto' : 'visible',
          maxWidth: '100%'
        };
      default: // sidebar
        return {
          ...baseStyles,
          flexDirection: 'column' as const,
          gap: 'var(--space-2)'
        };
    }
  };

  const getItemStyles = (isActive: boolean) => {
    // Header-specific styles without background boxes
    if (variant === 'header') {
      const headerItemStyles = {
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 'var(--space-1)' : 'var(--space-2)',
        padding: isMobile ? 'var(--space-1) var(--space-2)' : 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-md)',
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'all var(--transition-normal)',
        border: 'none',
        background: 'transparent',
        minHeight: isMobile ? '40px' : 'var(--touch-target-min-size)',
        fontSize: isMobile ? 'var(--text-xs)' : 'var(--text-sm)',
        fontWeight: 'var(--font-weight-medium)',
        fontFamily: 'var(--font-family-system)',
        color: 'white',
        whiteSpace: 'nowrap' as const,
        flexShrink: 0
      };

      if (isActive) {
        return {
          ...headerItemStyles,
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderTop: '2px solid transparent',
          borderLeft: '2px solid transparent',
          borderRight: '2px solid transparent',
          borderBottom: '2px solid white'
        };
      }

      return {
        ...headerItemStyles,
        backgroundColor: 'transparent',
        opacity: 1,
        color: 'rgba(255, 255, 255, 0.95)'
      };
    }

    // Original styles for sidebar and bottom navigation
    const baseItemStyles = {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: variant === 'bottom' ? 'var(--space-2)' : 'var(--space-3) var(--space-4)',
      borderRadius: 'var(--radius-lg)',
      textDecoration: 'none',
      cursor: 'pointer',
      transition: 'all var(--transition-normal)',
      border: 'none',
      background: 'transparent',
      width: variant === 'bottom' ? 'auto' : '100%',
      minHeight: 'var(--touch-target-min-size)',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--font-weight-medium)',
      fontFamily: 'var(--font-family-system)'
    };

    if (isActive) {
      return {
        ...baseItemStyles,
        backgroundColor: 'var(--color-primary-sage)',
        color: 'white',
        boxShadow: 'var(--shadow-sm)'
      };
    }

    return {
      ...baseItemStyles,
      color: 'var(--color-text-secondary)',
      ':hover': {
        backgroundColor: 'var(--color-surface-hover)',
        color: 'var(--color-text-primary)'
      }
    };
  };

  return (
    <nav 
      className={`app-navigation ${className}`}
      style={getNavStyles()}
      role="navigation"
      aria-label="Hauptnavigation"
    >
      {items.map((item) => {
        const isActive = view === item.view;
        
        return (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.view)}
            style={getItemStyles(isActive)}
            className="nav-item"
            aria-current={isActive ? 'page' : undefined}
            title={item.description}
            onMouseEnter={(e) => {
              if (!isActive) {
                if (variant === 'header') {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.color = 'white';
                } else {
                  e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                }
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                if (variant === 'header') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.95)';
                } else {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                }
              }
            }}
          >
            <span className="nav-icon" style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {item.icon}
            </span>
            
            {showLabels && variant !== 'bottom' && (
              <span className="nav-label" style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)'
              }}>
                {item.label}
              </span>
            )}
            
            {variant === 'bottom' && (
              <span className="nav-label-mobile" style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-weight-medium)',
                textAlign: 'center',
                marginTop: '2px',
                lineHeight: 1.2
              }}>
                {item.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default AppNavigation;