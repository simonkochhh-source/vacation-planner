import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginPage from './LoginPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-background, #F5F3F0)' }}
      >
        <div className="flex flex-col items-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2"
            style={{ borderColor: 'var(--color-primary-ocean, #4A90A4)' }}
          ></div>
          <p 
            className="mt-4"
            style={{ color: 'var(--color-text-secondary, #8B8680)' }}
          >Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;