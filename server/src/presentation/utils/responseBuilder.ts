/**
 * Standardized API Response Builder
 *
 * Produces the canonical response shapes that match the client's
 * successEnvelopeSchema and errorEnvelopeSchema in shared-schemas.
 */

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
  timestamp: string;
}

export class ResponseBuilder {
  static success<T>(data: T): SuccessResponse<T> {
    return {
      success: true,
      data,
    };
  }

  static error(
    code: string,
    message: string,
    details?: unknown
  ): ErrorResponse {
    return {
      success: false,
      error: message,
      code,
      details,
      timestamp: new Date().toISOString(),
    };
  }

  static validationError(message: string, details?: unknown): ErrorResponse {
    return ResponseBuilder.error('VALIDATION_ERROR', message, details);
  }

  static unauthorized(message: string = 'Authentication required'): ErrorResponse {
    return ResponseBuilder.error('UNAUTHORIZED', message);
  }

  static forbidden(message: string = 'Access forbidden'): ErrorResponse {
    return ResponseBuilder.error('FORBIDDEN', message);
  }

  static notFound(resource: string, identifier?: string): ErrorResponse {
    const msg = identifier
      ? `${resource} not found: ${identifier}`
      : `${resource} not found`;
    return ResponseBuilder.error('NOT_FOUND', msg);
  }

  static conflict(message: string, details?: unknown): ErrorResponse {
    return ResponseBuilder.error('CONFLICT', message, details);
  }

  static internalError(message: string = 'Internal server error', details?: unknown): ErrorResponse {
    return ResponseBuilder.error('INTERNAL_SERVER_ERROR', message, details);
  }
}
