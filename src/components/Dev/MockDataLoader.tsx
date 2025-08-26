import React, { useState } from 'react';
import { loadMockData, clearAllData } from '../../data/mockData';
import { Database, Trash2, RefreshCw } from 'lucide-react';

const MockDataLoader: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLoadMockData = () => {
    setLoading(true);
    try {
      const result = loadMockData();
      console.log('Loading mock data...', result);
      
      // Verify data was stored
      const storedTrips = localStorage.getItem('vacation-planner-trips');
      const storedDestinations = localStorage.getItem('vacation-planner-destinations');
      
      console.log('Stored trips:', storedTrips ? JSON.parse(storedTrips).length : 0, 'trips');
      console.log('Stored destinations:', storedDestinations ? JSON.parse(storedDestinations).length : 0, 'destinations');
      
      if (!storedTrips || !storedDestinations) {
        throw new Error('Failed to store data in localStorage');
      }
      
      alert(`Mock-Daten geladen: ${JSON.parse(storedTrips).length} Reisen, ${JSON.parse(storedDestinations).length} Ziele`);
      
      // Automatic reload after short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error loading mock data:', error);
      alert(`Fehler beim Laden der Mock-Daten: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      setLoading(false);
    }
  };

  const handleClearData = () => {
    if (window.confirm('Alle Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      setLoading(true);
      try {
        clearAllData();
        alert('Alle Daten gelöscht! Bitte Seite neu laden (F5).');
      } catch (error) {
        console.error('Error clearing data:', error);
        alert('Fehler beim Löschen der Daten');
      }
      setLoading(false);
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: '500',
          transition: 'all 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
        onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
      >
        <Database size={24} />
      </button>

      {/* Developer Panel */}
      {isVisible && (
        <div style={{
          position: 'fixed',
          bottom: '90px',
          right: '20px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
          padding: '1.5rem',
          zIndex: 9998,
          minWidth: '300px',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{
            margin: '0 0 1rem 0',
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#1f2937',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Database size={18} />
            Entwickler-Tools
          </h3>
          
          <p style={{
            margin: '0 0 1rem 0',
            fontSize: '0.875rem',
            color: '#6b7280',
            lineHeight: '1.4'
          }}>
            Lade Mock-Daten für Tests oder lösche alle vorhandenen Daten.
          </p>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <button
              onClick={handleLoadMockData}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: loading ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => {
                if (!loading) e.currentTarget.style.background = '#059669';
              }}
              onMouseOut={(e) => {
                if (!loading) e.currentTarget.style.background = '#10b981';
              }}
            >
              <Database size={16} />
              {loading ? 'Lade...' : 'Mock-Daten laden'}
            </button>

            <button
              onClick={handleClearData}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: loading ? '#9ca3af' : '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => {
                if (!loading) e.currentTarget.style.background = '#dc2626';
              }}
              onMouseOut={(e) => {
                if (!loading) e.currentTarget.style.background = '#ef4444';
              }}
            >
              <Trash2 size={16} />
              Alle Daten löschen
            </button>

            <button
              onClick={handleReload}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#f9fafb';
                  e.currentTarget.style.borderColor = '#9ca3af';
                }
              }}
              onMouseOut={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }
              }}
            >
              <RefreshCw size={16} />
              Seite neu laden
            </button>
          </div>

          <div style={{
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e5e7eb'
          }}>
            <h4 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151'
            }}>
              Mock-Daten Übersicht:
            </h4>
            <ul style={{
              margin: 0,
              padding: '0 0 0 1rem',
              fontSize: '0.75rem',
              color: '#6b7280',
              lineHeight: '1.5'
            }}>
              <li>5 Reisen (Berlin, Bayern, Hamburg, Köln, Dresden)</li>
              <li>12 Ziele mit Koordinaten</li>
              <li>Verschiedene Kategorien (Sehenswürdigkeiten, Hotels, Restaurants, etc.)</li>
              <li>Realistische Daten und Zeiten</li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
};

export default MockDataLoader;