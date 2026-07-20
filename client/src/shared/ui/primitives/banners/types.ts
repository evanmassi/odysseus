/**
 * Alert Banner Types
 */

import type { ReactNode } from 'react';

import type { LucideIcon } from 'lucide-react';

export type AlertBannerVariant = 'error' | 'warning' | 'info' | 'success' | 'demo';

export interface AlertBannerProps {
  variant: AlertBannerVariant;
  children: ReactNode;
  /** Defaults to a variant-appropriate animated icon */
  icon?: LucideIcon;
  title?: string;
  actions?: ReactNode;
  animate?: boolean;
  className?: string;
  /** Bottom margin preset */
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

export const defaultAlertBannerProps = {
  animate: true,
  spacing: 'md',
} satisfies Partial<AlertBannerProps>;
