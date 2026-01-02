/**
 * Type-safe API client with Zod validation
 * Provides centralized HTTP client with automatic data validation
 */

import type { ZodSchema } from 'zod';

/**
 * API error class for structured error handling
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: unknown
  ) {
    super(`API Error ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

/**
 * Validation error for schema validation failures
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public issues: unknown[]
  ) {
    super(`Validation Error: ${message}`);
    this.name = 'ValidationError';
  }
}

/**
 * Type-safe API client configuration
 */
interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * HTTP request options
 */
interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Type-safe API client class
 */
export class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor(config: ApiClientConfig) {
    this.baseURL = config.baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Config default, 0/empty values are invalid
    this.timeout = config.timeout || 30000;
  }

  /**
   * Make a GET request with schema validation
   */
  async get<T>(endpoint: string, schema: ZodSchema<T>, options?: RequestOptions): Promise<T> {
    const response = await this.fetch('GET', endpoint, undefined, options);
    return this.validateAndReturn(response, schema);
  }

  /**
   * Make a POST request with schema validation
   */
  async post<T>(
    endpoint: string,
    data: unknown,
    schema: ZodSchema<T>,
    options?: RequestOptions
  ): Promise<T> {
    const response = await this.fetch('POST', endpoint, data, options);
    return this.validateAndReturn(response, schema);
  }

  /**
   * Make a PUT request with schema validation
   */
  async put<T>(
    endpoint: string,
    data: unknown,
    schema: ZodSchema<T>,
    options?: RequestOptions
  ): Promise<T> {
    const response = await this.fetch('PUT', endpoint, data, options);
    return this.validateAndReturn(response, schema);
  }

  /**
   * Make a DELETE request with schema validation
   */
  async delete<T>(endpoint: string, schema: ZodSchema<T>, options?: RequestOptions): Promise<T> {
    const response = await this.fetch('DELETE', endpoint, undefined, options);
    return this.validateAndReturn(response, schema);
  }

  /**
   * Raw fetch wrapper with error handling
   */
  private async fetch(
    method: string,
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;

    const headers = {
      ...this.defaultHeaders,
      ...options?.headers,
    };

    const controller = new AbortController();
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Config default, 0/empty values are invalid
    const timeout = options?.timeout || this.timeout;

    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ApiError(
          response.status,
          response.statusText,
          await this.safeJsonParse(response)
        );
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError(408, 'Request Timeout');
      }

      throw new ApiError(500, 'Network Error', error);
    }
  }

  /**
   * Validate response data with Zod schema
   */
  private async validateAndReturn<T>(response: Response, schema: ZodSchema<T>): Promise<T> {
    const rawData = await this.safeJsonParse(response);

    try {
      return schema.parse(rawData);
    } catch (error) {
      throw new ValidationError(
        'Response data validation failed',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Access Zod error issues property
        (error as any).issues || [error]
      );
    }
  }

  /**
   * Safely parse JSON response
   */
  private async safeJsonParse(response: Response): Promise<unknown> {
    const text = await response.text();

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Remove authentication token
   */
  removeAuthToken() {
    delete this.defaultHeaders['Authorization'];
  }

  /**
   * Update default headers
   */
  setHeaders(headers: Record<string, string>) {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient({
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty string URL is invalid, must fallback
  baseURL: import.meta.env['VITE_API_URL'] || 'http://localhost:3001/api',
  timeout: 30000,
});

/**
 * Utility function to create API client with custom config
 */
export const createApiClient = (config: ApiClientConfig) => new ApiClient(config);
