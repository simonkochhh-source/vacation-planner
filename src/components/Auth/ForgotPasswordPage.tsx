import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

interface ForgotPasswordPageProps {
  onBackToLogin: () => void;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  onBackToLogin
}) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      setError(null);
      
      await resetPassword(email);
      setEmailSent(true);
      
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError(error.message || 'Fehler beim Senden der E-Mail. Bitte versuchen Sie es später erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
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
            E-Mail gesendet!
          </h1>
          
          <p style={{ 
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-md)',
            lineHeight: 1.5
          }}>
            Wir haben eine E-Mail mit Anweisungen zum Zurücksetzen Ihres Passworts an{' '}
            <strong style={{ color: 'var(--color-text-primary)' }}>{email}</strong> gesendet.
          </p>
          
          <p style={{ 
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-lg)'
          }}>
            Bitte überprüfen Sie auch Ihren Spam-Ordner.
          </p>
          
          <button
            onClick={onBackToLogin}
            className="btn btn-secondary"
            style={{
              border: '2px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              padding: 'var(--space-md) var(--space-lg)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-weight-medium)',
              transition: 'all var(--transition-normal)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              margin: '0 auto'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-neutral-mist)';
              e.currentTarget.style.borderColor = 'var(--color-primary-ocean)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-surface)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <ArrowLeft size={16} />
            Zurück zur Anmeldung
          </button>
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
            Passwort zurücksetzen
          </h1>
          
          <p style={{ 
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.5
          }}>
            Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts.
          </p>
        </div>

        {/* Reset Form */}
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

          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-xs)'
              }}>
                E-Mail-Adresse
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ihre.email@beispiel.de"
                className="input w-full"
                style={{
                  padding: 'var(--space-md)',
                  border: '2px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--text-base)',
                  fontFamily: 'var(--font-body)',
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
              disabled={isLoading || !email}
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
                cursor: (isLoading || !email) ? 'not-allowed' : 'pointer',
                opacity: (isLoading || !email) ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading && email) {
                  e.currentTarget.style.backgroundColor = 'var(--color-secondary-forest)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading && email) {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-sage)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {isLoading ? 'E-Mail wird gesendet...' : 'Reset-Link senden'}
            </button>
          </form>

          {/* Back button */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={onBackToLogin}
              style={{
                color: 'var(--color-text-secondary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
                transition: 'color var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                margin: '0 auto'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              <ArrowLeft size={16} />
              Zurück zur Anmeldung
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;