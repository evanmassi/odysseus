/**
 * Alert Banner
 *
 * Inline alert component for displaying contextual messages in forms and modals.
 */

import {
  AnimatedCheckmark,
  AnimatedInfoMark,
  AnimatedSparkles,
  AnimatedWarningMark,
  AnimatedXMark,
} from '@shared/ui/components/icons';

import { defaultAlertBannerProps } from './types';

import type { AlertBannerProps, AlertBannerVariant } from './types';
import type { LucideIcon } from 'lucide-react';

const variantStyles: Record<
  AlertBannerVariant,
  { bg: string; icon: string; text: string; defaultIcon: LucideIcon | null }
> = {
  error: {
    bg: 'bg-danger-light',
    icon: 'text-danger-text',
    text: 'text-danger-text',
    defaultIcon: null,
  },
  warning: {
    bg: 'bg-warning-light',
    icon: 'text-warning-text',
    text: 'text-warning-text',
    defaultIcon: null,
  },
  info: {
    bg: 'bg-info-light',
    icon: 'text-info-text',
    text: 'text-info-text',
    defaultIcon: null,
  },
  success: {
    bg: 'bg-success-light',
    icon: 'text-success-text',
    text: 'text-success-text',
    defaultIcon: null,
  },
  demo: {
    bg: 'bg-demo-light',
    icon: 'text-demo-text',
    text: 'text-demo-text',
    defaultIcon: null,
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

  // Render icon - use animated icons when no custom icon provided
  const renderIcon = (extraClass = '') => {
    if (!icon) {
      if (variant === 'error') {
        return <AnimatedXMark size={24} className={`${styles.icon} flex-shrink-0 ${extraClass}`} />;
      }
      if (variant === 'warning') {
        return (
          <AnimatedWarningMark size={24} className={`${styles.icon} flex-shrink-0 ${extraClass}`} />
        );
      }
      if (variant === 'info') {
        return (
          <AnimatedInfoMark size={24} className={`${styles.icon} flex-shrink-0 ${extraClass}`} />
        );
      }
      if (variant === 'success') {
        return (
          <AnimatedCheckmark size={24} className={`${styles.icon} flex-shrink-0 ${extraClass}`} />
        );
      }
      if (variant === 'demo') {
        return (
          <AnimatedSparkles size={24} className={`${styles.icon} flex-shrink-0 ${extraClass}`} />
        );
      }
    }
    if (Icon) {
      return <Icon className={`w-4 h-4 ${styles.icon} flex-shrink-0 ${extraClass}`} />;
    }
    return null;
  };

  // Complex layout: has title or actions
  if (title != null || actions != null) {
    return (
      <div
        className={`w-fit px-3 py-1 ${styles.bg} rounded-lg ${animationClass} ${spacingClass} ${className}`}
        role="alert"
      >
        <div className="flex items-start gap-2">
          {renderIcon('mt-0.5')}
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
      className={`w-fit min-h-7 px-2 py-1 ${styles.bg} rounded-lg flex items-center gap-2 ${animationClass} ${spacingClass} ${className}`}
      role="alert"
    >
      {renderIcon()}
      <span className={`text-sm ${styles.text}`}>{children}</span>
    </div>
  );
}
