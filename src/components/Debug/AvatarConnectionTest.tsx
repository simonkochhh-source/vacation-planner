import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { testAvatarUploadConnection, testUserServiceAvatarUpload } from '../../utils/testAvatarUpload';
import { Camera, CheckCircle, XCircle, AlertTriangle, Play, Loader } from 'lucide-react';

interface TestResult {
  authCheck: boolean;
  bucketExists: boolean;
  bucketPublic: boolean;
  uploadPermission: boolean;
  errorDetails: string[];
}

const AvatarConnectionTest: React.FC = () => {
  const { user } = useAuth();
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [userServiceTest, setUserServiceTest] = useState<boolean | null>(null);

  // Auto-run test when user is authenticated
  useEffect(() => {
    if (user && !testResult && !testing) {
      runConnectionTest();
    }
  }, [user]);

  const runConnectionTest = async () => {
    setTesting(true);
    try {
      const result = await testAvatarUploadConnection();
      setTestResult(result);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setTesting(false);
    }
  };

  const runUserServiceTest = async () => {
    setTesting(true);
    try {
      const result = await testUserServiceAvatarUpload();
      setUserServiceTest(result);
    } catch (error) {
      console.error('UserService test failed:', error);
      setUserServiceTest(false);
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: boolean | null) => {
    if (status === null) return <AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} />;
    return status ? 
      <CheckCircle size={16} style={{ color: 'var(--color-success)' }} /> :
      <XCircle size={16} style={{ color: 'var(--color-error)' }} />;
  };

  const getStatusText = (status: boolean | null) => {
    if (status === null) return 'Nicht getestet';
    return status ? 'OK' : 'Fehler';
  };

  if (!user) {
    return (
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '1rem',
        margin: '1rem 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Camera size={20} style={{ color: 'var(--color-text-secondary)' }} />
          <h4 style={{ margin: 0, color: 'var(--color-text-primary)' }}>
            Avatar Upload Test
          </h4>
        </div>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          Melden Sie sich an, um die Avatar-Upload-Verbindung zu testen.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      padding: '1rem',
      margin: '1rem 0'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Camera size={20} style={{ color: 'var(--color-primary-ocean)' }} />
        <h4 style={{ margin: 0, color: 'var(--color-text-primary)' }}>
          Avatar Upload Connection Test
        </h4>
        {testing && <Loader size={16} className="animate-spin" style={{ color: 'var(--color-primary-ocean)' }} />}
      </div>

      {/* Test Results */}
      {testResult && (
        <div style={{ marginBottom: '1rem' }}>
          <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>
            Verbindungstest:
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {getStatusIcon(testResult.authCheck)}
              <span>Authentifizierung: {getStatusText(testResult.authCheck)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {getStatusIcon(testResult.bucketExists)}
              <span>Storage Bucket: {getStatusText(testResult.bucketExists)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {getStatusIcon(testResult.bucketPublic)}
              <span>Öffentlicher Zugang: {getStatusText(testResult.bucketPublic)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {getStatusIcon(testResult.uploadPermission)}
              <span>Upload-Berechtigung: {getStatusText(testResult.uploadPermission)}</span>
            </div>
          </div>
        </div>
      )}

      {/* UserService Test Result */}
      {userServiceTest !== null && (
        <div style={{ marginBottom: '1rem' }}>
          <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>
            UserService Test:
          </h5>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            {getStatusIcon(userServiceTest)}
            <span>Avatar Upload Service: {getStatusText(userServiceTest)}</span>
          </div>
        </div>
      )}

      {/* Error Details */}
      {testResult?.errorDetails && testResult.errorDetails.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-error)', fontSize: '0.875rem' }}>
            Gefundene Probleme:
          </h5>
          <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            {testResult.errorDetails.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={runConnectionTest}
          disabled={testing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            background: 'var(--color-primary-ocean)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: testing ? 'not-allowed' : 'pointer',
            fontSize: '0.75rem',
            opacity: testing ? 0.6 : 1
          }}
        >
          <Play size={12} />
          Verbindung testen
        </button>

        <button
          onClick={runUserServiceTest}
          disabled={testing || !testResult?.uploadPermission}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            background: 'var(--color-success)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (testing || !testResult?.uploadPermission) ? 'not-allowed' : 'pointer',
            fontSize: '0.75rem',
            opacity: (testing || !testResult?.uploadPermission) ? 0.6 : 1
          }}
        >
          <Camera size={12} />
          Upload testen
        </button>
      </div>

      {/* Success Message */}
      {testResult && testResult.authCheck && testResult.bucketExists && testResult.uploadPermission && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: 'var(--color-success)',
          color: 'white',
          borderRadius: '4px',
          fontSize: '0.875rem',
          textAlign: 'center'
        }}>
          🎉 Avatar Upload ist vollständig konfiguriert und einsatzbereit!
        </div>
      )}

      {/* Setup Hint */}
      {testResult && testResult.errorDetails.length > 0 && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: 'var(--color-warning)',
          color: 'white',
          borderRadius: '4px',
          fontSize: '0.875rem'
        }}>
          💡 Siehe AVATAR_SETUP.md für detaillierte Setup-Anweisungen
        </div>
      )}
    </div>
  );
};

export default AvatarConnectionTest;