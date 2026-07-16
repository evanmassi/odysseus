/**
 * HTTP Client Base Transport
 *
 * Fetch-based transport with error parsing and offline write blocking. No auth, no transformation.
 */

import { errorEnvelopeSchema, ApiError } from '@odysseus/shared-schemas';

import { isOffline } from '@infra/connection';
import { env } from '@shared/config';

export const OFFLINE_WRITE_BLOCKED_CODE = 'OFFLINE_WRITE_BLOCKED';

export class OfflineWriteError extends ApiError {
  constructor() {
    super(
      "You're offline. Changes cannot be saved until connection is restored.",
      0, // status 0 indicates network error
      OFFLINE_WRITE_BLOCKED_CODE
    );
    this.name = 'OfflineWriteError';
  }
}

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export interface HttpTransportConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
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
  ): Promise<T> {
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
        throw this.buildApiError(response, responseData);
      }

      return responseData as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network request failed');
    }
  }

  private buildApiError(response: Response, body: unknown): ApiError {
    const parsed = errorEnvelopeSchema.safeParse(body);
    if (parsed.success) {
      return new ApiError(
        parsed.data.error,
        response.status,
        parsed.data.code,
        parsed.data.details
      );
    }
    const fallback = body as { message?: string; code?: string } | null;
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty/missing message should fall back to the HTTP status line
    const message = fallback?.message || `HTTP ${response.status}: ${response.statusText}`;
    return new ApiError(message, response.status, fallback?.code);
  }

  async get<T = unknown>(url: string, headers?: Record<string, string>): Promise<T> {
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
      throw this.buildApiError(response, errorData);
    }

    return response.blob();
  }

  async post<T = unknown>(
    url: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>('POST', url, data, headers);
  }

  async put<T = unknown>(
    url: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>('PUT', url, data, headers);
  }

  async delete<T = unknown>(url: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('DELETE', url, undefined, headers);
  }
}

export const baseTransport = new HttpTransport({
  baseURL: env.apiBaseUrl(),
});
