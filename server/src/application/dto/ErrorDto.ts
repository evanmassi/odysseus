/**
 * Standardized API Error Responses
 *
 * Maps domain errors to HTTP status codes and response format.
 */

import { DomainError } from '@domain/errors/DomainError';
import { ValidationError } from '@domain/errors/ValidationError';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
  timestamp: string;
}

export class ErrorDto {
  static fromDomainError(error: Error): { status: number; response: ErrorResponse } {
    const baseResponse = {
      success: false as const,
      timestamp: new Date().toISOString()
    };

    if (error instanceof ValidationError) {
      return {
        status: 400,
        response: {
          ...baseResponse,
          error: error.message,
          code: 'VALIDATION_ERROR',
          details: error.context || {}
        }
      };
    }

    if (error instanceof NotFoundError) {
      return {
        status: 404,
        response: {
          ...baseResponse,
          error: error.message,
          code: 'NOT_FOUND',
          details: error.context || {}
        }
      };
    }

    if (error instanceof PermissionError) {
      return {
        status: 403,
        response: {
          ...baseResponse,
          error: error.message,
          code: 'PERMISSION_DENIED',
          details: error.context || {}
        }
      };
    }

    if (error instanceof DomainError) {
      return {
        status: 400,
        response: {
          ...baseResponse,
          error: error.message,
          code: 'DOMAIN_ERROR',
          details: error.context || {}
        }
      };
    }

    return {
      status: 500,
      response: {
        ...baseResponse,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      }
    };
  }

  static success<T>(data: T): { success: true; data: T } {
    return {
      success: true,
      data
    };
  }

  static customError(message: string, status: number = 400, code?: string, details?: unknown): { status: number; response: ErrorResponse } {
    return {
      status,
      response: {
        success: false,
        error: message,
        code,
        details,
        timestamp: new Date().toISOString()
      }
    };
  }
}
