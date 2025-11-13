/**
 * Repository Query Options Types
 *
 * Centralized query, pagination, and sorting option types for all repositories.
 */

/**
 * Pagination Result
 *
 * Standard paginated response structure used across all repositories
 */
export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Query Options
 *
 * Common query parameters for filtering and pagination
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  dateFrom?: Date;
  dateTo?: Date;
}
