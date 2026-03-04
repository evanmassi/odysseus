/**
 * Cache Management
 *
 * Query client configuration, query keys, cache persistence, and version validation.
 */

export { validateCacheVersion } from './cacheVersionValidation';
export {
  queryClient,
  CACHE_TIMES,
  DOMAIN_QUERY_OPTIONS,
  cacheMetrics,
  setupQueryPersistence,
  clearAllCaches,
} from './queryClient';
export { queryKeys } from './queryKeys';
