/**
 * Infrastructure API Layer
 */

export { baseHttpClient, HttpClient } from './HttpClient';
export { OfflineWriteError, isOfflineError } from './HttpClient';
export type { HttpClientConfig, ApiResponse } from './HttpClient';
export { AuthenticatedHttpClient } from './AuthenticatedHttpClient';
export { authHttpClient, AuthHttpClient } from './AuthHttpClient';
export { transformApiResponse, ResponseTransformers } from './responseTransformers';

import { AuthenticatedHttpClient } from './AuthenticatedHttpClient';
import { baseHttpClient } from './HttpClient';

export const httpClient = new AuthenticatedHttpClient(baseHttpClient);
