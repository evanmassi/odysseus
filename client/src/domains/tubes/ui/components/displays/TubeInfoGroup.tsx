/**
 * Info section wrapper component
 * Groups related fields with a subtle divider and muted header
 */

import React from 'react';

interface TubeInfoGroupProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  /** Hide the title/divider (useful for first section) */
  hideTitle?: boolean;
}

export const TubeInfoGroup: React.FC<TubeInfoGroupProps> = ({
  title,
  children,
  className = '',
  hideTitle = false,
}) => {
  return (
    <div className={className}>
      {!hideTitle && (
        <div className="flex items-center gap-3 mb-2.5">
          <span className="text-xs text-muted-foreground/60 whitespace-nowrap font-medium">
            {title}
          </span>
          <div className="h-px flex-1 bg-muted-foreground/60" />
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
