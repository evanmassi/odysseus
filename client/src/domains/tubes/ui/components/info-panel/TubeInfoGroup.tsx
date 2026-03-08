/**
 * Tube Info Group
 *
 * Section wrapper that groups related fields under a muted header with divider.
 */

import type { FC, ReactNode } from 'react';

interface TubeInfoGroupProps {
  title: string;
  children: ReactNode;
  className?: string;
  hideTitle?: boolean;
}

export const TubeInfoGroup: FC<TubeInfoGroupProps> = ({
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
