import React, { useCallback } from 'react';
import { QuickActionsProps } from '../../types/ai';

const QuickActions: React.FC<QuickActionsProps> = ({
  actions,
  onActionSelect,
  loading = false
}) => {
  const handleActionClick = useCallback((action: any) => {
    if (loading) return;
    onActionSelect(action);
  }, [onActionSelect, loading]);

  if (!actions || actions.length === 0) return null;

  // Group actions by category for better organization
  const groupedActions = actions.reduce((groups, action) => {
    const category = action.category || 'general';
    if (!groups[category]) groups[category] = [];
    groups[category].push(action);
    return groups;
  }, {} as Record<string, typeof actions>);

  const getCategoryLabel = (category: string) => {
    const labels = {
      interest: 'Interessen',
      budget: 'Budget',
      style: 'Reisestil',
      transport: 'Transport',
      accommodation: 'Unterkunft',
      general: 'Allgemein'
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      interest: '#4caf50',
      budget: '#ff9800',
      style: '#2196f3',
      transport: '#9c27b0',
      accommodation: '#f44336',
      general: '#00bcd4'
    };
    return colors[category as keyof typeof colors] || '#00bcd4';
  };

  return (
    <div className="quick-actions-container">
      {Object.entries(groupedActions).map(([category, categoryActions]) => (
        <div key={category} className="action-category">
          {Object.keys(groupedActions).length > 1 && (
            <div 
              className="category-label"
              style={{ color: getCategoryColor(category) }}
            >
              {getCategoryLabel(category)}
            </div>
          )}
          
          <div className="actions-grid">
            {categoryActions.map((action, index) => (
              <button
                key={action.id || index}
                className={`quick-action-btn ${loading ? 'disabled' : ''}`}
                onClick={() => handleActionClick(action)}
                disabled={loading}
                title={action.message}
              >
                <span className="action-icon">{action.icon}</span>
                <span className="action-label">{action.label}</span>
                
                {/* Loading indicator */}
                {loading && (
                  <div className="action-loading">
                    <div className="loading-spinner"></div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      <style>{`
        .quick-actions-container {
          margin-top: 0.75rem;
          animation: slideIn 0.3s ease-out;
        }

        .action-category {
          margin-bottom: 1rem;
        }

        .action-category:last-child {
          margin-bottom: 0;
        }

        .category-label {
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.9;
        }

        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 0.5rem;
        }

        .quick-action-btn {
          background: #333;
          border: 1px solid #444;
          color: #ccc;
          padding: 0.875rem 1rem;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.85rem;
          font-weight: 500;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          text-align: left;
          min-height: 52px;
        }

        .quick-action-btn:hover:not(.disabled) {
          background: #3a3a3a;
          border-color: #00bcd4;
          color: #00bcd4;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 188, 212, 0.15);
        }

        .quick-action-btn:active:not(.disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(0, 188, 212, 0.2);
        }

        .quick-action-btn.disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        .action-icon {
          font-size: 1.1rem;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
        }

        .action-label {
          flex: 1;
          line-height: 1.3;
          word-break: break-word;
        }

        .action-loading {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(51, 51, 51, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #555;
          border-top: 2px solid #00bcd4;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* Hover effects for different categories */
        .action-category:nth-child(1) .quick-action-btn:hover:not(.disabled) {
          border-color: #4caf50;
          color: #4caf50;
          box-shadow: 0 4px 12px rgba(76, 175, 80, 0.15);
        }

        .action-category:nth-child(2) .quick-action-btn:hover:not(.disabled) {
          border-color: #ff9800;
          color: #ff9800;
          box-shadow: 0 4px 12px rgba(255, 152, 0, 0.15);
        }

        .action-category:nth-child(3) .quick-action-btn:hover:not(.disabled) {
          border-color: #2196f3;
          color: #2196f3;
          box-shadow: 0 4px 12px rgba(33, 150, 243, 0.15);
        }

        /* Ripple effect on click */
        .quick-action-btn::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(0, 188, 212, 0.3);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.3s ease, height 0.3s ease;
          pointer-events: none;
        }

        .quick-action-btn:active:not(.disabled)::before {
          width: 100px;
          height: 100px;
        }

        /* Animations */
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .actions-grid {
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 0.375rem;
          }

          .quick-action-btn {
            padding: 0.75rem;
            gap: 0.5rem;
            font-size: 0.8rem;
            min-height: 48px;
          }

          .action-icon {
            font-size: 1rem;
            width: 20px;
            height: 20px;
          }

          .category-label {
            font-size: 0.75rem;
          }
        }

        @media (max-width: 480px) {
          .actions-grid {
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 0.25rem;
          }

          .quick-action-btn {
            padding: 0.625rem;
            gap: 0.375rem;
            font-size: 0.75rem;
            min-height: 44px;
            flex-direction: column;
            text-align: center;
          }

          .action-icon {
            font-size: 1.2rem;
            width: auto;
            height: auto;
            margin-bottom: 0.125rem;
          }

          .action-label {
            line-height: 1.2;
            font-size: 0.7rem;
          }
        }

        /* High contrast mode */
        @media (prefers-contrast: high) {
          .quick-action-btn {
            border-width: 2px;
          }

          .quick-action-btn:hover:not(.disabled) {
            border-width: 2px;
          }

          .category-label {
            font-weight: 700;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .quick-actions-container {
            animation: none;
          }

          .quick-action-btn {
            transition: none;
          }

          .quick-action-btn:hover:not(.disabled) {
            transform: none;
          }

          .quick-action-btn:active:not(.disabled) {
            transform: none;
          }

          .quick-action-btn::before {
            transition: none;
          }

          .loading-spinner {
            animation: none;
            border-top-color: #00bcd4;
            border-right-color: #00bcd4;
          }
        }

        /* Focus management */
        .quick-action-btn:focus {
          outline: 2px solid #00bcd4;
          outline-offset: 2px;
        }

        /* Print styles */
        @media print {
          .quick-actions-container {
            display: none;
          }
        }

        /* Special styling for single action */
        .actions-grid:has(> .quick-action-btn:only-child) .quick-action-btn {
          max-width: 300px;
          margin: 0 auto;
        }

        /* Empty state */
        .actions-grid:empty::after {
          content: 'Keine Aktionen verfügbar';
          display: block;
          text-align: center;
          color: #666;
          font-style: italic;
          padding: 1rem;
        }

        /* Loading state for entire component */
        .quick-actions-container.loading {
          opacity: 0.7;
          pointer-events: none;
        }

        .quick-actions-container.loading .quick-action-btn {
          background: #2a2a2a;
          border-color: #3a3a3a;
          color: #666;
        }
      `}</style>
    </div>
  );
};

export default QuickActions;