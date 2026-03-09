/**
 * Validation middleware for request validation
 * Provides clean error responses and prevents invalid data from reaching handlers
 */
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '@infrastructure/logging/logger';

export interface ValidationError {
  field: string;
  message: string;
  received?: unknown;
}

/**
 * Generic validation middleware factory
 * Creates middleware that validates request body against a Zod schema
 */
export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        const errors: ValidationError[] = result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
          received: 'received' in issue ? issue.received : undefined
        }));

        logger.warn('Validation failed:', {
          endpoint: req.path,
          method: req.method,
          errors: errors,
          body: req.body
        });
        
        res.status(400).json({
          error: 'Validation failed',
          message: 'One or more fields contain invalid data',
          details: errors
        });
        return;
      }
      
      // Replace req.body with parsed/validated data
      req.body = result.data;
      next();
    } catch (error) {
      logger.error('Validation middleware error:', error);
      res.status(500).json({
        error: 'Internal validation error',
        message: 'An error occurred while validating your request'
      });
    }
  };
};

/**
 * Validate request parameters
 */
export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.params);
      
      if (!result.success) {
        const errors: ValidationError[] = result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
          received: 'received' in issue ? issue.received : undefined
        }));

        logger.warn('Parameter validation failed:', {
          endpoint: req.path,
          method: req.method,
          errors: errors,
          params: req.params
        });
        
        res.status(400).json({
          error: 'Invalid parameters',
          message: 'One or more URL parameters are invalid',
          details: errors
        });
        return;
      }
      
      // Assign validated data (Express types don't support middleware type narrowing)
      req.params = result.data as any;
      next();
    } catch (error) {
      logger.error('Parameter validation middleware error:', error);
      res.status(500).json({
        error: 'Internal validation error',
        message: 'An error occurred while validating your request'
      });
    }
  };
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.query);
      
      if (!result.success) {
        const errors: ValidationError[] = result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
          received: 'received' in issue ? issue.received : undefined
        }));

        logger.warn('Query validation failed:', {
          endpoint: req.path,
          method: req.method,
          errors: errors,
          query: req.query
        });
        
        res.status(400).json({
          error: 'Invalid query parameters',
          message: 'One or more query parameters are invalid',
          details: errors
        });
        return;
      }
      
      // Assign validated data (Express types don't support middleware type narrowing)
      req.query = result.data as any;
      next();
    } catch (error) {
      logger.error('Query validation middleware error:', error);
      res.status(500).json({
        error: 'Internal validation error',
        message: 'An error occurred while validating your request'
      });
    }
  };
};

// Business logic validation moved to domain layer
// Position validation now handled by TubePositionService in domain layer

/**
 * Sanitize string inputs to prevent XSS and injection attacks
 */
export const sanitizeStrings = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const sanitizeValue = (value: unknown): unknown => {
      if (typeof value === 'string') {
        // Remove potentially dangerous HTML/JS
        return value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<[^>]*>/g, '') // Remove HTML tags
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
