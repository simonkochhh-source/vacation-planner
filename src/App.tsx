import React from 'react';
import { AppProvider, useApp } from './stores/AppContext';
import MainLayout from './components/Layout/MainLayout';
import EnhancedTimelineView from './components/Scheduling/EnhancedTimelineView';
import MapView from './components/Views/MapView';
import TimelineView from './components/Views/TimelineView';
import BudgetView from './components/Views/BudgetView';
import SettingsView from './components/Views/SettingsView';
import DestinationDiscovery from './components/Discovery/DestinationDiscovery';
import MockDataLoader from './components/Dev/MockDataLoader';
import './App.css';
import './styles/responsive.css';
import './styles/components.css';

const AppContent: React.FC = () => {
  const { uiState } = useApp();

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
        return <EnhancedTimelineView />;
    }
  };

  return (
    <MainLayout>
      {renderCurrentView()}
      <MockDataLoader />
    </MainLayout>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
