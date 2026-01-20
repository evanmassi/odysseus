/**
 * Alert Banner
 *
 * Inline alert component for displaying contextual messages in forms and modals.
 */

import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';

import { defaultAlertBannerProps } from './types';

import type { AlertBannerProps, AlertBannerVariant } from './types';
import type { LucideIcon } from 'lucide-react';

const variantStyles: Record<
  AlertBannerVariant,
  { bg: string; border: string; icon: string; text: string; defaultIcon: LucideIcon }
> = {
  error: {
    bg: 'bg-muted',
    border: 'border-l-danger-border',
    icon: 'text-danger-text',
    text: 'text-danger-text',
    defaultIcon: AlertTriangle,
  },
  warning: {
    bg: 'bg-muted',
    border: 'border-l-warning-border',
    icon: 'text-warning-text',
    text: 'text-warning-text',
    defaultIcon: AlertCircle,
  },
  info: {
    bg: 'bg-muted',
    border: 'border-l-muted-foreground',
    icon: 'text-muted-foreground',
    text: 'text-secondary-foreground',
    defaultIcon: Info,
  },
  success: {
    bg: 'bg-muted',
    border: 'border-l-success-border',
    icon: 'text-success-text',
    text: 'text-success-text',
    defaultIcon: CheckCircle,
  },
};

const spacingStyles = {
  none: '',
  sm: 'mb-2',
  md: 'mb-4',
  lg: 'mb-6',
};

export function AlertBanner({
  variant,
  children,
  icon,
  title,
  actions,
  animate = defaultAlertBannerProps.animate,
  className = '',
  spacing = defaultAlertBannerProps.spacing,
}: AlertBannerProps) {
  const styles = variantStyles[variant];
  const Icon = icon ?? styles.defaultIcon;
  const animationClass = animate ? 'animate-in slide-in-from-top-2 duration-300' : '';
  const spacingClass = spacingStyles[spacing ?? 'md'];

  // Complex layout: has title or actions
  if (title != null || actions != null) {
    return (
      <div
        className={`px-3 py-2 ${styles.bg} border-l-4 ${styles.border} rounded-lg shadow-sm ${animationClass} ${spacingClass} ${className}`}
        role="alert"
      >
        <div className="flex items-start gap-2">
          <Icon className={`w-4 h-4 ${styles.icon} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            {title && <p className={`text-sm font-medium ${styles.text}`}>{title}</p>}
            <div className={`text-sm ${styles.text} ${title ? 'mt-1' : ''}`}>{children}</div>
            {actions && <div className="mt-2">{actions}</div>}
          </div>
        </div>
      </div>
    );
  }

  // Simple layout: just message
  return (
    <div
      className={`px-3 py-2 ${styles.bg} border-l-4 ${styles.border} rounded-lg shadow-sm flex items-center gap-2 ${animationClass} ${spacingClass} ${className}`}
      role="alert"
    >
      <Icon className={`w-4 h-4 ${styles.icon} flex-shrink-0`} />
      <span className={`text-sm ${styles.text}`}>{children}</span>
    </div>
  );
}
