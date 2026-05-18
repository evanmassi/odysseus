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
          <div className="mt-0.5 font-mono text-[10px] tracking-[0.06em] text-muted-foreground/70">
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

export function BracketSection({ title, meta, children, className }: BracketSectionProps) {
  return (
    <div className={className}>
      <BracketHeader title={title} meta={meta} />
      <div className="relative pl-5">
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-1 left-1.5 top-1 w-px [background:linear-gradient(180deg,transparent_0%,hsl(var(--foreground)/0.18)_10%,hsl(var(--foreground)/0.18)_90%,transparent_100%)]"
        />
        <SettingsRowGroup>{children}</SettingsRowGroup>
      </div>
    </div>
  );
}
