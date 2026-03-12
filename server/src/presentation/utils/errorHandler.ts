/**
 * Controller Error Handler
 *
 * Centralizes error handling for all controllers with type-safe unknown handling.
 */

import { Response } from 'express';
import { ErrorDto } from '@application/dto/ErrorDto';
import { logger } from '@infrastructure/logging/logger';

function isZodError(value: unknown): value is { name: 'ZodError'; errors: unknown[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    (value as { name: unknown }).name === 'ZodError'
  );
}

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
