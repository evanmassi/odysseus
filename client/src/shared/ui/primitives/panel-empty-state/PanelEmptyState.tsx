import type { LucideIcon } from 'lucide-react';

interface PanelEmptyStateProps {
  icon: LucideIcon;
  message: string;
  description?: string;
  className?: string;
}

export function PanelEmptyState({
  icon: Icon,
  message,
  description,
  className,
}: PanelEmptyStateProps) {
  return (
    <div
      className={`flex min-h-[11rem] flex-col items-center justify-center text-center ${className ?? ''}`}
    >
      <Icon
        className="phosphor-glow phosphor-breathe mx-auto mb-4 h-10 w-10 text-card-foreground/30"
        strokeWidth={1.25}
      />
      <p className="text-body-sm text-card-foreground/40">{message}</p>
      {description && <p className="mt-1 text-caption text-card-foreground/30">{description}</p>}
    </div>
  );
}
