/**
 * HTTP Client for API communication
 */
import {
  successEnvelopeSchema,
  errorEnvelopeSchema,
  paginatedEnvelopeSchema,
  batchEnvelopeSchema,
  ApiError,
  type PaginatedResult,
  type BatchResult,
} from '@odysseus/shared-schemas';
import { z } from 'zod';

import { transformApiResponse, ResponseTransformers } from './responseTransformers';

import type { TokenProvider } from '@shared/session/types';

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

  /**
   * Apply intelligent response transformation based on endpoint patterns
   */
  applyResponseTransformation(data: unknown, url: string): unknown {
    if (!data) return data;

    if (url.includes('/auth/login') || url.includes('/auth/register')) {
      return ResponseTransformers.LoginResponse(data);
    } else if (url.includes('/auth/refresh')) {
      return ResponseTransformers.RefreshResponse(data);
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
    } else if (url.includes('/admin/users')) {
      if (Array.isArray(data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Raw API data before transformation
        return data.map((user: any) => ResponseTransformers.AdminUser(user));
      }
      return ResponseTransformers.AdminUser(data);
    } else if (url.includes('/admin/metrics')) {
      return ResponseTransformers.SystemMetrics(data);
    } else if (url.includes('/admin/audit')) {
      if (Array.isArray(data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Raw API data before transformation
        return data.map((entry: any) => ResponseTransformers.AuditLogEntry(entry));
      }
      return ResponseTransformers.AuditLogEntry(data);
    } else {
      return transformApiResponse(data);
    }
  }

  async get<T = unknown>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, undefined, headers);
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

  /**
   * GET request that unwraps envelope and validates data
   */
  async getData<T>(
    url: string,
    dataSchema: z.ZodType<T>,
    headers?: Record<string, string>
  ): Promise<T> {
    const response = await this.get(url, headers);

    const envelope = successEnvelopeSchema(dataSchema).parse(response.data);

    return envelope.data;
  }

  /**
   * GET request for array responses (most common)
   */
  async getArray<T>(
    url: string,
    itemSchema: z.ZodType<T>,
    headers?: Record<string, string>
  ): Promise<T[]> {
    const response = await this.get(url, headers);

    const envelope = successEnvelopeSchema(z.array(itemSchema)).safeParse(response.data);

    if (!envelope.success) {
      throw 'error' in envelope ? envelope.error : new Error('Validation failed');
    }

    return envelope.data.data;
  }

  /**
   * POST request that unwraps envelope and validates response
   */
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

  /**
   * PUT request that unwraps envelope and validates response
   */
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

  /**
   * DELETE request (returns void)
   */
  async deleteData(url: string, headers?: Record<string, string>): Promise<void> {
    await this.delete(url, headers);
  }

  /**
   * DELETE request that returns data
   * Unwraps envelope and validates response data
   */
  async deleteWithData<T>(
    url: string,
    responseSchema: z.ZodType<T>,
    headers?: Record<string, string>
  ): Promise<T> {
    const response = await this.delete(url, headers);

    const envelope = successEnvelopeSchema(responseSchema).parse(response.data);

    return envelope.data;
  }

  /**
   * GET paginated data
   */
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

  /**
   * POST/PUT batch operations
   */
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

  setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  removeAuthToken() {
    delete this.defaultHeaders['Authorization'];
  }
}

// Configure API base URL based on environment
const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3001/api';

export const httpClient = new HttpClient({
  baseURL: API_BASE_URL,
});

// Session Manager Integration
export function configureHttpClientWithSessionManager(sessionManager: TokenProvider) {
  // Configure the HTTP client to work with the session manager
  // This allows automatic token injection and refresh handling
  const originalGet = httpClient.get.bind(httpClient);
  const originalPost = httpClient.post.bind(httpClient);
  const originalPut = httpClient.put.bind(httpClient);
  const originalDelete = httpClient.delete.bind(httpClient);

  // Build auth headers with proactive token refresh
  async function buildAuthHeaders(sessionManager: TokenProvider): Promise<Record<string, string>> {
    const token = await sessionManager.getValidAccessToken(); // Pre-refresh if needed
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Token injection for methods without data (GET, DELETE)
  const injectNoData = async <T>(
    originalMethod: (url: string, headers?: Record<string, string>) => Promise<ApiResponse<T>>,
    url: string,
    headers: Record<string, string> | undefined,
    sessionManager: TokenProvider
  ) => {
    const authHeaders = await buildAuthHeaders(sessionManager);
    const requestHeaders = { ...headers, ...authHeaders };

    const response = await originalMethod(url, requestHeaders);
    if (response && response.data) {
      response.data = httpClient.applyResponseTransformation(response.data, url) as T;
    }
    return response;
  };

  // Token injection for methods with data (POST, PUT)
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

    const response = await originalMethod(url, data, requestHeaders);
    if (response && response.data) {
      response.data = httpClient.applyResponseTransformation(response.data, url) as T;
    }
    return response;
  };

  // Override methods with correct signatures
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
}
