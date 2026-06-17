/**
 * Tree Connector Nub
 *
 * Glowing junction dot where a spine meets a child row; turns amber to flag a
 * full box. Absolutely positioned at the row's left edge — its parent must be
 * positioned.
 */

interface TreeNubProps {
  full?: boolean;
}

export function TreeNub({ full = false }: TreeNubProps) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -left-0.5 top-1/2 z-10 h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{
        background: full ? 'hsl(var(--color-warning-bg))' : 'hsl(var(--primary))',
        boxShadow: full
          ? '0 0 6px 1px hsl(var(--color-warning-bg) / calc(0.85 * var(--lit)))'
          : '0 0 6px 1px hsl(var(--primary) / calc(0.85 * var(--lit)))',
      }}
    />
  );
}
