/**
 * Query Keys for React Query
 *
 * Hierarchical query key structure for TanStack Query.
 * Lab-scoped domains include labId for cache partitioning between tenants.
 * Default labId of '' is inert — queries using it should be disabled via enabled: !!labId.
 */

import type {
  AdvancedSearchOptions,
  LookupCategory,
  TubeFilterableField,
} from '@odysseus/shared-schemas';

export const queryKeys = {
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

  // Auth (public — first-time setup detection, password policy; not lab-scoped)
  auth: {
    firstTime: () => ['auth', 'first-time'] as const,
    passwordRequirements: () => ['auth', 'password-requirements'] as const,
  },

  // Admin (lab-scoped)
  admin: {
    all: (labId = '') => ['admin', labId] as const,
    users: (labId = '') => [...queryKeys.admin.all(labId), 'users'] as const,
  },

  // Tubes (lab-scoped)
  tubes: {
    root: ['tubes'] as const,
    all: (labId = '') => [...queryKeys.tubes.root, labId] as const,
    detail: (labId = '', id: string) => [...queryKeys.tubes.all(labId), 'detail', id] as const,
    locationPrefix: (labId = '') => [...queryKeys.tubes.all(labId), 'location'] as const,
    location: (labId = '', tankId: string, rackId: string, boxId: string) =>
      [...queryKeys.tubes.locationPrefix(labId), tankId, rackId, boxId] as const,
    byRack: (labId = '', tankId: string, rackId: string) =>
      [...queryKeys.tubes.all(labId), 'byRack', tankId, rackId] as const,
    locationCounts: (labId = '') => [...queryKeys.tubes.all(labId), 'locationCounts'] as const,
    filterOptions: (labId = '', fields: TubeFilterableField[]) =>
      [...queryKeys.tubes.all(labId), 'filterOptions', [...fields].sort()] as const,
    bulk: (labId = '', tubeIds: string[]) =>
      [
        ...queryKeys.tubes.all(labId),
        'bulk',
        { tubeIds: [...tubeIds].sort(), length: tubeIds.length },
      ] as const,
  },

  // Researchers (lab-scoped)
  researchers: {
    root: ['researchers'] as const,
    all: (labId = '') => [...queryKeys.researchers.root, labId] as const,
    list: (labId = '') => [...queryKeys.researchers.all(labId), 'list'] as const,
    visible: (labId = '') => [...queryKeys.researchers.all(labId), 'visible'] as const,
  },

  // Search (lab-scoped)
  search: {
    all: (labId = '') => ['search', labId] as const,
    tubes: (labId = '') => [...queryKeys.search.all(labId), 'tubes'] as const,
    tubesSearch: (labId = '', options: AdvancedSearchOptions) =>
      [...queryKeys.search.tubes(labId), 'search', options] as const,
  },

  // Donors (lab-scoped)
  donors: {
    all: (labId = '') => ['donors', labId] as const,
    list: (labId = '') => [...queryKeys.donors.all(labId), 'list'] as const,
    search: (labId = '', query: string) =>
      [...queryKeys.donors.all(labId), 'search', query] as const,
    collectionHistory: (labId = '', donorId: string) =>
      [...queryKeys.donors.all(labId), 'collection-history', donorId] as const,
  },

  // Equipment (lab-scoped)
  equipment: {
    all: (labId = '') => ['equipment', labId] as const,
    categories: (labId = '') => [...queryKeys.equipment.all(labId), 'categories'] as const,
    items: (labId = '') => [...queryKeys.equipment.all(labId), 'items'] as const,
    detail: (labId = '', id: string) => [...queryKeys.equipment.all(labId), 'detail', id] as const,
  },

  // Supplies (lab-scoped)
  supplies: {
    all: (labId = '') => ['supplies', labId] as const,
    categories: (labId = '') => [...queryKeys.supplies.all(labId), 'categories'] as const,
    items: (labId = '') => [...queryKeys.supplies.all(labId), 'items'] as const,
    detail: (labId = '', id: string) => [...queryKeys.supplies.all(labId), 'detail', id] as const,
    locations: (labId = '') => [...queryKeys.supplies.all(labId), 'locations'] as const,
    transactions: (labId = '', itemId: string) =>
      [...queryKeys.supplies.all(labId), 'transactions', itemId] as const,
    reorderList: (labId = '') => [...queryKeys.supplies.all(labId), 'reorder-list'] as const,
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
    root: ['storage'] as const,
    all: (labId = '') => [...queryKeys.storage.root, labId] as const,
    data: (labId = '') => [...queryKeys.storage.all(labId), 'data'] as const,
  },

  // Storage Analytics (not lab-scoped — system admin cross-lab or parameterized by labId)
  storageAnalytics: {
    all: ['storageAnalytics'] as const,
    lab: (labId: string) => [...queryKeys.storageAnalytics.all, 'lab', labId] as const,
    crossLab: () => [...queryKeys.storageAnalytics.all, 'crossLab'] as const,
  },
} as const;
