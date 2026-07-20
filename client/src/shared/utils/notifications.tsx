/**
 * Notifications Utility
 *
 * Standardized toast notifications via the custom Toast component.
 */

import { toast } from 'react-hot-toast';

import { Toast, type ToastType } from '@shared/ui/components/overlays/Toast';

const DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
  WARNING: 4000,
  INFO: 3000,
  PERSISTENT: Infinity,
} as const;

function showToast(type: ToastType, message: string, duration: number, id?: string): string {
  return toast.custom(t => <Toast type={type} message={message} visible={t.visible} />, {
    id,
    duration,
    position: 'bottom-right',
  });
}

/** Use these instead of direct toast.* calls for consistency. */
export const notifications = {
  success: (message: string, options?: { id?: string }): string =>
    showToast('success', message, DURATION.SUCCESS, options?.id),

  error: (message: string, options?: { id?: string }): string =>
    showToast('error', message, DURATION.ERROR, options?.id),

  // Fixed ID prevents duplicate toasts when offline
  offlineError: (): string =>
    showToast(
      'error',
      "You're offline. Changes cannot be saved until connection is restored.",
      DURATION.ERROR,
      'offline-write-error'
    ),

  persistentError: (message: string): string => showToast('error', message, DURATION.PERSISTENT),

  warning: (message: string): string => showToast('warning', message, DURATION.WARNING),

  info: (message: string): string => showToast('info', message, DURATION.INFO),

  loading: (message: string): string => showToast('loading', message, DURATION.PERSISTENT),

  dismiss: (toastId?: string): void => {
    toast.dismiss(toastId);
  },
};
