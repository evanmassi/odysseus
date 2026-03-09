/**
 * Controller Error Handler
 *
 * Centralizes error handling for all controllers with type-safe unknown handling.
 * Converts caught exceptions to appropriate HTTP responses.
 */

import { Response } from 'express';
import { ErrorDto } from '@application/dto/ErrorDto';
import { logger } from '@infrastructure/logging/logger';

/** Type guard for Zod validation errors. */
function isZodError(value: unknown): value is { name: 'ZodError'; errors: unknown[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    (value as { name: unknown }).name === 'ZodError'
  );
}

/**
 * Convert unknown caught value to Error instance.
 * Catch blocks receive `unknown` - this safely extracts error information.
 */
function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  return new Error('An unexpected error occurred');
}

/**
 * Handle controller errors and send appropriate HTTP response.
 *
 * @param error - Caught exception (typed as unknown for safety)
 * @param res - Express response object
 * @param context - Log context describing the failed operation
 * @param requestId - Optional request ID for traceability
 */
export function handleControllerError(
  error: unknown,
  res: Response,
  context: string,
  requestId?: string
): void {
  const err = error instanceof Error ? error : new Error(String(error));

  logger.error(context, {
    requestId,
    errorType: err.constructor.name,
    message: err.message,
    stack: err.stack,
    ...(isZodError(error) && { validationErrors: error.errors })
  });

  // Zod validation errors get special handling
  if (isZodError(error)) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.errors
      }
    });
    return;
  }

  const errorResponse = ErrorDto.fromDomainError(err);
  res.status(errorResponse.status).json(errorResponse.response);
}
