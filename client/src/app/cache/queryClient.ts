/**
 * React Query Client Configuration
 *
 * Optimized for socket-driven real-time updates with offline persistence.
 * Core data (tubes, storage, researchers) persists to localStorage for
 * offline read access. Sensitive data (sessions, admin metrics) is excluded.
 */
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

import { isOfflineError } from '@infra/api';
import { logger } from '@infra/logger';
import { env } from '@shared/config';
import {
  getErrorMessage,
  isInfrastructureError,
  hasStatus,
  hasMessage,
} from '@shared/utils/getErrorMessage';
import { notifications } from '@shared/utils/notifications';
import { MS_PER_SECOND, MS_PER_MINUTE, MS_PER_HOUR, MS_PER_DAY } from '@shared/utils/timeConstants';

import { CONFIG_VERSION_KEY, QUERY_CACHE_KEY } from './cacheStorageKeys';

import type { DefaultOptions, QueryKey, Mutation } from '@tanstack/react-query';

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** Static query keys to invalidate on success (consumed by handleMutationSuccess). */
      invalidates?: QueryKey[];
      /**
       * Suppress the global error toast — for a mutation that surfaces its own error inline
       * (e.g. a form field). The mutation still logs; only the toast is skipped.
       */
      suppressErrorToast?: boolean;
    };
  }
}

// React Query v5 types errors as `unknown`; these guards narrow the shapes we log.

function hasDetails(error: unknown): error is { details: Record<string, unknown> } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'details' in error &&
    typeof (error as Record<string, unknown>)['details'] === 'object' &&
    (error as Record<string, unknown>)['details'] !== null
  );
}

function isQuery(query: unknown): query is { queryKey: unknown } {
  return typeof query === 'object' && query !== null && 'queryKey' in query;
}

export const CACHE_TIMES = {
  REAL_TIME: {
    staleTime: 3 * MS_PER_MINUTE,
    gcTime: 15 * MS_PER_MINUTE,
  },

  MEDIUM: {
    staleTime: 10 * MS_PER_MINUTE,
    gcTime: 30 * MS_PER_MINUTE,
  },

  STABLE: {
    staleTime: 30 * MS_PER_MINUTE,
    gcTime: MS_PER_HOUR,
  },

  CONFIG: {
    staleTime: MS_PER_HOUR,
    gcTime: 2 * MS_PER_HOUR,
  },

  SEARCH: {
    staleTime: 30 * MS_PER_SECOND,
    gcTime: 5 * MS_PER_MINUTE,
  },
} as const;

const retryLogic = (failureCount: number, error: unknown): boolean => {
  if (hasStatus(error) && error.status >= 400 && error.status < 500) {
    return false;
  }

  return failureCount < 3;
};

const mutationRetryLogic = (failureCount: number, error: unknown): boolean => {
  if (hasStatus(error) && error.status >= 400 && error.status < 500) {
    return false;
  }

  if (isOfflineError(error)) {
    return false;
  }

  if (hasStatus(error) && (error.status >= 500 || error.status === 0)) {
    return failureCount < 2;
  }

  return false;
};

const retryDelay = (attemptIndex: number): number => {
  // Exponential backoff: 1s, 2s, 4s, capped at 30s
  const exponentialDelay = Math.min(1000 * 2 ** attemptIndex, 30000);

  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 1000;

  return exponentialDelay + jitter;
};

const handleQueryError = (error: unknown, query: unknown): void => {
  if (env.isDev()) {
    logger.error('Query failed', {
      queryKey: isQuery(query) ? query.queryKey : 'unknown',
      error: hasMessage(error) ? error.message : String(error),
      status: hasStatus(error) ? error.status : undefined,
    });
  }

  // Infrastructure failures get a toast; 4xx query errors stay silent — the component renders
  // its own error state from the query's `isError`.
  if (isInfrastructureError(error)) {
    notifications.error(getErrorMessage(error));
  }
};

const handleMutationError = (
  error: unknown,
  variables: unknown,
  mutation: Mutation<unknown, unknown, unknown, unknown>
): void => {
  if (env.isDev()) {
    const originalError =
      hasDetails(error) && typeof error.details['originalError'] !== 'undefined'
        ? error.details['originalError']
        : error;

    logger.error('Mutation failed', {
      mutationKey: mutation.options.mutationKey ?? 'unknown',
      wrapperMessage: hasMessage(error) ? error.message : undefined,
      originalError,
      status: hasStatus(error)
        ? error.status
        : hasStatus(originalError)
          ? originalError.status
          : undefined,
      errorDetails: hasDetails(error) ? error.details : undefined,
      variables,
    });
  }

  if (isOfflineError(error)) {
    notifications.offlineError();
    return;
  }

  // A mutation that renders its error inline opts out of the global toast via meta.
  if (mutation.options.meta?.suppressErrorToast) {
    return;
  }

  notifications.error(getErrorMessage(error));
};

// Central post-write invalidation: a mutation declares `meta: { invalidates: [queryKey, ...] }` and
// this refetches those keys on success, so hooks don't repeat useQueryClient + an onSuccess block.
// Use meta ONLY for pure static-key invalidation; keep onSuccess for anything more — keys derived from
// the mutation's (typed) variables or result, success toasts, cache patching, or optimistic updates.
const handleMutationSuccess = (mutation: Mutation<unknown, unknown, unknown, unknown>): void => {
  mutation.options.meta?.invalidates?.forEach(
    queryKey => void queryClient.invalidateQueries({ queryKey })
  );
};

const defaultOptions: DefaultOptions = {
  queries: {
    staleTime: CACHE_TIMES.MEDIUM.staleTime,
    gcTime: CACHE_TIMES.MEDIUM.gcTime,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: false,
    retry: retryLogic,
    retryDelay: retryDelay,
    refetchInterval: false,
    refetchIntervalInBackground: false,
    networkMode: 'online',
  },

  mutations: {
    retry: mutationRetryLogic,
    retryDelay: retryDelay,
    // HTTP interceptor handles offline blocking
    networkMode: 'always',
  },
};

export const queryClient = new QueryClient({
  defaultOptions,
  queryCache: new QueryCache({
    onError: (error, query) => {
      handleQueryError(error, query);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, variables, _context, mutation) => {
      handleMutationError(error, variables, mutation);
    },
    onSuccess: (_data, _variables, _context, mutation) => {
      handleMutationSuccess(mutation);
    },
  }),
});

export const DOMAIN_QUERY_OPTIONS = {
  tubes: {
    staleTime: CACHE_TIMES.REAL_TIME.staleTime,
    gcTime: CACHE_TIMES.REAL_TIME.gcTime,
    refetchOnMount: false,
  },

  researchers: {
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
    refetchOnMount: false,
  },

  configuration: {
    staleTime: CACHE_TIMES.CONFIG.staleTime,
    gcTime: CACHE_TIMES.CONFIG.gcTime,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },

  search: {
    staleTime: CACHE_TIMES.SEARCH.staleTime,
    gcTime: CACHE_TIMES.SEARCH.gcTime,
    refetchOnMount: false,
  },

  statistics: {
    staleTime: CACHE_TIMES.REAL_TIME.staleTime,
    gcTime: CACHE_TIMES.REAL_TIME.gcTime,
    refetchOnMount: false,
  },
} as const;

// Admin-scoped data stays out of localStorage. 'labs' and 'storageAnalytics' are system-admin
// surfaces spanning every lab, so they belong here alongside the rest.
const NON_PERSISTED_QUERY_KEYS: readonly string[] = [
  'users',
  'admin',
  'auth',
  'security',
  'labs',
  'storageAnalytics',
];

function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  const firstKey = queryKey[0];
  if (typeof firstKey !== 'string') return false;

  // Matched exactly, not by prefix: 'storage' would otherwise swallow 'storageAnalytics'.
  return !NON_PERSISTED_QUERY_KEYS.includes(firstKey);
}

// JSON.parse revives Date.prototype.toISOString() strings back to Date objects.
// Without this, persisted queries lose Date class identity across reloads and
// downstream code (formatRelativeTime, .getTime()) breaks on the rehydrated strings.
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
function reviveDates(_key: string, value: unknown): unknown {
  if (typeof value === 'string' && ISO_DATE_RE.test(value)) {
    return new Date(value);
  }
  return value;
}

export function setupQueryPersistence(): void {
  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: QUERY_CACHE_KEY,
    serialize: data => JSON.stringify(data),
    deserialize: str => JSON.parse(str, reviveDates),
  });

  void persistQueryClient({
    queryClient,
    persister,
    maxAge: MS_PER_DAY,
    dehydrateOptions: {
      shouldDehydrateQuery: query => {
        const defaultShouldDehydrate = query.state.status === 'success';
        return defaultShouldDehydrate && shouldPersistQuery(query.queryKey);
      },
    },
  });
}

/** Ensures the next user gets fresh data filtered for their demo status. */
export function clearAllCaches(): void {
  queryClient.clear();
  localStorage.removeItem(QUERY_CACHE_KEY);
  localStorage.removeItem(CONFIG_VERSION_KEY);
}
