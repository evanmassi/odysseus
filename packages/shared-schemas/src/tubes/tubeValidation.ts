/**
 * Tube Validation Utilities
 *
 * Date parsers with Zod preprocessors for normalizing form data at API boundaries.
 */

import { z } from 'zod';

// DATE PREPROCESSING (HTML5 Date Input → YYYY-MM-DD)

/**
 * Date Parser - converts Date objects to YYYY-MM-DD strings
 *
 * Accepts:
 * - Date objects from HTML5 <input type="date">
 * - YYYY-MM-DD strings (already valid)
 * - ISO datetime strings
 * - Empty strings (→ undefined)
 */
export function parseDate(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

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
  val => parseDate(val),
  z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
      z.string().datetime('Invalid date format'),
    ])
    .optional()
);

/**
 * Date preprocessor for UPDATE operations (PATCH semantics)
 * - null → null (clear field)
 * - empty → undefined (no change)
 * - Date/string → YYYY-MM-DD string (set/update)
 */
export const datePreprocessorNullable = z.preprocess(
  val => {
    if (val === null) return null; // Preserve null for tri-state PATCH
    return parseDate(val);
  },
  z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
      z.string().datetime('Invalid date format'),
    ])
    .nullable()
    .optional()
);

/**
 * Generic helper: make schema optional and normalize empty strings
 * Use for: HTML form fields that can be left blank
 */
export const optionalFromEmpty = <S extends z.ZodTypeAny>(schema: S) =>
  z.preprocess(val => {
    if (val === undefined || val === null) return undefined;
    if (typeof val === 'string' && val.trim() === '') return undefined;
    return val;
  }, schema.optional());

/**
 * Generic helper: make schema nullable + optional, normalize empty strings
 * Preserves null for tri-state PATCH semantics
 */
export const nullableOptionalFromEmpty = <S extends z.ZodTypeAny>(schema: S) =>
  z.preprocess(val => {
    if (val === null) return null;
    if (val === undefined) return undefined;
    if (typeof val === 'string' && val.trim() === '') return null; // Convert empty strings to null for tri-state PATCH
    return val;
  }, schema.nullable().optional());
