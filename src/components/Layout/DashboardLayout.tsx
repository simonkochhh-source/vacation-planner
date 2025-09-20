import React from 'react';
import { isUsingPlaceholderCredentials } from '../../lib/supabase';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--color-background)',
      color: 'var(--color-text-primary)'
    }}>
      {/* Demo Mode Badge (optional) */}
      {isUsingPlaceholderCredentials && (
        <div style={{
          position: 'fixed',
          top: 'var(--space-md)',
          right: 'var(--space-md)',
          zIndex: 1000
        }}>
          <div className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
            Demo Mode
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;