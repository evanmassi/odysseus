/**
 * Infrastructure API Layer
 */

export { httpClient, HttpClient, configureHttpClientWithSessionService } from './HttpClient';
export { OfflineWriteError, isOfflineError } from './HttpClient';
export type { HttpClientConfig, ApiResponse } from './HttpClient';
export { authHttpClient, AuthHttpClient } from './AuthHttpClient';
export { transformApiResponse, ResponseTransformers } from './responseTransformers';
