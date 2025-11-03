/**
 * Shared Error System - Index
 * 
 * Exports the complete error handling system for use throughout the application.
 */

// Core error classes
export {
  AppError,
  AuthenticationError,
  ValidationError,
  DomainError,
  InfrastructureError,
  ApiError,
  UnknownError,
  FieldResolutionError,
  FieldPathError,
} from './AppError';

// Type guards
export {
  isAppError,
  isRetryableError,
  isAuthError,
  isValidationError,
  isDomainError,
  isInfrastructureError,
} from './AppError';

// Error mapping utilities
export {
  mapError,
  mapQueryError,
  mapFormError,
  mapApiError,
  mapApiErrorSync,
  getErrorSeverity,
  shouldReportError,
  getErrorContext,
  type ErrorSeverity,
} from './mapError';
