import type { FullnessTone } from '@shared/utils/fullnessTone';

export const FULLNESS_FILL: Record<FullnessTone, string> = {
  success: 'bg-success-bg',
  warning: 'bg-warning-bg',
  danger: 'bg-danger-bg',
};

export const FULLNESS_GLOW: Record<FullnessTone, string> = {
  success: 'dark:shadow-[0_0_6px_hsl(var(--color-success-bg)/0.6)]',
  warning: 'dark:shadow-[0_0_6px_hsl(var(--color-warning-bg)/0.6)]',
  danger: 'dark:shadow-[0_0_6px_hsl(var(--color-danger-bg)/0.6)]',
};
