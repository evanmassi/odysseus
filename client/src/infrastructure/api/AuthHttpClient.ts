/**
 * Authentication HTTP Client
 *
 * Dedicated HTTP client for authentication endpoints only.
 * Prevents circular dependency with SessionService by providing
 * a pure HTTP transport layer without token injection.
 *
 * Purpose:
 * - Handle /login, /refresh, /logout endpoints
 * - No automatic token injection (prevents circular dependency)
 * - No 401 retry logic (auth endpoints don't need token refresh)
 * - Simple, focused transport layer
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

/**
 * Pure HTTP client for authentication operations
 *
 * This client intentionally does NOT:
 * - Inject authentication tokens (prevents circular dependency)
 * - Handle 401 retries (auth endpoints handle their own errors)
 * - Use SessionService (would create infinite loop)
 * - Apply complex transformations (keeps it simple)
 */
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

  /**
   * POST request for authentication endpoints
   *
   * @param path - API path (e.g., '/public/auth/login')
   * @param data - Request payload
   * @param headers - Optional additional headers
   * @returns Promise with parsed JSON response
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic HTTP client, accepts any request body
  async post<T = any>(path: string, data: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(data),
      headers,
    });
  }

  /**
   * GET request for authentication endpoints (if needed)
   *
   * @param path - API path
   * @param headers - Optional additional headers (e.g., Authorization for session-info)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic HTTP client response type
  async get<T = any>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, {
      method: 'GET',
      headers,
    });
  }

  /**
   * Core request method with minimal error handling
   */
  private async request<T>(path: string, options: RequestInit): Promise<T> {
    const url = `${this.baseURL}${path}`;

    // Build headers - NO Authorization header
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new AuthApiError(
          responseData.message || `Authentication request failed: ${response.status}`,
          response.status,
          responseData.code,
          responseData.details
        );
      }

      // Apply response transformation (converts date strings to Date objects)
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

      // Handle fetch errors (network, timeout, etc.)
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

  /**
   * Get base URL for debugging
   */
  getBaseURL(): string {
    return this.baseURL;
  }
}

/**
 * Default auth HTTP client instance
 */
export const authHttpClient = new AuthHttpClient();
