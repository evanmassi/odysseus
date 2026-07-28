/**
 * Reagent Lot Predicates
 *
 * Shared reading of which lots count as stock on hand.
 */

import type { ReagentLot } from '@odysseus/shared-schemas';

/** A lot the server would draw from: still active and not yet spent. */
export function isLotDrawable(lot: ReagentLot): boolean {
  return lot.status === 'active' && lot.quantity > 0;
}
