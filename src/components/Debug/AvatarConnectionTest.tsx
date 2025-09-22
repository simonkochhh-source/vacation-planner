import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { testAvatarUploadConnection } from '../../utils/testAvatarUpload';
import { CheckCircle } from 'lucide-react';

const AvatarConnectionTest: React.FC = () => {
  const { user } = useAuth();
  const [isWorking, setIsWorking] = useState<boolean | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  // Auto-check when user is authenticated
  useEffect(() => {
    if (user && !hasChecked) {
      checkAvatarStatus();
    }
  }, [user, hasChecked]);

  const checkAvatarStatus = async () => {
    if (!user) return;
    
    try {
      const result = await testAvatarUploadConnection();
      const isFullyWorking = result.authCheck && result.bucketExists && result.uploadPermission;
      setIsWorking(isFullyWorking);
    } catch (error) {
      console.error('Avatar status check failed:', error);
      setIsWorking(false);
    } finally {
      setHasChecked(true);
    }
  };

  // Only show if avatar upload is working
  if (!user || !isWorking) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.75rem',
      background: 'var(--color-success)',
      color: 'white',
      borderRadius: '6px',
      fontSize: '0.875rem',
      margin: '1rem 0'
    }}>
      <CheckCircle size={16} />
      <span>Avatar Upload ist konfiguriert und einsatzbereit!</span>
    </div>
  );
};

export default AvatarConnectionTest;