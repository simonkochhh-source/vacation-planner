import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, RefreshCw, CheckCircle, Mountain } from 'lucide-react';

interface EmailVerificationPageProps {
  email: string;
  onBackToLogin: () => void;
  onVerificationComplete: () => void;
}

const EmailVerificationPage: React.FC<EmailVerificationPageProps> = ({
  email,
  onBackToLogin,
  onVerificationComplete
}) => {
  const { verifyOtp, resendVerification } = useAuth();
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (verificationCode.length !== 6) {
      setError('Bitte geben Sie einen 6-stelligen Verifizierungscode ein.');
      return;
    }

    try {
      setIsVerifying(true);
      setError(null);
      
      await verifyOtp(email, verificationCode, 'signup');
      setSuccess(true);
      
      // Wait a moment to show success, then redirect
      setTimeout(() => {
        onVerificationComplete();
      }, 2000);
      
    } catch (error: any) {
      console.error('Verification error:', error);
      setError(error.message || 'Ungültiger Verifizierungscode. Bitte versuchen Sie es erneut.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setIsResending(true);
      setError(null);
      
      await resendVerification(email);
      setResendCooldown(60); // 60 second cooldown
      
    } catch (error: any) {
      console.error('Resend error:', error);
      setError(error.message || 'Fehler beim Versenden der E-Mail. Bitte versuchen Sie es später erneut.');
    } finally {
      setIsResending(false);
    }
  };

  if (success) {
    return (
      <div className="app-container min-h-screen flex items-center justify-center" style={{ padding: 'var(--space-2xl) var(--space-md)' }}>
        <div className="max-w-md w-full text-center">
          <div className="mx-auto flex items-center justify-center rounded-full" 
               style={{ 
                 width: '80px', 
                 height: '80px',
                 backgroundColor: 'var(--color-success)',
                 marginBottom: 'var(--space-lg)'
               }}>
            <CheckCircle size={40} style={{ color: 'white' }} />
          </div>
          
          <h1 style={{ 
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-md)'
          }}>
            E-Mail erfolgreich verifiziert!
          </h1>
          
          <p style={{ 
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-lg)'
          }}>
            Ihr Konto wurde erfolgreich aktiviert. Sie werden automatisch weitergeleitet...
          </p>
          
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" 
               style={{ borderColor: 'var(--color-success)' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container min-h-screen flex items-center justify-center" style={{ padding: 'var(--space-2xl) var(--space-md)' }}>
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center" style={{ marginBottom: 'var(--space-2xl)' }}>
          <div className="mx-auto flex items-center justify-center rounded-full" 
               style={{ 
                 width: '80px', 
                 height: '80px',
                 backgroundColor: 'var(--color-primary-ocean)',
                 marginBottom: 'var(--space-lg)'
               }}>
            <Mail size={40} style={{ color: 'white' }} />
          </div>
          
          <h1 style={{ 
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-md)'
          }}>
            E-Mail verifizieren
          </h1>
          
          <p style={{ 
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-md)',
            lineHeight: 1.5
          }}>
            Wir haben einen 6-stelligen Verifizierungscode an{' '}
            <strong style={{ color: 'var(--color-text-primary)' }}>{email}</strong> gesendet.
          </p>
          
          <p style={{ 
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)'
          }}>
            Bitte überprüfen Sie auch Ihren Spam-Ordner.
          </p>
        </div>

        {/* Verification Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {error && (
            <div className="card" style={{ 
              backgroundColor: 'var(--color-error)', 
              color: 'white',
              padding: 'var(--space-md)',
              border: 'none'
            }}>
              <p style={{ fontSize: 'var(--text-sm)', margin: 0 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-xs)'
              }}>
                Verifizierungscode
              </label>
              <input
                type="text"
                required
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setVerificationCode(value);
                }}
                placeholder="123456"
                className="input w-full"
                style={{
                  padding: 'var(--space-md)',
                  border: '2px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--text-lg)',
                  fontFamily: 'monospace',
                  textAlign: 'center',
                  letterSpacing: '0.25em',
                  transition: 'border-color var(--transition-fast)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-primary-ocean)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(74, 144, 164, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-border)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isVerifying || verificationCode.length !== 6}
              className="btn btn-primary w-full"
              style={{
                backgroundColor: 'var(--color-primary-sage)',
                color: 'white',
                border: 'none',
                padding: 'var(--space-md) var(--space-lg)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-weight-medium)',
                transition: 'all var(--transition-normal)',
                cursor: (isVerifying || verificationCode.length !== 6) ? 'not-allowed' : 'pointer',
                opacity: (isVerifying || verificationCode.length !== 6) ? 0.6 : 1
              }}
            >
              {isVerifying ? 'Wird verifiziert...' : 'Code verifizieren'}
            </button>
          </form>

          {/* Resend and Back buttons */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: 'var(--space-sm)',
            alignItems: 'center'
          }}>
            <button
              onClick={handleResendCode}
              disabled={isResending || resendCooldown > 0}
              style={{
                color: resendCooldown > 0 ? 'var(--color-text-secondary)' : 'var(--color-primary-ocean)',
                background: 'none',
                border: 'none',
                cursor: (isResending || resendCooldown > 0) ? 'not-allowed' : 'pointer',
                fontSize: 'var(--text-sm)',
                transition: 'color var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)'
              }}
            >
              <RefreshCw size={16} className={isResending ? 'animate-spin' : ''} />
              {resendCooldown > 0 
                ? `Code erneut senden (${resendCooldown}s)`
                : isResending 
                  ? 'Wird gesendet...'
                  : 'Code erneut senden'
              }
            </button>
            
            <button
              onClick={onBackToLogin}
              style={{
                color: 'var(--color-text-secondary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
                transition: 'color var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              Zurück zur Anmeldung
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;