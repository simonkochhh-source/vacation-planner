import React, { useState, useEffect } from 'react';
import { Home, Search, MapPin, Camera, MessageCircle, User, Plus, TrendingUp } from 'lucide-react';
import { useUIContext } from '../../contexts/UIContext';
import { useResponsive } from '../../hooks/useResponsive';

interface SocialNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  view: string;
  badge?: number;
  isMain?: boolean;
}

const SocialMediaNavigation: React.FC = () => {
  const { currentView, updateUIState } = useUIContext();
  const { isMobile } = useResponsive();
  const [activeTab, setActiveTab] = useState(currentView || 'landing');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Social Media style navigation items
  const navItems: SocialNavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home size={24} />,
      view: 'landing',
      isMain: true
    },
    {
      id: 'search',
      label: 'Entdecken',
      icon: <Search size={24} />,
      view: 'search',
      isMain: true
    },
    {
      id: 'create',
      label: 'Erstellen',
      icon: <Plus size={28} />,
      view: 'create',
      isMain: false // Special create button
    },
    {
      id: 'trips',
      label: 'Trips',
      icon: <MapPin size={24} />,
      view: 'trips',
      badge: 3, // Example: 3 active trips
      isMain: true
    },
    {
      id: 'profile',
      label: 'Profil',
      icon: <User size={24} />,
      view: 'profile',
      isMain: true
    }
  ];

  // Quick creation options (Instagram/TikTok style)
  const createOptions = [
    { icon: <Camera size={20} />, label: 'Trip Foto', action: 'photo' },
    { icon: <MapPin size={20} />, label: 'Neuer Trip', action: 'trip' },
    { icon: <MessageCircle size={20} />, label: 'Story teilen', action: 'story' },
    { icon: <TrendingUp size={20} />, label: 'Live Trip', action: 'live' }
  ];

  useEffect(() => {
    setActiveTab(currentView || 'landing');
  }, [currentView]);

  const handleNavClick = (view: string, isCreate = false) => {
    if (isCreate) {
      setShowCreateModal(true);
      return;
    }
    
    setActiveTab(view as any);
    updateUIState({ currentView: view as any });
  };

  const handleCreateAction = (action: string) => {
    setShowCreateModal(false);
    // Handle different creation actions
    switch (action) {
      case 'photo':
        updateUIState({ currentView: 'photos' });
        break;
      case 'trip':
        updateUIState({ currentView: 'trips' });
        break;
      case 'story':
        // Open story creation
        break;
      case 'live':
        // Start live trip sharing
        break;
      default:
        break;
    }
  };

  const navContainerStyle = {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    background: 'var(--color-surface)',
    borderTop: '1px solid var(--color-outline-variant)',
    paddingBottom: 'var(--safe-area-inset-bottom, 0px)',
    paddingTop: 'var(--space-2)',
    zIndex: 100,
    // Modern blur effect
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    backgroundColor: 'rgba(var(--color-surface-rgb), 0.9)'
  };

  const navListStyle = {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: '0 var(--space-2)',
    margin: 0,
    listStyle: 'none'
  };

  const getNavItemStyle = (item: SocialNavItem, isActive: boolean) => {
    const baseStyle = {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      padding: 'var(--space-2)',
      minWidth: '60px',
      minHeight: '60px',
      borderRadius: item.id === 'create' ? '50%' : 'var(--radius-lg)',
      cursor: 'pointer',
      transition: 'all var(--motion-duration-short)',
      position: 'relative' as const,
      textDecoration: 'none',
      color: isActive ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
      background: 'transparent',
      border: 'none',
      // Touch optimizations
      WebkitTapHighlightColor: 'transparent',
      touchAction: 'manipulation'
    };

    // Special styling for create button (Instagram style)
    if (item.id === 'create') {
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
        color: 'white',
        minWidth: '56px',
        minHeight: '56px',
        transform: 'scale(1)',
        boxShadow: '0 4px 12px rgba(var(--color-primary-rgb), 0.3)'
      };
    }

    return {
      ...baseStyle,
      ...(isActive && {
        background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
        transform: 'translateY(-2px)'
      })
    };
  };

  const labelStyle = {
    fontSize: '10px',
    fontWeight: '500',
    marginTop: 'var(--space-1)',
    textAlign: 'center' as const,
    lineHeight: '1.2'
  };

  const badgeStyle = {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    background: 'var(--color-error)',
    color: 'white',
    borderRadius: '50%',
    minWidth: '18px',
    height: '18px',
    fontSize: '10px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid var(--color-surface)'
  };

  const createModalStyle = {
    position: 'fixed' as const,
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-xl)',
    padding: 'var(--space-4)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
    border: '1px solid var(--color-outline-variant)',
    zIndex: 110,
    minWidth: '280px',
    backdropFilter: 'blur(20px)',
    backgroundColor: 'rgba(var(--color-surface-rgb), 0.95)'
  };

  const createOptionStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-lg)',
    cursor: 'pointer',
    transition: 'all var(--motion-duration-short)',
    background: 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left' as const,
    color: 'var(--color-on-surface)',
    minHeight: '48px' // Touch-friendly
  };

  if (!isMobile) {
    return null; // Only show on mobile
  }

  return (
    <>
      {/* Create Modal Overlay */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 105,
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowCreateModal(false)}
        />
      )}

      {/* Create Options Modal */}
      {showCreateModal && (
        <div style={createModalStyle}>
          <h3 style={{
            margin: '0 0 var(--space-3) 0',
            fontSize: '16px',
            fontWeight: '600',
            color: 'var(--color-on-surface)'
          }}>
            Erstellen
          </h3>
          
          {createOptions.map((option, index) => (
            <button
              key={index}
              style={createOptionStyle}
              onClick={() => handleCreateAction(option.action)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-surface-container)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{
                background: 'var(--color-primary-container)',
                color: 'var(--color-on-primary-container)',
                borderRadius: '50%',
                padding: 'var(--space-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {option.icon}
              </div>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main Navigation */}
      <nav style={navContainerStyle} role="navigation" aria-label="Hauptnavigation">
        <ul style={navListStyle} role="tablist">
          {navItems.map((item) => {
            const isActive = activeTab === item.view;
            const isCreate = item.id === 'create';
            
            return (
              <li key={item.id}>
                <button
                  style={getNavItemStyle(item, isActive)}
                  onClick={() => handleNavClick(item.view, isCreate)}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  role="tab"
                  onTouchStart={(e) => {
                    if (!isCreate) {
                      e.currentTarget.style.transform = isActive ? 'translateY(-2px) scale(0.95)' : 'scale(0.95)';
                    }
                  }}
                  onTouchEnd={(e) => {
                    if (!isCreate) {
                      e.currentTarget.style.transform = isActive ? 'translateY(-2px)' : 'scale(1)';
                    }
                  }}
                >
                  {/* Badge for notifications */}
                  {item.badge && (
                    <span style={badgeStyle}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                  
                  {/* Icon */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: item.id === 'create' ? 0 : 'var(--space-1)'
                  }}>
                    {item.icon}
                  </div>
                  
                  {/* Label (hide for create button) */}
                  {item.id !== 'create' && (
                    <span style={labelStyle}>
                      {item.label}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
};

export default SocialMediaNavigation;