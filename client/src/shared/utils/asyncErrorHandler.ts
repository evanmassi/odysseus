import { notifications } from './notifications';

/**
 * Wraps an async operation with loading state management, success/error notifications,
 * and optional callbacks. Eliminates the repeated try/catch/finally pattern across modals.
 */
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
