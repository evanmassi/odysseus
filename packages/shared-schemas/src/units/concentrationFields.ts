/**
 * Concentration Field Validation
 *
 * Zod preprocessors that parse flexible concentration input (scientific, suffix,
 * and caret notation) and enforce the both-or-neither concentration+unit rule.
 * Shared by tube and reagent schemas.
 */

import { z } from 'zod';

const SUFFIX_MULTIPLIERS: Record<string, number> = {
  k: 1e3,
  K: 1e3,
  m: 1e6,
  M: 1e6,
  b: 1e9,
  B: 1e9,
  t: 1e12,
  T: 1e12,
};

type ConcentrationParseResult =
  | { success: true; value: number }
  | { success: true; value: undefined } // Empty input (valid for optional field)
  | { success: false; error: string };

/**
 * Parses flexible concentration input into a number. Accepts plain numbers,
 * separators, e-notation (5e6), caret notation (1.5x10^6), and K/M/B/T suffixes.
 * Empty input resolves to undefined; malformed input to a descriptive error.
 */
function parseConcentrationInput(value: unknown): ConcentrationParseResult {
  if (value === undefined || value === null || value === '') {
    return { success: true, value: undefined };
  }

  // Zero is valid (but will fail positive check later)
  if (value === 0 || value === '0') {
    return { success: true, value: 0 };
  }

  if (typeof value === 'number') {
    if (Number.isFinite(value)) {
      return { success: true, value };
    }
    return { success: false, error: 'Invalid number value' };
  }

  const str = String(value).trim();
  if (!str) {
    return { success: true, value: undefined };
  }

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
    return {
      success: false,
      error: 'Invalid suffix. Use K (thousand), M (million), B (billion), or T (trillion)',
    };
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

  if (/\^/.test(cleaned)) {
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

  return { success: false, error: 'Invalid concentration value' };
}

/**
 * Concentration for CREATE requests: empty → undefined, valid → positive number,
 * malformed → validation error.
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
  .pipe(z.number().positive('Concentration must be positive').optional());

/**
 * Concentration for UPDATE requests (PATCH semantics): null/empty → null (clear),
 * undefined → undefined (no change), value → positive number, malformed → error.
 */
export const concentrationPreprocessorNullable = z
  .unknown()
  .transform((val, ctx) => {
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
  .pipe(z.number().positive('Concentration must be positive').nullable().optional());

/**
 * Business rule: concentration and unit must both be present or both absent.
 */
export const concentrationUnitRefinement = <
  T extends {
    concentration?: number | null;
    concentrationUnit?: string | null;
  },
>(
  schema: z.ZodType<T>
) =>
  schema.superRefine((data, ctx) => {
    const hasConcentration = data.concentration !== undefined && data.concentration !== null;
    const hasUnit = data.concentrationUnit !== undefined && data.concentrationUnit !== null;

    if ((hasConcentration && hasUnit) || (!hasConcentration && !hasUnit)) {
      return;
    }

    if (hasUnit && !hasConcentration) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Missing concentration value',
        path: ['concentration'],
      });
    } else {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Missing concentration unit',
        path: ['concentrationUnit'],
      });
    }
  });
