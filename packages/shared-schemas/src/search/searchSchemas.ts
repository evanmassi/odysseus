/**
 * Search Domain Schemas
 *
 * Schemas for advanced search filters, options, and results.
 */

import { z } from 'zod';
import { tubeDataSchema, TUBE_SORT_FIELDS } from '../tubes/tubeSchemas';

const SearchFiltersSchema = z
  .object({
    // Location filters — arrays use OR logic (e.g. tankIds: ['a','b'] = tank a OR tank b)
    tankIds: z.array(z.string()).optional(),
    rackIds: z.array(z.string()).optional(),
    boxIds: z.array(z.string()).optional(),

    // Position filter (alphanumeric label like "C5" or numeric like "23")
    // NOTE: Position label is box-specific. Works best when filtering by a single box.
    positionLabel: z.string().optional(),

    // Sample filters (multiple selection)
    cellTypes: z.array(z.string()).optional(),
    species: z.array(z.string()).optional(),
    sources: z.array(z.string()).optional(),
    lotNumbers: z.array(z.string()).optional(),
    donorInternalIds: z.array(z.string()).optional(),
    donorSourceIds: z.array(z.string()).optional(),
    cultureConditions: z.array(z.string()).optional(),

    // Researcher filter (multiple selection)
    researcherIds: z.array(z.string()).optional(),

    // Date range filters (single values for from/to)
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  })
  .strict();

export const AdvancedSearchOptionsSchema = z
  .object({
    query: z.string().optional(),
    filters: SearchFiltersSchema.optional(),
    limit: z.number().min(1).max(1000).default(50),
    sortBy: z.enum(TUBE_SORT_FIELDS).optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

const SearchPaginationSchema = z
  .object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  })
  .strict();

const SearchMetadataSchema = z
  .object({
    query: z.string(),
    searchTime: z.number(),
    totalMatches: z.number(),
  })
  .strict();

const GroupedResultSchema = z
  .object({
    groupKey: z.string(),
    groupType: z.enum(['cellType', 'researcher', 'donor', 'lotNumber', 'media', 'batch']),
    tubes: z.array(tubeDataSchema),
    primaryLocation: z.string(),
    totalCount: z.number(),
  })
  .strict();

export const SearchResultSchema = z
  .object({
    data: z.array(tubeDataSchema),
    grouped: z.array(GroupedResultSchema).optional(), // Optional for backwards compatibility — server-side grouping
    matchedTerms: z.array(z.string()).optional(), // Terms for client-side highlighting (includes synonyms)
    pagination: SearchPaginationSchema.optional(),
    metadata: SearchMetadataSchema.optional(),
  })
  .strict();

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
// Input shape: callers may omit limit/sortOrder — the schema applies their defaults on parse.
export type AdvancedSearchOptions = z.input<typeof AdvancedSearchOptionsSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type GroupedResult = z.infer<typeof GroupedResultSchema>;
