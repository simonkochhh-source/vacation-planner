import React, { createContext, useContext, useEffect, useState } from 'react';

interface SecurityContextType {
  isSecureConnection: boolean;
  cspViolations: number;
  lastSecurityCheck: Date | null;
  reportViolation: (violation: SecurityViolation) => void;
}

interface SecurityViolation {
  type: 'csp' | 'xss' | 'injection' | 'unauthorized';
  description: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userAgent?: string;
}

const SecurityContext = createContext<SecurityContextType | null>(null);

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurityContext must be used within SecurityProvider');
  }
  return context;
};

interface SecurityProviderProps {
  children: React.ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const [isSecureConnection, setIsSecureConnection] = useState(false);
  const [cspViolations, setCspViolations] = useState(0);
  const [lastSecurityCheck, setLastSecurityCheck] = useState<Date | null>(null);

  // Check security status on mount
  useEffect(() => {
    performSecurityCheck();
    setupCSPViolationReporting();
    
    // Periodic security checks
    const securityInterval = setInterval(performSecurityCheck, 5 * 60 * 1000); // Every 5 minutes
    
    return () => {
      clearInterval(securityInterval);
    };
  }, []);

  const performSecurityCheck = () => {
    // Check HTTPS connection
    const isHTTPS = window.location.protocol === 'https:' || 
                   window.location.hostname === 'localhost';
    setIsSecureConnection(isHTTPS);
    
    // Log security check
    setLastSecurityCheck(new Date());
    
    // Additional security validations
    validateEnvironment();
  };

  const validateEnvironment = () => {
    // Check for development vs production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!isDevelopment) {
      // Production security checks
      if (!isSecureConnection) {
        console.error('🔒 SECURITY WARNING: Application running on insecure connection in production');
        reportViolation({
          type: 'unauthorized',
          description: 'Insecure connection in production environment',
          timestamp: new Date(),
          severity: 'critical'
        });
      }
      
      // Check for exposed debug info
      if (window.localStorage.getItem('debug') === 'true') {
        console.warn('🔒 SECURITY: Debug mode enabled in production');
        window.localStorage.removeItem('debug');
      }
    }
  };

  const setupCSPViolationReporting = () => {
    // Listen for CSP violations
    document.addEventListener('securitypolicyviolation', (event) => {
      setCspViolations(prev => prev + 1);
      
      const violation: SecurityViolation = {
        type: 'csp',
        description: `CSP Violation: ${event.violatedDirective} - ${event.blockedURI}`,
        timestamp: new Date(),
        severity: 'medium',
        userAgent: navigator.userAgent
      };
      
      reportViolation(violation);
    });
  };

  const reportViolation = (violation: SecurityViolation) => {
    // Log violation (in production, send to monitoring service)
    console.warn('🔒 Security Violation:', violation);
    
    // In production, report to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to your monitoring service
      // fetch('/api/security/report', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(violation)
      // });
    }
    
    // Store locally for debugging (limit storage)
    try {
      const violations = JSON.parse(localStorage.getItem('security_violations') || '[]');
      violations.unshift(violation);
      
      // Keep only last 50 violations
      const limitedViolations = violations.slice(0, 50);
      localStorage.setItem('security_violations', JSON.stringify(limitedViolations));
    } catch (error) {
      console.error('Failed to store security violation:', error);
    }
  };

  const contextValue: SecurityContextType = {
    isSecureConnection,
    cspViolations,
    lastSecurityCheck,
    reportViolation
  };

  return (
    <SecurityContext.Provider value={contextValue}>
      {children}
    </SecurityContext.Provider>
  );
};