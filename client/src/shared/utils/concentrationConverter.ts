/**
 * Concentration parsing utility for scientific notation formats
 */

/**
 * Comprehensive concentration parser supporting all common scientific formats:
 * - 5e6, 5E6, 5.0e6, 5.0E6
 * - 5e+6, 5E+6, 5.0e+6, 5.0E+6
 * - 5e06, 5E06, 5.0e06, 5.0E06
 * - 5000000 (regular numbers)
 * - "5e6" (string formats)
 */
export function normalizeConcentration(value: string | number | undefined): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;

  // Handle zero explicitly
  if (value === 0 || value === '0') return 0;

  // If already a number, validate and return
  if (typeof value === 'number') {
    return isNaN(value) ? undefined : value;
  }

  // Handle string input
  const stringValue = String(value).trim();
  if (!stringValue) return undefined;

  // Remove commas and spaces that might be in user input
  const cleanValue = stringValue.replace(/[,\s]/g, '');

  // Handle scientific notation patterns
  const scientificPatterns = [
    /^(\d*\.?\d+)[eE]([+-]?\d+)$/, // Standard: 5e6, 5.0E+06
    /^(\d*\.?\d+)[eE]([+-]?0*\d+)$/, // With leading zeros: 5e06
  ];

  for (const pattern of scientificPatterns) {
    const match = cleanValue.match(pattern);
    if (match) {
      const mantissa = parseFloat(match[1]);
      const exponent = parseInt(match[2]);

      if (!isNaN(mantissa) && !isNaN(exponent)) {
        return mantissa * Math.pow(10, exponent);
      }
    }
  }

  // Fallback to regular number parsing
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? undefined : parsed;
}
