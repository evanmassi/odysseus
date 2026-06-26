/**
 * Storage Service Tests
 *
 * Pins the contract that API errors propagate unwrapped — re-wrapping would hide
 * status/code from the conflict and offline guards in the mutation handlers.
 */
import { ApiError } from '@odysseus/shared-schemas';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@infra/api', () => ({
  httpClient: {
    getData: vi.fn(),
    postData: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { httpClient } from '@infra/api';

import { StorageService } from './StorageService';

describe('StorageService error propagation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('propagates the original ApiError from a write without wrapping it', async () => {
    const conflict = new ApiError('Configuration was modified', 409);
    vi.mocked(httpClient.put).mockRejectedValue(conflict);

    await expect(StorageService.updateTank('tank-1', { name: 'X' })).rejects.toBe(conflict);
  });

  it('preserves the status so the 409 conflict guard can read it', async () => {
    vi.mocked(httpClient.postData).mockRejectedValue(new ApiError('conflict', 409));

    await expect(StorageService.addTank('Tank A')).rejects.toMatchObject({ status: 409 });
  });

  it('propagates errors from reads (queries) unwrapped', async () => {
    const serverError = new ApiError('boom', 500);
    vi.mocked(httpClient.getData).mockRejectedValue(serverError);

    await expect(StorageService.loadConfiguration()).rejects.toBe(serverError);
  });
});
