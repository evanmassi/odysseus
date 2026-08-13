/**
 * Bulk Result Notifications Tests
 *
 * Covers the three feedback tiers: full success, total failure, and partial failure.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@shared/utils/notifications', () => ({
  notifications: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

import { notifications } from '@shared/utils/notifications';

import { notifyBulkResult } from './bulkResultNotifications';

describe('notifyBulkResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('notifies success with the action verb when nothing failed', () => {
    notifyBulkResult(
      { succeeded: ['a', 'b', 'c'], failed: [] },
      { entityLabel: 'transactions', actionVerb: 'Voided' }
    );

    expect(notifications.success).toHaveBeenCalledWith('Voided 3 transactions');
    expect(notifications.warning).not.toHaveBeenCalled();
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it('notifies error when everything failed', () => {
    notifyBulkResult(
      { succeeded: [], failed: [{}, {}] },
      { entityLabel: 'items', actionVerb: 'Issued' }
    );

    expect(notifications.error).toHaveBeenCalledWith('All 2 items failed');
    expect(notifications.success).not.toHaveBeenCalled();
  });

  it('notifies a warning on partial failure', () => {
    notifyBulkResult(
      { succeeded: ['a', 'b'], failed: [{}] },
      { entityLabel: 'items', actionVerb: 'Updated' }
    );

    expect(notifications.warning).toHaveBeenCalledWith('2 succeeded, 1 failed');
    expect(notifications.success).not.toHaveBeenCalled();
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it('carries the server reason so a block says why, not just how many', () => {
    notifyBulkResult(
      { succeeded: ['a'], failed: [{ error: 'This tube belongs to the demo dataset.' }] },
      { entityLabel: 'tubes', actionVerb: 'Removed' }
    );

    expect(notifications.warning).toHaveBeenCalledWith(
      '1 succeeded, 1 failed — This tube belongs to the demo dataset.'
    );
  });

  it('states a shared reason once however many rows carry it', () => {
    notifyBulkResult(
      {
        succeeded: [],
        failed: [{ error: 'Protected.' }, { error: 'Protected.' }, { error: 'Locked by Ada.' }],
      },
      { entityLabel: 'tubes', actionVerb: 'Removed' }
    );

    expect(notifications.error).toHaveBeenCalledWith(
      'All 3 tubes failed — Protected. Locked by Ada.'
    );
  });
});
