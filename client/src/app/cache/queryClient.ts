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
import { notifications } from '@shared/utils/notifications';
import { MS_PER_SECOND, MS_PER_MINUTE, MS_PER_HOUR, MS_PER_DAY } from '@shared/utils/timeConstants';

import { CONFIG_VERSION_KEY, QUERY_CACHE_KEY } from './cacheStorageKeys';

import type { DefaultOptions, QueryKey } from '@tanstack/react-query';

// React Query v5 types errors as `unknown`.

function hasStatus(error: unknown): error is { status: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as Record<string, unknown>)['status'] === 'number'
  );
}

function hasMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>)['message'] === 'string'
  );
}

function hasCode(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as Record<string, unknown>)['code'] === 'string'
  );
}

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

function isMutation(mutation: unknown): mutation is { options: { mutationKey?: unknown } } {
  return (
    typeof mutation === 'object' &&
    mutation !== null &&
    'options' in mutation &&
    typeof (mutation as Record<string, unknown>)['options'] === 'object' &&
    (mutation as Record<string, unknown>)['options'] !== null
  );
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

  if (hasStatus(error) && error.status === 429) {
    notifications.error('Too many requests. Please wait a moment and try again.');
  } else if (hasStatus(error) && error.status >= 500) {
    notifications.error('Server error occurred. Please try again.');
  } else if (
    (hasStatus(error) && error.status === 0) ||
    (hasCode(error) && error.code === 'NETWORK_ERROR')
  ) {
    notifications.error('Network error. Check your connection.');
  }
};

const handleMutationError = (
  error: unknown,
  variables: unknown,
  _context: unknown,
  mutation: unknown
): void => {
  if (env.isDev()) {
    const originalError =
      hasDetails(error) && typeof error.details['originalError'] !== 'undefined'
        ? error.details['originalError']
        : error;

    logger.error('Mutation failed', {
      mutationKey: isMutation(mutation) ? mutation.options.mutationKey : 'unknown',
      wrapperMessage: hasMessage(error) ? error.message : undefined,
      originalError: originalError,
      status: hasStatus(error)
        ? error.status
        : hasStatus(originalError)
          ? originalError.status
          : undefined,
      errorDetails: hasDetails(error) ? error.details : undefined,
      variables,
    });

    logger.error('Full error object', { error });
    if (originalError !== error) {
      logger.error('Original unwrapped error', { originalError });
    }
  }

  if (isOfflineError(error)) {
    notifications.offlineError();
    return;
  }

  if (hasStatus(error) && error.status === 429) {
    notifications.error('Too many requests. Please wait a moment and try again.');
  } else if (hasStatus(error) && error.status >= 500) {
    notifications.error('Server error. Your changes could not be saved.');
  } else if (hasStatus(error) && error.status >= 400 && error.status < 500) {
    const message = hasMessage(error) ? error.message : 'Invalid request. Please check your input.';
    notifications.error(message);
  } else {
    notifications.error('Network error. Please try again.');
  }
};

// Central post-write invalidation: a mutation declares `meta: { invalidates: [queryKey, ...] }` and
// this refetches those keys on success, so hooks don't repeat useQueryClient + an onSuccess block.
// Use meta ONLY for pure static-key invalidation; keep onSuccess for anything more — keys derived from
// the mutation's (typed) variables or result, success toasts, cache patching, or optimistic updates.
const handleMutationSuccess = (mutation: { meta?: Record<string, unknown> }): void => {
  const invalidates = mutation.meta?.['invalidates'] as QueryKey[] | undefined;
  invalidates?.forEach(queryKey => void queryClient.invalidateQueries({ queryKey }));
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
    onError: (error, variables, context, mutation) => {
      handleMutationError(error, variables, context, mutation);
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
