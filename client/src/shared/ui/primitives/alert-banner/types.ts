/**
 * Alert Banner Types
 *
 * Type definitions for the AlertBanner primitive component.
 */

import type { ReactNode } from 'react';

import type { LucideIcon } from 'lucide-react';

export type AlertBannerVariant = 'error' | 'warning' | 'info' | 'success';

export interface AlertBannerProps {
  /** Visual variant determining colors */
  variant: AlertBannerVariant;

  /** Main message content */
  children: ReactNode;

  /** Optional custom icon - defaults to variant-appropriate icon */
  icon?: LucideIcon;

  /** Optional title for multi-line banners */
  title?: string;

  /** Whether to show entrance animation */
  animate?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Bottom margin preset */
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

export const defaultAlertBannerProps: Partial<AlertBannerProps> = {
  animate: true,
  spacing: 'md',
};
