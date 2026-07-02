/**
 * Unsaved Changes Indicator
 *
 * Footer stamp for settings surfaces — a warning tick with a live count, or a muted rest state.
 */

interface UnsavedChangesIndicatorProps {
  count: number;
}

export function UnsavedChangesIndicator({ count }: UnsavedChangesIndicatorProps) {
  if (count === 0) {
    return (
      <span className="type-label text-label-2xs tracking-label-wide text-foreground/35">
        No unsaved changes
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2 type-label text-label-2xs tracking-label-wide text-warning-text">
      <span
        aria-hidden
        className="h-[11px] w-0.5 bg-warning-bg dark:shadow-[0_0_6px_-1px_hsl(var(--color-warning-bg)/0.6)]"
      />
      {count} unsaved {count === 1 ? 'change' : 'changes'}
    </span>
  );
}
