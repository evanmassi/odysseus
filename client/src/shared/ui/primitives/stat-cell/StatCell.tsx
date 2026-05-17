/**
 * Stat Cell
 *
 * Labeled metric block for stat strips.
 */

import React from 'react';

import { cva } from 'class-variance-authority';

type StatCellTone = 'default' | 'success' | 'warning' | 'danger';
type StatCellSize = 'md' | 'sm';

export interface StatCellProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  footer?: React.ReactNode;
  tone?: StatCellTone;
  size?: StatCellSize;
  icon?: React.ReactNode;
  className?: string;
}

const tickVariants = cva('w-1.5 h-1.5 shrink-0', {
  variants: {
    tone: {
      default: 'bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.7)]',
      success: 'bg-success-bg shadow-[0_0_8px_hsl(var(--color-success-bg)/0.7)]',
      warning: 'bg-warning-bg shadow-[0_0_8px_hsl(var(--color-warning-bg)/0.7)]',
      danger: 'bg-danger-bg shadow-[0_0_8px_hsl(var(--color-danger-bg)/0.7)]',
    },
  },
  defaultVariants: { tone: 'default' },
});

const sizeStyles: Record<
  StatCellSize,
  { container: string; value: string; valueGlow: string; unit: string; footer: string }
> = {
  md: {
    container: 'gap-1 px-4 py-3.5',
    value: 'text-[26px]',
    valueGlow: 'phosphor-text',
    unit: 'ml-1.5 text-[11px]',
    footer: 'mt-0.5 text-[10px]',
  },
  sm: {
    container: 'gap-0.5 px-3 py-2.5',
    value: 'text-[17px]',
    valueGlow: '',
    unit: 'ml-1 text-[10px]',
    footer: 'mt-0.5 text-[9.5px]',
  },
};

export function StatCell({
  label,
  value,
  unit,
  footer,
  tone = 'default',
  size = 'md',
  icon,
  className,
}: StatCellProps) {
  const s = sizeStyles[size];
  return (
    <div className={`flex flex-col ${s.container} ${className ?? ''}`}>
      <span className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.20em] text-muted-foreground">
        {icon ? (
          <span className="inline-flex shrink-0 items-center">{icon}</span>
        ) : (
          <span className={tickVariants({ tone })} />
        )}
        {label}
      </span>
      <div
        className={`font-display font-normal leading-none tracking-[-0.02em] text-foreground ${s.value}`}
      >
        <span className={s.valueGlow}>{value}</span>
        {unit && (
          <span className={`font-mono tracking-[0.1em] text-muted-foreground ${s.unit}`}>
            {unit}
          </span>
        )}
      </div>
      {footer && (
        <div className={`font-mono tracking-[0.1em] text-muted-foreground/60 ${s.footer}`}>
          {footer}
        </div>
      )}
    </div>
  );
}
