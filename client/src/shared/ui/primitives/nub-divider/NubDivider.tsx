/**
 * Nub Divider
 *
 * Thin rule terminated by glowing end nubs, in a primary or neutral tone.
 */

export type NubDividerTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

export interface NubDividerProps {
  /** Color family for the line and its glowing end nubs. */
  tone?: NubDividerTone;
  /**
   * Positioning + extra classes. The element has no position of its own — pass a context
   * (e.g. `absolute inset-x-0 -bottom-px` to pin it to an edge, or `relative` for in-flow).
   */
  className?: string;
}

const TONE: Record<NubDividerTone, { line: string; nub: string }> = {
  primary: {
    line: 'bg-primary/30 shadow-[0_0_8px_hsl(var(--primary)/0.45)]',
    nub: 'bg-primary shadow-[0_0_6px_1px_hsl(var(--primary)/0.7)]',
  },
  success: {
    line: 'bg-success-bg/30 shadow-[0_0_8px_hsl(var(--color-success-bg)/0.45)]',
    nub: 'bg-success-bg shadow-[0_0_6px_1px_hsl(var(--color-success-bg)/0.7)]',
  },
  warning: {
    line: 'bg-warning-bg/30 shadow-[0_0_8px_hsl(var(--color-warning-bg)/0.45)]',
    nub: 'bg-warning-bg shadow-[0_0_6px_1px_hsl(var(--color-warning-bg)/0.7)]',
  },
  danger: {
    line: 'bg-danger-bg/30 shadow-[0_0_8px_hsl(var(--color-danger-bg)/0.45)]',
    nub: 'bg-danger-bg shadow-[0_0_6px_1px_hsl(var(--color-danger-bg)/0.7)]',
  },
  neutral: {
    line: 'bg-line-faint',
    nub: 'bg-foreground shadow-[0_0_6px_1px_hsl(var(--foreground)/0.7)]',
  },
};

export function NubDivider({ tone = 'primary', className = '' }: NubDividerProps) {
  const t = TONE[tone];
  return (
    <span aria-hidden className={`pointer-events-none block h-px ${t.line} ${className}`}>
      <span className={`absolute left-0 top-1/2 h-0.5 w-0.5 -translate-y-1/2 ${t.nub}`} />
      <span className={`absolute right-0 top-1/2 h-0.5 w-0.5 -translate-y-1/2 ${t.nub}`} />
    </span>
  );
}
