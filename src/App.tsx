import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { SecurityProvider } from './security/SecurityProvider';
import CookieConsent from './components/GDPR/CookieConsent';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import DashboardLayout from './components/Layout/DashboardLayout';
import { SupabaseAppProvider, useSupabaseApp } from './stores/SupabaseAppContext';
import MainLayout from './components/Layout/MainLayout';
import EnhancedTimelineView from './components/Scheduling/EnhancedTimelineView';
import MapView from './components/Views/MapView';
import BudgetView from './components/Views/BudgetView';
import SettingsView from './components/Views/SettingsView';
import DiscoveryView from './components/Views/DiscoveryView';
import SearchPage from './components/Search/SearchPage';
import LandingView from './components/Views/LandingView';
import PhotosView from './components/Views/PhotosView';
import UserProfileView from './components/Social/UserProfileView';
import MyProfileView from './components/Profile/MyProfileView';
import { useTheme } from './hooks/useTheme';
import { Destination } from './types';
// import './utils/debugDashboard'; // Debug utilities disabled to prevent refresh loops
import './App.css';
import './styles/responsive.css';
import './styles/components.css';

const AppContent: React.FC = () => {
  const { uiState, currentTrip, reorderDestinations, updateUIState } = useSupabaseApp();
  
  // Initialize theme system
  useTheme();

  const handleReorderDestinations = async (reorderedDestinations: Destination[]) => {
    if (!currentTrip) return;
    
    try {
      console.log('App: Reordering destinations:', reorderedDestinations.map(d => d.name));
      
      // Update the trip with the new destination order using the proper reorderDestinations action
      const destinationIds = reorderedDestinations.map(dest => dest.id);
      await reorderDestinations(currentTrip.id, destinationIds);
      
      console.log('✅ App: Trip destinations reordered successfully');
    } catch (error) {
      console.error('❌ App: Failed to reorder destinations:', error);
    }
  };

  const renderCurrentView = () => {
    switch (uiState.currentView || uiState.activeView) {
      case 'landing':
        return <LandingView />;
      case 'map':
        return <MapView />;
      case 'budget':
        return <BudgetView />;
      case 'settings':
        return <SettingsView />;
      case 'discovery':
        return <DiscoveryView />;
      case 'search':
        return <SearchPage />;
      case 'photos':
        return <PhotosView />;
      case 'user-profile':
        return (
          <UserProfileView
            userId={uiState.selectedUserId || ''}
            onBack={() => updateUIState({ currentView: 'landing' })}
          />
        );
      case 'my-profile':
        return <MyProfileView />;
      case 'list':
      default:
        return (
          <EnhancedTimelineView 
            onDestinationClick={(dest) => {
              console.log('App: Destination clicked:', dest.name);
            }}
            onEditDestination={(dest) => {
              console.log('App: Edit destination:', dest.name);
            }}
            onReorderDestinations={handleReorderDestinations}
          />
        );
    }
  };

  return (
    <div className="app-container">
      <DashboardLayout>
        <MainLayout>
          {renderCurrentView()}
        </MainLayout>
      </DashboardLayout>
      <CookieConsent />
    </div>
  );
};

function App() {
  return (
    <SecurityProvider>
      <AuthProvider>
        <ProtectedRoute>
          <SupabaseAppProvider>
            <AppContent />
          </SupabaseAppProvider>
        </ProtectedRoute>
      </AuthProvider>
    </SecurityProvider>
  );
}

export default App;
