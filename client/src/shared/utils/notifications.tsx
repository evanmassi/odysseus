/**
 * Notifications Utility
 *
 * Standardized toast notifications using custom Toast component.
 * 5 semantic types: success, error, warning, info, loading
 * All toasts auto-dismiss except persistent errors.
 *
 * Colors are inherited from the design system (variables.css):
 * - Success: --color-success-bg (#22c55e)
 * - Error: --color-danger-bg (#f76969)
 * - Warning: --color-warning-bg (#eab308)
 * - Info/Loading: --color-info-bg (#3b82f6)
 */

import { toast } from 'react-hot-toast';

import { Toast } from '@shared/ui/components/Toast';

/**
 * Duration constants (milliseconds)
 */
const DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
  WARNING: 4000,
  INFO: 3000,
  PERSISTENT: Infinity,
} as const;

/**
 * Standardized notification utilities
 * Use these instead of direct toast.* calls for consistency
 */
export const notifications = {
  /**
   * Success notification - completed actions
   * Green border, auto-dismisses after 3s
   */
  success: (message: string): string => {
    return toast.custom(t => <Toast type="success" message={message} visible={t.visible} />, {
      duration: DURATION.SUCCESS,
      position: 'bottom-right',
    });
  },

  /**
   * Error notification - failed operations
   * Red border, auto-dismisses after 5s
   */
  error: (message: string): string => {
    return toast.custom(t => <Toast type="error" message={message} visible={t.visible} />, {
      duration: DURATION.ERROR,
      position: 'bottom-right',
    });
  },

  /**
   * Persistent error notification - critical failures (e.g., network disconnect)
   * Red border, stays until manually dismissed
   * Returns toast ID for programmatic dismissal
   */
  persistentError: (message: string): string => {
    return toast.custom(t => <Toast type="error" message={message} visible={t.visible} />, {
      duration: DURATION.PERSISTENT,
      position: 'bottom-right',
    });
  },

  /**
   * Warning notification - caution/blocked actions
   * Amber border, auto-dismisses after 4s
   */
  warning: (message: string): string => {
    return toast.custom(t => <Toast type="warning" message={message} visible={t.visible} />, {
      duration: DURATION.WARNING,
      position: 'bottom-right',
    });
  },

  /**
   * Info notification - neutral updates
   * Blue border, auto-dismisses after 3s
   */
  info: (message: string): string => {
    return toast.custom(t => <Toast type="info" message={message} visible={t.visible} />, {
      duration: DURATION.INFO,
      position: 'bottom-right',
    });
  },

  /**
   * Loading notification - async operations in progress
   * Blue border with spinning icon, persists until dismissed
   * Returns toast ID for programmatic dismissal
   */
  loading: (message: string): string => {
    return toast.custom(t => <Toast type="loading" message={message} visible={t.visible} />, {
      duration: DURATION.PERSISTENT,
      position: 'bottom-right',
    });
  },

  /**
   * Dismiss a specific toast or all toasts
   * @param toastId - Optional ID to dismiss specific toast
   */
  dismiss: (toastId?: string): void => {
    toast.dismiss(toastId);
  },
};
