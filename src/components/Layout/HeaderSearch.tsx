import React from 'react';
import IntelligentSearch from '../Search/IntelligentSearch';
import { useResponsive } from '../../hooks/useResponsive';
import { getResponsiveTextSize } from '../../utils/responsive';

interface HeaderSearchProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onNavigate: (type: 'destination' | 'trip' | 'user', id: string) => void;
  onShowSearchPage: (query: string) => void;
}

interface HeaderSearchReturnType {
  DesktopSearch: () => React.JSX.Element | null;
  MobileSearch: () => React.JSX.Element | null;
}

const HeaderSearch = ({
  searchQuery,
  onSearchChange,
  onNavigate,
  onShowSearchPage
}: HeaderSearchProps): HeaderSearchReturnType => {
  const { isMobile } = useResponsive();
  const isLargeScreen = !isMobile;

  // Desktop search (centered in header)
  const DesktopSearch = (): React.JSX.Element | null => {
    if (!isLargeScreen) return null;
    
    return (
      <div style={{ 
        flex: 1, 
        maxWidth: '400px', 
        margin: '0 var(--space-2xl)',
        position: 'relative'
      }}>
        <IntelligentSearch
          value={searchQuery}
          onChange={onSearchChange}
          onNavigate={onNavigate}
          onShowSearchPage={onShowSearchPage}
          placeholder="Ziele, Reisen, Nutzer suchen..."
          className="input"
          style={{
            width: '100%',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.95)',
            fontSize: getResponsiveTextSize('sm', isMobile),
            fontWeight: 'var(--font-weight-normal)'
          }}
        />
      </div>
    );
  };

  // Mobile search (full width below header)
  const MobileSearch = (): React.JSX.Element | null => {
    if (isLargeScreen) return null;
    
    return (
      <div style={{ 
        marginTop: 'var(--space-md)',
        position: 'relative'
      }}>
        <IntelligentSearch
          value={searchQuery}
          onChange={onSearchChange}
          onNavigate={onNavigate}
          onShowSearchPage={onShowSearchPage}
          placeholder="Ziele, Reisen, Nutzer suchen..."
          className="input"
          style={{
            width: '100%',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.95)',
            fontSize: getResponsiveTextSize('sm', isMobile)
          }}
          isMobile={true}
        />
      </div>
    );
  };

  return {
    DesktopSearch,
    MobileSearch
  };
};

export default HeaderSearch;