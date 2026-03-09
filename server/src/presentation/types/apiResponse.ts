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

export interface PaginationRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchRequest {
  query?: string;
  filters?: Record<string, unknown>;
  pagination?: PaginationRequest;
}

export interface SearchResponse<T> {
  items: T[];
  pagination: PaginationMeta;
  facets?: SearchFacet[];
}

export interface SearchFacet {
  field: string;
  values: SearchFacetValue[];
}

export interface SearchFacetValue {
  value: string;
  count: number;
}

export interface ApiValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface ApiValidationResult {
  isValid: boolean;
  errors: ApiValidationError[];
}

export interface AuditInfo {
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  version: number;
}
