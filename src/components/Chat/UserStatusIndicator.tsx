import React from 'react';
import { UserStatus, userStatusService } from '../../services/userStatusService';

interface UserStatusIndicatorProps {
  status: UserStatus;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  lastSeenAt?: string;
  showTooltip?: boolean;
}

const UserStatusIndicator: React.FC<UserStatusIndicatorProps> = ({
  status,
  size = 'md',
  showText = false,
  className = '',
  lastSeenAt,
  showTooltip = true
}) => {
  const statusColor = userStatusService.getStatusColor(status);
  const statusText = userStatusService.getStatusText(status);
  
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const dotElement = (
    <div
      className={`
        ${sizeClasses[size]} 
        rounded-full 
        border-2 border-white 
        shadow-sm 
        ${className}
      `}
      style={{ backgroundColor: statusColor }}
      title={showTooltip ? `${statusText}${lastSeenAt ? ` - ${userStatusService.formatLastSeen(lastSeenAt)}` : ''}` : undefined}
    />
  );

  if (showText) {
    return (
      <div className="flex items-center gap-2">
        {dotElement}
        <span className="text-sm text-gray-600">
          {statusText}
          {lastSeenAt && status === 'offline' && (
            <span className="text-xs text-gray-400 ml-1">
              ({userStatusService.formatLastSeen(lastSeenAt)})
            </span>
          )}
        </span>
      </div>
    );
  }

  return dotElement;
};

export default UserStatusIndicator;