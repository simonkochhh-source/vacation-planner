import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { checkAndMigrateCurrentUser } from '../../utils/migrateUser';
import { RefreshCw, User, AlertCircle } from 'lucide-react';

const MigrationButton: React.FC = () => {
  const { user, refreshUserProfile } = useAuth();
  const [isMigrating, setIsMigrating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const handleMigration = async () => {
    if (!user) {
      setMessage('Kein authentifizierter Benutzer gefunden');
      setMessageType('error');
      return;
    }

    try {
      setIsMigrating(true);
      setMessage('Migration wird durchgeführt...');
      setMessageType('info');

      const success = await checkAndMigrateCurrentUser();
      
      if (success) {
        setMessage('Migration erfolgreich! Profil wird aktualisiert...');
        setMessageType('success');
        
        // Refresh the user profile
        await refreshUserProfile();
        
        // Clear message after 3 seconds
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage('Migration fehlgeschlagen. Bitte versuchen Sie es erneut.');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Migration error:', error);
      setMessage('Fehler bei der Migration aufgetreten');
      setMessageType('error');
    } finally {
      setIsMigrating(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div style={{
      background: 'rgba(255, 193, 7, 0.1)',
      border: '1px solid #ffc107',
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '1rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.75rem'
      }}>
        <AlertCircle size={20} style={{ color: '#ffc107' }} />
        <h4 style={{
          fontSize: '0.875rem',
          fontWeight: '600',
          margin: 0,
          color: '#856404'
        }}>
          Profil-Problem erkannt
        </h4>
      </div>
      
      <p style={{
        fontSize: '0.875rem',
        color: '#856404',
        margin: '0 0 1rem 0',
        lineHeight: 1.4
      }}>
        Es scheint, als ob Ihr Google-Account bereits existiert, aber noch kein Benutzerprofil 
        in der Datenbank erstellt wurde. Klicken Sie auf "Migration durchführen", um dies zu beheben.
      </p>

      {message && (
        <div style={{
          background: messageType === 'success' ? 'var(--color-success)' : 
                     messageType === 'error' ? 'var(--color-error)' : 
                     'var(--color-info)',
          color: 'white',
          padding: '0.5rem',
          borderRadius: '4px',
          fontSize: '0.875rem',
          marginBottom: '0.75rem'
        }}>
          {message}
        </div>
      )}

      <button
        onClick={handleMigration}
        disabled={isMigrating}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          background: isMigrating ? '#6c757d' : '#ffc107',
          color: isMigrating ? 'white' : '#856404',
          border: 'none',
          borderRadius: '6px',
          cursor: isMigrating ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem',
          fontWeight: '500',
          opacity: isMigrating ? 0.7 : 1
        }}
      >
        {isMigrating ? (
          <>
            <RefreshCw size={16} className="animate-spin" />
            Migration läuft...
          </>
        ) : (
          <>
            <User size={16} />
            Migration durchführen
          </>
        )}
      </button>
      
      <div style={{
        fontSize: '0.75rem',
        color: '#6c757d',
        marginTop: '0.5rem'
      }}>
        User ID: {user.id}
      </div>
    </div>
  );
};

export default MigrationButton;