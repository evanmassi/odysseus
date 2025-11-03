/**
 * Info section wrapper component
 * Groups related fields with a title and colored border
 */

import React from 'react';

interface InfoSectionProps {
  title: string;
  color: 'primary' | 'secondary' | 'purple' | 'gray';
  children: React.ReactNode;
  className?: string;
}

const colorConfig = {
  primary: {
    border: 'border-storage-tank-hover',
    header: 'text-storage-tank-hover'
  },
  secondary: {
    border: 'border-storage-rack-hover',
    header: 'text-storage-rack-hover'
  },
  purple: {
    border: 'border-purple-400',
    header: 'text-purple-600'
  },
  gray: {
    border: 'border-storage-box-hover',
    header: 'text-storage-box-hover'
  }
};

export const InfoSection: React.FC<InfoSectionProps> = ({
  title,
  color,
  children,
  className = ''
}) => {
  const colors = colorConfig[color];

  return (
    <div className={`border-l-4 ${colors.border} pl-2.5 py-0.5 ${className}`}>
      <div className={`font-bold ${colors.header} uppercase tracking-wider mb-0.5 text-xs`}>
        {title}
      </div>
      <div className="pl-2">
        {children}
      </div>
    </div>
  );
};
