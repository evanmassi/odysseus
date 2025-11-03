/**
 * Public API for Researchers Domain
 *
 * Exports actively used components and services only.
 */

// Services
export { ResearcherService } from './services/ResearcherService';

// Types
export * from './types';

// React Query Hooks
export * from './hooks/useResearchersQuery';

// Schemas (re-exported from shared package for convenience)
export * from '@odysseus/shared-schemas';
