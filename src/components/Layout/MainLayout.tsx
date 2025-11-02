import React, { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import SocialSidebar from './SocialSidebar';
import SocialMediaNavigation from '../navigation/SocialMediaNavigation';
import { useUIContext } from '../../contexts/UIContext';
import { useResponsive } from '../../hooks/useResponsive';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { isMobile } = useResponsive();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [socialSidebarOpen, setSocialSidebarOpen] = useState(false);
  const { currentView, activeView, hideHeader } = useUIContext();

  // Determine which sidebar should be shown based on current view
  const viewToCheck = currentView || activeView;
  const shouldShowTripsSidebar = viewToCheck === 'trips';
  const shouldShowSocialSidebar = viewToCheck === 'landing';

  // Close sidebars when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(false);
      setSocialSidebarOpen(false);
    }
  }, [isMobile]);

  // Close sidebars when changing views
  useEffect(() => {
    if (!shouldShowTripsSidebar) {
      setSidebarOpen(false);
    }
    if (!shouldShowSocialSidebar) {
      setSocialSidebarOpen(false);
    }
  }, [shouldShowTripsSidebar, shouldShowSocialSidebar]);

  return (
    <div className={`layout ${isMobile ? 'mobile' : 'desktop'}`} style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
      paddingTop: isMobile ? 'var(--safe-area-inset-top, 0px)' : 0,
      paddingBottom: 0,
      backgroundColor: 'var(--color-background)',
      color: 'var(--color-text-primary)'
    }}>
      {/* Header - Always full width at top */}
      {!hideHeader && (
        <Header 
          onMenuClick={
            isMobile && shouldShowTripsSidebar ? () => setSidebarOpen(true) : 
            isMobile && shouldShowSocialSidebar ? () => setSocialSidebarOpen(true) : 
            undefined
          } 
        />
      )}
      
      {/* Content Container - Sidebar + Main */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden'
      }}>
        {/* Trips Sidebar - Only show in trips view */}
        {shouldShowTripsSidebar && (
          <Sidebar 
            isOpen={sidebarOpen || !isMobile} 
            isMobile={isMobile}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        {/* Social Sidebar - Only show in landing view */}
        {shouldShowSocialSidebar && (
          <SocialSidebar 
            isOpen={socialSidebarOpen || !isMobile} 
            isMobile={isMobile}
            onClose={() => setSocialSidebarOpen(false)}
          />
        )}
        
        {/* Main Content */}
        <main className="main-content" style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: 'var(--color-background)',
          color: 'var(--color-text-primary)',
          padding: isMobile ? '0' : 'var(--space-4)',
          paddingLeft: isMobile ? 'max(var(--space-2), var(--safe-area-inset-left, 0px))' : 'var(--space-4)',
          paddingRight: isMobile ? 'max(var(--space-2), var(--safe-area-inset-right, 0px))' : 'var(--space-4)',
          minHeight: 0 // Important: Allow flex item to shrink
        }}>
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: isMobile ? '0.5rem' : '1rem',
            backgroundColor: 'var(--color-background)',
            color: 'var(--color-text-primary)',
            // Enhanced mobile scrolling
            WebkitOverflowScrolling: isMobile ? 'touch' : 'auto',
            minHeight: 0 // Allow content to shrink for proper scrolling
          }}>
            {children}
          </div>
        </main>
        
        {/* Social Media Navigation - Mobile Only */}
        <SocialMediaNavigation />
      </div>
    </div>
  );
};

export default MainLayout;