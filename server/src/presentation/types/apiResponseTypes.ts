/**
 * Standardized API Response Format
 *
 * Provides consistent response structure across all endpoints.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  field?: string;
}

export interface ApiResponseMeta {
  timestamp: string;
  requestId: string;
  version: string;
  pagination?: PaginationMeta;
  executionTime?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}