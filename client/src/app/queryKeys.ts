/**
 * Query Keys for React Query
 *
 * Hierarchical query key structure for TanStack Query
 */

import type {
  TubeQueryFilters,
  ResearcherQueryFilters,
  SearchFilters,
  AdvancedSearchOptions,
} from '@odysseus/shared-schemas';

export const queryKeys = {
  // Authentication
  auth: {
    all: ['auth'] as const,
    verify: () => [...queryKeys.auth.all, 'verify'] as const,
    firstTime: () => [...queryKeys.auth.all, 'firstTime'] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    settings: () => [...queryKeys.users.all, 'settings'] as const,
    profile: () => [...queryKeys.users.all, 'profile'] as const,
    sessions: () => [...queryKeys.users.all, 'sessions'] as const,
    lookup: (userIds: string[]) => [...queryKeys.users.all, 'lookup', [...userIds].sort()] as const,
    list: () => [...queryKeys.users.all, 'list'] as const,
  },

  // Admin (admin-only operations)
  admin: {
    all: ['admin'] as const,
    users: () => [...queryKeys.admin.all, 'users'] as const,
  },

  // Tubes (unified)
  tubes: {
    all: ['tubes'] as const,
    list: (filters?: TubeQueryFilters) =>
      filters
        ? ([...queryKeys.tubes.all, 'list', filters] as const)
        : ([...queryKeys.tubes.all, 'list'] as const),
    lists: () => [...queryKeys.tubes.all, 'list'] as const, // Canonical base query
    detail: (id: string) => [...queryKeys.tubes.all, 'detail', id] as const,
    location: (tankId: string, rackId: string, boxId: string) =>
      [...queryKeys.tubes.all, 'location', tankId, rackId, boxId] as const,
    locationStats: (tankId: string, rackId: string) =>
      [...queryKeys.tubes.all, 'locationStats', tankId, rackId] as const,
    stats: () => [...queryKeys.tubes.all, 'stats'] as const,
    paginated: (filters?: TubeQueryFilters) =>
      [...queryKeys.tubes.all, 'paginated', filters] as const,
  },

  // Researchers (unified with socket bridge)
  researchers: {
    all: ['researchers'] as const,
    list: (filters?: ResearcherQueryFilters) =>
      filters
        ? ([...queryKeys.researchers.all, 'list', filters] as const)
        : ([...queryKeys.researchers.all, 'list'] as const),
    lists: () => [...queryKeys.researchers.all, 'list'] as const, // Canonical base query
    admin: (filters?: ResearcherQueryFilters) =>
      filters
        ? ([...queryKeys.researchers.all, 'admin', filters] as const)
        : ([...queryKeys.researchers.all, 'admin'] as const),
    detail: (id: string) => [...queryKeys.researchers.all, 'detail', id] as const,
    stats: () => [...queryKeys.researchers.all, 'stats'] as const,
  },

  // Search (expanded from distributed searchQueryKeys)
  search: {
    all: ['search'] as const,
    tubes: () => [...queryKeys.search.all, 'tubes'] as const,
    tubesSearch: (options: AdvancedSearchOptions) =>
      [...queryKeys.search.tubes(), 'search', options] as const,
    quickSearch: (query: string, limit?: number) =>
      [...queryKeys.search.tubes(), 'quick', query, limit] as const,
    fieldSearch: (field: string, value: string, options?: AdvancedSearchOptions) =>
      [...queryKeys.search.tubes(), 'field', field, value, options] as const,
    suggestions: (query: string, field?: string) =>
      [...queryKeys.search.all, 'suggestions', query, field] as const,
    savedSearches: () => [...queryKeys.search.all, 'saved'] as const,
    filterOptions: () => [...queryKeys.search.all, 'filter-options'] as const,
    // Legacy key for backward compatibility (used by useTubeQueries)
    results: (query: string, filters?: SearchFilters) =>
      [...queryKeys.search.all, 'results', query, filters] as const,
  },

  // Storage (migrated from distributed storageQueryKeys)
  storage: {
    all: ['storage'] as const,
    storage: () => [...queryKeys.storage.all, 'data'] as const,
    exists: () => [...queryKeys.storage.all, 'exists'] as const,
    positionDisplayPresets: () => [...queryKeys.storage.all, 'positionDisplayPresets'] as const,
  },
} as const;
