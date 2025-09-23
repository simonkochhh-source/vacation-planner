import React, { useState } from 'react';
import { SupabaseService } from '../../services/supabaseService';
import PolicyUpdater from './PolicyUpdater';

const DestinationDebugger: React.FC = () => {
  const [showPolicyUpdater, setShowPolicyUpdater] = useState(false);
  const testDestinationLoading = async () => {
    console.log('🚀 Manual destination loading test started...');
    
    try {
      const destinations = await SupabaseService.getDestinations();
      console.log('🎯 Manual test result:', destinations);
      alert(`Destinations loaded: ${destinations.length} items. Check console for details.`);
    } catch (error) {
      console.error('❌ Manual test failed:', error);
      alert('Destination loading failed. Check console for details.');
    }
  };

  const testDirectSupabaseQuery = async () => {
    console.log('🔧 Direct Supabase query test...');
    
    try {
      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('📊 Direct query result:', { data, error });
      alert(`Direct query: ${data?.length || 0} destinations. Check console for details.`);
    } catch (error) {
      console.error('❌ Direct query failed:', error);
      alert('Direct query failed. Check console for details.');
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      zIndex: 9999, 
      background: '#333', 
      color: 'white', 
      padding: '10px', 
      borderRadius: '5px',
      display: 'flex',
      flexDirection: 'column',
      gap: '5px'
    }}>
      <h4 style={{ margin: '0 0 10px 0', fontSize: '12px' }}>🔧 Debug Tools</h4>
      <button 
        onClick={testDestinationLoading}
        style={{ 
          padding: '5px 10px', 
          fontSize: '11px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          cursor: 'pointer'
        }}
      >
        Test SupabaseService
      </button>
      <button 
        onClick={testDirectSupabaseQuery}
        style={{ 
          padding: '5px 10px', 
          fontSize: '11px',
          background: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          cursor: 'pointer'
        }}
      >
        Test Direct Query
      </button>
      <button 
        onClick={() => setShowPolicyUpdater(true)}
        style={{ 
          padding: '5px 10px', 
          fontSize: '11px',
          background: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          cursor: 'pointer'
        }}
      >
        Update RLS Policies
      </button>
      
      {showPolicyUpdater && (
        <PolicyUpdater onClose={() => setShowPolicyUpdater(false)} />
      )}
    </div>
  );
};

export default DestinationDebugger;