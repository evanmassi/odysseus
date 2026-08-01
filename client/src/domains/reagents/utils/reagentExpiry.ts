/**
 * Reagent Expiry Status
 *
 * Expiry warnings for an item (from its lot rollup) and for a single lot (from its
 * own date), both measured against the lab window or the item's override.
 */

import { pluralizeUnit } from '@odysseus/shared-schemas';

import { daysUntil } from '@shared/utils/dateExpiry';

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

export interface ReagentLotExpiry {
  tone: 'danger' | 'warning';
  label: string;
}

/** Past its expiration date — the server refuses to draw from these without an acknowledgment. */
export function isLotExpired(expirationDate: string | undefined): boolean {
  if (!expirationDate) return false;
  const days = daysUntil(expirationDate);
  return days !== undefined && days < 0;
}

/** Per-lot counterpart of the item badge, read from the lot's own expiration date. */
export function resolveLotExpiry(
  expirationDate: string | undefined,
  warningDays: number | undefined
): ReagentLotExpiry | undefined {
  if (!expirationDate) return undefined;

  const days = daysUntil(expirationDate);
  if (days === undefined) return undefined;
  if (days < 0) return { tone: 'danger', label: 'expired' };
  if (days > (warningDays ?? DEFAULT_EXPIRY_WARNING_DAYS)) return undefined;

  return { tone: 'warning', label: days === 0 ? 'today' : `${days}d` };
}
