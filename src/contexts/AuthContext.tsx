import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isUsingPlaceholderCredentials } from '../lib/supabase';
import { userService, UserProfile } from '../services/userService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<{ needsVerification: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  verifyOtp: (email: string, token: string, type: 'signup' | 'recovery') => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
  refreshUserProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Handle placeholder credentials - skip authentication
    if (isUsingPlaceholderCredentials) {
      console.log('🔓 Auth: Using placeholder mode - skipping authentication');
      setLoading(false);
      return;
    }

    // Get initial session - but don't auto-login
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Auth: Error getting session:', error);
          setSession(null);
          setUser(null);
        } else {
          // Only set session if it's valid and not expired
          if (session?.user) {
            // Check if session is expired
            const isExpired = session.expires_at && new Date(session.expires_at * 1000) <= new Date();
            
            if (!isExpired) {
              console.log('🔐 Auth: Valid session found:', session.user.email);
              setSession(session);
              setUser(session.user);
            } else {
              console.log('🔓 Auth: Session expired, clearing...');
              setSession(null);
              setUser(null);
              await supabase.auth.signOut();
            }
          } else {
            console.log('🔓 Auth: No valid session found');
            setSession(null);
            setUser(null);
          }
        }
      } catch (error) {
        console.error('❌ Auth: Failed to get initial session:', error);
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth: State change:', event, 'User:', session?.user?.email || 'No user');
        console.log('🔍 Auth: User ID:', session?.user?.id || 'No ID');
        console.log('🔍 Auth: Provider:', session?.user?.app_metadata?.provider || 'No provider');
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Load user profile dynamically when user signs in (non-blocking)
        if (session?.user) {
          console.log('👤 Auth: Loading profile for user:', session.user.id);
          // Load profile in background - don't block authentication
          if (!userProfile || userProfile.id !== session.user.id) {
            loadUserProfile(session.user.id); // Removed await - non-blocking
          }
        } else {
          console.log('🔓 Auth: No user, clearing profile');
          setUserProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Load user profile from users table - SIMPLE VERSION to prevent loops
  const loadUserProfile = async (userId: string) => {
    try {
      console.log('👤 Auth: Loading user profile for:', userId);
      
      // Direct profile loading without timeout for faster response
      const profile = await userService.getCurrentUserProfile();
      
      if (profile && typeof profile === 'object' && 'nickname' in profile) {
        console.log('✅ Auth: User profile loaded:', profile.nickname);
        setUserProfile(profile as UserProfile);
      } else {
        console.log('⚠️ Auth: No user profile found - but continuing anyway');
        // Set to null instead of retrying to prevent loops
        setUserProfile(null);
      }
    } catch (error) {
      console.error('❌ Auth: Failed to load user profile:', error);
      console.log('⚠️ Auth: Continuing without profile to prevent loading loop');
      setUserProfile(null);
    }
  };

  // Refresh user profile
  const refreshUserProfile = async () => {
    if (!user) return;
    await loadUserProfile(user.id);
  };


  const getRedirectUrl = () => {
    // Get current origin dynamically
    const origin = window.location.origin;
    const hostname = window.location.hostname;
    
    console.log('🔗 Auth: Current origin:', origin);
    console.log('🔗 Auth: Current hostname:', hostname);
    console.log('🔗 Auth: Current protocol:', window.location.protocol);
    console.log('🌍 Auth: Environment:', process.env.NODE_ENV);
    
    // Check for Vercel deployment
    const isVercel = hostname.includes('.vercel.app') || process.env.REACT_APP_VERCEL_URL;
    
    // Check for custom production domain
    const productionUrl = process.env.REACT_APP_PRODUCTION_URL;
    
    // Priority: Custom production URL > Current origin (should work in most cases)
    let redirectUrl = origin;
    
    if (process.env.NODE_ENV === 'production' && productionUrl) {
      redirectUrl = productionUrl;
      console.log('🌐 Auth: Using custom production URL:', productionUrl);
    } else if (isVercel) {
      console.log('☁️ Auth: Detected Vercel deployment, using current origin');
    } else if (hostname === 'localhost' && process.env.NODE_ENV === 'production') {
      console.error('❌ Auth: Localhost detected in production! This will cause OAuth to fail.');
      console.log('💡 Auth: Set REACT_APP_PRODUCTION_URL in your deployment environment');
    }
    
    const finalUrl = `${redirectUrl}/dashboard`;
    console.log('🎯 Auth: Final redirect URL:', finalUrl);
    console.log('🚀 Auth: OAuth Fix Version 2.0 - Deployed!');
    
    return finalUrl;
  };

  const signInWithGoogle = async () => {
    if (isUsingPlaceholderCredentials) {
      console.log('⚠️ Auth: Cannot sign in with placeholder credentials');
      return;
    }

    try {
      const redirectUrl = getRedirectUrl();
      console.log('🔑 Auth: Attempting Google sign in...');
      console.log('🔗 Auth: Redirect URL:', redirectUrl);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error('❌ Auth: Google sign in error details:', {
          message: error.message,
          status: error.status,
          code: error.code || 'No code',
          details: error
        });
        throw error;
      }
      
      console.log('✅ Auth: Google OAuth request initiated successfully');
    } catch (error: any) {
      console.error('❌ Auth: Failed to sign in with Google:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        fullError: error
      });
      throw error;
    }
  };

  const signInWithApple = async () => {
    if (isUsingPlaceholderCredentials) {
      console.log('⚠️ Auth: Cannot sign in with placeholder credentials');
      return;
    }

    try {
      const redirectUrl = getRedirectUrl();
      console.log('🍎 Auth: Attempting Apple sign in...');
      console.log('🔗 Auth: Redirect URL:', redirectUrl);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error('❌ Auth: Apple sign in error:', error.message);
        throw error;
      }
    } catch (error) {
      console.error('❌ Auth: Failed to sign in with Apple:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (isUsingPlaceholderCredentials) {
      console.log('⚠️ Auth: Cannot sign in with placeholder credentials');
      return;
    }

    try {
      console.log('📧 Auth: Attempting email sign in...');
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Auth: Email sign in error:', error.message);
        throw error;
      }
      
      console.log('✅ Auth: Email sign in successful');
    } catch (error) {
      console.error('❌ Auth: Failed to sign in with email:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string): Promise<{ needsVerification: boolean }> => {
    if (isUsingPlaceholderCredentials) {
      console.log('⚠️ Auth: Cannot sign up with placeholder credentials');
      return { needsVerification: false };
    }

    try {
      console.log('📧 Auth: Attempting email sign up...');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('❌ Auth: Email sign up error:', error.message);
        throw error;
      }
      
      const needsVerification = !data.session && !!data.user && !data.user.email_confirmed_at;
      
      console.log('✅ Auth: Email sign up successful', { 
        needsVerification,
        userId: data.user?.id,
        emailConfirmed: !!data.user?.email_confirmed_at 
      });
      
      return { needsVerification: !!needsVerification };
    } catch (error) {
      console.error('❌ Auth: Failed to sign up with email:', error);
      throw error;
    }
  };

  const signOut = async () => {
    if (isUsingPlaceholderCredentials) {
      console.log('⚠️ Auth: Cannot sign out with placeholder credentials');
      return;
    }

    try {
      console.log('🔓 Auth: Signing out...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Auth: Sign out error:', error.message);
        throw error;
      }
      
      console.log('✅ Auth: Successfully signed out');
    } catch (error) {
      console.error('❌ Auth: Failed to sign out:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    if (isUsingPlaceholderCredentials) {
      console.log('⚠️ Auth: Cannot reset password with placeholder credentials');
      return;
    }

    try {
      console.log('🔐 Auth: Attempting password reset...');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        console.error('❌ Auth: Password reset error:', error.message);
        throw error;
      }
      
      console.log('✅ Auth: Password reset email sent');
    } catch (error) {
      console.error('❌ Auth: Failed to reset password:', error);
      throw error;
    }
  };

  const verifyOtp = async (email: string, token: string, type: 'signup' | 'recovery') => {
    if (isUsingPlaceholderCredentials) {
      console.log('⚠️ Auth: Cannot verify OTP with placeholder credentials');
      return;
    }

    try {
      console.log('🔑 Auth: Attempting OTP verification...');
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type
      });

      if (error) {
        console.error('❌ Auth: OTP verification error:', error.message);
        throw error;
      }
      
      console.log('✅ Auth: OTP verification successful');
    } catch (error) {
      console.error('❌ Auth: Failed to verify OTP:', error);
      throw error;
    }
  };

  const resendVerification = async (email: string) => {
    if (isUsingPlaceholderCredentials) {
      console.log('⚠️ Auth: Cannot resend verification with placeholder credentials');
      return;
    }

    try {
      console.log('📧 Auth: Resending verification email...');
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('❌ Auth: Resend verification error:', error.message);
        throw error;
      }
      
      console.log('✅ Auth: Verification email resent');
    } catch (error) {
      console.error('❌ Auth: Failed to resend verification:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signInWithGoogle,
    signInWithApple,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    resetPassword,
    verifyOtp,
    resendVerification,
    isAuthenticated: !!user || isUsingPlaceholderCredentials,
    userProfile,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};