/**
 * Toast - Custom notification component for react-hot-toast
 *
 * Modern, minimal toast design with left border accent.
 * Uses existing design system colors for visual consistency.
 *
 * Features:
 * - 5 types: success, error, warning, info, loading
 * - Accessible with proper aria-live regions
 * - Smooth enter/exit animations
 * - Design system color integration
 *
 * @example
 * toast.custom((t) => <Toast type="success" message="Tube created" visible={t.visible} />)
 */

import { CheckCircle, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastProps {
  /** Toast variant - determines icon, border color, and accessibility */
  type: ToastType;

  /** Message to display */
  message: string;

  /** Controls enter/exit animation state (from react-hot-toast's t.visible) */
  visible?: boolean;
}

/**
 * Toast configuration mapping type to visual properties
 * Colors reference CSS variables from the design system (variables.css)
 */
const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    borderClass: 'border-l-[var(--color-success-bg)]',
    iconClass: 'text-[var(--color-success-bg)]',
    ariaLive: 'polite' as const,
  },
  error: {
    icon: XCircle,
    borderClass: 'border-l-[var(--color-danger-bg)]',
    iconClass: 'text-[var(--color-danger-bg)]',
    ariaLive: 'assertive' as const,
  },
  warning: {
    icon: AlertTriangle,
    borderClass: 'border-l-[var(--color-warning-bg)]',
    iconClass: 'text-[var(--color-warning-bg)]',
    ariaLive: 'assertive' as const,
  },
  info: {
    icon: Info,
    borderClass: 'border-l-[var(--color-info-bg)]',
    iconClass: 'text-[var(--color-info-bg)]',
    ariaLive: 'polite' as const,
  },
  loading: {
    icon: Loader2,
    borderClass: 'border-l-[var(--color-info-bg)]',
    iconClass: 'text-[var(--color-info-bg)]',
    ariaLive: 'polite' as const,
  },
} as const;

/**
 * Custom toast component with left border accent style
 * Matches Linear/Notion aesthetic - dark background, colored border indicator
 */
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
        bg-gray-800 border-l-4 ${config.borderClass}
        transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      <Icon
        className={`w-5 h-5 flex-shrink-0 ${config.iconClass} ${isLoading ? 'animate-spin' : ''}`}
        aria-hidden="true"
      />
      <span className="text-sm text-gray-200 leading-snug">{message}</span>
    </div>
  );
}
