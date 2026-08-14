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

// Every bulk surface reaches this helper with its own response shape, and only some carry a
// per-row reason, so the message is read defensively rather than by widening each caller's type.
function errorOf(failure: unknown): string | undefined {
  if (typeof failure !== 'object' || failure === null) return undefined;
  const { error } = failure as { error?: unknown };
  return typeof error === 'string' ? error : undefined;
}

// Bulk failures usually share one cause — a guard rejecting many rows — so the distinct
// server messages stay short enough to carry, and a bare count would hide why.
function reasonSuffix(failed: unknown[]): string {
  const reasons = [...new Set(failed.map(errorOf).filter((e): e is string => !!e))];
  return reasons.length > 0 ? ` — ${reasons.join(' ')}` : '';
}

export function notifyBulkResult(
  result: BulkResult,
  { entityLabel, actionVerb }: { entityLabel: string; actionVerb: string }
): void {
  if (result.failed.length === 0) {
    notifications.success(`${actionVerb} ${result.succeeded.length} ${entityLabel}`);
  } else if (result.succeeded.length === 0) {
    notifications.error(
      `All ${result.failed.length} ${entityLabel} failed${reasonSuffix(result.failed)}`
    );
  } else {
    notifications.warning(
      `${result.succeeded.length} succeeded, ${result.failed.length} failed${reasonSuffix(result.failed)}`
    );
  }
}
