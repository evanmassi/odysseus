/**
 * Panel Empty State
 *
 * Centered placeholder for a panel's body — nothing selected yet, or no results.
 */
import type { LucideIcon } from 'lucide-react';

interface PanelEmptyStateProps {
  icon: LucideIcon;
  message: string;
  description?: string;
  className?: string;
}

const CORNER_PINS = ['left-3 top-3', 'right-3 top-3', 'bottom-3 left-3', 'bottom-3 right-3'];

export function PanelEmptyState({
  icon: Icon,
  message,
  description,
  className,
}: PanelEmptyStateProps) {
  return (
    <div
      className={`relative isolate flex min-h-[11rem] flex-col items-center justify-center text-center ${className ?? ''}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-lg dark:bg-shade/50 dark:blur-lg"
      />
      {CORNER_PINS.map(corner => (
        <span
          key={corner}
          aria-hidden
          className={`pointer-events-none absolute ${corner} h-0.5 w-1 bg-foreground/25 dark:shadow-[0_0_4px_hsl(var(--foreground)/0.45)]`}
        />
      ))}
      <Icon
        className="phosphor-glow phosphor-breathe mx-auto mb-4 h-10 w-10 text-card-foreground/30"
        strokeWidth={1.25}
      />
      <p className="text-body-sm text-card-foreground/40">{message}</p>
      {description && <p className="mt-1 text-caption text-card-foreground/30">{description}</p>}
    </div>
  );
}
