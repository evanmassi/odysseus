/**
 * Notifications Utility
 *
 * Standardized toast notifications via the custom Toast component.
 */

import { toast } from 'react-hot-toast';

import { Toast } from '@shared/ui/components/overlays/Toast';

const DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
  WARNING: 4000,
  INFO: 3000,
  PERSISTENT: Infinity,
} as const;

/** Use these instead of direct toast.* calls for consistency. */
export const notifications = {
  success: (message: string, options?: { id?: string }): string => {
    return toast.custom(t => <Toast type="success" message={message} visible={t.visible} />, {
      id: options?.id,
      duration: DURATION.SUCCESS,
      position: 'bottom-right',
    });
  },

  error: (message: string, options?: { id?: string }): string => {
    return toast.custom(t => <Toast type="error" message={message} visible={t.visible} />, {
      id: options?.id,
      duration: DURATION.ERROR,
      position: 'bottom-right',
    });
  },

  // Fixed ID prevents duplicate toasts when offline
  offlineError: (): string => {
    return toast.custom(
      t => (
        <Toast
          type="error"
          message="You're offline. Changes cannot be saved until connection is restored."
          visible={t.visible}
        />
      ),
      {
        id: 'offline-write-error',
        duration: DURATION.ERROR,
        position: 'bottom-right',
      }
    );
  },

  persistentError: (message: string): string => {
    return toast.custom(t => <Toast type="error" message={message} visible={t.visible} />, {
      duration: DURATION.PERSISTENT,
      position: 'bottom-right',
    });
  },

  warning: (message: string): string => {
    return toast.custom(t => <Toast type="warning" message={message} visible={t.visible} />, {
      duration: DURATION.WARNING,
      position: 'bottom-right',
    });
  },

  info: (message: string): string => {
    return toast.custom(t => <Toast type="info" message={message} visible={t.visible} />, {
      duration: DURATION.INFO,
      position: 'bottom-right',
    });
  },

  loading: (message: string): string => {
    return toast.custom(t => <Toast type="loading" message={message} visible={t.visible} />, {
      duration: DURATION.PERSISTENT,
      position: 'bottom-right',
    });
  },

  dismiss: (toastId?: string): void => {
    toast.dismiss(toastId);
  },
};
