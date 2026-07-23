/**
 * Date Expiry Math
 *
 * Whole-day distance from today for date-only fields (expiry, maintenance due),
 * computed at local midnight so a date-only value doesn't drift across timezones.
 */

import { normalizeDateString } from '@shared/utils/dateFormatters';
import { MS_PER_DAY } from '@shared/utils/timeConstants';

/**
 * Whole-day distance from today (local midnight) to `date`: negative if past,
 * 0 today, positive if future. Returns undefined when the date is unset or unparseable.
 */
export function daysUntil(date: Date | string): number | undefined {
  const dateStr = normalizeDateString(date);
  if (!dateStr) return undefined;
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / MS_PER_DAY);
}
