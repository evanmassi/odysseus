/**
 * Error Mapping Utilities
 * 
 * Provides utilities for mapping unknown errors to our AppError taxonomy.
 * This ensures consistent error handling across the application.
 */

import { ZodError } from 'zod';
import {
  AppError,
  ApiError,
  ValidationError,
  InfrastructureError,
  UnknownError,
  DomainError,
  AuthenticationError,
  type FieldResolutionError,
  type FieldPathError,
} from './AppError';

/**
 * Maps any unknown error to our AppError taxonomy
 * This is the main function to use for error normalization
 */
export const mapError = (error: unknown): AppError => {
  // Already an AppError, return as-is
  if (error instanceof AppError) {
    return error;
  }

  // HTTP Response errors
  if (error instanceof Response) {
    return mapResponseErrorSync(error);
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    return mapZodError(error);
  }

  // Network/fetch errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new InfrastructureError(
      'NETWORK_ERROR',
      'Network request failed',
      { originalMessage: error.message }
    );
  }

  // Timeout errors
  if (error instanceof Error && error.name === 'AbortError') {
    return new InfrastructureError(
      'TIMEOUT',
      'Request was cancelled or timed out',
      { originalMessage: error.message }
    );
  }

  // Domain-specific errors (field resolution, etc.)
  if (error instanceof Error) {
    return mapStandardError(error);
  }

  // Everything else becomes UnknownError
  return new UnknownError(error);
};

/**
 * Maps HTTP Response to ApiError
 */
const mapResponseError = async (response: Response): Promise<ApiError> => {
  return ApiError.fromResponse(response);
};

/**
 * Maps Response synchronously (when we can't await)
 */
const mapResponseErrorSync = (response: Response): ApiError => {
  return new ApiError(
    response.status,
    response.statusText,
    `HTTP ${response.status}: ${response.statusText}`
  );
};

/**
 * Maps Zod validation errors to ValidationError
 */
const mapZodError = (zodError: ZodError): ValidationError => {
  const firstIssue = zodError.issues[0];
  const fieldPath = firstIssue?.path.join('.');
  const message = firstIssue?.message || 'Validation failed';

  return new ValidationError(
    'SCHEMA_VALIDATION',
    `Validation error${fieldPath ? ` at ${fieldPath}` : ''}: ${message}`,
    {
      issues: zodError.issues,
      fieldPath,
    }
  );
};

/**
 * Maps standard JavaScript errors based on patterns
 */
const mapStandardError = (error: Error): AppError => {
  const message = error.message.toLowerCase();

  // Authentication patterns
  if (
    message.includes('unauthorized') ||
    message.includes('authentication') ||
    message.includes('login') ||
    message.includes('credential')
  ) {
    return new AuthenticationError('INVALID_CREDENTIALS', error.message);
  }

  // Network patterns
  if (
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('unreachable')
  ) {
    return new InfrastructureError('NETWORK_ERROR', error.message);
  }

  // Validation patterns
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required') ||
    message.includes('missing')
  ) {
    return new ValidationError('FORM_VALIDATION', error.message);
  }

  // Field resolution patterns (for our field resolver system)
  if (message.includes('field') && (message.includes('unknown') || message.includes('resolution'))) {
    return new DomainError('FIELD_RESOLUTION_ERROR', error.message);
  }

  // Default to UnknownError
  return new UnknownError(error);
};

/**
 * Specialized mapping functions for specific error types
 */

/**
 * Maps React Query errors
 */
export const mapQueryError = (error: unknown): AppError => {
  // React Query wraps errors, so we need to extract the original
  if (error && typeof error === 'object' && 'cause' in error) {
    return mapError(error.cause);
  }

  return mapError(error);
};

/**
 * Maps form validation errors
 */
export const mapFormError = (error: unknown): ValidationError => {
  const appError = mapError(error);
  
  if (appError instanceof ValidationError) {
    return appError;
  }

  // Convert other errors to validation errors for form context
  return new ValidationError(
    'FORM_VALIDATION',
    appError.getUserMessage(),
    { originalError: appError }
  );
};

/**
 * Maps API response errors with proper async handling
 */
export const mapApiError = async (error: unknown): Promise<AppError> => {
  if (error instanceof Response) {
    return ApiError.fromResponse(error);
  }

  return mapError(error);
};

/**
 * Synchronous version for when async is not available
 */
export const mapApiErrorSync = (error: unknown): AppError => {
  if (error instanceof Response) {
    return mapResponseErrorSync(error);
  }

  return mapError(error);
};

/**
 * Error severity classification
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export const getErrorSeverity = (error: AppError): ErrorSeverity => {
  switch (error.type) {
    case 'AUTHENTICATION':
      return 'high';
    case 'VALIDATION':
      return 'low';
    case 'DOMAIN':
      return 'medium';
    case 'INFRASTRUCTURE':
      return error.code === 'SERVER_ERROR' ? 'critical' : 'medium';
    case 'UNKNOWN':
      return 'high';
    default:
      return 'medium';
  }
};

/**
 * Check if error should be reported to error tracking service
 */
export const shouldReportError = (error: AppError): boolean => {
  const severity = getErrorSeverity(error);
  
  // Don't report validation errors or low-severity issues
  if (severity === 'low') return false;
  
  // Don't report authentication errors (these are usually user errors)
  if (error.type === 'AUTHENTICATION') return false;
  
  // Report everything else
  return true;
};

/**
 * Extract error context for logging
 */
export const getErrorContext = (error: AppError): Record<string, any> => {
  return {
    type: error.type,
    code: error.code,
    message: error.message,
    retryable: error.retryable,
    severity: getErrorSeverity(error),
    timestamp: error.timestamp,
    details: error.details,
    shouldReport: shouldReportError(error),
  };
};
