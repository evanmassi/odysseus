/**
 * Authentication HTTP Client
 *
 * Dedicated transport for auth endpoints — no token injection to avoid circular dependency with SessionService.
 */

import { transformApiResponse } from './responseTransformers';

export interface AuthApiErrorData {
  message: string;
  status: number;
  code?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Error details structure varies by error type
  details?: any;
}

export class AuthApiError extends Error implements AuthApiErrorData {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Error details structure varies by error type
    public details?: any
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

export class AuthHttpClient {
  private readonly baseURL: string;
  private readonly timeout: number;

  constructor(
    config: { baseURL: string; timeout?: number } = {
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty string URL is invalid, must fallback
      baseURL: import.meta.env['VITE_API_URL'] || 'http://localhost:3001/api',
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new AuthApiError(
          responseData.message || `Authentication request failed: ${response.status}`,
          response.status,
          responseData.code,
          responseData.details
        );
      }

      const typeHint = path.includes('/refresh')
        ? 'RefreshResponse'
        : path.includes('/login')
          ? 'LoginResponse'
          : path.includes('/session-info')
            ? 'SessionInfo'
            : path.includes('/heartbeat')
              ? 'Heartbeat'
              : undefined;

      return transformApiResponse<T>(responseData, typeHint);
    } catch (error) {
      if (error instanceof AuthApiError) {
        throw error;
      }

      if ((error as Error).name === 'AbortError') {
        throw new AuthApiError('Authentication request timeout', 408);
      }

      throw new AuthApiError(
        `Authentication request failed: ${(error as Error).message}`,
        0, // Unknown status for network errors
        'NETWORK_ERROR',
        error
      );
    }
  }
}

export const authHttpClient = new AuthHttpClient();
