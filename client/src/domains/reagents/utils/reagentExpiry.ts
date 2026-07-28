/**
 * Reagent Expiry Status
 *
 * Derives the expiry warning for an item from its lot rollup: expired lots first,
 * then the soonest expiration inside the warning window.
 */

import { daysUntil } from '@shared/utils/dateExpiry';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';

import type { ReagentItemWithStock } from '@odysseus/shared-schemas';

/** Lab-wide warning window; an item's own `expiryWarningDays` overrides it. */
const DEFAULT_EXPIRY_WARNING_DAYS = 90;

interface ReagentExpiryBadge {
  tone: 'danger' | 'warning';
  /** Chip text on the item row. */
  label: string;
  /** Longer form for the row tooltip. */
  detail: string;
}

/**
 * Undefined when nothing expires soon. `soonestExpiration` covers stocked active lots
 * including expired ones, so the expired count is checked first and wins.
 */
export function resolveExpiryBadge(item: ReagentItemWithStock): ReagentExpiryBadge | undefined {
  if (item.expiredLotCount > 0) {
    const noun = pluralizeUnit('lot', item.expiredLotCount);
    return {
      tone: 'danger',
      label: `${item.expiredLotCount} expired`,
      detail: `${item.expiredLotCount} ${noun} expired`,
    };
  }

  if (!item.soonestExpiration) return undefined;

  const days = daysUntil(item.soonestExpiration);
  if (days === undefined || days > (item.expiryWarningDays ?? DEFAULT_EXPIRY_WARNING_DAYS)) {
    return undefined;
  }

  return {
    tone: 'warning',
    label: days === 0 ? 'exp today' : `exp ${days}d`,
    detail: days === 0 ? 'Expires today' : `Expires in ${days} ${pluralizeUnit('day', days)}`,
  };
}
