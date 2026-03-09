/**
 * Concentration Value Parser
 *
 * Normalizes concentration values from various numeric and scientific notation formats.
 */

export function normalizeConcentration(value: string | number | undefined): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;

  if (value === 0 || value === '0') return 0;

  if (typeof value === 'number') {
    return isNaN(value) ? undefined : value;
  }

  const stringValue = String(value).trim();
  if (!stringValue) return undefined;

  const cleanValue = stringValue.replace(/[,\s]/g, '');

  const match = cleanValue.match(/^(\d*\.?\d+)[eE]([+-]?\d+)$/);
  if (match) {
    const mantissa = parseFloat(match[1]);
    const exponent = parseInt(match[2]);

    if (!isNaN(mantissa) && !isNaN(exponent)) {
      return mantissa * Math.pow(10, exponent);
    }
  }

  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? undefined : parsed;
}
