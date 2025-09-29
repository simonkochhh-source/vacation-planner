import React, { useState, useEffect } from 'react';
import { getPerformanceMetrics } from '../../utils/performance';

interface PerformanceValidatorProps {
  showInProduction?: boolean;
}

const PerformanceValidator: React.FC<PerformanceValidatorProps> = ({ 
  showInProduction = false 
}) => {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development or if explicitly enabled
    if (process.env.NODE_ENV === 'production' && !showInProduction) {
      return;
    }

    const updateMetrics = () => {
      const currentMetrics = getPerformanceMetrics();
      setMetrics(currentMetrics);
    };

    // Update metrics every 3 seconds
    const interval = setInterval(updateMetrics, 3000);
    updateMetrics(); // Initial update

    // Show on Shift+P
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'P') {
        setIsVisible(!isVisible);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showInProduction, isVisible]);

  // Don't render in production unless explicitly enabled
  if (process.env.NODE_ENV === 'production' && !showInProduction) {
    return null;
  }

  if (!isVisible) {
    return (
      <div 
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          background: '#1f2937',
          color: '#e5e7eb',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          fontFamily: 'monospace',
          zIndex: 9998,
          cursor: 'pointer'
        }}
        onClick={() => setIsVisible(true)}
      >
        Shift+P: Performance
      </div>
    );
  }

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        background: '#1f2937',
        color: '#e5e7eb',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '11px',
        fontFamily: 'monospace',
        zIndex: 9998,
        maxWidth: '300px',
        maxHeight: '400px',
        overflow: 'auto'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <strong>Performance Metrics</strong>
        <button 
          onClick={() => setIsVisible(false)}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#e5e7eb', 
            cursor: 'pointer' 
          }}
        >
          ×
        </button>
      </div>
      
      {metrics.length === 0 ? (
        <div>No metrics recorded yet</div>
      ) : (
        <div>
          {metrics.slice(-10).map((metric, index) => (
            <div 
              key={index} 
              style={{ 
                marginBottom: '4px',
                padding: '4px',
                background: metric.value > getThreshold(metric.name) ? '#dc2626' : '#059669',
                borderRadius: '3px'
              }}
            >
              <div>{metric.name}: {metric.value.toFixed(2)}ms</div>
              <div style={{ fontSize: '9px', opacity: 0.7 }}>
                {new Date(metric.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const getThreshold = (metricName: string): number => {
  const thresholds: { [key: string]: number } = {
    'FID': 100,
    'LCP': 2500,
    'CLS': 0.1,
    'click_latency': 200,
    'pointerdown_latency': 200,
    'keydown_latency': 200
  };
  return thresholds[metricName] || Infinity;
};

export default PerformanceValidator;