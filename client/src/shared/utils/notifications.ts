import { toast } from 'react-hot-toast';

/**
 * Design System Colors
 * - Pale Amber Frost: Cut/Move operations
 * - Ice Blue: Copy/Paste operations
 * - Mint Frost: Update/Edit/Add operations
 */
const COLORS = {
  lightAmber: '#FFF0D9', // Cut/Move - Pale Amber Frost
  icyBlue: '#D9F3FF', // Copy/Paste - Ice Blue
  mintyFrost: '#E3F8E6', // Update/Edit/Add - Mint Frost
  success: '#10B981', // Generic success
  error: '#EF4444', // Errors
} as const;

export const notifications = {
  success: (message: string) => {
    toast.success(message, {
      duration: 3000,
      position: 'bottom-right',
      style: {
        background: COLORS.success,
        color: '#fff',
      },
    });
  },

  error: (message: string) => {
    toast.error(message, {
      duration: 5000,
      position: 'bottom-right',
      style: {
        background: COLORS.error,
        color: '#fff',
      },
    });
  },

  loading: (message: string) => {
    return toast.loading(message, {
      position: 'bottom-right',
    });
  },

  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  },

  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(promise, messages, {
      position: 'bottom-right',
    });
  },

  // Operation-specific notifications with semantic colors

  /** Cut operation - Pale Amber Frost */
  cut: (message: string) => {
    toast.success(message, {
      duration: 2000,
      position: 'bottom-right',
      style: {
        background: COLORS.lightAmber,
        color: '#92400E', // Dark amber text
      },
    });
  },

  /** Move operation - Pale Amber Frost (matches cut) */
  move: (message: string) => {
    toast.success(message, {
      duration: 2000,
      position: 'bottom-right',
      style: {
        background: COLORS.lightAmber,
        color: '#92400E', // Dark amber text
      },
    });
  },

  /** Copy operation - Ice Blue */
  copy: (message: string) => {
    toast.success(message, {
      duration: 2000,
      position: 'bottom-right',
      style: {
        background: COLORS.icyBlue,
        color: '#0C4A6E', // Dark blue text
      },
    });
  },

  /** Paste operation - Ice Blue (matches copy) */
  paste: (message: string) => {
    toast.success(message, {
      duration: 2000,
      position: 'bottom-right',
      style: {
        background: COLORS.icyBlue,
        color: '#0C4A6E', // Dark blue text
      },
    });
  },

  /** Update operation - Mint Frost */
  update: (message: string) => {
    toast.success(message, {
      duration: 3000,
      position: 'bottom-right',
      style: {
        background: COLORS.mintyFrost,
        color: '#065F46', // Dark green text
      },
    });
  },

  /** Create/Add operation - Mint Frost */
  create: (message: string) => {
    toast.success(message, {
      duration: 3000,
      position: 'bottom-right',
      style: {
        background: COLORS.mintyFrost,
        color: '#065F46', // Dark green text
      },
    });
  },

  /** Delete operation - Generic success (green with checkmark) */
  delete: (message: string) => {
    toast.success(message, {
      duration: 3000,
      position: 'bottom-right',
      style: {
        background: COLORS.success,
        color: '#fff',
      },
    });
  },

  /** Lock/Unlock operation - Mint Frost (same as update) */
  lock: (message: string) => {
    toast.success(message, {
      duration: 2000,
      position: 'bottom-right',
      style: {
        background: COLORS.mintyFrost,
        color: '#065F46', // Dark green text
      },
    });
  },

  info: (message: string) => {
    toast(message, {
      duration: 3000,
      position: 'bottom-right',
      style: {
        background: COLORS.icyBlue,
        color: '#fff',
      },
    });
  },

  warning: (message: string) => {
    toast(message, {
      duration: 4000,
      position: 'bottom-right',
      style: {
        background: COLORS.lightAmber,
        color: '#fff',
      },
    });
  },
};

// Export colors for UI consistency
export { COLORS as NOTIFICATION_COLORS };
