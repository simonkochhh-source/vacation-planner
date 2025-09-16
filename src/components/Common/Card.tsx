import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  hover = false,
  padding = 'lg',
  className = '',
  ...props 
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-6'
  };

  const classes = [
    'card',
    paddingClasses[padding],
    hover && 'cursor-pointer',
    className
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={classes}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;