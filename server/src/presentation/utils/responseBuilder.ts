/**
 * Standardized API Response Builder
 *
 * Produces the canonical response shapes that match the client's
 * successEnvelopeSchema and errorEnvelopeSchema in shared-schemas.
 */

import { API_ERROR_CODES } from '@odysseus/shared-schemas';

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

  static forbidden(message: string = 'Access forbidden'): ErrorResponse {
    return ResponseBuilder.error(API_ERROR_CODES.FORBIDDEN, message);
  }

  static internalError(message: string = 'Internal server error', details?: unknown): ErrorResponse {
    return ResponseBuilder.error(API_ERROR_CODES.INTERNAL_SERVER_ERROR, message, details);
  }
}
