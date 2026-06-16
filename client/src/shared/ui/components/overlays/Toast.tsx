/**
 * Toast Notification
 *
 * Notification card for react-hot-toast integration.
 */

import { CheckCircle, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastProps {
  type: ToastType;
  message: string;
  /** Bound to react-hot-toast's t.visible for enter/exit animation */
  visible?: boolean;
}

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    iconClass:
      'text-[hsl(var(--color-success-bg))] drop-shadow-[0_0_5px_hsl(var(--color-success-bg)/0.75)]',
    coreClass: 'bg-[hsl(var(--color-success-bg))]',
    glowClass: 'bg-[hsl(var(--color-success-bg)/0.6)]',
    ariaLive: 'polite' as const,
  },
  error: {
    icon: XCircle,
    iconClass:
      'text-[hsl(var(--color-danger-bg))] drop-shadow-[0_0_5px_hsl(var(--color-danger-bg)/0.75)]',
    coreClass: 'bg-[hsl(var(--color-danger-bg))]',
    glowClass: 'bg-[hsl(var(--color-danger-bg)/0.6)]',
    ariaLive: 'assertive' as const,
  },
  warning: {
    icon: AlertTriangle,
    iconClass:
      'text-[hsl(var(--color-warning-bg))] drop-shadow-[0_0_5px_hsl(var(--color-warning-bg)/0.75)]',
    coreClass: 'bg-[hsl(var(--color-warning-bg))]',
    glowClass: 'bg-[hsl(var(--color-warning-bg)/0.6)]',
    ariaLive: 'assertive' as const,
  },
  info: {
    icon: Info,
    iconClass:
      'text-[hsl(var(--color-info-bg))] drop-shadow-[0_0_5px_hsl(var(--color-info-bg)/0.75)]',
    coreClass: 'bg-[hsl(var(--color-info-bg))]',
    glowClass: 'bg-[hsl(var(--color-info-bg)/0.6)]',
    ariaLive: 'polite' as const,
  },
  loading: {
    icon: Loader2,
    iconClass:
      'text-[hsl(var(--color-info-bg))] drop-shadow-[0_0_5px_hsl(var(--color-info-bg)/0.75)]',
    coreClass: 'bg-[hsl(var(--color-info-bg))]',
    glowClass: 'bg-[hsl(var(--color-info-bg)/0.6)]',
    ariaLive: 'polite' as const,
  },
} as const;

export function Toast({ type, message, visible = true }: ToastProps): React.ReactElement {
  const config = TOAST_CONFIG[type];
  const Icon = config.icon;
  const isLoading = type === 'loading';

  return (
    <div
      role={config.ariaLive === 'assertive' ? 'alert' : 'status'}
      aria-live={config.ariaLive}
      aria-atomic="true"
      className={`
        relative isolate flex items-center gap-3 px-4 py-3
        min-w-[280px] max-w-[420px]
        transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-2 -z-10 bg-black/[0.93] blur-md"
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-y-3 left-[3px] w-1.5 rounded-full blur-[4px] ${config.glowClass}`}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-y-3 left-[5px] w-[1.5px] rounded-full ${config.coreClass}`}
      />
      <Icon
        className={`w-5 h-5 flex-shrink-0 ${config.iconClass} ${isLoading ? 'animate-spin' : ''}`}
        strokeWidth={2.25}
        aria-hidden="true"
      />
      <span className="text-sm text-toast-foreground leading-snug">{message}</span>
    </div>
  );
}
