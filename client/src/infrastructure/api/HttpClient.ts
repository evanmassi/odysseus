/**
 * HTTP Client
 *
 * Composition wrapper that layers auth headers and 401 retry over the base transport.
 */

import { successEnvelopeSchema, ApiError, API_ERROR_CODES } from '@odysseus/shared-schemas';
import { z } from 'zod';

import type { HttpTransport, ApiResponse } from './HttpTransport';
import type { TokenProvider } from '@shared/types/sessionTypes';

// Session errors that should NOT trigger token refresh — session is invalidated server-side
const SESSION_TERMINAL_ERRORS: Set<string> = new Set([
  API_ERROR_CODES.SESSION_IDLE_TIMEOUT,
  API_ERROR_CODES.SESSION_ABSOLUTE_TIMEOUT,
  API_ERROR_CODES.SESSION_REVOKED,
]);

export class HttpClient {
  private tokenProvider: TokenProvider | null = null;

  constructor(private readonly baseClient: HttpTransport) {}

  setTokenProvider(provider: TokenProvider): void {
    this.tokenProvider = provider;
  }

  // PRIMITIVE METHODS — auth headers + retry

  async get<T = unknown>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.withAuthRetry(h => this.baseClient.get<T>(url, h), headers);
  }

  async post<T = unknown>(
    url: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.withAuthRetry(h => this.baseClient.post<T>(url, data, h), headers);
  }

  async put<T = unknown>(
    url: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.withAuthRetry(h => this.baseClient.put<T>(url, data, h), headers);
  }

  async delete<T = unknown>(
    url: string,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.withAuthRetry(h => this.baseClient.delete<T>(url, h), headers);
  }

  async getBlob(url: string, headers?: Record<string, string>): Promise<Blob> {
    return this.withAuthRetry(h => this.baseClient.getBlob(url, h), headers);
  }

  // CONVENIENCE METHODS — envelope unwrapping + Zod validation

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

  // INTERNAL

  private async getAuthHeaders(): Promise<Record<string, string>> {
    if (!this.tokenProvider) return {};
    const token = await this.tokenProvider.getValidAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Single retry on 401: refresh the token and replay the request once.
   * Terminal session errors (idle/absolute timeout, revoked) are never retried.
   */
  private async withAuthRetry<T>(
    execute: (headers: Record<string, string>) => Promise<T>,
    baseHeaders: Record<string, string> | undefined
  ): Promise<T> {
    const authHeaders = await this.getAuthHeaders();

    try {
      return await execute({ ...baseHeaders, ...authHeaders });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        if (error.code && SESSION_TERMINAL_ERRORS.has(error.code)) {
          throw error;
        }

        if (this.tokenProvider) {
          const newToken = await this.tokenProvider.getValidAccessToken();
          if (newToken) {
            return await execute({ ...baseHeaders, Authorization: `Bearer ${newToken}` });
          }
        }
      }

      throw error;
    }
  }
}
