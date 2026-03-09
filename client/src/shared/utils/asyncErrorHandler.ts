/**
 * Async Error Handler
 *
 * Wraps async operations with loading state, notifications, and error handling.
 */

import { notifications } from './notifications';
export async function withAsyncHandler(
  operation: () => Promise<void>,
  options: {
    setLoading?: (loading: boolean) => void;
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: () => void;
  } = {}
): Promise<void> {
  options.setLoading?.(true);
  try {
    await operation();
    if (options.successMessage) {
      notifications.success(options.successMessage);
    }
    options.onSuccess?.();
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : (options.errorMessage ?? 'An error occurred');
    notifications.error(message);
  } finally {
    options.setLoading?.(false);
  }
}
