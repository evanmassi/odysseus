/**
 * Shared Text Field Helpers
 *
 * Zod primitives for optional text input. Normalizing blank-as-absent at the
 * schema boundary keeps services from re-deciding it field by field.
 */

import { z } from 'zod';

const trimmed = (max?: number) =>
  max === undefined ? z.string().trim() : z.string().trim().max(max);

/**
 * Optional text: trims, and blank becomes undefined (field absent). For create requests.
 * `.optional()` stays outermost so the object key remains optional after the transform.
 */
export const optionalText = (max?: number) =>
  trimmed(max)
    .transform(value => (value === '' ? undefined : value))
    .optional();

/**
 * Patchable text: trims; blank becomes null (clear the field), absent stays
 * undefined (leave unchanged). For update requests where null is the clear signal.
 * `.nullish()` stays outermost so the object key remains optional after the transform.
 */
export const patchText = (max?: number) =>
  trimmed(max)
    .transform(value => (value === '' ? null : value))
    .nullish();
