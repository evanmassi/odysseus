import type { ReactNode } from 'react';

interface PanelHeaderProps {
  title: string;
  icon?: ReactNode;
  className?: string;
}

export function PanelHeader({ title, icon, className }: PanelHeaderProps) {
  return (
    <div className={`flex min-w-0 items-center gap-3.5 px-4 pb-2.5 pt-3 ${className ?? ''}`}>
      {icon && (
        <span
          aria-hidden
          className="inline-flex flex-none items-center text-primary dark:[filter:drop-shadow(0_0_5px_hsl(var(--primary)/0.75))]"
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 break-words type-label text-label-md font-semibold text-foreground">
        {title}
      </span>
    </div>
  );
}
