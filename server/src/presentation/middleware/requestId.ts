/**
 * Request ID Middleware
 *
 * Generates unique request IDs for traceability across logs.
 * Attaches ID to request object and response header.
 */

import crypto from 'crypto';

import type { Request, Response, NextFunction } from 'express';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
}
