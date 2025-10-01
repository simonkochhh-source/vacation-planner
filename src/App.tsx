import React, { Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { SecurityProvider } from './security/SecurityProvider';
import CookieConsent from './components/GDPR/CookieConsent';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import DashboardLayout from './components/Layout/DashboardLayout';
import { SupabaseAppProvider, useSupabaseApp } from './stores/SupabaseAppContext';
import MainLayout from './components/Layout/MainLayout';
import { useTheme } from './hooks/useTheme';
import { useOptimizedCallback } from './hooks/useOptimizedCallback';
import { initPerformanceMonitoring } from './utils/performance';
import PerformanceBudget from './components/Performance/PerformanceBudget';
import PerformanceValidator from './components/Performance/PerformanceValidator';
import { Destination } from './types';
// import './utils/debugDashboard'; // Debug utilities disabled to prevent refresh loops
import './design-system/index.css';
import './App.css';
import './styles/responsive.css';
import './styles/components.css';
import './styles/mobile.css';
import { ChatInterface } from './components/Chat';
// Lazy loaded components with performance optimizations and preloading
const EnhancedTimelineView = React.lazy(() => 
  import(/* webpackChunkName: "timeline" */ './components/Scheduling/EnhancedTimelineView')
);
const AllRoutesMapView = React.lazy(() => 
  import(/* webpackChunkName: "map" */ './components/Views/AllRoutesMapView')
);
const BudgetView = React.lazy(() => 
  import(/* webpackChunkName: "budget" */ './components/Views/BudgetView')
);
const SettingsView = React.lazy(() => 
  import(/* webpackChunkName: "settings" */ './components/Views/SettingsView')
);
const DiscoveryView = React.lazy(() => 
  import(/* webpackChunkName: "discovery" */ './components/Views/DiscoveryView')
);
const SearchPage = React.lazy(() => 
  import(/* webpackChunkName: "search" */ './components/Search/SearchPage')
);
const LandingView = React.lazy(() => 
  import(/* webpackChunkName: "landing" */ './components/Views/LandingView')
);
const TripsView = React.lazy(() => 
  import(/* webpackChunkName: "trips" */ './components/Views/TripsView')
);
const AllPhotosView = React.lazy(() => 
  import(/* webpackChunkName: "photos" */ './components/Views/AllPhotosView')
);
const UserProfileView = React.lazy(() => 
  import(/* webpackChunkName: "social" */ './components/Social/UserProfileView')
);
const MyProfileView = React.lazy(() => 
  import(/* webpackChunkName: "profile" */ './components/Profile/MyProfileView')
);
const PlaceSearchDemo = React.lazy(() => 
  import(/* webpackChunkName: "demo" */ './components/Views/PlaceSearchDemo')
);
const ModernDesignDemo = React.lazy(() => 
  import(/* webpackChunkName: "design-demo" */ './components/Demo/ModernDesignDemo')
);

// Preload critical routes based on user behavior
const preloadRoute = (routeName: string) => {
  const preloadMap = {
    'map': () => import(/* webpackChunkName: "map" */ './components/Views/AllRoutesMapView'),
    'search': () => import(/* webpackChunkName: "search" */ './components/Search/SearchPage'),
    'budget': () => import(/* webpackChunkName: "budget" */ './components/Views/BudgetView'),
    'photos': () => import(/* webpackChunkName: "photos" */ './components/Views/AllPhotosView'),
  };
  
  const preloader = preloadMap[routeName as keyof typeof preloadMap];
  if (preloader) {
    // Use requestIdleCallback for non-critical preloading
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => preloader(), { timeout: 2000 });
    } else {
      setTimeout(() => preloader(), 100);
    }
  }
};

const AppContent: React.FC = () => {
  const { uiState, currentTrip, reorderDestinations, updateUIState } = useSupabaseApp();
  
  // Initialize theme system and performance monitoring
  useTheme();
  
  // Initialize performance monitoring on mount
  React.useEffect(() => {
    initPerformanceMonitoring();
  }, []);

  // Preload likely next routes based on current view
  React.useEffect(() => {
    const currentView = uiState.currentView || uiState.activeView;
    
    // Preload common next views based on user flow patterns
    switch (currentView) {
      case 'landing':
      case 'list':
        // Users often go to map or search from timeline/landing
        preloadRoute('map');
        preloadRoute('search');
        break;
      case 'map':
        // Users often check photos or budget from map
        preloadRoute('photos');
        preloadRoute('budget');
        break;
      case 'search':
        // Users often go to map after search
        preloadRoute('map');
        break;
    }
  }, [uiState.currentView, uiState.activeView]);

  const handleReorderDestinations = useOptimizedCallback(async (reorderedDestinations: Destination[]) => {
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
  }, [currentTrip, reorderDestinations], 'handleReorderDestinations');

  const renderCurrentView = useOptimizedCallback(() => {
    switch (uiState.currentView || uiState.activeView) {
      case 'landing':
        return <LandingView />;
      case 'trips':
        return <TripsView />;
      case 'map':
        return <AllRoutesMapView />;
      case 'budget':
        return <BudgetView />;
      case 'settings':
        return <SettingsView />;
      case 'discovery':
        return <DiscoveryView />;
      case 'search':
        return <SearchPage />;
      case 'photos':
        return <AllPhotosView />;
      case 'user-profile':
        return (
          <UserProfileView
            userId={uiState.selectedUserId || ''}
            onBack={() => updateUIState({ currentView: 'landing' })}
          />
        );
      case 'my-profile':
        return <MyProfileView />;
      case 'place-search-demo':
        return <PlaceSearchDemo />;
      case 'design-demo':
        return <ModernDesignDemo />;
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
  }, [uiState.currentView, uiState.activeView, uiState.selectedUserId, updateUIState, handleReorderDestinations], 'renderCurrentView');

  return (
    <div className="app-container">
      <DashboardLayout>
        <MainLayout>
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          }>
            {renderCurrentView()}
          </Suspense>
        </MainLayout>
      </DashboardLayout>
      <CookieConsent />
      <PerformanceBudget />
      <PerformanceValidator />
      {/* <QuickSearchTest /> */}
      
      {/* Global Chat Interface */}
      {uiState.chatOpen && (
        <ChatInterface
          isOpen={uiState.chatOpen}
          onClose={() => updateUIState({ chatOpen: false })}
          initialRoomId={uiState.selectedChatRoomId}
        />
      )}
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
