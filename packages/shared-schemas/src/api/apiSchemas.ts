/**
 * Shared API schemas and utilities
 * 
 * NOTE: Envelope schemas (success/error wrappers) have been moved to:
 * @see infrastructure/transportSchemas.ts
 * 
 * This file contains only:
 * - WebSocket message schemas
 * - Query parameter schemas
 * - Shared API constants
 */

import { z } from 'zod';

/**
 * WebSocket message schema
 */
export const websocketMessageSchema = z.object({
  type: z.string(),
  event: z.string(),
  data: z.unknown(),
  timestamp: z.string().datetime(),
  userId: z.string().optional(),
  requestId: z.string().optional()
});

/**
 * Generic query parameters schema
 */
export const queryParametersSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  fields: z.string().optional(), // comma-separated field names
  include: z.string().optional(), // comma-separated relation names
  filter: z.record(z.string(), z.string()).optional()
});

export type WebSocketMessage = z.infer<typeof websocketMessageSchema>;
export type QueryParameters = z.infer<typeof queryParametersSchema>;

/**
 * HTTP status code validation
 */
export const httpStatusSchema = z.union([
  z.literal(200), z.literal(201), z.literal(204),
  z.literal(400), z.literal(401), z.literal(403), z.literal(404), z.literal(409), z.literal(422),
  z.literal(500), z.literal(502), z.literal(503)
]);

/**
 * Common API error codes
 */
export const API_ERROR_CODES = {
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Session Management
  SESSION_IDLE_TIMEOUT: 'SESSION_IDLE_TIMEOUT',
  SESSION_ABSOLUTE_TIMEOUT: 'SESSION_ABSOLUTE_TIMEOUT',
  SESSION_REVOKED: 'SESSION_REVOKED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  REQUIRED_FIELD: 'REQUIRED_FIELD',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Operations
  OPERATION_FAILED: 'OPERATION_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',

  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR'
} as const;
