import { daysUntil } from '@shared/utils/dateExpiry';
import { normalizeDateString } from '@shared/utils/dateFormatters';

export const MAINTENANCE_DUE_SOON_DAYS = 30;

export function resolveMaintenanceDue(
  date: Date | string
): { daysUntil: number; dateStr: string } | undefined {
  const dateStr = normalizeDateString(date);
  if (!dateStr) return undefined;
  const days = daysUntil(dateStr);
  if (days === undefined) return undefined;
  return { daysUntil: days, dateStr };
}
