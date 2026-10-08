export type DividerTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

interface DividerProps {
  tone?: DividerTone;
  className?: string;
}

const TONE: Record<DividerTone, string> = {
  primary:
    '[background:linear-gradient(90deg,transparent_0%,hsl(var(--primary)/0.2)_10%,hsl(var(--primary)/0.2)_90%,transparent_100%)] dark:shadow-[0_0_8px_hsl(var(--primary)/0.14),0_0_18px_hsl(var(--primary)/0.06)]',
  success:
    '[background:linear-gradient(90deg,transparent_0%,hsl(var(--color-success-bg)/0.2)_10%,hsl(var(--color-success-bg)/0.2)_90%,transparent_100%)] dark:shadow-[0_0_8px_hsl(var(--color-success-bg)/0.14),0_0_18px_hsl(var(--color-success-bg)/0.06)]',
  warning:
    '[background:linear-gradient(90deg,transparent_0%,hsl(var(--color-warning-bg)/0.2)_10%,hsl(var(--color-warning-bg)/0.2)_90%,transparent_100%)] dark:shadow-[0_0_8px_hsl(var(--color-warning-bg)/0.14),0_0_18px_hsl(var(--color-warning-bg)/0.06)]',
  danger:
    '[background:linear-gradient(90deg,transparent_0%,hsl(var(--color-danger-bg)/0.2)_10%,hsl(var(--color-danger-bg)/0.2)_90%,transparent_100%)] dark:shadow-[0_0_8px_hsl(var(--color-danger-bg)/0.14),0_0_18px_hsl(var(--color-danger-bg)/0.06)]',
  neutral:
    '[background:linear-gradient(90deg,transparent_0%,hsl(var(--foreground)/0.12)_10%,hsl(var(--foreground)/0.12)_90%,transparent_100%)]',
};

export function Divider({ tone = 'primary', className = '' }: DividerProps) {
  return (
    <span aria-hidden className={`pointer-events-none block h-px ${TONE[tone]} ${className}`} />
  );
}
