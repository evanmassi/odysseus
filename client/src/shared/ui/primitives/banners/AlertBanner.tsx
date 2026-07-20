/**
 * Alert Banner
 *
 * Inline semantic alert with a variant-colored lead, message, and optional title/actions.
 */

import type { ComponentType } from 'react';

import {
  AnimatedCheckmark,
  AnimatedInfoMark,
  AnimatedSparkles,
  AnimatedWarningMark,
  AnimatedXMark,
} from '@shared/ui/components/icons';

import { defaultAlertBannerProps } from './types';

import type { AlertBannerProps, AlertBannerVariant } from './types';

const ICON_SIZE = 18;

const DEFAULT_LEADS: Record<AlertBannerVariant, string> = {
  error: 'Alert',
  warning: 'Notice',
  success: 'Success',
  info: 'Advisory',
  demo: 'Demo',
};

const VARIANT_ICONS: Record<AlertBannerVariant, ComponentType<{ size?: number }>> = {
  error: AnimatedXMark,
  warning: AnimatedWarningMark,
  info: AnimatedInfoMark,
  success: AnimatedCheckmark,
  demo: AnimatedSparkles,
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
  const animationClass = animate ? 'animate-in slide-in-from-top-2 duration-300' : '';
  const spacingClass = spacingStyles[spacing];
  const Icon = icon ?? VARIANT_ICONS[variant];

  return (
    <div
      role="alert"
      className={`alert-banner alert-banner--${variant} ${spacingClass} ${animationClass} ${className}`}
    >
      <span className="alert-banner__icon">
        <Icon size={ICON_SIZE} />
      </span>
      <span className="alert-banner__lead">{DEFAULT_LEADS[variant]}</span>
      <span className="alert-banner__sep" aria-hidden />
      <div className="alert-banner__body">
        {title != null && <p className="alert-banner__title">{title}</p>}
        <div className="alert-banner__message">{children}</div>
      </div>
      {actions != null && <div className="alert-banner__actions">{actions}</div>}
    </div>
  );
}
