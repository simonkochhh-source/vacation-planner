import React from 'react';
import { Mountain } from 'lucide-react';
import { useResponsive } from '../../hooks/useResponsive';
import { getResponsiveTextSize } from '../../utils/responsive';

interface HeaderBrandProps {
  onLogoClick: () => void;
}

const HeaderBrand: React.FC<HeaderBrandProps> = ({ onLogoClick }) => {
  const { isMobile } = useResponsive();
  const isLargeScreen = !isMobile;

  return (
    <button
      onClick={onLogoClick}
      className="header-brand-button"
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        padding: 'var(--space-xs)',
        borderRadius: 'var(--radius-md)',
        transition: 'all var(--transition-fast)',
        color: 'inherit'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
      title="Zur Startseite"
    >
      <div 
        className="brand-icon"
        style={{
          background: 'rgba(255, 255, 255, 0.2)',
          padding: 'var(--space-sm)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Mountain size={24} />
      </div>
      
      <div className="brand-text">
        <h1 style={{ 
          fontFamily: 'var(--font-heading)',
          fontSize: getResponsiveTextSize(isLargeScreen ? 'xl' : 'lg', isMobile),
          fontWeight: 'var(--font-weight-semibold)',
          margin: 0,
          lineHeight: 1.2
        }}>
          {isLargeScreen ? 'Trailkeeper' : 'Keeper'}
        </h1>
        {isLargeScreen && (
          <p style={{ 
            fontSize: getResponsiveTextSize('xs', isMobile), 
            margin: 0, 
            opacity: 0.8,
            fontWeight: 'var(--font-weight-normal)'
          }}>
            Vacation Planner
          </p>
        )}
      </div>
    </button>
  );
};

export default HeaderBrand;