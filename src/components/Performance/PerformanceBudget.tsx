import React, { useState, useEffect } from 'react';
import { checkPerformanceBudget, getPerformanceMetrics } from '../../utils/performance';

interface PerformanceBudgetProps {
  showInProduction?: boolean;
}

const PerformanceBudget: React.FC<PerformanceBudgetProps> = ({ 
  showInProduction = false 
}) => {
  const [budgetStatus, setBudgetStatus] = useState<{
    passed: boolean;
    issues: any[];
    totalMetrics: number;
  } | null>(null);

  useEffect(() => {
    // Only show in development or if explicitly enabled
    if (process.env.NODE_ENV === 'production' && !showInProduction) {
      return;
    }

    const checkBudget = () => {
      const status = checkPerformanceBudget();
      setBudgetStatus(status);
    };

    // Check budget every 5 seconds
    const interval = setInterval(checkBudget, 5000);
    checkBudget(); // Initial check

    return () => clearInterval(interval);
  }, [showInProduction]);

  // Don't render in production unless explicitly enabled
  if (process.env.NODE_ENV === 'production' && !showInProduction) {
    return null;
  }

  if (!budgetStatus) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        background: budgetStatus.passed ? '#4ade80' : '#f87171',
        color: 'white',
        padding: 'var(--space-2) var(--space-3)',
        borderRadius: '6px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9999,
        minWidth: '120px'
      }}
    >
      <div>Performance Budget</div>
      <div>{budgetStatus.passed ? '✓ PASSED' : '⚠ ISSUES'}</div>
      {budgetStatus.issues.length > 0 && (
        <div style={{ fontSize: '10px', marginTop: 'var(--space-1)' }}>
          {budgetStatus.issues.length} issue(s)
        </div>
      )}
    </div>
  );
};

export default PerformanceBudget;