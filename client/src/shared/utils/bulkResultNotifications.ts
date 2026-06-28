/**
 * Bulk Operation Result Notifications
 *
 * Three-tier feedback for bulk operations: success, partial failure, or total failure.
 */

import { notifications } from '@shared/utils/notifications';

interface BulkResult {
  succeeded: unknown[];
  failed: unknown[];
}

export function notifyBulkResult(
  result: BulkResult,
  { entityLabel, actionVerb }: { entityLabel: string; actionVerb: string }
): void {
  if (result.failed.length === 0) {
    notifications.success(`${actionVerb} ${result.succeeded.length} ${entityLabel}`);
  } else if (result.succeeded.length === 0) {
    notifications.error(`All ${result.failed.length} ${entityLabel} failed`);
  } else {
    notifications.warning(`${result.succeeded.length} succeeded, ${result.failed.length} failed`);
  }
}
