import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './utils/serviceWorkerRegistration';
import { initPerformanceMonitoring, getPerformanceMetrics } from './utils/performance';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Initialize performance monitoring
initPerformanceMonitoring();

// Enhanced web vitals reporting
reportWebVitals((metric) => {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(metric);
  }
});

// Register service worker for offline support and caching
if (process.env.NODE_ENV === 'production') {
  serviceWorkerRegistration.register({
    onSuccess: (registration) => {
      console.log('SW registered successfully');
    },
    onUpdate: (registration) => {
      console.log('SW updated');
      // Show update notification to user
      serviceWorkerRegistration.showUpdateAvailable(registration);
    },
    onOfflineReady: () => {
      console.log('App ready for offline use');
      // Optionally show offline ready notification
    },
  });
} else {
  // Unregister service worker in development to avoid caching issues
  serviceWorkerRegistration.unregister();
}

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Handle uncaught errors
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
});
