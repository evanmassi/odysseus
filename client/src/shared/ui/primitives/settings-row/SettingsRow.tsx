/**
 * Settings Row
 *
 * Label + hint on the left, single control on the right.
 */

import type { ReactNode } from 'react';

import { BracketHeader } from '../titles/bracket-header/BracketHeader';

export interface SettingsRowProps {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SettingsRow({ label, hint, children, className }: SettingsRowProps) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 ${className ?? ''}`}>
      <div className="min-w-0">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/85">
          {label}
        </div>
        {hint && (
          <div className="mt-0.5 font-display text-[11.5px] leading-snug text-muted-foreground/70">
            {hint}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

export interface SettingsRowGroupProps {
  children: ReactNode;
  className?: string;
}

const GROUP_CLASSES =
  'divide-y divide-line-faint border-b border-transparent ' +
  '[&>*:nth-child(2)]:[border-image:linear-gradient(90deg,hsl(var(--foreground)/0.14)_0%,hsl(var(--foreground)/0.10)_60%,transparent_100%)_1] ' +
  '[&>*:nth-child(3)]:[border-image:linear-gradient(90deg,hsl(var(--foreground)/0.12)_0%,hsl(var(--foreground)/0.08)_72%,transparent_100%)_1] ' +
  '[border-image:linear-gradient(90deg,hsl(var(--foreground)/0.10)_0%,hsl(var(--foreground)/0.06)_55%,transparent_100%)_1]';

export function SettingsRowGroup({ children, className }: SettingsRowGroupProps) {
  return <div className={`${GROUP_CLASSES} ${className ?? ''}`}>{children}</div>;
}

export interface BracketSectionProps {
  title: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}

// A chassis compartment: a banded bracket-header strip over a two-column row
// grid. Sections stack flush, split by a hairline (the first omits its top
// rule). The 1px grid gaps render as hairline dividers; cells need an opaque
// background to mask the gap fill — bg-card matches both the panel chassis and
// the settings-modal surface. A child may carry `col-span-2` for a full row.
const GRID_CLASSES = 'grid grid-cols-2 gap-px bg-line-soft [&>*]:bg-card [&>*]:px-5';

export function BracketSection({ title, meta, children, className }: BracketSectionProps) {
  return (
    <div className={`border-t border-line-soft first:border-t-0 ${className ?? ''}`}>
      <div className="border-b border-line-soft bg-black/15 [background-image:linear-gradient(180deg,hsl(var(--foreground)/0.06)_0%,transparent_85%)] px-5 py-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.09)]">
        <BracketHeader title={title} meta={meta} />
      </div>
      <div className={GRID_CLASSES}>{children}</div>
    </div>
  );
}
