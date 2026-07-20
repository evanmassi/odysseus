/**
 * API Error Guards Tests
 *
 * Covers conflict (409) and offline-write error classification.
 */
import { ApiError } from '@odysseus/shared-schemas';
import { describe, it, expect } from 'vitest';

import { isConflictError, isOfflineError } from './apiErrorGuards';
import { OfflineWriteError } from './HttpTransport';

describe('isConflictError', () => {
  it('returns true for a 409 status', () => {
    expect(isConflictError(new ApiError('conflict', 409))).toBe(true);
    expect(isConflictError({ status: 409 })).toBe(true);
  });

  it('returns false for other statuses', () => {
    expect(isConflictError(new ApiError('server error', 500))).toBe(false);
    expect(isConflictError(new ApiError('bad request', 400))).toBe(false);
  });

  it('returns false when status is absent or the value is not an error object', () => {
    expect(isConflictError(new Error('plain'))).toBe(false);
    expect(isConflictError(null)).toBe(false);
    expect(isConflictError(undefined)).toBe(false);
    expect(isConflictError('409')).toBe(false);
  });
});

describe('isOfflineError', () => {
  it('returns true for an OfflineWriteError instance', () => {
    expect(isOfflineError(new OfflineWriteError())).toBe(true);
  });

  it('returns true for any error carrying the offline-write code', () => {
    expect(isOfflineError({ code: 'OFFLINE_WRITE_BLOCKED' })).toBe(true);
    expect(isOfflineError(new ApiError('offline', 0, 'OFFLINE_WRITE_BLOCKED'))).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isOfflineError(new ApiError('conflict', 409))).toBe(false);
    expect(isOfflineError({ code: 'SOMETHING_ELSE' })).toBe(false);
    expect(isOfflineError(null)).toBe(false);
  });
});
