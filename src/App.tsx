import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import DashboardLayout from './components/Layout/DashboardLayout';
import { SupabaseAppProvider, useSupabaseApp } from './stores/SupabaseAppContext';
import MainLayout from './components/Layout/MainLayout';
import EnhancedTimelineView from './components/Scheduling/EnhancedTimelineView';
import MapView from './components/Views/MapView';
import TimelineView from './components/Views/TimelineView';
import BudgetView from './components/Views/BudgetView';
import SettingsView from './components/Views/SettingsView';
import DestinationDiscovery from './components/Discovery/DestinationDiscovery';
import { Destination } from './types';
import './App.css';
import './styles/responsive.css';
import './styles/components.css';

const AppContent: React.FC = () => {
  const { uiState, currentTrip, reorderDestinations } = useSupabaseApp();

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
      case 'map':
        return <MapView />;
      case 'timeline':
        return <TimelineView />;
      case 'budget':
        return <BudgetView />;
      case 'settings':
        return <SettingsView />;
      case 'discovery':
        return <DestinationDiscovery />;
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
    <DashboardLayout>
      <MainLayout>
        {renderCurrentView()}
      </MainLayout>
    </DashboardLayout>
  );
};

function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <SupabaseAppProvider>
          <AppContent />
        </SupabaseAppProvider>
      </ProtectedRoute>
    </AuthProvider>
  );
}

export default App;
