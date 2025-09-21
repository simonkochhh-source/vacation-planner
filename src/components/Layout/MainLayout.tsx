import React, { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { uiState } = useSupabaseApp();

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(false); // Close sidebar when switching to desktop
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className={`layout ${isMobile ? 'mobile' : 'desktop'}`} style={{
      height: '100vh',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: 'var(--color-background)',
      color: 'var(--color-text-primary)'
    }}>
      {/* Mobile Header */}
      {isMobile && !uiState.hideHeader && <Header onMenuClick={() => setSidebarOpen(true)} />}
      
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
        color: 'var(--color-text-primary)',
        ...(isMobile && { marginTop: 0 })
      }}>
        {/* Desktop Header */}
        {!isMobile && !uiState.hideHeader && <Header />}
        
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
  );
};

export default MainLayout;