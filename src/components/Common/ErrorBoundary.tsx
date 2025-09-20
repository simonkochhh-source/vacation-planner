import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div 
          className="error-boundary"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-xl)',
            minHeight: '300px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            margin: 'var(--space-md)',
            textAlign: 'center'
          }}
        >
          <AlertTriangle 
            size={48} 
            style={{ 
              color: 'var(--color-error)', 
              marginBottom: 'var(--space-md)' 
            }} 
          />
          
          <h2 style={{ 
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-sm)',
            fontSize: 'var(--text-xl)'
          }}>
            Oops! Etwas ist schiefgelaufen
          </h2>
          
          <p style={{ 
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-lg)',
            maxWidth: '400px'
          }}>
            Ein unerwarteter Fehler ist aufgetreten. Versuchen Sie, die Seite neu zu laden.
          </p>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ 
              marginBottom: 'var(--space-lg)',
              padding: 'var(--space-md)',
              background: 'var(--color-neutral-mist)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-mono)',
              maxWidth: '500px',
              overflow: 'auto'
            }}>
              <summary style={{ 
                cursor: 'pointer',
                marginBottom: 'var(--space-sm)',
                fontWeight: 'var(--font-weight-medium)'
              }}>
                Technische Details
              </summary>
              <pre style={{ 
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: 0
              }}>
                {this.state.error.stack}
              </pre>
            </details>
          )}
          
          <Button 
            variant="primary" 
            onClick={this.handleReset}
            leftIcon={<RefreshCw size={16} />}
          >
            Erneut versuchen
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;