/**
 * Infrastructure API Layer
 *
 * The shared httpClient singleton and the offline-write error check.
 */

export { isOfflineError } from './HttpTransport';

import { HttpClient } from './HttpClient';
import { baseTransport } from './HttpTransport';

export const httpClient = new HttpClient(baseTransport);
