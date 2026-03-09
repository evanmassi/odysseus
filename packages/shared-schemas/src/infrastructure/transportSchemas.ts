/**
 * Server Transport Envelopes
 *
 * Zod schemas for API response validation and normalized error class for API failures.
 */

import { z } from 'zod';

// Maps to ErrorDto.success
export const successEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
    timestamp: z.string().datetime().optional(),
    requestId: z.string().optional()
  });

// Maps to ErrorDto.fromDomainError
export const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
  timestamp: z.string().datetime()
});

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
