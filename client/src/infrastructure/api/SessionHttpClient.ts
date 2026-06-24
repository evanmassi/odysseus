/**
 * Session HTTP Client
 *
 * Dedicated transport for auth endpoints — no token injection to avoid circular dependency with SessionService.
 */

import { ApiError } from '@odysseus/shared-schemas';

import { env } from '@shared/config';

export class SessionHttpClient {
  private readonly baseURL: string;
  private readonly timeout: number;

  constructor(
    config: { baseURL: string; timeout?: number } = {
      baseURL: env.apiBaseUrl(),
    }
  ) {
    this.baseURL = config.baseURL;
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Config default, 0/empty values are invalid
    this.timeout = config.timeout || 30000;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic HTTP client, accepts any request body
  async post<T = any>(path: string, data: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(data),
      headers,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic HTTP client response type
  async get<T = any>(path: string, headers?: Record<string, string>): Promise<T> {
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
          responseData.message || `Authentication request failed: ${response.status}`,
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

      if ((error as Error).name === 'AbortError') {
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
