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

import { CONFIG_VERSION_KEY, QUERY_CACHE_KEY } from './cacheStorageKeys';

import type { DefaultOptions } from '@tanstack/react-query';

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
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  },

  MEDIUM: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },

  STABLE: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  },

  CONFIG: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  },

  SEARCH: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
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
    refetchOnMount: true,
  },

  statistics: {
    staleTime: CACHE_TIMES.REAL_TIME.staleTime,
    gcTime: CACHE_TIMES.REAL_TIME.gcTime,
    refetchOnMount: false,
  },
} as const;

const EXCLUDED_QUERY_PREFIXES = ['users', 'admin', 'auth', 'security'] as const;

function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  const firstKey = queryKey[0];
  if (typeof firstKey !== 'string') return false;

  return !EXCLUDED_QUERY_PREFIXES.some(prefix => firstKey.startsWith(prefix));
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
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
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
