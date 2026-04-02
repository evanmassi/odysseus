/**
 * Query Keys for React Query
 *
 * Hierarchical query key structure for TanStack Query.
 * Lab-scoped domains include labId for cache partitioning between tenants.
 * Default labId of '' is inert — queries using it should be disabled via enabled: !!labId.
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
    lookup: (labId = '', userIds: string[]) =>
      [...queryKeys.users.all, labId, 'lookup', [...userIds].sort()] as const,
    list: (labId = '') => [...queryKeys.users.all, labId, 'list'] as const,
    presence: (labId = '') => [...queryKeys.users.all, labId, 'presence'] as const,
  },

  // Admin (lab-scoped)
  admin: {
    all: (labId = '') => ['admin', labId] as const,
    users: (labId = '') => [...queryKeys.admin.all(labId), 'users'] as const,
  },

  // Tubes (lab-scoped)
  tubes: {
    all: (labId = '') => ['tubes', labId] as const,
    list: (labId = '', filters?: TubeQueryFilters) =>
      filters
        ? ([...queryKeys.tubes.all(labId), 'list', filters] as const)
        : ([...queryKeys.tubes.all(labId), 'list'] as const),
    listAll: (labId = '') => [...queryKeys.tubes.all(labId), 'list'] as const,
    detail: (labId = '', id: string) => [...queryKeys.tubes.all(labId), 'detail', id] as const,
    location: (labId = '', tankId: string, rackId: string, boxId: string) =>
      [...queryKeys.tubes.all(labId), 'location', tankId, rackId, boxId] as const,
    locationStats: (labId = '', tankId: string, rackId: string) =>
      [...queryKeys.tubes.all(labId), 'locationStats', tankId, rackId] as const,
    stats: (labId = '') => [...queryKeys.tubes.all(labId), 'stats'] as const,
    bulk: (labId = '', tubeIds: string[]) =>
      [
        ...queryKeys.tubes.all(labId),
        'bulk',
        { tubeIds: [...tubeIds].sort(), length: tubeIds.length },
      ] as const,
    paginated: (labId = '', filters?: TubeQueryFilters) =>
      [...queryKeys.tubes.all(labId), 'paginated', filters] as const,
  },

  // Researchers (lab-scoped)
  researchers: {
    all: (labId = '') => ['researchers', labId] as const,
    list: (labId = '', filters?: ResearcherQueryFilters) =>
      filters
        ? ([...queryKeys.researchers.all(labId), 'list', filters] as const)
        : ([...queryKeys.researchers.all(labId), 'list'] as const),
    visible: (labId = '') => [...queryKeys.researchers.all(labId), 'visible'] as const,
    admin: (labId = '', filters?: ResearcherQueryFilters) =>
      filters
        ? ([...queryKeys.researchers.all(labId), 'admin', filters] as const)
        : ([...queryKeys.researchers.all(labId), 'admin'] as const),
    detail: (labId = '', id: string) =>
      [...queryKeys.researchers.all(labId), 'detail', id] as const,
    stats: (labId = '') => [...queryKeys.researchers.all(labId), 'stats'] as const,
  },

  // Search (lab-scoped)
  search: {
    all: (labId = '') => ['search', labId] as const,
    tubes: (labId = '') => [...queryKeys.search.all(labId), 'tubes'] as const,
    tubesSearch: (labId = '', options: AdvancedSearchOptions) =>
      [...queryKeys.search.tubes(labId), 'search', options] as const,
    quickSearch: (labId = '', query: string, limit?: number) =>
      [...queryKeys.search.tubes(labId), 'quick', query, limit] as const,
    fieldSearch: (labId = '', field: string, value: string, options?: AdvancedSearchOptions) =>
      [...queryKeys.search.tubes(labId), 'field', field, value, options] as const,
    results: (labId = '', query: string, filters?: SearchFilters) =>
      [...queryKeys.search.all(labId), 'results', query, filters] as const,
  },

  // Donors (lab-scoped)
  donors: {
    all: (labId = '') => ['donors', labId] as const,
    list: (labId = '') => [...queryKeys.donors.all(labId), 'list'] as const,
    detail: (labId = '', id: string) => [...queryKeys.donors.all(labId), 'detail', id] as const,
    search: (labId = '', query: string) =>
      [...queryKeys.donors.all(labId), 'search', query] as const,
  },

  // Equipment (lab-scoped)
  equipment: {
    all: (labId = '') => ['equipment', labId] as const,
    categories: (labId = '') => [...queryKeys.equipment.all(labId), 'categories'] as const,
    items: (labId = '') => [...queryKeys.equipment.all(labId), 'items'] as const,
    detail: (labId = '', id: string) => [...queryKeys.equipment.all(labId), 'detail', id] as const,
    documents: (labId = '', itemId: string) =>
      [...queryKeys.equipment.all(labId), 'documents', itemId] as const,
    maintenance: (labId = '', itemId: string) =>
      [...queryKeys.equipment.all(labId), 'maintenance', itemId] as const,
  },

  // Lookups (lab-scoped)
  lookups: {
    all: (labId = '') => ['lookups', labId] as const,
    byCategory: (labId = '', category: LookupCategory) =>
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

  // Security (not lab-scoped — system admin only)
  security: {
    all: ['security'] as const,
    overview: () => [...queryKeys.security.all, 'overview'] as const,
    sessions: () => [...queryKeys.security.all, 'sessions'] as const,
    ipActivity: (startDate?: string, endDate?: string) =>
      [...queryKeys.security.all, 'ipActivity', startDate, endDate] as const,
    failedLogins: (limit?: number, startDate?: string, endDate?: string) =>
      [...queryKeys.security.all, 'failedLogins', limit, startDate, endDate] as const,
    sessionActivity: (hours?: number) =>
      [...queryKeys.security.all, 'sessionActivity', hours] as const,
  },

  // Storage (lab-scoped)
  storage: {
    all: (labId = '') => ['storage', labId] as const,
    data: (labId = '') => [...queryKeys.storage.all(labId), 'data'] as const,
    positionDisplayPresets: (labId = '') =>
      [...queryKeys.storage.all(labId), 'positionDisplayPresets'] as const,
  },

  // Storage Analytics (not lab-scoped — system admin cross-lab or parameterized by labId)
  storageAnalytics: {
    all: ['storageAnalytics'] as const,
    lab: (labId: string) => [...queryKeys.storageAnalytics.all, 'lab', labId] as const,
    crossLab: () => [...queryKeys.storageAnalytics.all, 'crossLab'] as const,
  },
} as const;
