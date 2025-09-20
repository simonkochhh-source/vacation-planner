import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isUsingPlaceholderCredentials } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
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

  useEffect(() => {
    // Handle placeholder credentials - skip authentication
    if (isUsingPlaceholderCredentials) {
      console.log('🔓 Auth: Using placeholder mode - skipping authentication');
      setLoading(false);
      return;
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Auth: Error getting session:', error);
        } else {
          console.log('🔐 Auth: Initial session:', session?.user?.email || 'No user');
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('❌ Auth: Failed to get initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth: State change:', event, session?.user?.email || 'No user');
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

  const signUpWithEmail = async (email: string, password: string) => {
    if (isUsingPlaceholderCredentials) {
      console.log('⚠️ Auth: Cannot sign up with placeholder credentials');
      return;
    }

    try {
      console.log('📧 Auth: Attempting email sign up...');
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('❌ Auth: Email sign up error:', error.message);
        throw error;
      }
      
      console.log('✅ Auth: Email sign up successful');
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

  const value: AuthContextType = {
    user,
    session,
    loading,
    signInWithGoogle,
    signInWithApple,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    isAuthenticated: !!user || isUsingPlaceholderCredentials,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};