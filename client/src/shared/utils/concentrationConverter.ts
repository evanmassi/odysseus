/**
 * Enhanced concentration conversion utilities
 * Handles all scientific notation formats scientists use
 * 
 * ⚠️ DEPRECATED - Use utilities from @odysseus/shared-schemas instead
 * 
 * Phase 5 Migration:
 * - For display: Use formatConcentrationDisplay() from @odysseus/shared-schemas
 * - For parsing: Use parseConcentration() from @odysseus/shared-schemas
 * - For validation: Use Zod schema validation (concentrationPreprocessor)
 * 
 * This file kept for backward compatibility during migration.
 * Will be removed in future cleanup phase.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { formatToScientificNotation } from './scientificNotation';

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

/**
 * Convert concentration for storage (server expects number)
 */
export function concentrationForStorage(input: string | number | undefined): number | undefined {
  return normalizeConcentration(input);
}

/**
 * Convert concentration for display (consistent formatting)
 */
export function concentrationForDisplay(
  value: number | undefined, 
  unit?: 'c/v' | 'c/mL'
): string {
  if (value === undefined || value === null) return '';
  if (value === 0) return '0';
  
  const formatted = formatToScientificNotation(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Validate concentration input
 */
export function validateConcentrationInput(value: string | number | undefined): {
  isValid: boolean;
  normalized?: number;
  error?: string;
} {
  if (value === '' || value === undefined || value === null) {
    return { isValid: true }; // Optional field
  }
  
  const normalized = normalizeConcentration(value);
  
  if (normalized === undefined) {
    return {
      isValid: false,
      error: 'Invalid concentration format. Use numbers or scientific notation (e.g., 5e6, 1.5E+07)'
    };
  }
  
  if (normalized < 0) {
    return {
      isValid: false,
      error: 'Concentration cannot be negative'
    };
  }
  
  if (normalized > Number.MAX_SAFE_INTEGER) {
    return {
      isValid: false, 
      error: 'Concentration value too large'
    };
  }
  
  return {
    isValid: true,
    normalized
  };
}

/**
 * Type guard for concentration values
 */
export function isValidConcentration(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && value >= 0;
}

/**
 * Batch normalize concentrations (useful for import/migration)
 */
export function normalizeConcentrationBatch(
  values: Array<{ id: string; concentration?: string | number }>
): Array<{ id: string; concentration?: number; error?: string }> {
  return values.map(({ id, concentration }) => {
    const validation = validateConcentrationInput(concentration);
    
    return {
      id,
      concentration: validation.normalized,
      ...(validation.error && { error: validation.error })
    };
  });
}
