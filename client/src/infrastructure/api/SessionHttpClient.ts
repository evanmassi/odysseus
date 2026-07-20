/**
 * Session HTTP Client
 *
 * Dedicated transport for auth endpoints — no token injection to avoid circular dependency with SessionService.
 */

import { ApiError } from '@odysseus/shared-schemas';

import { env } from '@shared/config';

const REQUEST_TIMEOUT_MS = 30_000;

export class SessionHttpClient {
  private readonly baseURL = env.apiBaseUrl();
  private readonly timeout = REQUEST_TIMEOUT_MS;

  async post<T = unknown>(
    path: string,
    data: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(data),
      headers,
    });
  }

  async get<T = unknown>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, {
      method: 'GET',
      headers,
    });
  }

  private async request<T>(path: string, options: RequestInit): Promise<T> {
    const url = `${this.baseURL}${path}`;

    // No Authorization header — auth endpoints must not auto-inject tokens
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: AbortSignal.timeout(this.timeout),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new ApiError(
          responseData.error || `Authentication request failed: ${response.status}`,
          response.status,
          responseData.code,
          responseData.details
        );
      }

      return responseData as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if ((error as Error).name === 'TimeoutError') {
        throw new ApiError('Authentication request timeout', 408);
      }

      throw new ApiError(
        `Authentication request failed: ${(error as Error).message}`,
        0,
        'NETWORK_ERROR',
        error
      );
    }
  }
}

export const sessionHttpClient = new SessionHttpClient();
