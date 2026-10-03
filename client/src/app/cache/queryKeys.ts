// PITFALL: a default labId of '' is inert; queries using it must be disabled with enabled: !!labId.

import type {
  AdvancedSearchOptions,
  AuditLogFilters,
  LookupCategory,
  TubeFilterableField,
} from '@odysseus/shared-schemas';

export const queryKeys = {
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

  auth: {
    firstTime: () => ['auth', 'first-time'] as const,
    passwordRequirements: () => ['auth', 'password-requirements'] as const,
  },

  admin: {
    all: (labId = '') => ['admin', labId] as const,
    users: (labId = '') => [...queryKeys.admin.all(labId), 'users'] as const,
    inviteCodes: (labId = '') => [...queryKeys.admin.all(labId), 'inviteCodes'] as const,
    catalog: (labId = '') => [...queryKeys.admin.all(labId), 'catalog'] as const,
    researchers: (labId = '') => [...queryKeys.admin.all(labId), 'researchers'] as const,
    unlinkedResearchers: (labId = '') =>
      [...queryKeys.admin.all(labId), 'unlinkedResearchers'] as const,
    securityConfig: () => ['admin', 'securityConfig'] as const,
    versionInfo: () => ['admin', 'versionInfo'] as const,
    metrics: (labId = '') => [...queryKeys.admin.all(labId), 'metrics'] as const,
    auditLogAll: () => ['admin', 'auditLog'] as const,
    auditLog: (labId: string, filters: AuditLogFilters, includeArchive: boolean) =>
      [...queryKeys.admin.auditLogAll(), labId, filters, includeArchive] as const,
    auditRetention: () => ['admin', 'auditRetention'] as const,
  },

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

  researchers: {
    root: ['researchers'] as const,
    all: (labId = '') => [...queryKeys.researchers.root, labId] as const,
    list: (labId = '') => [...queryKeys.researchers.all(labId), 'list'] as const,
    visible: (labId = '') => [...queryKeys.researchers.all(labId), 'visible'] as const,
  },

  search: {
    all: (labId = '') => ['search', labId] as const,
    tubes: (labId = '') => [...queryKeys.search.all(labId), 'tubes'] as const,
    tubesSearch: (labId = '', options: AdvancedSearchOptions) =>
      [...queryKeys.search.tubes(labId), 'search', options] as const,
  },

  donors: {
    all: (labId = '') => ['donors', labId] as const,
    list: (labId = '') => [...queryKeys.donors.all(labId), 'list'] as const,
    search: (labId = '', query: string) =>
      [...queryKeys.donors.all(labId), 'search', query] as const,
    collectionHistory: (labId = '', donorId: string) =>
      [...queryKeys.donors.all(labId), 'collection-history', donorId] as const,
  },

  equipment: {
    all: (labId = '') => ['equipment', labId] as const,
    categories: (labId = '') => [...queryKeys.equipment.all(labId), 'categories'] as const,
    items: (labId = '') => [...queryKeys.equipment.all(labId), 'items'] as const,
    detail: (labId = '', id: string) => [...queryKeys.equipment.all(labId), 'detail', id] as const,
  },

  supplies: {
    all: (labId = '') => ['supplies', labId] as const,
    categories: (labId = '') => [...queryKeys.supplies.all(labId), 'categories'] as const,
    items: (labId = '') => [...queryKeys.supplies.all(labId), 'items'] as const,
    detail: (labId = '', id: string) => [...queryKeys.supplies.all(labId), 'detail', id] as const,
    transactions: (labId = '', itemId: string) =>
      [...queryKeys.supplies.all(labId), 'transactions', itemId] as const,
  },

  labLocations: {
    all: (labId = '') => ['labLocations', labId] as const,
  },

  attributes: {
    all: (labId = '') => ['attributes', labId] as const,
  },

  customUnits: {
    all: (labId = '') => ['customUnits', labId] as const,
  },

  reagents: {
    all: (labId = '') => ['reagents', labId] as const,
    categories: (labId = '') => [...queryKeys.reagents.all(labId), 'categories'] as const,
    items: (labId = '') => [...queryKeys.reagents.all(labId), 'items'] as const,
    detail: (labId = '', id: string) => [...queryKeys.reagents.all(labId), 'detail', id] as const,
    transactions: (labId = '', itemId: string) =>
      [...queryKeys.reagents.all(labId), 'transactions', itemId] as const,
    // PITFALL: callers pass a sorted list so the key stays stable.
    lotLabels: (labId = '', itemIds: string[]) =>
      [...queryKeys.reagents.all(labId), 'lotLabels', itemIds] as const,
  },

  lookups: {
    all: (labId = '') => ['lookups', labId] as const,
    byCategory: (labId = '', category: LookupCategory) =>
      [...queryKeys.lookups.all(labId), category] as const,
  },

  labs: {
    all: ['labs'] as const,
    list: () => [...queryKeys.labs.all, 'list'] as const,
    labDetails: (labId: string) => [...queryKeys.labs.all, 'labDetails', labId] as const,
    overview: () => [...queryKeys.labs.all, 'overview'] as const,
    demoLimits: (labId: string) => [...queryKeys.labs.all, 'demoLimits', labId] as const,
  },

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

  storage: {
    root: ['storage'] as const,
    all: (labId = '') => [...queryKeys.storage.root, labId] as const,
    data: (labId = '') => [...queryKeys.storage.all(labId), 'data'] as const,
  },

  storageAnalytics: {
    all: ['storageAnalytics'] as const,
    lab: (labId: string) => [...queryKeys.storageAnalytics.all, 'lab', labId] as const,
    crossLab: () => [...queryKeys.storageAnalytics.all, 'crossLab'] as const,
  },
} as const;
