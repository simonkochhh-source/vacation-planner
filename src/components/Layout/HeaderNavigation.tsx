import React from 'react';
import { MapPin, Calendar, DollarSign, Camera } from 'lucide-react';
import Button from '../Common/Button';
import { useResponsive } from '../../hooks/useResponsive';
import { getResponsiveTextSize } from '../../utils/responsive';

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
  const isLargeScreen = !isMobile;

  const navigationItems = [
    {
      view: 'map' as ViewType,
      icon: <MapPin size={18} />,
      label: 'Karte',
      title: 'Karte'
    },
    {
      view: 'timeline' as ViewType,
      icon: <Calendar size={18} />,
      label: 'Timeline',
      title: 'Timeline'
    },
    {
      view: 'budget' as ViewType,
      icon: <DollarSign size={18} />,
      label: 'Budget',
      title: 'Budget'
    },
    {
      view: 'photos' as ViewType,
      icon: <Camera size={18} />,
      label: 'Fotos',
      title: 'Fotos'
    }
  ];

  return (
    <div className="header-navigation">
      {navigationItems.map(({ view, icon, label, title }) => (
        <Button
          key={view}
          variant="ghost"
          size="sm"
          onClick={() => onViewChange(view)}
          style={{
            background: currentView === view ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
            color: 'white',
            minWidth: 'auto',
            padding: 'var(--space-sm)'
          }}
          title={title}
        >
          {icon}
          {isLargeScreen && (
            <span style={{ fontSize: getResponsiveTextSize('sm', isMobile) }}>
              {label}
            </span>
          )}
        </Button>
      ))}
    </div>
  );
};

export default HeaderNavigation;