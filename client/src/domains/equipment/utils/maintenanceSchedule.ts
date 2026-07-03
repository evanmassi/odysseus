/**
 * Maintenance Schedule
 *
 * Day-count math for equipment maintenance due dates, shared by the item row
 * and the maintenance alert panel.
 */

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
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntil = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return { daysUntil, dateStr };
}
