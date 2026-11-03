import { z } from 'zod';
import { tubeDataSchema, TUBE_SORT_FIELDS } from '../tubes/tubeSchemas';

const SearchFiltersSchema = z
  .object({
    // PITFALL: each location array is OR'd within itself (tankIds ['a','b'] means tank a or b).
    tankIds: z.array(z.string()).optional(),
    rackIds: z.array(z.string()).optional(),
    boxIds: z.array(z.string()).optional(),

    cellTypes: z.array(z.string()).optional(),
    species: z.array(z.string()).optional(),
    sources: z.array(z.string()).optional(),
    lotNumbers: z.array(z.string()).optional(),
    donorInternalIds: z.array(z.string()).optional(),
    donorSourceIds: z.array(z.string()).optional(),
    cultureConditions: z.array(z.string()).optional(),

    researcherIds: z.array(z.string()).optional(),

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
    grouped: z.array(GroupedResultSchema).optional(),
    matchedTerms: z.array(z.string()).optional(),
    pagination: SearchPaginationSchema.optional(),
    metadata: SearchMetadataSchema.optional(),
  })
  .strict();

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
// PITFALL: input shape; callers may omit limit/sortOrder because the schema fills defaults on parse.
export type AdvancedSearchOptions = z.input<typeof AdvancedSearchOptionsSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type GroupedResult = z.infer<typeof GroupedResultSchema>;
