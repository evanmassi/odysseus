/**
 * Tube Display Formatters
 *
 * Presentation-only utility for formatting tube concentration values in scientific notation for UI components.
 */

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
  if (value === undefined || value === null) return '';
  if (value === 0) return '0';

  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / Math.pow(10, exponent);

  // Two decimal places to distinguish close values (e.g. 4.90E+6 vs 4.92E+6)
  const mantissaFormatted = mantissa.toFixed(2);
  const exponentFormatted = exponent >= 0 ? `+${exponent}` : `${exponent}`;
  const scientificNotation = `${mantissaFormatted}E${exponentFormatted}`;

  return unit ? `${scientificNotation} ${unit}` : scientificNotation;
}
