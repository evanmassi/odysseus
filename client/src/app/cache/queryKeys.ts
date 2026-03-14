/**
 * Query Keys for React Query
 *
 * Hierarchical query key structure for TanStack Query.
 * Lab-scoped domains include labId for cache partitioning between tenants.
 */

import type {
  TubeQueryFilters,
  ResearcherQueryFilters,
  SearchFilters,
  AdvancedSearchOptions,
  LookupCategory,
} from '@odysseus/shared-schemas';

export const queryKeys = {
  // Authentication (not lab-scoped)
  auth: {
    all: ['auth'] as const,
    verify: () => [...queryKeys.auth.all, 'verify'] as const,
    firstTime: () => [...queryKeys.auth.all, 'firstTime'] as const,
  },

  // Users — per-user keys are not lab-scoped; list/presence/lookup are lab-scoped
  users: {
    all: ['users'] as const,
    settings: () => [...queryKeys.users.all, 'settings'] as const,
    profile: () => [...queryKeys.users.all, 'profile'] as const,
    sessions: () => [...queryKeys.users.all, 'sessions'] as const,
    lookup: (labId: string, userIds: string[]) =>
      [...queryKeys.users.all, labId, 'lookup', [...userIds].sort()] as const,
    list: (labId: string) => [...queryKeys.users.all, labId, 'list'] as const,
    presence: (labId: string) => [...queryKeys.users.all, labId, 'presence'] as const,
  },

  // Admin (lab-scoped)
  admin: {
    all: (labId: string) => ['admin', labId] as const,
    users: (labId: string) => [...queryKeys.admin.all(labId), 'users'] as const,
  },

  // Tubes (lab-scoped)
  tubes: {
    all: (labId: string) => ['tubes', labId] as const,
    list: (labId: string, filters?: TubeQueryFilters) =>
      filters
        ? ([...queryKeys.tubes.all(labId), 'list', filters] as const)
        : ([...queryKeys.tubes.all(labId), 'list'] as const),
    listAll: (labId: string) => [...queryKeys.tubes.all(labId), 'list'] as const,
    detail: (labId: string, id: string) => [...queryKeys.tubes.all(labId), 'detail', id] as const,
    location: (labId: string, tankId: string, rackId: string, boxId: string) =>
      [...queryKeys.tubes.all(labId), 'location', tankId, rackId, boxId] as const,
    locationStats: (labId: string, tankId: string, rackId: string) =>
      [...queryKeys.tubes.all(labId), 'locationStats', tankId, rackId] as const,
    stats: (labId: string) => [...queryKeys.tubes.all(labId), 'stats'] as const,
    bulk: (labId: string, tubeIds: string[]) =>
      [
        ...queryKeys.tubes.all(labId),
        'bulk',
        { tubeIds: [...tubeIds].sort(), length: tubeIds.length },
      ] as const,
    paginated: (labId: string, filters?: TubeQueryFilters) =>
      [...queryKeys.tubes.all(labId), 'paginated', filters] as const,
  },

  // Researchers (lab-scoped)
  researchers: {
    all: (labId: string) => ['researchers', labId] as const,
    list: (labId: string, filters?: ResearcherQueryFilters) =>
      filters
        ? ([...queryKeys.researchers.all(labId), 'list', filters] as const)
        : ([...queryKeys.researchers.all(labId), 'list'] as const),
    visible: (labId: string) => [...queryKeys.researchers.all(labId), 'visible'] as const,
    admin: (labId: string, filters?: ResearcherQueryFilters) =>
      filters
        ? ([...queryKeys.researchers.all(labId), 'admin', filters] as const)
        : ([...queryKeys.researchers.all(labId), 'admin'] as const),
    detail: (labId: string, id: string) =>
      [...queryKeys.researchers.all(labId), 'detail', id] as const,
    stats: (labId: string) => [...queryKeys.researchers.all(labId), 'stats'] as const,
  },

  // Search (lab-scoped)
  search: {
    all: (labId: string) => ['search', labId] as const,
    tubes: (labId: string) => [...queryKeys.search.all(labId), 'tubes'] as const,
    tubesSearch: (labId: string, options: AdvancedSearchOptions) =>
      [...queryKeys.search.tubes(labId), 'search', options] as const,
    quickSearch: (labId: string, query: string, limit?: number) =>
      [...queryKeys.search.tubes(labId), 'quick', query, limit] as const,
    fieldSearch: (labId: string, field: string, value: string, options?: AdvancedSearchOptions) =>
      [...queryKeys.search.tubes(labId), 'field', field, value, options] as const,
    results: (labId: string, query: string, filters?: SearchFilters) =>
      [...queryKeys.search.all(labId), 'results', query, filters] as const,
  },

  // Lookups (lab-scoped)
  lookups: {
    all: (labId: string) => ['lookups', labId] as const,
    byCategory: (labId: string, category: LookupCategory) =>
      [...queryKeys.lookups.all(labId), category] as const,
  },

  // Labs (not lab-scoped — already parameterized by labId)
  labs: {
    all: ['labs'] as const,
    list: () => [...queryKeys.labs.all, 'list'] as const,
    labDetails: (labId: string) => [...queryKeys.labs.all, 'labDetails', labId] as const,
    overview: () => [...queryKeys.labs.all, 'overview'] as const,
    demoLimits: (labId: string) => [...queryKeys.labs.all, 'demoLimits', labId] as const,
    audit: (labId: string) => [...queryKeys.labs.all, 'audit', labId] as const,
  },

  // Invite Codes (not lab-scoped — already parameterized by labId)
  inviteCodes: {
    all: ['inviteCodes'] as const,
    currentLab: () => [...queryKeys.inviteCodes.all, 'currentLab'] as const,
    byLab: (labId: string) => [...queryKeys.inviteCodes.all, 'byLab', labId] as const,
  },

  // Storage (lab-scoped)
  storage: {
    all: (labId: string) => ['storage', labId] as const,
    data: (labId: string) => [...queryKeys.storage.all(labId), 'data'] as const,
    positionDisplayPresets: (labId: string) =>
      [...queryKeys.storage.all(labId), 'positionDisplayPresets'] as const,
  },
} as const;
