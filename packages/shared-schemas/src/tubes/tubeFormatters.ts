/**
 * Tube Display Formatters
 *
 * Presentation-only utility for formatting tube concentration values in scientific notation for UI components.
 */

import { formatScientific } from '../units';

import type { ConcentrationUnit } from './tubeSchemas';

/**
 * Format concentration for display in scientific notation (X.XEX format)
 *
 * Examples:
 * - 5000000 → "5.0E+6"
 * - 5000000, 'c/v' → "5.0E+6 c/v"
 * - 1500000 → "1.5E+6"
 * - 320000000 → "3.2E+8"
 * - undefined → ""
 * - 0 → "0"
 */
export function formatConcentrationDisplay(
  value: number | undefined,
  unit?: ConcentrationUnit
): string {
  if (!value) return formatScientific(value);
  const scientific = formatScientific(value);
  return unit ? `${scientific} ${unit}` : scientific;
}
