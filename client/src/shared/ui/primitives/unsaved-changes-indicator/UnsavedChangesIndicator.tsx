/**
 * Unsaved Changes Indicator
 *
 * Footer stamp for settings surfaces: a glowing warning tick with a live count,
 * or a muted "no changes" rest state. Shared so every settings footer reads the
 * same dirty-state language.
 */

export interface UnsavedChangesIndicatorProps {
  count: number;
}

export function UnsavedChangesIndicator({ count }: UnsavedChangesIndicatorProps) {
  if (count === 0) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/35">
        No unsaved changes
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-warning-text">
      <span
        aria-hidden
        className="h-[11px] w-0.5 bg-warning-bg shadow-[0_0_6px_-1px_hsl(var(--color-warning-bg)/0.6)]"
      />
      {count} unsaved {count === 1 ? 'change' : 'changes'}
    </span>
  );
}
