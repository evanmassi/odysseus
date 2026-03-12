/**
 * Controller Error Handler
 *
 * Single entry point for mapping caught errors to HTTP responses.
 * Domain errors map to appropriate status codes; unknown errors become 500s.
 */

import { Response } from 'express';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';
import { DomainError } from '@domain/errors/DomainError';
import { ValidationError } from '@domain/errors/ValidationError';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';
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
    res.status(400).json(ResponseBuilder.validationError('Invalid request data', error.errors));
    return;
  }

  if (err instanceof ValidationError) {
    res.status(400).json(ResponseBuilder.error('VALIDATION_ERROR', err.message, err.context || {}));
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json(ResponseBuilder.error('NOT_FOUND', err.message, err.context || {}));
    return;
  }

  if (err instanceof PermissionError) {
    res.status(403).json(ResponseBuilder.error('PERMISSION_DENIED', err.message, err.context || {}));
    return;
  }

  if (err instanceof DomainError) {
    res.status(400).json(ResponseBuilder.error('DOMAIN_ERROR', err.message, err.context || {}));
    return;
  }

  res.status(500).json(ResponseBuilder.internalError());
}
