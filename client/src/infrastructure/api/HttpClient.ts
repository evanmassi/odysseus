/**
 * HTTP Client for API Communication
 *
 * Fetch-based transport with envelope unwrapping, Zod validation, and offline write blocking.
 */
import {
  successEnvelopeSchema,
  errorEnvelopeSchema,
  paginatedEnvelopeSchema,
  batchEnvelopeSchema,
  ApiError,
  API_ERROR_CODES,
  type PaginatedResult,
  type BatchResult,
} from '@odysseus/shared-schemas';
import { z } from 'zod';

import { isOffline } from '@infra/connection/networkState';

import { transformApiResponse, ResponseTransformers } from './responseTransformers';

import type { TokenProvider } from '@shared/session/types';

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

    if (
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/force-change-password')
    ) {
      return ResponseTransformers.LoginResponse(data);
    } else if (url.includes('/auth/refresh')) {
      return ResponseTransformers.RefreshResponse(data);
    } else if (url.includes('/auth/verify')) {
      // Session verification returns same structure as login
      return ResponseTransformers.LoginResponse(data);
    } else if (url.includes('/auth/')) {
      // Other auth endpoints (first-time, password-requirements, etc.) have no date fields
      return transformApiResponse(data, 'AuthGenericResponse');
    } else if (url.includes('/users/me/profile')) {
      return ResponseTransformers.Person(data);
    } else if (url.includes('/users/me/sessions')) {
      if (Array.isArray(data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Raw API data before transformation
        return data.map((session: any) => ResponseTransformers.ActiveSession(session));
      }
      return ResponseTransformers.ActiveSession(data);
    } else if (url.includes('/users/me/settings')) {
      return transformApiResponse(data, 'UserSettingsResponse');
    } else if (url.includes('/configuration')) {
      return transformApiResponse(data, 'ConfigurationResponse');
    } else if (url.includes('/tubes')) {
      return transformApiResponse(data, 'TubeData');
    } else if (url.includes('/researchers')) {
      return ResponseTransformers.Researcher(data);
    } else if (url.includes('/lookups')) {
      return transformApiResponse(data, 'LookupValue');
    } else if (url.includes('/admin/users')) {
      if (Array.isArray(data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Raw API data before transformation
        return data.map((user: any) => ResponseTransformers.AdminUser(user));
      }
      return ResponseTransformers.AdminUser(data);
    } else if (url.includes('/admin/metrics')) {
      return ResponseTransformers.SystemMetrics(data);
    } else if (url.includes('/admin/security-config')) {
      return transformApiResponse(data, 'SecurityConfigResponse');
    } else if (url.includes('/admin/audit/statistics')) {
      return transformApiResponse(data, 'AuditStatistics');
    } else if (url.includes('/admin/audit/retention')) {
      return transformApiResponse(data, 'AuditRetention');
    } else if (url.includes('/admin/audit')) {
      if (Array.isArray(data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Raw API data before transformation
        return data.map((entry: any) => ResponseTransformers.AuditLogEntry(entry));
      }
      return ResponseTransformers.AuditLogEntry(data);
    } else if (url.includes('/session-info')) {
      return transformApiResponse(data, 'SessionInfo');
    } else if (url.includes('/users/lookup') || url.includes('/users/list')) {
      return transformApiResponse(data, 'UserLookup');
    } else {
      return transformApiResponse(data);
    }
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

  async getPaginated<T>(
    url: string,
    itemSchema: z.ZodType<T>,
    headers?: Record<string, string>
  ): Promise<PaginatedResult<T>> {
    const response = await this.get(url, headers);

    const envelope = paginatedEnvelopeSchema(itemSchema).parse(response.data);

    return {
      items: envelope.data,
      pagination: envelope.pagination ?? {
        total: envelope.data.length,
        page: 1,
        limit: envelope.data.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };
  }

  async postBatch<T>(
    url: string,
    body: unknown,
    itemSchema: z.ZodType<T>,
    headers?: Record<string, string>
  ): Promise<BatchResult<T>> {
    const response = await this.post(url, body, headers);

    const envelope = batchEnvelopeSchema(itemSchema).parse(response.data);

    return envelope.data;
  }
}

// Configure API base URL based on environment
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

  async function buildAuthHeaders(sessionManager: TokenProvider): Promise<Record<string, string>> {
    const token = await sessionManager.getValidAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  const injectNoData = async <T>(
    originalMethod: (url: string, headers?: Record<string, string>) => Promise<ApiResponse<T>>,
    url: string,
    headers: Record<string, string> | undefined,
    sessionManager: TokenProvider
  ) => {
    const authHeaders = await buildAuthHeaders(sessionManager);
    const requestHeaders = { ...headers, ...authHeaders };

    try {
      const response = await originalMethod(url, requestHeaders);
      if (response && response.data) {
        response.data = httpClient.applyResponseTransformation(response.data, url) as T;
      }
      return response;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        if (error.code && SESSION_TERMINAL_ERRORS.has(error.code)) {
          throw error;
        }

        const newToken = await sessionManager.getValidAccessToken();

        if (newToken) {
          const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
          const retryResponse = await originalMethod(url, retryHeaders);

          if (retryResponse && retryResponse.data) {
            retryResponse.data = httpClient.applyResponseTransformation(
              retryResponse.data,
              url
            ) as T;
          }
          return retryResponse;
        }
      }

      throw error;
    }
  };

  const injectWithData = async <T>(
    originalMethod: (
      url: string,
      data?: unknown,
      headers?: Record<string, string>
    ) => Promise<ApiResponse<T>>,
    url: string,
    data: unknown,
    headers: Record<string, string> | undefined,
    sessionManager: TokenProvider
  ) => {
    const authHeaders = await buildAuthHeaders(sessionManager);
    const requestHeaders = { ...headers, ...authHeaders };

    try {
      const response = await originalMethod(url, data, requestHeaders);
      if (response && response.data) {
        response.data = httpClient.applyResponseTransformation(response.data, url) as T;
      }
      return response;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        if (error.code && SESSION_TERMINAL_ERRORS.has(error.code)) {
          throw error;
        }

        const newToken = await sessionManager.getValidAccessToken();

        if (newToken) {
          const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
          const retryResponse = await originalMethod(url, data, retryHeaders);

          if (retryResponse && retryResponse.data) {
            retryResponse.data = httpClient.applyResponseTransformation(
              retryResponse.data,
              url
            ) as T;
          }
          return retryResponse;
        }
      }

      throw error;
    }
  };
  httpClient.get = async function <T = unknown>(url: string, headers?: Record<string, string>) {
    return injectNoData<T>(originalGet, url, headers, sessionManager);
  };

  httpClient.delete = async function <T = unknown>(url: string, headers?: Record<string, string>) {
    return injectNoData<T>(originalDelete, url, headers, sessionManager);
  };

  httpClient.post = async function <T = unknown>(
    url: string,
    data?: unknown,
    headers?: Record<string, string>
  ) {
    return injectWithData<T>(originalPost, url, data, headers, sessionManager);
  };

  httpClient.put = async function <T = unknown>(
    url: string,
    data?: unknown,
    headers?: Record<string, string>
  ) {
    return injectWithData<T>(originalPut, url, data, headers, sessionManager);
  };

  httpClient.getBlob = async function (url: string, headers?: Record<string, string>) {
    const authHeaders = await buildAuthHeaders(sessionManager);
    const requestHeaders = { ...headers, ...authHeaders };

    try {
      return await originalGetBlob(url, requestHeaders);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        if (error.code && SESSION_TERMINAL_ERRORS.has(error.code)) {
          throw error;
        }

        const newToken = await sessionManager.getValidAccessToken();
        if (newToken) {
          const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
          return await originalGetBlob(url, retryHeaders);
        }
      }
      throw error;
    }
  };
}
