import React from 'react';
import AppNavigation from '../Navigation/AppNavigation';
import { useResponsive } from '../../hooks/useResponsive';

type ViewType = 'list' | 'map' | 'timeline' | 'budget' | 'search' | 'photos';

interface HeaderNavigationProps {
  currentView: string;
  onViewChange: (view: ViewType) => void;
}

const HeaderNavigation: React.FC<HeaderNavigationProps> = ({ 
  currentView, 
  onViewChange 
}) => {
  const { isMobile } = useResponsive();

  // Filter navigation items for header (only show core views)
  const headerViews = ['map', 'list', 'budget', 'photos'];

  return (
    <div 
      className="header-navigation"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)'
      }}
    >
      <AppNavigation 
        variant="header"
        showLabels={!isMobile}
        className="header-nav"
      />
    </div>
  );
};

export default HeaderNavigation;