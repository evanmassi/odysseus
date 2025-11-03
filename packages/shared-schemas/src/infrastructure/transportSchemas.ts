import { z } from 'zod';

/**
 * Transport layer schemas for server envelope validation
 * These schemas match the ErrorDto responses from the backend
 */

/**
 * Success envelope schema (matches ErrorDto.success)
 */
export const successEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
    timestamp: z.string().datetime().optional(),
    requestId: z.string().optional()
  });

/**
 * Error envelope schema (matches ErrorDto.fromDomainError)
 */
export const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
  timestamp: z.string().datetime()
});

/**
 * Paginated envelope schema (for future pagination support)
 */
export const paginatedEnvelopeSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: z.object({
      total: z.number().int().min(0),
      page: z.number().int().min(1),
      limit: z.number().int().min(1),
      totalPages: z.number().int().min(0),
      hasNext: z.boolean(),
      hasPrev: z.boolean()
    }).optional(),
    message: z.string().optional(),
    timestamp: z.string().datetime().optional()
  });

/**
 * Batch operation envelope schema (for bulk operations)
 */
export const batchEnvelopeSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.object({
      successful: z.array(itemSchema),
      failed: z.array(z.object({
        input: z.unknown(),
        error: z.object({
          code: z.string(),
          message: z.string(),
          field: z.string().optional()
        })
      })),
      summary: z.object({
        total: z.number().int().min(0),
        successful: z.number().int().min(0),
        failed: z.number().int().min(0)
      })
    })
  });

/**
 * Normalized error class for API failures
 * Used to standardize error handling across the application
 */
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

/**
 * Paginated result type for domain layer
 */
export type PaginatedResult<T> = {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

/**
 * Batch operation result type for domain layer
 */
export type BatchResult<T> = {
  successful: T[];
  failed: Array<{
    input: unknown;
    error: {
      code: string;
      message: string;
      field?: string;
    };
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
};
