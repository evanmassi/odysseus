/**
 * Infrastructure API Layer
 *
 * The shared httpClient singleton and API error guards.
 */

export { isOfflineError, isConflictError } from './apiErrorGuards';

import { HttpClient } from './HttpClient';
import { baseTransport } from './HttpTransport';

export const httpClient = new HttpClient(baseTransport);
