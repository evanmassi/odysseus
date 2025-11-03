/**
 * Infrastructure API Layer - Public Exports
 */

export * from './client';
export { httpClient, HttpClient } from './httpClient';
export { authHttpClient, AuthHttpClient } from './AuthHttpClient';
export { 
  ApiError, 
  type PaginatedResult, 
  type BatchResult 
} from '@odysseus/shared-schemas';
