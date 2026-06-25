/**
 * Infrastructure API Layer
 */

export { baseTransport, HttpTransport } from './HttpTransport';
export { OfflineWriteError, isOfflineError } from './HttpTransport';
export type { HttpTransportConfig } from './HttpTransport';
export { HttpClient } from './HttpClient';
export { sessionHttpClient, SessionHttpClient } from './SessionHttpClient';

import { HttpClient } from './HttpClient';
import { baseTransport } from './HttpTransport';

export const httpClient = new HttpClient(baseTransport);
