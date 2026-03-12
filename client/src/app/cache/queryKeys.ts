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
  LookupCategory,
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
    presence: () => [...queryKeys.users.all, 'presence'] as const,
  },

  // Admin
  admin: {
    all: ['admin'] as const,
    users: () => [...queryKeys.admin.all, 'users'] as const,
  },

  // Tubes
  tubes: {
    all: ['tubes'] as const,
    list: (filters?: TubeQueryFilters) =>
      filters
        ? ([...queryKeys.tubes.all, 'list', filters] as const)
        : ([...queryKeys.tubes.all, 'list'] as const),
    listAll: () => [...queryKeys.tubes.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.tubes.all, 'detail', id] as const,
    location: (tankId: string, rackId: string, boxId: string) =>
      [...queryKeys.tubes.all, 'location', tankId, rackId, boxId] as const,
    locationStats: (tankId: string, rackId: string) =>
      [...queryKeys.tubes.all, 'locationStats', tankId, rackId] as const,
    stats: () => [...queryKeys.tubes.all, 'stats'] as const,
    bulk: (tubeIds: string[]) =>
      [
        ...queryKeys.tubes.all,
        'bulk',
        { tubeIds: [...tubeIds].sort(), length: tubeIds.length },
      ] as const,
    paginated: (filters?: TubeQueryFilters) =>
      [...queryKeys.tubes.all, 'paginated', filters] as const,
  },

  // Researchers
  researchers: {
    all: ['researchers'] as const,
    list: (filters?: ResearcherQueryFilters) =>
      filters
        ? ([...queryKeys.researchers.all, 'list', filters] as const)
        : ([...queryKeys.researchers.all, 'list'] as const),
    visible: () => [...queryKeys.researchers.all, 'visible'] as const, // Approved + active only
    admin: (filters?: ResearcherQueryFilters) =>
      filters
        ? ([...queryKeys.researchers.all, 'admin', filters] as const)
        : ([...queryKeys.researchers.all, 'admin'] as const),
    detail: (id: string) => [...queryKeys.researchers.all, 'detail', id] as const,
    stats: () => [...queryKeys.researchers.all, 'stats'] as const,
  },

  // Search
  search: {
    all: ['search'] as const,
    tubes: () => [...queryKeys.search.all, 'tubes'] as const,
    tubesSearch: (options: AdvancedSearchOptions) =>
      [...queryKeys.search.tubes(), 'search', options] as const,
    quickSearch: (query: string, limit?: number) =>
      [...queryKeys.search.tubes(), 'quick', query, limit] as const,
    fieldSearch: (field: string, value: string, options?: AdvancedSearchOptions) =>
      [...queryKeys.search.tubes(), 'field', field, value, options] as const,
    results: (query: string, filters?: SearchFilters) =>
      [...queryKeys.search.all, 'results', query, filters] as const,
  },

  // Lookups
  lookups: {
    all: ['lookups'] as const,
    byCategory: (category: LookupCategory) => ['lookups', category] as const,
  },

  // Labs
  labs: {
    all: ['labs'] as const,
    list: () => [...queryKeys.labs.all, 'list'] as const,
    labDetails: (labId: string) => [...queryKeys.labs.all, 'labDetails', labId] as const,
    overview: () => [...queryKeys.labs.all, 'overview'] as const,
    demoLimits: (labId: string) => [...queryKeys.labs.all, 'demoLimits', labId] as const,
    audit: (labId: string) => [...queryKeys.labs.all, 'audit', labId] as const,
  },

  // Invite Codes
  inviteCodes: {
    all: ['inviteCodes'] as const,
    currentLab: () => [...queryKeys.inviteCodes.all, 'currentLab'] as const,
    byLab: (labId: string) => [...queryKeys.inviteCodes.all, 'byLab', labId] as const,
  },

  // Storage
  storage: {
    all: ['storage'] as const,
    data: () => [...queryKeys.storage.all, 'data'] as const,
    exists: () => [...queryKeys.storage.all, 'exists'] as const,
    positionDisplayPresets: () => [...queryKeys.storage.all, 'positionDisplayPresets'] as const,
  },
} as const;
