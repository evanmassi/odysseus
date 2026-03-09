/**
 * Toast Notification
 *
 * Left-border-accent notification component for react-hot-toast integration.
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
    borderClass: 'border-l-[hsl(var(--color-success-bg))]',
    iconClass: 'text-[hsl(var(--color-success-bg))]',
    ariaLive: 'polite' as const,
  },
  error: {
    icon: XCircle,
    borderClass: 'border-l-[hsl(var(--color-danger-bg))]',
    iconClass: 'text-[hsl(var(--color-danger-bg))]',
    ariaLive: 'assertive' as const,
  },
  warning: {
    icon: AlertTriangle,
    borderClass: 'border-l-[hsl(var(--color-warning-bg))]',
    iconClass: 'text-[hsl(var(--color-warning-bg))]',
    ariaLive: 'assertive' as const,
  },
  info: {
    icon: Info,
    borderClass: 'border-l-[hsl(var(--color-info-bg))]',
    iconClass: 'text-[hsl(var(--color-info-bg))]',
    ariaLive: 'polite' as const,
  },
  loading: {
    icon: Loader2,
    borderClass: 'border-l-[hsl(var(--color-info-bg))]',
    iconClass: 'text-[hsl(var(--color-info-bg))]',
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
        flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
        min-w-[280px] max-w-[420px]
        bg-toast border-l-4 ${config.borderClass}
        transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      <Icon
        className={`w-5 h-5 flex-shrink-0 ${config.iconClass} ${isLoading ? 'animate-spin' : ''}`}
        aria-hidden="true"
      />
      <span className="text-sm text-toast-foreground leading-snug">{message}</span>
    </div>
  );
}
