/**
 * Public API for Researchers Domain
 *
 * Exports actively used components and services only.
 */

// Services
export { ResearcherService } from './services/ResearcherService';

// Types (already includes Researcher and ResearcherQueryFilters from @odysseus/shared-schemas)
export * from './types';

// React Query Hooks
export * from './hooks/useResearchersQuery';
