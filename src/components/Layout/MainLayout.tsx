import React, { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-close sidebar on mobile
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={`layout ${isMobile ? 'mobile' : 'desktop'}`} style={{
      height: '100vh',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Mobile Header */}
      {isMobile && <Header onToggleSidebar={toggleSidebar} />}
      
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        isMobile={isMobile}
        onClose={() => setSidebarOpen(false)}
      />
      
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Main Content */}
      <main className="main-content" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#ffffff',
        ...(isMobile && { marginTop: 0 })
      }}>
        {/* Desktop Header */}
        {!isMobile && <Header onToggleSidebar={toggleSidebar} />}
        
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: isMobile ? '0.5rem' : '1rem'
        }}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;