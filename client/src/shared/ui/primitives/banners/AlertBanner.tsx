/**
 * Alert Banner
 *
 * Inline alert: 3px lit edge with halo, translucent tone-tinted body,
 * radial wash, semantic mono lead, hairline separator, message, optional actions.
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

const DEFAULT_LEADS: Record<AlertBannerVariant, string> = {
  error: 'Alert',
  warning: 'Notice',
  success: 'Success',
  info: 'Advisory',
  demo: 'Demo',
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
  lead,
  animate = defaultAlertBannerProps.animate,
  className = '',
  spacing = defaultAlertBannerProps.spacing,
}: AlertBannerProps) {
  const animationClass = animate ? 'animate-in slide-in-from-top-2 duration-300' : '';
  const spacingClass = spacingStyles[spacing ?? 'md'];
  const leadText = lead ?? DEFAULT_LEADS[variant];

  return (
    <div
      role="alert"
      className={`alert-banner alert-banner--${variant} ${spacingClass} ${animationClass} ${className}`}
    >
      <span className="alert-banner__icon">{renderIcon(variant, icon)}</span>
      <span className="alert-banner__lead">{leadText}</span>
      <span className="alert-banner__sep" aria-hidden />
      <div className="alert-banner__body">
        {title != null && <p className="alert-banner__title">{title}</p>}
        <div className="alert-banner__message">{children}</div>
      </div>
      {actions != null && <div className="alert-banner__actions">{actions}</div>}
    </div>
  );
}

function renderIcon(variant: AlertBannerVariant, customIcon: AlertBannerProps['icon']) {
  if (customIcon) {
    const CustomIcon = customIcon;
    return <CustomIcon className="w-[18px] h-[18px]" />;
  }
  if (variant === 'error') return <AnimatedXMark size={18} />;
  if (variant === 'warning') return <AnimatedWarningMark size={18} />;
  if (variant === 'info') return <AnimatedInfoMark size={18} />;
  if (variant === 'success') return <AnimatedCheckmark size={18} />;
  if (variant === 'demo') return <AnimatedSparkles size={18} />;
  return null;
}
