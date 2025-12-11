/**
 * Info section wrapper component
 * Groups related fields with a subtle divider and muted header
 */

import React from 'react';

interface InfoSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  /** Hide the title/divider (useful for first section) */
  hideTitle?: boolean;
}

export const InfoSection: React.FC<InfoSectionProps> = ({
  title,
  children,
  className = '',
  hideTitle = false,
}) => {
  return (
    <div className={className}>
      {!hideTitle && (
        <div className="flex items-center gap-2 mb-1.5">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-[10px] text-odysseus-dark/40 tracking-wide font-medium">
            {title}
          </span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
