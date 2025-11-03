/**
 * Researcher Hooks Barrel Export
 *
 * Clean barrel exports for all researcher-related React Query hooks.
 * Provides a single import point for all researcher domain functionality.
 *
 * ARCHITECTURE: Immediate operations pattern only
 * - No batch operations (removed as unused tech debt)
 * - Single create/update/delete operations
 * - If CSV import needed in future, rebuild batch operations properly
 */

export {
  useResearchersQuery,
  useResearcherQuery,
  useCreateResearcherMutation,
  useUpdateResearcherMutation,
  useDeleteResearcherMutation,
  useActiveResearchersQuery
} from './useResearchersQuery';
