/**
 * Async Error Handler Tests
 *
 * Covers the success path and the error-message composition matrix.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./notifications', () => ({
  notifications: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { withAsyncHandler } from './asyncErrorHandler';
import { notifications } from './notifications';

const failWith = (reason: unknown) => () => Promise.reject(reason);

describe('withAsyncHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('success path', () => {
    it('notifies success, runs onSuccess, and toggles loading', async () => {
      const setLoading = vi.fn();
      const onSuccess = vi.fn();

      await withAsyncHandler(async () => {}, {
        setLoading,
        successMessage: 'Saved',
        onSuccess,
      });

      expect(notifications.success).toHaveBeenCalledWith('Saved');
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(setLoading.mock.calls).toEqual([[true], [false]]);
      expect(notifications.error).not.toHaveBeenCalled();
    });

    it('skips the success notification when no successMessage is given', async () => {
      await withAsyncHandler(async () => {});
      expect(notifications.success).not.toHaveBeenCalled();
    });
  });

  describe('error message composition', () => {
    it('joins errorMessage and the Error detail as "label: detail"', async () => {
      await withAsyncHandler(failWith(new Error('Current password is incorrect')), {
        errorMessage: 'Failed to reset password',
      });
      expect(notifications.error).toHaveBeenCalledWith(
        'Failed to reset password: Current password is incorrect'
      );
    });

    it('uses errorMessage alone when the thrown value is not an Error', async () => {
      await withAsyncHandler(failWith('non-error'), { errorMessage: 'Failed to reset password' });
      expect(notifications.error).toHaveBeenCalledWith('Failed to reset password');
    });

    it('uses the Error detail alone when no errorMessage is given', async () => {
      await withAsyncHandler(failWith(new Error('boom')));
      expect(notifications.error).toHaveBeenCalledWith('boom');
    });

    it('falls back to a generic message when there is neither', async () => {
      await withAsyncHandler(failWith('non-error'));
      expect(notifications.error).toHaveBeenCalledWith('An error occurred');
    });
  });

  it('toggles loading off and skips onSuccess when the operation throws', async () => {
    const setLoading = vi.fn();
    const onSuccess = vi.fn();

    await withAsyncHandler(failWith(new Error('boom')), { setLoading, onSuccess });

    expect(setLoading.mock.calls).toEqual([[true], [false]]);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
