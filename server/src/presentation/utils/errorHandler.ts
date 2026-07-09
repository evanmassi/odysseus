/**
 * Controller Error Handler
 *
 * Single entry point for mapping caught errors to HTTP responses.
 * Domain errors map to appropriate status codes; unknown errors become 500s.
 */

import { API_ERROR_CODES } from '@odysseus/shared-schemas';


import { DomainError } from '@domain/errors/DomainError';
import { logger } from '@infrastructure/logging/logger';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Response } from 'express';

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
    res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.VALIDATION_FAILED, 'Invalid request data', error.errors));
    return;
  }

  if (err instanceof DomainError) {
    res.status(err.statusCode).json(ResponseBuilder.error(err.code, err.message, err.context ?? {}));
    return;
  }

  res.status(500).json(ResponseBuilder.internalError());
}
