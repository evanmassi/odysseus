import { z } from 'zod';
import { tubeDataSchema } from '../tubes/tubeSchemas';

/**
 * Search Filters Schema - Multiple Selection Support
 *
 * All filter fields use arrays to support multiple selections (OR logic).
 * For example: tankIds: ['tank1', 'tank2'] means "show tubes in tank1 OR tank2"
 *
 * Date range filters use single values (from/to).
 */
export const SearchFiltersSchema = z.object({
  // Location filters (multiple selection)
  tankIds: z.array(z.string()).optional(),
  rackIds: z.array(z.string()).optional(),
  boxIds: z.array(z.string()).optional(),

  // Position filter (alphanumeric label like "C5" or numeric like "23")
  // NOTE: Position label is box-specific. Works best when filtering by a single box.
  positionLabel: z.string().optional(),

  // Sample filters (multiple selection)
  cellTypes: z.array(z.string()).optional(),
  lotNumbers: z.array(z.string()).optional(),
  donorInternalIds: z.array(z.string()).optional(),
  donorSourceIds: z.array(z.string()).optional(),
  cultureConditions: z.array(z.string()).optional(),

  // Researcher filter (multiple selection)
  researcherIds: z.array(z.string()).optional(),

  // Date range filters (single values for from/to)
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
}).strict();

/**
 * Search Options Schema
 */
export const AdvancedSearchOptionsSchema = z.object({
  query: z.string().optional(),
  filters: SearchFiltersSchema.optional(),
  limit: z.number().min(1).max(1000).default(50).optional(),
  offset: z.number().min(0).default(0).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
}).strict();

/**
 * Search Result Pagination Schema
 */
export const SearchPaginationSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  hasMore: z.boolean(),
}).strict();

/**
 * Search Result Metadata Schema
 */
export const SearchMetadataSchema = z.object({
  query: z.string(),
  searchTime: z.number(),
  totalMatches: z.number(),
}).strict();

/**
 * Grouped Search Result Schema
 */
export const GroupedResultSchema = z.object({
  groupKey: z.string(),
  groupType: z.enum(['cellType', 'researcher', 'donor', 'lotNumber', 'media', 'batch']),
  tubes: z.array(tubeDataSchema),
  primaryLocation: z.string(),
  totalCount: z.number(),
}).strict();

/**
 * Search Result Base Schema (pure domain type)
 * Progressive enhancement: grouped field is optional for backwards compatibility
 */
export const SearchResultSchema = z.object({
  data: z.array(tubeDataSchema),
  grouped: z.array(GroupedResultSchema).optional(), // Server-side grouping (progressive enhancement)
  matchedTerms: z.array(z.string()).optional(), // Terms for client-side highlighting (includes synonyms)
  pagination: SearchPaginationSchema.optional(),
  metadata: SearchMetadataSchema.optional(),
}).strict();

/**
 * Search Results Schema (UI)
 */
export const SearchResultsSchema = z.object({
  tubes: z.array(tubeDataSchema),
  grouped: z.array(GroupedResultSchema),
  matchedTerms: z.array(z.string()).optional(), // Terms for client-side highlighting (includes synonyms)
  total: z.number(),
  query: z.string(),
  hasResults: z.boolean(),
}).strict();

/**
 * Search Suggestions Response Schema (pure domain type)
 */
export const SearchSuggestionsResponseSchema = z.object({
  suggestions: z.array(z.string()),
}).strict();

/**
 * Save Search Response Schema (pure domain type)
 */
export const SaveSearchResponseSchema = z.object({
  searchId: z.string(),
}).strict();

/**
 * Saved Search Schema
 */
export const SavedSearchSchema = z.object({
  id: z.string(),
  name: z.string(),
  searchOptions: AdvancedSearchOptionsSchema,
  createdAt: z.string(),
}).strict();

/**
 * Saved Searches Response Schema (pure domain type)
 */
export const SavedSearchesResponseSchema = z.object({
  searches: z.array(SavedSearchSchema),
}).strict();

/**
 * Filter Options Response Schema (pure domain type)
 */
export const FilterOptionsResponseSchema = z.object({
  options: z.object({
    cellTypes: z.array(z.string()),
    researchers: z.array(z.string()),
    mediaTypes: z.array(z.string()),
    cultureConditions: z.array(z.string()),
    rackIds: z.array(z.string()),
    boxIds: z.array(z.string()),
  }),
}).strict();

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
export type AdvancedSearchOptions = z.infer<typeof AdvancedSearchOptionsSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type GroupedResult = z.infer<typeof GroupedResultSchema>;
export type SearchResults = z.infer<typeof SearchResultsSchema>;
export type SearchSuggestionsResponse = z.infer<typeof SearchSuggestionsResponseSchema>;
export type SaveSearchResponse = z.infer<typeof SaveSearchResponseSchema>;
export type SavedSearch = z.infer<typeof SavedSearchSchema>;
export type SavedSearchesResponse = z.infer<typeof SavedSearchesResponseSchema>;
export type FilterOptionsResponse = z.infer<typeof FilterOptionsResponseSchema>;
