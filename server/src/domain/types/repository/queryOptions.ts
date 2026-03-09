/**
 * Repository Query Options Types
 *
 * Centralized query, pagination, and sorting option types for all repositories.
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

export interface QueryOptions {
  limit?: number;
  offset?: number;
  dateFrom?: Date;
  dateTo?: Date;
}
