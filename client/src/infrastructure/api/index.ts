/**
 * Infrastructure API Layer - Public Exports
 */

export * from './client';  // Exports local ApiError class
export { httpClient, HttpClient } from './httpClient';
export { authHttpClient, AuthHttpClient } from './AuthHttpClient';
export {
  type PaginatedResult,
  type BatchResult
} from '@odysseus/shared-schemas';
