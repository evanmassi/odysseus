/**
 * Shared API Types
 * 
 * Common types used across the API layer for consistent request/response formats.
 */

// STANDARD API RESPONSE FORMAT

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  field?: string; // For validation errors
}

export interface ApiResponseMeta {
  timestamp: string;
  requestId: string;
  version: string;
  pagination?: PaginationMeta;
  executionTime?: number;
}

// PAGINATION TYPES

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

// SEARCH TYPES

export interface SearchRequest {
  query?: string;
  filters?: Record<string, any>;
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

// VALIDATION TYPES

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// AUDIT TYPES

export interface AuditInfo {
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  version: number;
}

// ERROR CODES

export const API_ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  
  // Business Logic
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  
  // System
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Data
  DATA_CONFLICT: 'DATA_CONFLICT',
  DATA_INTEGRITY_VIOLATION: 'DATA_INTEGRITY_VIOLATION',
  OPTIMISTIC_LOCK_FAILURE: 'OPTIMISTIC_LOCK_FAILURE'
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];

// HTTP STATUS MAPPINGS

export const ERROR_STATUS_MAPPINGS: Record<ApiErrorCode, number> = {
  // 401 Unauthorized
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  SESSION_EXPIRED: 401,
  
  // 403 Forbidden
  FORBIDDEN: 403,
  OPERATION_NOT_ALLOWED: 403,
  
  // 400 Bad Request
  VALIDATION_FAILED: 400,
  INVALID_INPUT: 400,
  REQUIRED_FIELD_MISSING: 400,
  BUSINESS_RULE_VIOLATION: 400,
  
  // 404 Not Found
  RESOURCE_NOT_FOUND: 404,
  
  // 409 Conflict
  RESOURCE_ALREADY_EXISTS: 409,
  DATA_CONFLICT: 409,
  OPTIMISTIC_LOCK_FAILURE: 409,
  
  // 422 Unprocessable Entity
  DATA_INTEGRITY_VIOLATION: 422,
  
  // 429 Too Many Requests
  RATE_LIMIT_EXCEEDED: 429,
  
  // 500 Internal Server Error
  INTERNAL_SERVER_ERROR: 500,
  
  // 503 Service Unavailable
  SERVICE_UNAVAILABLE: 503
};
