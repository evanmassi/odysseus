/**
 * Alert Banner Types
 *
 * Type definitions for the alert banner primitive.
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
  /** Mono code-lead text — defaults per variant (Alert / Notice / Advisory / Success / Demo) */
  lead?: string;
  animate?: boolean;
  className?: string;
  /** Bottom margin preset */
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

export const defaultAlertBannerProps: Partial<AlertBannerProps> = {
  animate: true,
  spacing: 'md',
};
