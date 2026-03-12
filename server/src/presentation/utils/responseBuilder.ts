/**
 * Standardized API Response Builder
 *
 * Static factory methods for constructing consistent response objects.
 */

import { randomUUID } from 'crypto';
import type {
  ApiResponse,
  ApiResponseMeta,
} from '@presentation/types/apiResponseTypes';

export class ResponseBuilder {
  private static readonly API_VERSION = '1.0.0';

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

  static error(
    code: string,
    message: string,
    details?: unknown,
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

  static validationError(
    field: string,
    message: string,
    value?: unknown
  ): ApiResponse {
    return ResponseBuilder.error(
      'VALIDATION_FAILED',
      message,
      { value },
      field
    );
  }

  static unauthorized(message: string = 'Authentication required'): ApiResponse {
    return ResponseBuilder.error('UNAUTHORIZED', message);
  }

  static forbidden(message: string = 'Access forbidden'): ApiResponse {
    return ResponseBuilder.error('FORBIDDEN', message);
  }

  static notFound(resource: string, identifier?: string): ApiResponse {
    const message = identifier
      ? `${resource} not found: ${identifier}`
      : `${resource} not found`;

    return ResponseBuilder.error('NOT_FOUND', message);
  }

  static conflict(message: string, details?: unknown): ApiResponse {
    return ResponseBuilder.error('CONFLICT', message, details);
  }

  static internalError(
    message: string = 'Internal server error',
    details?: unknown
  ): ApiResponse {
    return ResponseBuilder.error('INTERNAL_SERVER_ERROR', message, details);
  }
}
