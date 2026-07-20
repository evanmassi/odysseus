/**
 * Tubes Domain Types
 *
 * Local domain types and re-exports from shared schemas.
 */

export type LockVariant = 'own' | 'shared' | 'admin-override' | 'other';

export * from './bulkUpdateTypes';
export * from './clipboardTypes';
export * from './gridSelectionTypes';

export type { TubeData, CreateTubeRequest, UpdateTubeRequest } from '@odysseus/shared-schemas';
