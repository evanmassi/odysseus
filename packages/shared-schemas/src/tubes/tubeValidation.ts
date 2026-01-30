/**
 * Tube Validation Utilities
 *
 * Parsing and preprocessing for tube data:
 * - Concentration parser handles all scientific notation formats
 * - Zod preprocessors normalize data at API boundaries
 */

import { z } from 'zod';
import { CONCENTRATION_UNITS, type ConcentrationUnit } from './tubeSchemas';

// Concentration Parsing

/**
 * Suffix multipliers for common abbreviations
 */
const SUFFIX_MULTIPLIERS: Record<string, number> = {
  'k': 1e3,
  'K': 1e3,
  'm': 1e6,
  'M': 1e6,
  'b': 1e9,
  'B': 1e9,
  't': 1e12,
  'T': 1e12,
};

/**
 * Concentration parse result - discriminated union for proper error handling
 */
type ConcentrationParseResult =
  | { success: true; value: number }
  | { success: true; value: undefined }  // Empty input (valid for optional field)
  | { success: false; error: string };

/**
 * Comprehensive Concentration Parser
 *
 * Accepts flexible input formats:
 * - Plain numbers: 5000000
 * - With separators: 5,000,000 | 5 000 000 | 5_000_000
 * - E-notation: 5e6, 1.5E+6, 3.2e-8
 * - Caret notation: 10^6, 1.5x10^6, 1.5*10^6
 * - Suffixes: 5M, 1.5K, 2B, 3T
 *
 * Returns discriminated union:
 * - { success: true, value: number } for valid input
 * - { success: true, value: undefined } for empty input (optional field)
 * - { success: false, error: string } for malformed input
 */
export function parseConcentrationInput(value: unknown): ConcentrationParseResult {
  // Handle null/undefined/empty
  if (value === undefined || value === null || value === '') {
    return { success: true, value: undefined };
  }

  // Zero is valid (but will fail positive check later)
  if (value === 0 || value === '0') {
    return { success: true, value: 0 };
  }

  // Already a number - validate and return
  if (typeof value === 'number') {
    if (Number.isFinite(value)) {
      return { success: true, value };
    }
    return { success: false, error: 'Invalid number value' };
  }

  // String processing
  const str = String(value).trim();
  if (!str) {
    return { success: true, value: undefined };
  }

  // Clean input: remove separators (commas, spaces, underscores)
  const cleaned = str.replace(/[,\s_]/g, '');
  if (!cleaned) {
    return { success: true, value: undefined };
  }

  // 1. Check for e-notation FIRST (before suffix check, since 'e' could be confused)
  // This ensures "1e" is caught as incomplete scientific notation, not invalid suffix
  if (/[eE]/.test(cleaned)) {
    const eNotationRegex = /^([+-]?\d*\.?\d+)[eE]([+-]?\d+)$/;
    const eMatch = cleaned.match(eNotationRegex);

    if (eMatch) {
      const mantissa = parseFloat(eMatch[1]);
      const exponent = parseInt(eMatch[2], 10);

      if (Number.isFinite(mantissa) && Number.isFinite(exponent)) {
        return { success: true, value: mantissa * Math.pow(10, exponent) };
      }
      return { success: false, error: 'Invalid scientific notation' };
    }

    // Has 'e' or 'E' but didn't match valid pattern
    if (/[eE]$/.test(cleaned) || /[eE][+-]$/.test(cleaned)) {
      return { success: false, error: 'Incomplete scientific notation (e.g., use 1.5e6)' };
    }
    return { success: false, error: 'Invalid scientific notation format' };
  }

  // 2. Check for suffix notation: 5M, 1.5K, 2B, 3T
  const suffixMatch = cleaned.match(/^([+-]?\d*\.?\d+)([kKmMbBtT])$/);
  if (suffixMatch) {
    const base = parseFloat(suffixMatch[1]);
    const suffix = suffixMatch[2];
    const multiplier = SUFFIX_MULTIPLIERS[suffix];

    if (Number.isFinite(base) && multiplier) {
      return { success: true, value: base * multiplier };
    }
    return { success: false, error: 'Invalid suffix notation' };
  }

  // Check for incomplete suffix (e.g., "5z" - number followed by invalid letter)
  // Only flag if it looks like they're trying to use a suffix
  if (/^\d+\.?\d*[a-zA-Z]$/.test(cleaned) && !/^[+-]?\d*\.?\d+[kKmMbBtT]$/.test(cleaned)) {
    return { success: false, error: 'Invalid suffix. Use K (thousand), M (million), B (billion), or T (trillion)' };
  }

  // 3. Check for caret notation: 10^6, 1.5x10^6, 1.5*10^6, 1.5×10^6
  // Pattern: optional mantissa with x/* multiplier, then 10^exponent
  const caretWithMantissaMatch = cleaned.match(/^([+-]?\d*\.?\d+)[xX*×]10\^([+-]?\d+)$/);
  if (caretWithMantissaMatch) {
    const mantissa = parseFloat(caretWithMantissaMatch[1]);
    const exponent = parseInt(caretWithMantissaMatch[2], 10);

    if (Number.isFinite(mantissa) && Number.isFinite(exponent)) {
      return { success: true, value: mantissa * Math.pow(10, exponent) };
    }
    return { success: false, error: 'Invalid caret notation' };
  }

  // Pattern: just 10^exponent (implies mantissa of 1)
  const caretOnlyMatch = cleaned.match(/^10\^([+-]?\d+)$/);
  if (caretOnlyMatch) {
    const exponent = parseInt(caretOnlyMatch[1], 10);

    if (Number.isFinite(exponent)) {
      return { success: true, value: Math.pow(10, exponent) };
    }
    return { success: false, error: 'Invalid caret notation' };
  }

  // Check for incomplete caret notation
  if (/\^/.test(cleaned)) {
    // Has caret but didn't match valid patterns
    if (/10\^$/.test(cleaned) || /[xX*×]10\^$/.test(cleaned)) {
      return { success: false, error: 'Incomplete caret notation (e.g., use 1.5x10^6)' };
    }
    return { success: false, error: 'Invalid caret notation format (e.g., use 10^6 or 1.5x10^6)' };
  }

  // 4. Plain number (no exponent, no suffix)
  const num = Number(cleaned);
  if (Number.isFinite(num)) {
    return { success: true, value: num };
  }

  // If we got here, it's invalid
  return { success: false, error: 'Invalid concentration value' };
}


// ZOD SCHEMAS (with validation and transformation)

/**
 * Concentration schema for CREATE operations
 *
 * Uses transform with ctx.addIssue() for proper error messages:
 * - Empty input → undefined (valid optional field)
 * - Valid input → number
 * - Invalid input → validation error with helpful message
 */
export const concentrationPreprocessor = z
  .unknown()
  .transform((val, ctx) => {
    const result = parseConcentrationInput(val);

    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error,
      });
      return z.NEVER;
    }

    return result.value;
  })
  .pipe(
    z.number().positive('Concentration must be positive').optional()
  );

/**
 * Concentration schema for UPDATE operations (PATCH semantics)
 * - null → null (clear field)
 * - empty string → null (clear field, consistent with unit field)
 * - undefined → undefined (no change)
 * - value → number (set/update)
 * - invalid → validation error
 */
export const concentrationPreprocessorNullable = z
  .unknown()
  .transform((val, ctx) => {
    // Preserve null for clearing
    if (val === null) return null;
    // Empty string = clear (consistent with nullableOptionalFromEmpty for unit)
    if (val === '' || (typeof val === 'string' && val.trim() === '')) return null;
    // Undefined = no change (field not included in update)
    if (val === undefined) return undefined;

    const result = parseConcentrationInput(val);

    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error,
      });
      return z.NEVER;
    }

    return result.value;
  })
  .pipe(
    z.number().positive('Concentration must be positive').nullable().optional()
  );

// DATE PREPROCESSING (HTML5 Date Input → YYYY-MM-DD)

/**
 * Date Parser - converts Date objects to YYYY-MM-DD strings
 *
 * Handles HTML5 date input values (Date objects) and converts to schema-compliant strings
 *
 * Accepts:
 * - Date objects from HTML5 <input type="date">
 * - YYYY-MM-DD strings (already valid)
 * - ISO datetime strings
 * - Empty strings (→ undefined)
 *
 * Returns: string (YYYY-MM-DD) | undefined
 */
export function parseDate(value: unknown): string | undefined {
  // Handle null/undefined/empty
  if (value === undefined || value === null || value === '') return undefined;

  // Already a YYYY-MM-DD string - return as-is
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    // Valid YYYY-MM-DD format - return directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    // ISO datetime string - extract date part
    if (trimmed.includes('T') || trimmed.includes('Z')) {
      try {
        const date = new Date(trimmed);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch {
        return undefined;
      }
    }

    return trimmed; // Let Zod validate format
  }

  // Date object from HTML5 input - convert to YYYY-MM-DD
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return undefined;
    return value.toISOString().split('T')[0];
  }

  return undefined;
}

/**
 * Date preprocessor for CREATE operations
 * Converts Date objects and various string formats to YYYY-MM-DD
 */
export const datePreprocessor = z.preprocess(
  (val) => parseDate(val),
  z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
    z.string().datetime('Invalid date format')
  ]).optional()
);

/**
 * Date preprocessor for UPDATE operations (PATCH semantics)
 * - null → null (clear field)
 * - empty → undefined (no change)
 * - Date/string → YYYY-MM-DD string (set/update)
 */
export const datePreprocessorNullable = z.preprocess(
  (val) => {
    if (val === null) return null; // Preserve null for tri-state PATCH
    return parseDate(val);
  },
  z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
    z.string().datetime('Invalid date format')
  ]).nullable().optional()
);

/**
 * Generic helper: make schema optional and normalize empty strings
 * Use for: HTML form fields that can be left blank
 */
export const optionalFromEmpty = <S extends z.ZodTypeAny>(schema: S) =>
  z.preprocess(
    (val) => {
      if (val === undefined || val === null) return undefined;
      if (typeof val === 'string' && val.trim() === '') return undefined;
      return val;
    },
    schema.optional()
  );

/**
 * Generic helper: make schema nullable + optional, normalize empty strings
 * Preserves null for tri-state PATCH semantics
 */
export const nullableOptionalFromEmpty = <S extends z.ZodTypeAny>(schema: S) =>
  z.preprocess(
    (val) => {
      if (val === null) return null; // Preserve null for clearing field
      if (val === undefined) return undefined;
      if (typeof val === 'string' && val.trim() === '') return null; // Convert empty strings to null for tri-state PATCH
      return val;
    },
    schema.nullable().optional()
  );

/**
 * Validates concentration + unit invariant
 * Business Rule: Both must be present OR both must be absent
 * 
 * @param concentration - Cell concentration value
 * @param unit - Concentration unit (c/v or c/mL)
 * @returns true if valid, false if violates invariant
 */
export function validateConcentrationUnit(
  concentration: number | undefined | null,
  unit: ConcentrationUnit | undefined | null
): boolean {
  const hasConcentration = concentration !== undefined && concentration !== null;
  const hasUnit = unit !== undefined && unit !== null;
  
  // Both present OR both absent
  return (hasConcentration && hasUnit) || (!hasConcentration && !hasUnit);
}

/**
 * Zod refinement for concentration + unit invariant
 * Apply to sample schemas to enforce business rule
 */
export const concentrationUnitRefinement = <T extends {
  concentration?: number | null;
  concentrationUnit?: ConcentrationUnit | null;
}>(schema: z.ZodType<T>) =>
  schema.superRefine((data, ctx) => {
    const hasConcentration = data.concentration !== undefined && data.concentration !== null;
    const hasUnit = data.concentrationUnit !== undefined && data.concentrationUnit !== null;

    // Validation passes if both present or both absent
    if (validateConcentrationUnit(data.concentration, data.concentrationUnit)) {
      return;
    }

    // Determine which field is missing and provide appropriate error
    if (hasUnit && !hasConcentration) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Missing concentration value',
        path: ['concentration']
      });
    } else {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Missing concentration unit',
        path: ['concentrationUnit']
      });
    }
  });
