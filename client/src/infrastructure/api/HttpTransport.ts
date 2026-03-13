/**
 * HTTP Client Base Transport
 *
 * Fetch-based transport with error parsing and offline write blocking. No auth, no transformation.
 */

import { errorEnvelopeSchema, ApiError } from '@odysseus/shared-schemas';

import { isOffline } from '@infra/connection';

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

export interface HttpTransportConfig {
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

export class HttpTransport {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor(config: HttpTransportConfig = {}) {
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
}

// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty string URL is invalid, must fallback
const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3001/api';

export const baseTransport = new HttpTransport({
  baseURL: API_BASE_URL,
});
