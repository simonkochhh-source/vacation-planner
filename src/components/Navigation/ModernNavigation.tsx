import React from 'react';
import { 
  Home, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Search, 
  User, 
  Settings,
  Plus
} from 'lucide-react';

interface ModernNavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
  isMobile?: boolean;
  skipLinkTarget?: string;
  ariaLabel?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  ariaLabel: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Home size={20} />, ariaLabel: 'Go to dashboard' },
  { id: 'trips', label: 'Trips', icon: <MapPin size={20} />, ariaLabel: 'View trips' },
  { id: 'timeline', label: 'Timeline', icon: <Calendar size={20} />, ariaLabel: 'View timeline' },
  { id: 'budget', label: 'Budget', icon: <DollarSign size={20} />, ariaLabel: 'View budget' },
  { id: 'search', label: 'Search', icon: <Search size={20} />, ariaLabel: 'Search trips' },
  { id: 'profile', label: 'Profile', icon: <User size={20} />, ariaLabel: 'View profile' },
];

const ModernNavigation: React.FC<ModernNavigationProps> = ({
  currentView,
  onViewChange,
  isMobile = false,
  skipLinkTarget = '#main-content',
  ariaLabel = 'Main navigation'
}) => {
  if (isMobile) {
    return (
      <>
        {/* Skip Link for Mobile */}
        <a href={skipLinkTarget} className="skip-link">
          Skip to main content
        </a>
        
        <nav 
          className="bottom-nav"
          role="navigation"
          aria-label={ariaLabel}
        >
          {navItems.slice(0, 4).map((item) => (
            <button
              key={item.id}
              className={`bottom-nav-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => onViewChange(item.id)}
              aria-label={item.ariaLabel}
              aria-current={currentView === item.id ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="nav-label text-label-small">
                {item.label}
              </span>
            </button>
          ))}
          
          {/* More button for additional options */}
          <button
            className="bottom-nav-item"
            onClick={() => onViewChange('more')}
            aria-label="More options"
          >
            <span className="nav-icon" aria-hidden="true">
              <Settings size={20} />
            </span>
            <span className="nav-label text-label-small">
              More
            </span>
          </button>
        </nav>
      </>
    );
  }

  return (
    <>
      {/* Skip Link for Desktop */}
      <a href={skipLinkTarget} className="skip-link">
        Skip to main content
      </a>
      
      <nav 
        className="desktop-nav"
        role="navigation"
        aria-label={ariaLabel}
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          width: '240px',
          height: '100vh',
          backgroundColor: 'var(--color-surface-container)',
          borderRight: '1px solid var(--color-outline-variant)',
          padding: 'var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          zIndex: 40
        }}
      >
        {/* Logo/Brand */}
        <div style={{
          padding: 'var(--space-4) 0',
          borderBottom: '1px solid var(--color-outline-variant)',
          marginBottom: 'var(--space-4)'
        }}>
          <h1 className="text-headline-small" style={{ margin: 0, color: 'var(--color-on-surface)' }}>
            Vacation Planner
          </h1>
        </div>

        {/* Navigation Items */}
        <ul role="menubar" style={{ listStyle: 'none', margin: 0, padding: 0, flex: 1 }}>
          {navItems.map((item) => (
            <li key={item.id} role="none">
              <button
                role="menuitem"
                className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                onClick={() => onViewChange(item.id)}
                aria-label={item.ariaLabel}
                aria-current={currentView === item.id ? 'page' : undefined}
                style={{
                  width: '100%',
                  padding: 'var(--space-3) var(--space-4)',
                  border: 'none',
                  backgroundColor: currentView === item.id ? 'var(--color-secondary-container)' : 'transparent',
                  color: currentView === item.id ? 'var(--color-on-secondary-container)' : 'var(--color-on-surface)',
                  borderRadius: 'var(--shape-corner-large)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  cursor: 'pointer',
                  transition: 'all var(--motion-duration-short2) var(--motion-easing-standard)',
                  marginBottom: 'var(--space-1)'
                }}
              >
                <span className="nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="text-label-large">
                  {item.label}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {/* Action Button */}
        <div style={{ borderTop: '1px solid var(--color-outline-variant)', paddingTop: 'var(--space-4)' }}>
          <button
            className="btn btn-filled"
            onClick={() => onViewChange('create-trip')}
            aria-label="Create new trip"
            style={{ width: '100%' }}
          >
            <Plus size={20} aria-hidden="true" />
            <span>New Trip</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default ModernNavigation;