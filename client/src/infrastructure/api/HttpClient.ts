/**
 * HTTP Client for API Communication
 *
 * Fetch-based transport with envelope unwrapping, Zod validation, and offline write blocking.
 */
import {
  successEnvelopeSchema,
  errorEnvelopeSchema,
  ApiError,
  API_ERROR_CODES,
} from '@odysseus/shared-schemas';
import { z } from 'zod';

import { isOffline } from '@infra/connection';

import { transformApiResponse, ResponseTransformers } from './responseTransformers';

import type { TokenProvider } from '@shared/types/sessionTypes';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Raw API data before transformation
type TransformFn = (data: any) => unknown;

function mapArray(transformer: TransformFn): TransformFn {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Raw API data before transformation
  return (data: any) => (Array.isArray(data) ? data.map(transformer) : transformer(data));
}

// Order matters — more specific paths must come before broader ones (e.g. /admin/audit/statistics before /admin/audit)
const URL_TRANSFORMER_REGISTRY: { match: (url: string) => boolean; transform: TransformFn }[] = [
  // Auth
  {
    match: url =>
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/force-change-password'),
    transform: data => ResponseTransformers.LoginResponse(data),
  },
  {
    match: url => url.includes('/auth/refresh'),
    transform: data => ResponseTransformers.RefreshResponse(data),
  },
  // Session verification returns same structure as login
  {
    match: url => url.includes('/auth/verify'),
    transform: data => ResponseTransformers.LoginResponse(data),
  },
  // Other auth endpoints (first-time, password-requirements, etc.) have no date fields
  {
    match: url => url.includes('/auth/'),
    transform: data => transformApiResponse(data, 'AuthGenericResponse'),
  },
  // Users
  {
    match: url => url.includes('/users/me/profile'),
    transform: data => ResponseTransformers.Person(data),
  },
  {
    match: url => url.includes('/users/me/sessions'),
    transform: mapArray(ResponseTransformers.ActiveSession),
  },
  {
    match: url => url.includes('/users/me/settings'),
    transform: data => transformApiResponse(data, 'UserSettingsResponse'),
  },
  {
    match: url => url.includes('/users/lookup') || url.includes('/users/list'),
    transform: data => transformApiResponse(data, 'UserLookup'),
  },
  // Domain
  {
    match: url => url.includes('/storage'),
    transform: data => transformApiResponse(data, 'StorageResponse'),
  },
  {
    match: url => url.includes('/tubes'),
    transform: data => transformApiResponse(data, 'TubeData'),
  },
  {
    match: url => url.includes('/researchers'),
    transform: data => ResponseTransformers.Researcher(data),
  },
  {
    match: url => url.includes('/lookups'),
    transform: data => transformApiResponse(data, 'LookupValue'),
  },
  // Admin
  {
    match: url => url.includes('/admin/users'),
    transform: mapArray(ResponseTransformers.AdminUser),
  },
  {
    match: url => url.includes('/admin/metrics'),
    transform: data => ResponseTransformers.SystemMetrics(data),
  },
  {
    match: url => url.includes('/admin/security-config'),
    transform: data => transformApiResponse(data, 'SecurityConfigResponse'),
  },
  {
    match: url => url.includes('/admin/audit/statistics'),
    transform: data => transformApiResponse(data, 'AuditStatistics'),
  },
  {
    match: url => url.includes('/admin/audit/retention'),
    transform: data => transformApiResponse(data, 'AuditRetention'),
  },
  {
    match: url => url.includes('/admin/audit'),
    transform: mapArray(ResponseTransformers.AuditLogEntry),
  },
  // Misc
  {
    match: url => url.includes('/session-info'),
    transform: data => transformApiResponse(data, 'SessionInfo'),
  },
];

// Session errors that should NOT trigger token refresh — session is invalidated server-side
const SESSION_TERMINAL_ERRORS: Set<string> = new Set([
  API_ERROR_CODES.SESSION_IDLE_TIMEOUT,
  API_ERROR_CODES.SESSION_ABSOLUTE_TIMEOUT,
  API_ERROR_CODES.SESSION_REVOKED,
]);

export class OfflineWriteError extends ApiError {
  constructor() {
    super(
      "You're offline. Changes cannot be saved until connection is restored.",
      0, // status 0 indicates network error
      'OFFLINE_WRITE_BLOCKED'
    );
    this.name = 'OfflineWriteError';
  }
}

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Use to avoid showing duplicate error notifications for offline writes. */
export function isOfflineError(error: unknown): boolean {
  return (
    error instanceof OfflineWriteError ||
    (typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: unknown }).code === 'OFFLINE_WRITE_BLOCKED')
  );
}

export interface HttpClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export class HttpClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor(config: HttpClientConfig = {}) {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Config default, 0/empty values are invalid
    this.baseURL = config.baseURL || '/api';
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Config default, 0/empty values are invalid
    this.timeout = config.timeout || 10000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
  }

  private async request<T = unknown>(
    method: string,
    url: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    // Uses shared network state (server-verified) instead of unreliable navigator.onLine
    if (WRITE_METHODS.has(method) && isOffline()) {
      throw new OfflineWriteError();
    }

    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    const requestHeaders = { ...this.defaultHeaders, ...headers };

    try {
      const response = await fetch(fullUrl, {
        method,
        headers: requestHeaders,
        body: data ? JSON.stringify(data) : undefined,
        signal: AbortSignal.timeout(this.timeout),
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        const errorParsed = errorEnvelopeSchema.safeParse(responseData);

        if (errorParsed.success) {
          throw new ApiError(
            errorParsed.data.error,
            response.status,
            errorParsed.data.code,
            errorParsed.data.details
          );
        }

        throw new ApiError(
          responseData?.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          responseData?.code
        );
      }

      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network request failed');
    }
  }

  applyResponseTransformation(data: unknown, url: string): unknown {
    if (!data) return data;

    for (const { match, transform } of URL_TRANSFORMER_REGISTRY) {
      if (match(url)) return transform(data);
    }

    return transformApiResponse(data);
  }

  async get<T = unknown>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, undefined, headers);
  }

  async getBlob(url: string, headers?: Record<string, string>): Promise<Blob> {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    const requestHeaders = { ...this.defaultHeaders, ...headers };
    // Remove Content-Type for blob requests - let browser set it
    delete requestHeaders['Content-Type'];

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: requestHeaders,
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorParsed = errorEnvelopeSchema.safeParse(errorData);

      if (errorParsed.success) {
        throw new ApiError(
          errorParsed.data.error,
          response.status,
          errorParsed.data.code,
          errorParsed.data.details
        );
      }

      throw new ApiError(
        errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData?.code
      );
    }

    return response.blob();
  }

  async post<T = unknown>(
    url: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data, headers);
  }

  async put<T = unknown>(
    url: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data, headers);
  }

  async delete<T = unknown>(
    url: string,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, undefined, headers);
  }

  async getData<T>(
    url: string,
    dataSchema: z.ZodType<T>,
    headers?: Record<string, string>
  ): Promise<T> {
    const response = await this.get(url, headers);

    const envelope = successEnvelopeSchema(dataSchema).parse(response.data);

    return envelope.data;
  }

  async getArray<T>(
    url: string,
    itemSchema: z.ZodType<T>,
    headers?: Record<string, string>
  ): Promise<T[]> {
    const response = await this.get(url, headers);

    const envelope = successEnvelopeSchema(z.array(itemSchema)).safeParse(response.data);

    if (!envelope.success) {
      throw envelope.error;
    }

    return envelope.data.data;
  }

  async postData<TResponse, TRequest = unknown>(
    url: string,
    body: TRequest,
    responseSchema: z.ZodType<TResponse>,
    headers?: Record<string, string>
  ): Promise<TResponse> {
    const response = await this.post(url, body, headers);

    const envelope = successEnvelopeSchema(responseSchema).parse(response.data);
    return envelope.data;
  }

  async putData<TResponse, TRequest = unknown>(
    url: string,
    body: TRequest,
    responseSchema: z.ZodType<TResponse>,
    headers?: Record<string, string>
  ): Promise<TResponse> {
    const response = await this.put(url, body, headers);

    const envelope = successEnvelopeSchema(responseSchema).parse(response.data);

    return envelope.data;
  }

  async deleteData(url: string, headers?: Record<string, string>): Promise<void> {
    await this.delete(url, headers);
  }

  async deleteWithData<T>(
    url: string,
    responseSchema: z.ZodType<T>,
    headers?: Record<string, string>
  ): Promise<T> {
    const response = await this.delete(url, headers);

    const envelope = successEnvelopeSchema(responseSchema).parse(response.data);

    return envelope.data;
  }
}

// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty string URL is invalid, must fallback
const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3001/api';

export const httpClient = new HttpClient({
  baseURL: API_BASE_URL,
});

export function configureHttpClientWithSessionService(sessionManager: TokenProvider) {
  const originalGet = httpClient.get.bind(httpClient);
  const originalPost = httpClient.post.bind(httpClient);
  const originalPut = httpClient.put.bind(httpClient);
  const originalDelete = httpClient.delete.bind(httpClient);
  const originalGetBlob = httpClient.getBlob.bind(httpClient);

  async function getAuthHeaders(): Promise<Record<string, string>> {
    const token = await sessionManager.getValidAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Single retry on 401: refresh the token and replay the request once.
   * Terminal session errors (idle/absolute timeout, revoked) are never retried.
   */
  async function withAuthRetry<T>(
    execute: (headers: Record<string, string>) => Promise<T>,
    baseHeaders: Record<string, string> | undefined
  ): Promise<T> {
    const authHeaders = await getAuthHeaders();

    try {
      return await execute({ ...baseHeaders, ...authHeaders });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        if (error.code && SESSION_TERMINAL_ERRORS.has(error.code)) {
          throw error;
        }

        const newToken = await sessionManager.getValidAccessToken();
        if (newToken) {
          return await execute({ ...baseHeaders, Authorization: `Bearer ${newToken}` });
        }
      }

      throw error;
    }
  }

  function applyTransform<T>(response: ApiResponse<T>, url: string): ApiResponse<T> {
    if (response && response.data) {
      response.data = httpClient.applyResponseTransformation(response.data, url) as T;
    }
    return response;
  }

  httpClient.get = async function <T = unknown>(url: string, headers?: Record<string, string>) {
    return withAuthRetry(h => originalGet<T>(url, h).then(r => applyTransform(r, url)), headers);
  };

  httpClient.delete = async function <T = unknown>(url: string, headers?: Record<string, string>) {
    return withAuthRetry(h => originalDelete<T>(url, h).then(r => applyTransform(r, url)), headers);
  };

  httpClient.post = async function <T = unknown>(
    url: string,
    data?: unknown,
    headers?: Record<string, string>
  ) {
    return withAuthRetry(
      h => originalPost<T>(url, data, h).then(r => applyTransform(r, url)),
      headers
    );
  };

  httpClient.put = async function <T = unknown>(
    url: string,
    data?: unknown,
    headers?: Record<string, string>
  ) {
    return withAuthRetry(
      h => originalPut<T>(url, data, h).then(r => applyTransform(r, url)),
      headers
    );
  };

  httpClient.getBlob = async function (url: string, headers?: Record<string, string>) {
    return withAuthRetry(h => originalGetBlob(url, h), headers);
  };
}
