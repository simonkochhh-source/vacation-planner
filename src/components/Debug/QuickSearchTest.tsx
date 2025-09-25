import React from 'react';
import { Search } from 'lucide-react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';

const QuickSearchTest: React.FC = () => {
  const { updateUIState } = useSupabaseApp();

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '50px',
      cursor: 'pointer',
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
      transform: 'translateY(0)',
    }}
    onClick={() => updateUIState({ currentView: 'place-search-demo' })}
    title="Test Enhanced Place Search"
  >
    <Search size={16} />
    <span>🔍 Test Place Search</span>
  </div>
  );
};

export default QuickSearchTest;