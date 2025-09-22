import React, { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { useResponsive } from '../../hooks/useResponsive';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { isMobile } = useResponsive();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { uiState } = useSupabaseApp();

  // Close sidebar when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  return (
    <div className={`layout ${isMobile ? 'mobile' : 'desktop'}`} style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: 'var(--color-background)',
      color: 'var(--color-text-primary)'
    }}>
      {/* Header - Always full width at top */}
      {!uiState.hideHeader && (
        <Header onMenuClick={isMobile ? () => setSidebarOpen(true) : undefined} />
      )}
      
      {/* Content Container - Sidebar + Main */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden'
      }}>
        {/* Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen || !isMobile} 
          isMobile={isMobile}
          onClose={() => setSidebarOpen(false)}
        />
        
        {/* Main Content */}
        <main className="main-content" style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: 'var(--color-background)',
          color: 'var(--color-text-primary)'
        }}>
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: isMobile ? '0.5rem' : '1rem',
            backgroundColor: 'var(--color-background)',
            color: 'var(--color-text-primary)'
          }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;