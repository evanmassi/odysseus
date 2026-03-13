/**
 * Authenticated HTTP Client
 *
 * Composition wrapper that layers auth headers, 401 retry, and response transformation over the base transport.
 */

import { successEnvelopeSchema, ApiError, API_ERROR_CODES } from '@odysseus/shared-schemas';
import { z } from 'zod';

import { transformApiResponse, ResponseTransformers } from './responseTransformers';

import type { HttpClient, ApiResponse } from './HttpClient';
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

export class AuthenticatedHttpClient {
  private tokenProvider: TokenProvider | null = null;

  constructor(private readonly baseClient: HttpClient) {}

  setTokenProvider(provider: TokenProvider): void {
    this.tokenProvider = provider;
  }

  // PRIMITIVE METHODS — auth headers + retry + response transformation

  async get<T = unknown>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.withAuthRetry(
      h => this.baseClient.get<T>(url, h).then(r => this.applyTransform(r, url)),
      headers
    );
  }

  async post<T = unknown>(
    url: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.withAuthRetry(
      h => this.baseClient.post<T>(url, data, h).then(r => this.applyTransform(r, url)),
      headers
    );
  }

  async put<T = unknown>(
    url: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.withAuthRetry(
      h => this.baseClient.put<T>(url, data, h).then(r => this.applyTransform(r, url)),
      headers
    );
  }

  async delete<T = unknown>(
    url: string,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.withAuthRetry(
      h => this.baseClient.delete<T>(url, h).then(r => this.applyTransform(r, url)),
      headers
    );
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

  private applyTransform<T>(response: ApiResponse<T>, url: string): ApiResponse<T> {
    if (response && response.data) {
      response.data = this.applyResponseTransformation(response.data, url) as T;
    }
    return response;
  }

  private applyResponseTransformation(data: unknown, url: string): unknown {
    if (!data) return data;

    for (const { match, transform } of URL_TRANSFORMER_REGISTRY) {
      if (match(url)) return transform(data);
    }

    return transformApiResponse(data);
  }
}
