/**
 * Cache Version Validation
 *
 * Validates that client-side cached data matches server state.
 * Clears stale cache when version mismatch is detected (e.g., after database reset).
 */
import { logger } from '@infra/logger';
import { env } from '@shared/config';

import { CONFIG_VERSION_KEY, QUERY_CACHE_KEY } from './cacheStorageKeys';
import { queryClient } from './queryClient';
import { queryKeys } from './queryKeys';

const VERSION_FETCH_TIMEOUT_MS = 5000;

interface VersionCheckResult {
  isValid: boolean;
  serverVersion: number | null;
  cachedVersion: number | null;
  reason: 'match' | 'mismatch' | 'no-cache' | 'no-session' | 'error';
}

function getCachedConfigVersion(labId?: string): number | null {
  if (!labId) return null;
  const cachedData = queryClient.getQueryData(queryKeys.storage.data(labId));

  if (!cachedData || typeof cachedData !== 'object') {
    return null;
  }

  const data = cachedData as Record<string, unknown>;
  const configuration = data['configuration'] as Record<string, unknown> | undefined;
  const systemConfig = configuration?.['systemConfig'] as Record<string, unknown> | undefined;
  const version = systemConfig?.['version'];

  if (typeof version === 'number') {
    return version;
  }

  return null;
}

async function fetchServerVersion(accessToken: string): Promise<number | null> {
  try {
    const apiBaseUrl = env.apiBaseUrl();

    const response = await fetch(`${apiBaseUrl}/storage/version`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(VERSION_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.warn('Failed to fetch server configuration version', {
        status: response.status,
      });
      return null;
    }

    const result = (await response.json()) as {
      success: boolean;
      data?: { version: number };
    };

    if (result.success && typeof result.data?.version === 'number') {
      return result.data.version;
    }

    return null;
  } catch (error) {
    logger.warn('Error fetching server configuration version', { error });
    return null;
  }
}

function clearStaleCaches(labId?: string): void {
  logger.info('Clearing stale caches due to version mismatch');

  queryClient.removeQueries({ queryKey: queryKeys.storage.all(labId) });
  queryClient.removeQueries({ queryKey: queryKeys.tubes.all(labId) });
  queryClient.removeQueries({ queryKey: queryKeys.researchers.all(labId) });

  try {
    localStorage.removeItem(QUERY_CACHE_KEY);
    localStorage.removeItem(CONFIG_VERSION_KEY);
  } catch {
    // localStorage may be unavailable in some contexts
  }

  logger.info('Stale caches cleared successfully');
}

/** Call during bootstrap after session-restore, before components render cached data. */
export async function validateCacheVersion(
  accessToken: string | null,
  labId?: string
): Promise<VersionCheckResult> {
  if (!accessToken) {
    // No session but cached data exists → stale from previous DB/session — clear it
    const cachedVersion = getCachedConfigVersion(labId);
    if (cachedVersion !== null) {
      clearStaleCaches(labId);
    }

    return {
      isValid: true,
      serverVersion: null,
      cachedVersion: null,
      reason: 'no-session',
    };
  }

  const cachedVersion = getCachedConfigVersion(labId);
  if (cachedVersion === null) {
    return {
      isValid: true,
      serverVersion: null,
      cachedVersion: null,
      reason: 'no-cache',
    };
  }

  const serverVersion = await fetchServerVersion(accessToken);
  if (serverVersion === null) {
    // Don't clear cache on network errors - might be temporary
    logger.warn('Could not verify cache version - server unreachable');
    return {
      isValid: true,
      serverVersion: null,
      cachedVersion,
      reason: 'error',
    };
  }

  if (serverVersion !== cachedVersion) {
    logger.warn('Cache version mismatch detected', {
      serverVersion,
      cachedVersion,
      isReset: serverVersion < cachedVersion,
    });
    clearStaleCaches(labId);

    return {
      isValid: false,
      serverVersion,
      cachedVersion,
      reason: 'mismatch',
    };
  }

  return {
    isValid: true,
    serverVersion,
    cachedVersion,
    reason: 'match',
  };
}
