import { pluralizeUnit } from '@odysseus/shared-schemas';

import { daysUntil } from '@shared/utils/dateExpiry';

import type { ReagentItemWithStock } from '@odysseus/shared-schemas';

const DEFAULT_EXPIRY_WARNING_DAYS = 90;

interface ReagentExpiryBadge {
  tone: 'danger' | 'warning';
  label: string;
  detail: string;
}

export interface ReagentLotExpiry {
  tone: 'danger' | 'warning';
  label: string;
  detail: string;
  days: number;
}

export function isLotExpired(expirationDate: string | undefined): boolean {
  if (!expirationDate) return false;
  const days = daysUntil(expirationDate);
  return days !== undefined && days < 0;
}

export function resolveLotExpiry(
  expirationDate: string | undefined,
  warningDays: number | undefined
): ReagentLotExpiry | undefined {
  if (!expirationDate) return undefined;

  const days = daysUntil(expirationDate);
  if (days === undefined) return undefined;
  if (days < 0) return { tone: 'danger', label: 'expired', detail: 'Expired', days };
  if (days > (warningDays ?? DEFAULT_EXPIRY_WARNING_DAYS)) return undefined;

  return {
    tone: 'warning',
    label: days === 0 ? 'today' : `${days}d`,
    detail: days === 0 ? 'Today' : `In ${days} ${pluralizeUnit('day', days)}`,
    days,
  };
}

export function resolveExpiryBadge(item: ReagentItemWithStock): ReagentExpiryBadge | undefined {
  const expiredCount = item.lotExpirations.filter(lot => isLotExpired(lot.expirationDate)).length;
  if (expiredCount > 0) {
    return {
      tone: 'danger',
      label: `${expiredCount} expired`,
      detail: `${expiredCount} ${pluralizeUnit('lot', expiredCount)} expired`,
    };
  }

  // PITFALL: lotExpirations arrive earliest first from the server, so the first lot is the soonest.
  const soonest = item.lotExpirations[0];
  const expiry = soonest && resolveLotExpiry(soonest.expirationDate, item.expiryWarningDays);
  if (!expiry) return undefined;

  return {
    tone: 'warning',
    label: expiry.days === 0 ? 'exp today' : `exp ${expiry.days}d`,
    detail:
      expiry.days === 0
        ? 'Expires today'
        : `Expires in ${expiry.days} ${pluralizeUnit('day', expiry.days)}`,
  };
}
