import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface PolicyUpdaterProps {
  onClose: () => void;
}

const PolicyUpdater: React.FC<PolicyUpdaterProps> = ({ onClose }) => {
  const [status, setStatus] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const updatePolicies = async () => {
    setIsRunning(true);
    setStatus('RLS policies cannot be updated from the client side.\n\nTo restore proper destination policies, please:\n\n1. Go to your Supabase dashboard\n2. Navigate to SQL Editor\n3. Execute the SQL file: database/restore_proper_destinations_policies.sql\n\nThis will replace the temporary "allow all" policy with secure, comprehensive policies.');
    setIsRunning(false);
  };

  const testPolicies = async () => {
    setIsRunning(true);
    setStatus('Testing current policies...');

    try {
      // Test 1: Check if we can query destinations
      const { data: destinations, error: destError } = await supabase
        .from('destinations')
        .select('id, name, user_id')
        .limit(5);

      if (destError) {
        setStatus(`Query test failed: ${destError.message}`);
        return;
      }

      setStatus(`Found ${destinations?.length || 0} destinations. Current policies are working.`);
      
      // Test 2: Check current policies
      const { data: policies, error: policyError } = await supabase
        .from('pg_policies')
        .select('policyname, tablename, cmd, permissive')
        .eq('tablename', 'destinations');

      if (!policyError && policies) {
        setStatus(`Found ${policies.length} policies: ${policies.map(p => p.policyname).join(', ')}`);
      }

    } catch (error) {
      setStatus(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <h2 style={{ marginTop: 0 }}>Destination Policies Updater</h2>
        
        <p>This tool helps update the destination table RLS policies from the temporary "allow all" policy to proper security rules.</p>
        
        <div style={{ margin: '1rem 0' }}>
          <button
            onClick={testPolicies}
            disabled={isRunning}
            style={{
              padding: '0.5rem 1rem',
              marginRight: '1rem',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRunning ? 'not-allowed' : 'pointer'
            }}
          >
            Test Current Policies
          </button>
          
          <button
            onClick={updatePolicies}
            disabled={isRunning}
            style={{
              padding: '0.5rem 1rem',
              marginRight: '1rem',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRunning ? 'not-allowed' : 'pointer'
            }}
          >
            Update Policies
          </button>
          
          <button
            onClick={onClose}
            disabled={isRunning}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRunning ? 'not-allowed' : 'pointer'
            }}
          >
            Close
          </button>
        </div>
        
        {status && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            marginTop: '1rem',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            whiteSpace: 'pre-wrap'
          }}>
            {status}
          </div>
        )}
        
        {!isRunning && (
          <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
            <p><strong>Manual SQL Execution:</strong></p>
            <p>If the automatic update doesn't work, you'll need to execute the SQL manually in the Supabase dashboard SQL editor.</p>
            <p>The SQL file is located at: <code>database/restore_proper_destinations_policies.sql</code></p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PolicyUpdater;