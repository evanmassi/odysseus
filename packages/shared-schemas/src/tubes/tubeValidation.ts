/**
 * Tube Validation Utilities
 *
 * Single source of truth for parsing and preprocessing:
 * - Concentration parser handles all scientific notation formats
 * - Zod preprocessors normalize data at API boundaries
 * - Pure data transformation, no business logic
 */

import { z } from 'zod';
import { CONCENTRATION_UNITS, type ConcentrationUnit } from './tubeSchemas';

/**
 * Scientific Notation Parser
 * 
 * Accepts ALL valid scientific formats:
 * - Standard: 5e6, 1.5E7, 3.2e+8, 5E-3
 * - With leading zeros: 5e06, 1.5E+07
 * - Regular numbers: 5000000, 1500000
 * - String formats: "5e6", "1.5E7"
 * 
 * Returns: number | undefined
 * - undefined for invalid/empty input (not an error - optional field)
 * 
 * Design: Strict regex validation BEFORE parsing
 * - Rejects malformed input (5e6xxx → undefined, not 5000000)
 * - No silent data loss via parseFloat
 */
export function parseConcentration(value: unknown): number | undefined {
  // Handle null/undefined/empty
  if (value === undefined || value === null || value === '') return undefined;
  
  // Zero is valid
  if (value === 0 || value === '0') return 0;
  
  // Already a number - validate and return
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  
  // String processing
  const str = String(value).trim();
  if (!str) return undefined;
  
  // Clean input: remove commas and spaces (user convenience)
  const cleaned = str.replace(/[,\s]/g, '');
  
  // Scientific notation regex: matches 5e6, 1.5E+7, 3.2e-8, etc.
  const scientificRegex = /^([+-]?\d*\.?\d+)[eE]([+-]?\d+)$/;
  const match = cleaned.match(scientificRegex);
  
  if (match) {
    const mantissa = parseFloat(match[1]);
    const exponent = parseInt(match[2], 10);
    
    if (Number.isFinite(mantissa) && Number.isFinite(exponent)) {
      return mantissa * Math.pow(10, exponent);
    }
    return undefined; // Invalid scientific notation
  }
  
  // Regular number (no exponent)
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : undefined;
}

// ZOD PREPROCESSORS (Boundary Normalization)

/**
 * Concentration preprocessor for CREATE operations
 * Empty input → undefined (optional field)
 */
export const concentrationPreprocessor = z.preprocess(
  (val) => parseConcentration(val),
  z.number().positive('Concentration must be positive').optional()
);

/**
 * Concentration preprocessor for UPDATE operations (PATCH semantics)
 * - null → null (clear field)
 * - empty → undefined (no change)
 * - value → number (set/update)
 */
export const concentrationPreprocessorNullable = z.preprocess(
  (val) => {
    if (val === null) return null; // Preserve null for tri-state PATCH
    return parseConcentration(val);
  },
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
