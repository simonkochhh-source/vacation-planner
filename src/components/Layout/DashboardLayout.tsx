import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isUsingPlaceholderCredentials } from '../../lib/supabase';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      
      if (isUsingPlaceholderCredentials) {
        // For demo purposes when using placeholder credentials
        window.location.href = '/';
        return;
      }
      
      await signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const getUserDisplayName = () => {
    if (isUsingPlaceholderCredentials) {
      return 'Demo User';
    }
    return user?.user_metadata?.full_name || user?.email || 'User';
  };

  const getUserAvatar = () => {
    if (isUsingPlaceholderCredentials) {
      return null;
    }
    return user?.user_metadata?.avatar_url;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-semibold text-gray-900">
                  Vacation Planner
                </h1>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {isUsingPlaceholderCredentials && (
                <div className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                  Demo Mode
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                {getUserAvatar() ? (
                  <img
                    className="h-8 w-8 rounded-full"
                    src={getUserAvatar()}
                    alt="User avatar"
                  />
                ) : (
                  <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <svg className="h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">
                    {getUserDisplayName()}
                  </span>
                  {!isUsingPlaceholderCredentials && user?.email && (
                    <span className="text-xs text-gray-500">
                      {user.email}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSigningOut ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                    Signing out...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </>
                )}
              </button>
            </div>
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