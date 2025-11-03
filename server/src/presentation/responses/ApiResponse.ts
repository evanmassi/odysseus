/**
 * Standardized API Response Format
 * 
 * Provides consistent response structure across all endpoints.
 * Replaces the inconsistent response formats throughout the application.
 */

import { randomUUID } from 'crypto';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta: ApiResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  field?: string; // For validation errors
}

export interface ApiResponseMeta {
  timestamp: string;
  requestId: string;
  version: string;
  executionTime?: number;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Response Builder - Factory for creating standardized responses
 */
export class ResponseBuilder {
  private static readonly API_VERSION = '1.0.0';

  /**
   * Create a successful response
   */
  static success<T>(
    data: T, 
    meta?: Partial<ApiResponseMeta>
  ): ApiResponse<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: randomUUID(),
        version: ResponseBuilder.API_VERSION,
        ...meta
      }
    };
  }

  /**
   * Create an error response
   */
  static error(
    code: string,
    message: string,
    details?: any,
    field?: string,
    meta?: Partial<ApiResponseMeta>
  ): ApiResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details,
        field
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: randomUUID(),
        version: ResponseBuilder.API_VERSION,
        ...meta
      }
    };
  }

  /**
   * Create a paginated response
   */
  static paginated<T>(
    items: T[],
    total: number,
    page: number,
    limit: number,
    meta?: Partial<ApiResponseMeta>
  ): ApiResponse<T[]> {
    const totalPages = Math.ceil(total / limit);
    
    return {
      success: true,
      data: items,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: randomUUID(),
        version: ResponseBuilder.API_VERSION,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        ...meta
      }
    };
  }

  /**
   * Create a response with execution time tracking
   */
  static withTiming<T>(
    startTime: number,
    data: T,
    meta?: Partial<ApiResponseMeta>
  ): ApiResponse<T> {
    const executionTime = Date.now() - startTime;
    
    return ResponseBuilder.success(data, {
      ...meta,
      executionTime
    });
  }

  /**
   * Create an empty success response (for DELETE operations, etc.)
   */
  static empty(meta?: Partial<ApiResponseMeta>): ApiResponse<null> {
    return ResponseBuilder.success(null, meta);
  }

  /**
   * Create a validation error response
   */
  static validationError(
    field: string,
    message: string,
    value?: any
  ): ApiResponse {
    return ResponseBuilder.error(
      'VALIDATION_FAILED',
      message,
      { value },
      field
    );
  }

  /**
   * Create an unauthorized error response
   */
  static unauthorized(message: string = 'Authentication required'): ApiResponse {
    return ResponseBuilder.error('UNAUTHORIZED', message);
  }

  /**
   * Create a forbidden error response  
   */
  static forbidden(message: string = 'Access forbidden'): ApiResponse {
    return ResponseBuilder.error('FORBIDDEN', message);
  }

  /**
   * Create a not found error response
   */
  static notFound(resource: string, identifier?: string): ApiResponse {
    const message = identifier 
      ? `${resource} not found: ${identifier}`
      : `${resource} not found`;
    
    return ResponseBuilder.error('NOT_FOUND', message);
  }

  /**
   * Create a conflict error response
   */
  static conflict(message: string, details?: any): ApiResponse {
    return ResponseBuilder.error('CONFLICT', message, details);
  }

  /**
   * Create an internal server error response
   */
  static internalError(
    message: string = 'Internal server error',
    details?: any
  ): ApiResponse {
    return ResponseBuilder.error('INTERNAL_SERVER_ERROR', message, details);
  }
}
