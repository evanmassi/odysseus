/**
 * Stat Cell
 *
 * Labeled metric block for stat strips.
 */

import React from 'react';

import { cva } from 'class-variance-authority';

type StatCellTone = 'default' | 'success' | 'warning' | 'danger';

export interface StatCellProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  footer?: React.ReactNode;
  tone?: StatCellTone;
  icon?: React.ReactNode;
  className?: string;
}

const tickVariants = cva('w-2 h-px shrink-0', {
  variants: {
    tone: {
      default: 'bg-muted-foreground/60',
      success: 'bg-success-bg',
      warning: 'bg-warning-bg',
      danger: 'bg-danger-bg',
    },
  },
  defaultVariants: { tone: 'default' },
});

export function StatCell({
  label,
  value,
  unit,
  footer,
  tone = 'default',
  icon,
  className,
}: StatCellProps) {
  return (
    <div className={`flex flex-col gap-1 px-4 py-3.5 ${className ?? ''}`}>
      <span className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.20em] text-muted-foreground">
        {icon ? (
          <span className="inline-flex shrink-0 items-center">{icon}</span>
        ) : (
          <span className={tickVariants({ tone })} />
        )}
        {label}
      </span>
      <div className="font-display text-[26px] font-normal leading-none tracking-[-0.02em] text-foreground">
        <span className="phosphor-text">{value}</span>
        {unit && (
          <span className="ml-1.5 font-mono text-[11px] tracking-[0.1em] text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      {footer && (
        <div className="mt-0.5 font-mono text-[10px] tracking-[0.1em] text-muted-foreground/60">
          {footer}
        </div>
      )}
    </div>
  );
}
