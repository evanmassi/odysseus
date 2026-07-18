/**
 * Accent Tick
 *
 * The short accent stripe that prefixes console section labels and field headers.
 */

export type AccentTickTone = 'primary' | 'muted' | 'warning';

const TONE: Record<AccentTickTone, string> = {
  primary: 'bg-primary/80 dark:shadow-[0_0_6px_hsl(var(--primary)/0.55)]',
  muted: 'bg-muted-foreground/40',
  warning: 'bg-warning-bg/80 dark:shadow-[0_0_6px_hsl(var(--color-warning-bg)/0.55)]',
};

export function AccentTick({ tone = 'primary' }: { tone?: AccentTickTone }) {
  return <span aria-hidden className={`h-2.5 w-0.5 shrink-0 ${TONE[tone]}`} />;
}
