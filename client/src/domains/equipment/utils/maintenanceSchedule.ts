/**
 * Maintenance Schedule
 *
 * Day-count math for equipment maintenance due dates, shared by the item row
 * and the maintenance alert panel.
 */

import { daysUntil } from '@shared/utils/dateExpiry';
import { normalizeDateString } from '@shared/utils/dateFormatters';

/**
 * Resolves a maintenance date to its normalized string and whole-day distance from
 * today (local midnight). Returns undefined when the date is unset or unparseable.
 */
export function resolveMaintenanceDue(
  date: Date | string
): { daysUntil: number; dateStr: string } | undefined {
  const dateStr = normalizeDateString(date);
  if (!dateStr) return undefined;
  const days = daysUntil(dateStr);
  if (days === undefined) return undefined;
  return { daysUntil: days, dateStr };
}
