import { z } from 'zod';

import { parseNumberInput } from './numberInput';

export const concentrationPreprocessor = z
  .unknown()
  .transform((val, ctx) => {
    const result = parseNumberInput(val);

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

export const concentrationPreprocessorNullable = z
  .unknown()
  .transform((val, ctx) => {
    if (val === null) return null;
    if (val === '' || (typeof val === 'string' && val.trim() === '')) return null;
    if (val === undefined) return undefined;

    const result = parseNumberInput(val);

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
