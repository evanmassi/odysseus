/**
 * Shared Date Field Helpers
 *
 * Zod primitives for response schema date fields. Coerce ISO strings to Date objects
 * at parse time so the transformer registry and URL routing table are unnecessary.
 */

import { z } from 'zod';

/** Accepts ISO string or Date, always outputs Date */
export const dateField = z.coerce.date();

/** Optional date — undefined passes, strings/Dates coerced */
export const optionalDateField = z.coerce.date().optional();

/** Nullable date — null stays null, strings/Dates coerced. Uses z.null().or() because z.coerce.date().nullable() turns null into epoch. */
export const nullableDateField = z.null().or(z.coerce.date());
