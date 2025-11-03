/**
 * Researcher Types - Schema-First Approach
 *
 * Re-export types from schema definitions
 *
 * ARCHITECTURE NOTE:
 * - Researcher: Simple domain entity (profile data only)
 * - Profile types (CreateResearcherProfile, UpdateResearcherProfile) imported directly where needed
 */

export type {
  Researcher,
  ResearcherQueryFilters
} from '@odysseus/shared-schemas';
