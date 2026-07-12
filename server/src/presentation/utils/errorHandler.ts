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

// Domain-error `context` is internal by default (logged, never returned). Only these keys —
// the ones a client legitimately consumes (position-conflict location, optimistic-lock versions) —
// are echoed back, so a future error can't leak a sensitive value it happens to stash in context.
const CLIENT_SAFE_CONTEXT_KEYS = [
  'code', 'tankId', 'rackId', 'boxId', 'position', 'currentVersion', 'expectedVersion',
] as const;

export function filterPublicContext(
  context: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!context) return undefined;
  const safe: Record<string, unknown> = {};
  for (const key of CLIENT_SAFE_CONTEXT_KEYS) {
    if (key in context) safe[key] = context[key];
  }
  return Object.keys(safe).length > 0 ? safe : undefined;
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
    ...(err instanceof DomainError && err.context && { errorContext: err.context }),
    ...(isZodError(error) && { validationErrors: error.errors })
  });

  if (isZodError(error)) {
    res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.VALIDATION_FAILED, 'Invalid request data', error.errors));
    return;
  }

  if (err instanceof DomainError) {
    res.status(err.statusCode).json(ResponseBuilder.error(err.code, err.message, filterPublicContext(err.context)));
    return;
  }

  res.status(500).json(ResponseBuilder.internalError());
}
