/**
 * Error Mapper
 *
 * Maps domain errors to standardized HTTP responses.
 * This ensures consistent error handling across all endpoints.
 */

import { ResponseBuilder } from '@presentation/utils/ResponseBuilder';
import type { ApiResponse } from '@presentation/types/apiResponse';
import { DomainError } from '@domain/errors/DomainError';
import { ValidationError } from '@domain/errors/ValidationError';
import { PermissionError } from '@domain/errors/PermissionError';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PasswordResetError } from '@domain/errors/PasswordResetError';
import { PasswordValidationError } from '@domain/errors/PasswordValidationError';

/** Zod error shape for type-safe error handling */
interface ZodErrorShape {
  issues: Array<{
    path: (string | number)[];
    message: string;
    received?: unknown;
  }>;
}

export class ErrorMapper {
  /**
   * Map any error to a standardized API response
   */
  static mapError(error: Error): ApiResponse {
    // Handle domain errors with proper status codes
    if (error instanceof DomainError) {
      return ResponseBuilder.error(
        error.code,
        error.message,
        error.context
      );
    }

    // Handle validation errors
    if (error instanceof ValidationError) {
      return ResponseBuilder.validationError('unknown', error.message);
    }

    // Handle permission errors
    if (error instanceof PermissionError) {
      return ResponseBuilder.forbidden(error.message);
    }

    // Handle not found errors
    if (error instanceof NotFoundError) {
      return ResponseBuilder.notFound('Resource', error.message);
    }

    // Handle password reset errors
    if (error instanceof PasswordResetError) {
      return ResponseBuilder.error(error.code, error.message);
    }

    // Handle password validation errors
    if (error instanceof PasswordValidationError) {
      return ResponseBuilder.validationError('password', error.message);
    }

    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      return this.mapZodError(error as unknown as ZodErrorShape);
    }

    // Handle known error types by name
    switch (error.constructor.name) {
      case 'UserAlreadyExistsError':
        return ResponseBuilder.conflict(error.message);
        
      case 'InvalidCredentialsError':
        return ResponseBuilder.unauthorized(error.message);
        
      case 'SessionExpiredError':
        return ResponseBuilder.unauthorized(error.message);
        
      case 'UserNotFoundError':
        return ResponseBuilder.notFound('User');
        
      case 'TubeNotFoundError':
        return ResponseBuilder.notFound('Tube');
        
      case 'ResearcherNotFoundError':
        return ResponseBuilder.notFound('Researcher');

      default:
        // Unknown error - don't leak internals
        const isDevelopment = process.env.NODE_ENV === 'development';
        return ResponseBuilder.internalError(
          isDevelopment ? error.message : 'An unexpected error occurred',
          isDevelopment ? { stack: error.stack } : undefined
        );
    }
  }

  /**
   * Map Zod validation errors to API response
   */
  private static mapZodError(zodError: ZodErrorShape): ApiResponse {
    const issues = zodError.issues || [];
    const firstIssue = issues[0];
    
    if (firstIssue) {
      return ResponseBuilder.validationError(
        firstIssue.path.join('.'),
        firstIssue.message,
        firstIssue.received
      );
    }
    
    return ResponseBuilder.validationError('unknown', 'Validation failed');
  }

  /**
   * Get appropriate HTTP status code for an error
   */
  static getStatusCode(error: Error): number {
    if (error instanceof DomainError) {
      return error.statusCode;
    }

    switch (error.constructor.name) {
      case 'ValidationError':
      case 'PasswordValidationError':
      case 'PasswordResetError':
      case 'ZodError':
        return 400;

      case 'InvalidCredentialsError':
      case 'SessionExpiredError':
        return 401;

      case 'PermissionError':
        return 403;

      case 'NotFoundError':
      case 'UserNotFoundError':
      case 'TubeNotFoundError':
      case 'ResearcherNotFoundError':
        return 404;

      case 'UserAlreadyExistsError':
        return 409;

      default:
        return 500;
    }
  }
}
