/**
 * Transport and Base Response Schemas
 *
 * API envelope schemas, shared response base schemas, and normalized error class.
 */

import { z } from 'zod';

// Envelope schemas

export const successEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
    timestamp: z.string().datetime().optional(),
    requestId: z.string().optional(),
  });

export const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
  timestamp: z.string().datetime(),
});

// Base response schemas

export const messageResponseSchema = z.object({
  message: z.string(),
});

export type MessageResponse = z.infer<typeof messageResponseSchema>;

export const emptyResponseSchema = z.object({});

export const versionInfoSchema = z.object({
  version: z.string(),
  environment: z.string(),
  nodeVersion: z.string(),
  platform: z.string(),
});

export type VersionInfo = z.infer<typeof versionInfoSchema>;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown,
    public requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
