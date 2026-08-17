/**
 * Item Row Shell
 *
 * Inset row chrome shared by all three catalogs' item rows: the status
 * stripe, a keyboard-selectable wrapper, a two-line identity, and the
 * status-tinted hover/selected glow. The urgency icon, name badge, and trailing
 * chips are injected per domain.
 */

import type { CSSProperties, ReactNode } from 'react';

export type ItemRowStatusTone = 'success' | 'warning' | 'danger' | 'muted';

/** Short status stripe — same idiom as the navigator locator strip. */
const STATUS_LINE: Record<ItemRowStatusTone, string> = {
  success: 'bg-success-bg dark:shadow-[0_0_6px_-1px_hsl(var(--color-success-bg)/0.6)]',
  warning: 'bg-warning-bg dark:shadow-[0_0_6px_-1px_hsl(var(--color-warning-bg)/0.6)]',
  danger: 'bg-danger-bg dark:shadow-[0_0_6px_-1px_hsl(var(--color-danger-bg)/0.6)]',
  muted: 'bg-muted-foreground/40',
};

interface ItemRowShellProps {
  id: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
  statusTone: ItemRowStatusTone;
  name: string;
  /** Secondary identity fragments; falsy entries are dropped, the rest joined with `//`. */
  identityParts: Array<string | undefined>;
  leadingIcon?: ReactNode;
  badge?: ReactNode;
  trailing?: ReactNode;
}

export function ItemRowShell({
  id,
  isSelected,
  onSelect,
  statusTone,
  name,
  identityParts,
  leadingIcon,
  badge,
  trailing,
}: ItemRowShellProps) {
  const dimmed = statusTone === 'muted';
  const parts = identityParts.filter(Boolean);

  // Rows a catalog considers urgent — due-soon/overdue equipment, low/out supplies, expiring or
  // low reagents — tint their hover + selected glow to match the alert tables; healthy and dimmed
  // rows stay primary.
  const rowStyle: CSSProperties | undefined =
    statusTone === 'danger'
      ? ({ '--row-tone': 'var(--color-danger-bg)' } as CSSProperties)
      : statusTone === 'warning'
        ? ({ '--row-tone': 'var(--color-warning-bg)' } as CSSProperties)
        : undefined;

  return (
    <div
      className={`nav-tree-row row-glow nav-tree-row--item ${isSelected ? 'is-selected' : ''} ${
        dimmed ? 'opacity-50 hover:opacity-65' : ''
      }`}
      style={rowStyle}
      onClick={() => onSelect(id)}
      onKeyDown={e => {
        if (e.key === 'Enter') onSelect(id);
      }}
      role="button"
      tabIndex={0}
    >
      <span aria-hidden className={`h-7 w-0.5 flex-shrink-0 ${STATUS_LINE[statusTone]}`} />

      {leadingIcon}

      <div className="flex min-w-[9rem] flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-display text-body font-medium leading-tight text-card-foreground">
            {name}
          </span>
          {badge}
        </div>
        {parts.length > 0 && (
          <span className="truncate font-mono text-data-sm tracking-[0.02em] text-muted-foreground">
            {parts.map((part, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-1.5 text-foreground/30">{'//'}</span>}
                {part}
              </span>
            ))}
          </span>
        )}
      </div>

      {/* Shrinks before the name does — an unnamed row is useless, a clipped chip is not. */}
      <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">{trailing}</div>
    </div>
  );
}
