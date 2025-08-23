import React from 'react';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showText?: boolean;
  text?: string;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 60,
  strokeWidth = 4,
  color = '#10b981',
  backgroundColor = '#e5e7eb',
  showText = true,
  text
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div 
      style={{ 
        position: 'relative', 
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.5s ease-in-out'
          }}
        />
      </svg>
      
      {showText && (
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: `${size / 6}px`,
            fontWeight: '600',
            color: '#374151'
          }}
        >
          {text || `${Math.round(progress)}%`}
        </div>
      )}
    </div>
  );
};

export default ProgressRing;