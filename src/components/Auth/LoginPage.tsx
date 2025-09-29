import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isUsingPlaceholderCredentials } from '../../lib/supabase';
import { MapPin, Mountain, Compass } from 'lucide-react';
import EmailVerificationPage from './EmailVerificationPage';
import ForgotPasswordPage from './ForgotPasswordPage';

const LoginPage: React.FC = () => {
  const { signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail, loading } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentView, setCurrentView] = useState<'login' | 'verification' | 'forgot-password'>('login');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');

  const handleGoogleSignIn = async () => {
    if (isUsingPlaceholderCredentials) {
      // For demo purposes when using placeholder credentials
      window.location.href = '/dashboard';
      return;
    }

    try {
      setIsSigningIn(true);
      setError(null);
      await signInWithGoogle();
    } catch (error: any) {
      let errorMessage = error.message || 'Failed to sign in with Google';
      
      // Provide helpful error messages for common OAuth issues
      if (error.message?.includes('provider') || error.message?.includes('400')) {
        errorMessage = 'Google OAuth is not configured yet. Please use email authentication below or contact your administrator to set up Google login.';
      }
      
      setError(errorMessage);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (isUsingPlaceholderCredentials) {
      // For demo purposes when using placeholder credentials
      window.location.href = '/dashboard';
      return;
    }

    try {
      setIsSigningIn(true);
      setError(null);
      await signInWithApple();
    } catch (error: any) {
      let errorMessage = error.message || 'Failed to sign in with Apple';
      
      // Provide helpful error messages for common OAuth issues
      if (error.message?.includes('provider') || error.message?.includes('400')) {
        errorMessage = 'Apple OAuth is not configured yet. Please use email authentication below or contact your administrator to set up Apple login.';
      }
      
      setError(errorMessage);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isUsingPlaceholderCredentials) {
      window.location.href = '/dashboard';
      return;
    }

    try {
      setIsSigningIn(true);
      setError(null);
      
      if (isSignUp) {
        const result = await signUpWithEmail(email, password);
        if (result.needsVerification) {
          setPendingVerificationEmail(email);
          setCurrentView('verification');
        }
        // If no verification needed, user will be automatically signed in
      } else {
        await signInWithEmail(email, password);
      }
    } catch (error: any) {
      setError(error.message || `Failed to ${isSignUp ? 'sign up' : 'sign in'} with email`);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleBackToLogin = () => {
    setCurrentView('login');
    setShowEmailForm(false);
    setIsSignUp(false);
    setEmail('');
    setPassword('');
    setError(null);
    setPendingVerificationEmail('');
  };

  const handleVerificationComplete = () => {
    // User will be automatically signed in after verification
    // The auth state change will be handled by the AuthContext
    window.location.href = '/dashboard';
  };

  const handleForgotPassword = () => {
    setCurrentView('forgot-password');
  };

  if (loading) {
    return (
      <div className="app-container min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-md">
          <div className="animate-spin rounded-full h-12 w-12" style={{ borderBottomWidth: '2px', borderBottomColor: 'var(--color-primary-ocean)', borderBottomStyle: 'solid' }}></div>
          <p className="text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // Show verification page if user needs to verify email
  if (currentView === 'verification') {
    return (
      <EmailVerificationPage
        email={pendingVerificationEmail}
        onBackToLogin={handleBackToLogin}
        onVerificationComplete={handleVerificationComplete}
      />
    );
  }

  // Show forgot password page
  if (currentView === 'forgot-password') {
    return (
      <ForgotPasswordPage
        onBackToLogin={handleBackToLogin}
      />
    );
  }

  return (
    <div className="app-container min-h-screen flex items-center justify-center" style={{ padding: 'var(--space-2xl) var(--space-md)' }}>
      <div className="max-w-md w-full" style={{ gap: 'var(--space-2xl)' }}>
        {/* Hero Section */}
        <div className="text-center" style={{ marginBottom: 'var(--space-2xl)' }}>
          {/* Logo/Icon */}
          <div className="mx-auto flex items-center justify-center rounded-full" 
               style={{ 
                 width: '80px', 
                 height: '80px',
                 backgroundColor: 'var(--color-primary-sage)',
                 marginBottom: 'var(--space-lg)'
               }}>
            <Mountain size={40} style={{ color: 'white' }} />
          </div>
          
          {/* Brand Name */}
          <h1 style={{ 
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-3xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-sm)'
          }}>
            Trailkeeper
          </h1>
          
          {/* Subtitle */}
          <p style={{ 
            fontSize: 'var(--text-lg)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-md)'
          }}>
            Plan your next adventure with confidence
          </p>
          
          {/* Feature highlights */}
          <div className="flex justify-center items-center gap-md" style={{ marginBottom: 'var(--space-lg)' }}>
            <div className="flex items-center" style={{ gap: 'var(--space-xs)' }}>
              <MapPin size={16} style={{ color: 'var(--color-primary-ocean)' }} />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>Places</span>
            </div>
            <div className="flex items-center" style={{ gap: 'var(--space-xs)' }}>
              <Compass size={16} style={{ color: 'var(--color-primary-ocean)' }} />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>Routes</span>
            </div>
          </div>
          
          {isUsingPlaceholderCredentials && (
            <div className="card" style={{ 
              backgroundColor: 'var(--color-secondary-sunset)', 
              color: 'white',
              padding: 'var(--space-md)',
              marginTop: 'var(--space-md)'
            }}>
              <p style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
                <strong>Demo Mode:</strong> Using placeholder credentials. Authentication will be simulated.
              </p>
            </div>
          )}
        </div>
        
        {/* Authentication Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {error && (
            <div className="card" style={{ 
              backgroundColor: 'var(--color-error)', 
              color: 'white',
              padding: 'var(--space-md)',
              border: 'none'
            }}>
              <div className="flex items-start" style={{ gap: 'var(--space-sm)' }}>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p style={{ fontSize: 'var(--text-sm)', margin: 0 }}>{error}</p>
                  {error.includes('provider') && (
                    <p style={{ fontSize: 'var(--text-xs)', margin: 'var(--space-xs) 0 0 0', opacity: 0.9 }}>
                      OAuth providers not configured yet. Please use email authentication below.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="btn btn-secondary w-full"
            style={{
              border: '2px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              padding: 'var(--space-md) var(--space-lg)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-weight-medium)',
              transition: 'all var(--transition-normal)',
              cursor: isSigningIn ? 'not-allowed' : 'pointer',
              opacity: isSigningIn ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!isSigningIn) {
                e.currentTarget.style.backgroundColor = 'var(--color-neutral-mist)';
                e.currentTarget.style.borderColor = 'var(--color-primary-ocean)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSigningIn) {
                e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }
            }}
          >
            <div className="flex items-center justify-center" style={{ gap: 'var(--space-sm)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {isSigningIn ? 'Signing in...' : 'Continue with Google'}
            </div>
          </button>

          <button
            onClick={handleAppleSignIn}
            disabled={isSigningIn}
            className="btn w-full"
            style={{
              backgroundColor: 'var(--color-neutral-charcoal)',
              color: 'white',
              border: 'none',
              padding: 'var(--space-md) var(--space-lg)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-weight-medium)',
              transition: 'all var(--transition-normal)',
              cursor: isSigningIn ? 'not-allowed' : 'pointer',
              opacity: isSigningIn ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!isSigningIn) {
                e.currentTarget.style.backgroundColor = '#2A2A2A';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSigningIn) {
                e.currentTarget.style.backgroundColor = 'var(--color-neutral-charcoal)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <div className="flex items-center justify-center" style={{ gap: 'var(--space-sm)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              {isSigningIn ? 'Signing in...' : 'Continue with Apple'}
            </div>
          </button>

          {/* Divider */}
          <div className="relative" style={{ margin: 'var(--space-lg) 0' }}>
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: 'var(--color-border)' }} />
            </div>
            <div className="relative flex justify-center" style={{ fontSize: 'var(--text-sm)' }}>
              <span style={{ 
                padding: '0 var(--space-md)', 
                backgroundColor: 'var(--color-background)', 
                color: 'var(--color-text-secondary)' 
              }}>
                Or continue with
              </span>
            </div>
          </div>

          {/* Email/Password Form or Button */}
          {showEmailForm ? (
            <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
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
              <div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
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
                disabled={isSigningIn}
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
                  cursor: isSigningIn ? 'not-allowed' : 'pointer',
                  opacity: isSigningIn ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isSigningIn) {
                    e.currentTarget.style.backgroundColor = 'var(--color-secondary-forest)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSigningIn) {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-sage)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {isSigningIn ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
              </button>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <div className="flex justify-between items-center" style={{ fontSize: 'var(--text-sm)' }}>
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    style={{
                      color: 'var(--color-primary-ocean)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 'var(--text-sm)',
                      transition: 'color var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--color-secondary-forest)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--color-primary-ocean)';
                    }}
                  >
                    {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setShowEmailForm(false)}
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
                    Back
                  </button>
                </div>
                
                {!isSignUp && (
                  <div style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      style={{
                        color: 'var(--color-text-secondary)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 'var(--text-sm)',
                        transition: 'color var(--transition-fast)',
                        textDecoration: 'underline'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--color-primary-ocean)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--color-text-secondary)';
                      }}
                    >
                      Passwort vergessen?
                    </button>
                  </div>
                )}
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowEmailForm(true)}
              disabled={isSigningIn}
              className="btn btn-ghost w-full"
              style={{
                border: '2px solid var(--color-border)',
                backgroundColor: 'transparent',
                color: 'var(--color-text-primary)',
                padding: 'var(--space-md) var(--space-lg)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-weight-medium)',
                transition: 'all var(--transition-normal)',
                cursor: isSigningIn ? 'not-allowed' : 'pointer',
                opacity: isSigningIn ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!isSigningIn) {
                  e.currentTarget.style.backgroundColor = 'var(--color-neutral-mist)';
                  e.currentTarget.style.borderColor = 'var(--color-primary-ocean)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSigningIn) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                }
              }}
            >
              <div className="flex items-center justify-center" style={{ gap: 'var(--space-sm)' }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
                Continue with Email
              </div>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="text-center" style={{ marginTop: 'var(--space-2xl)' }}>
          <p style={{ 
            fontSize: 'var(--text-xs)', 
            color: 'var(--color-text-secondary)',
            lineHeight: 1.5
          }}>
            By continuing, you agree to our{' '}
            <a href="#" style={{ color: 'var(--color-primary-ocean)', textDecoration: 'underline' }}>
              Terms of Service
            </a>
            {' '}and{' '}
            <a href="#" style={{ color: 'var(--color-primary-ocean)', textDecoration: 'underline' }}>
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;