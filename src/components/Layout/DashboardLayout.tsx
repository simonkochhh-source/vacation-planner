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
      {/* Navigation Header */}
      <nav style={{
        backgroundColor: 'var(--color-surface)',
        boxShadow: 'var(--shadow-sm)',
        borderBottom: '1px solid var(--color-border)'
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: 'var(--color-text-primary)'
                }}>
                  Vacation Planner
                </h1>
              </div>
            </div>

            {/* Demo Mode Badge (optional) */}
            {isUsingPlaceholderCredentials && (
              <div className="flex items-center">
                <div className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                  Demo Mode
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;