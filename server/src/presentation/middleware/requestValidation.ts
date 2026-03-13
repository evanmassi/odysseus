/**
 * Request Validation Middleware
 *
 * Zod-based validation for request body, params, and query parameters.
 */

import { logger } from '@infrastructure/logging/logger';

import type { Request, Response, NextFunction } from 'express';
import type { z } from 'zod';


interface ValidationError {
  field: string;
  message: string;
  received?: unknown;
}

type RequestSource = 'body' | 'params' | 'query';

const SOURCE_CONFIG: Record<RequestSource, { errorLabel: string; errorMessage: string }> = {
  body: { errorLabel: 'Validation failed', errorMessage: 'One or more fields contain invalid data' },
  params: { errorLabel: 'Invalid parameters', errorMessage: 'One or more URL parameters are invalid' },
  query: { errorLabel: 'Invalid query parameters', errorMessage: 'One or more query parameters are invalid' }
};

function createValidator(source: RequestSource) {
  const config = SOURCE_CONFIG[source];

  return (schema: z.ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const result = schema.safeParse(req[source]);

        if (!result.success) {
          const errors: ValidationError[] = result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
            received: 'received' in issue ? issue.received : undefined
          }));

          logger.warn(`${config.errorLabel}:`, {
            endpoint: req.path,
            method: req.method,
            errors,
            [source]: req[source]
          });

          res.status(400).json({
            error: config.errorLabel,
            message: config.errorMessage,
            details: errors
          });
          return;
        }

        // Express types don't support middleware type narrowing
        (req as any)[source] = result.data;
        next();
      } catch (error) {
        logger.error(`${config.errorLabel} middleware error:`, error);
        res.status(500).json({
          error: 'Internal validation error',
          message: 'An error occurred while validating your request'
        });
      }
    };
  };
}

export const validateBody = createValidator('body');
export const validateParams = createValidator('params');
export const validateQuery = createValidator('query');

/** Strips HTML tags and script blocks from all string values in the request body */
export const sanitizeStrings = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const sanitizeValue = (value: unknown): unknown => {
      if (typeof value === 'string') {
        return value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<[^>]*>/g, '')
          .trim();
      }

      if (typeof value === 'object' && value !== null) {
        const sanitized: Record<string, unknown> | unknown[] = Array.isArray(value) ? [] : {};
        for (const key in value) {
          (sanitized as Record<string, unknown>)[key] = sanitizeValue((value as Record<string, unknown>)[key]);
        }
        return sanitized;
      }

      return value;
    };

    if (req.body) {
      req.body = sanitizeValue(req.body);
    }

    next();
  } catch (error) {
    logger.error('Sanitization error:', error);
    res.status(500).json({
      error: 'Internal processing error',
      message: 'An error occurred while processing your request'
    });
  }
};
