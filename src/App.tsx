import React from 'react';
import { AppProvider, useApp } from './stores/AppContext';
import MainLayout from './components/Layout/MainLayout';
import ListView from './components/Views/ListView';
import MapView from './components/Views/MapView';
import TimelineView from './components/Views/TimelineView';
import SchedulingView from './components/Views/SchedulingView';
import BudgetView from './components/Views/BudgetView';
import MockDataLoader from './components/Dev/MockDataLoader';
import './App.css';
import './styles/responsive.css';
import './styles/components.css';

const AppContent: React.FC = () => {
  const { uiState } = useApp();

  const renderCurrentView = () => {
    switch (uiState.currentView) {
      case 'map':
        return <MapView />;
      case 'timeline':
        return <TimelineView />;
      case 'scheduling':
        return <SchedulingView />;
      case 'budget':
        return <BudgetView />;
      case 'list':
      default:
        return <ListView />;
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
