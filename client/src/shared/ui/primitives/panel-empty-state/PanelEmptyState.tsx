/**
 * Panel Empty State
 *
 * Centered idle placeholder for an info panel when nothing is selected.
 */
import type { LucideIcon } from 'lucide-react';

export interface PanelEmptyStateProps {
  icon: LucideIcon;
  message: string;
  className?: string;
}

const CORNER_PINS = ['left-3 top-3', 'right-3 top-3', 'bottom-3 left-3', 'bottom-3 right-3'];

export function PanelEmptyState({ icon: Icon, message, className }: PanelEmptyStateProps) {
  return (
    <div
      className={`relative isolate flex min-h-[11rem] flex-col items-center justify-center text-center ${className ?? ''}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-lg bg-black/50 blur-lg"
      />
      {CORNER_PINS.map(corner => (
        <span
          key={corner}
          aria-hidden
          className={`pointer-events-none absolute ${corner} h-0.5 w-1 bg-foreground/25 shadow-[0_0_4px_hsl(var(--foreground)/0.45)]`}
        />
      ))}
      <Icon
        className="phosphor-glow phosphor-breathe mx-auto mb-4 h-10 w-10 text-card-foreground/30"
        strokeWidth={1.25}
      />
      <p className="text-sm text-card-foreground/40">{message}</p>
    </div>
  );
}
