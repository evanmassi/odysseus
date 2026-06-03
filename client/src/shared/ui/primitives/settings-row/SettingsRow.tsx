/**
 * Settings Row
 *
 * Labeled control rows and the index-titled sections that group them.
 */

import type { ReactNode } from 'react';

import { SubsectionHeader } from '../titles/subsection-header/SubsectionHeader';

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

export interface SubsectionProps {
  title: ReactNode;
  index?: number;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}

// clip-path trims the grid's leftmost 1px so each cell's left rim reads only as an
// inter-column divider — never at the grid edge or down a full-width row.
const GRID_CLASSES =
  'grid grid-cols-2 [clip-path:inset(-100px_-100px_-100px_1px)] [&>*]:px-5 ' +
  '[&>*]:shadow-[inset_0_1px_0_hsl(var(--foreground)/var(--alpha-phosphor-rim)),inset_0_-1px_0_hsl(var(--foreground)/var(--alpha-phosphor-rim)),inset_1px_0_0_hsl(var(--foreground)/var(--alpha-phosphor-rim))]';

export function Subsection({ title, index, meta, children, className }: SubsectionProps) {
  return (
    <div className={`border-t border-line-soft first:border-t-0 ${className ?? ''}`}>
      <div className="relative border-b border-line-soft [background:linear-gradient(180deg,hsl(var(--foreground)/0.025)_0%,transparent_35%),radial-gradient(ellipse_65%_120%_at_0%_0%,hsl(var(--foreground)/0.05),transparent_60%),radial-gradient(ellipse_60%_120%_at_100%_100%,hsl(var(--foreground)/0.035),transparent_70%),color-mix(in_srgb,hsl(var(--card))_85%,black)] px-5 py-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.05)]">
        <SubsectionHeader title={title} index={index} meta={meta} />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -bottom-px h-px [background:linear-gradient(90deg,transparent_0%,hsl(var(--primary)/0.18)_12%,hsl(var(--primary)/0.18)_88%,transparent_100%)] shadow-[0_0_8px_hsl(var(--primary)/0.12),0_0_18px_hsl(var(--primary)/0.05)]"
        />
      </div>
      <div className={GRID_CLASSES}>{children}</div>
    </div>
  );
}
