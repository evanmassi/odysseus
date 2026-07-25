/**
 * Document Type Vocabulary
 *
 * Shared classification for catalog document attachments, applied additively
 * across equipment, supply, and reagent documents so the three stay in sync.
 */

import { z } from 'zod';

export const DOCUMENT_TYPE_VALUES = ['sds', 'spec_sheet', 'coa', 'protocol', 'other'] as const;
export const documentTypeSchema = z.enum(DOCUMENT_TYPE_VALUES);
export type DocumentType = z.infer<typeof documentTypeSchema>;
