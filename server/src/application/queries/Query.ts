/**
 * Query Base Classes and Interfaces
 * 
 * CQRS Query pattern implementation for handling read operations.
 * Queries are used to retrieve data without side effects.
 */

import { randomUUID } from 'crypto';

export interface Query {
  /**
   * Unique identifier for this query instance.
   */
  readonly queryId: string;

  /**
   * Timestamp when the query was created.
   */
  readonly createdAt: Date;

  /**
   * The user who initiated this query (optional for read operations).
   */
  readonly requestedBy?: string;
}

export abstract class BaseQuery implements Query {
  public readonly queryId: string;
  public readonly createdAt: Date;

  constructor(
    public readonly requestedBy?: string
  ) {
    this.queryId = randomUUID();
    this.createdAt = new Date();
  }
}

/**
 * Query Handler Interface
 * 
 * Defines the contract for query handlers in the CQRS pattern.
 */
export interface QueryHandler<TQuery extends BaseQuery, TResult> {
  handle(query: TQuery): Promise<TResult>;
}

/**
 * Query Result
 * 
 * Standard result wrapper for query operations.
 */
export class QueryResult<T> {
  constructor(
    public readonly success: boolean,
    public readonly data?: T,
    public readonly error?: string,
    public readonly metadata?: QueryMetadata
  ) {}

  static success<T>(data: T, metadata?: QueryMetadata): QueryResult<T> {
    return new QueryResult<T>(true, data, undefined, metadata);
  }

  static failure<T>(error: string): QueryResult<T> {
    return new QueryResult<T>(false, undefined, error);
  }
}

/**
 * Query Metadata
 * 
 * Additional information about query execution.
 */
export interface QueryMetadata {
  executionTimeMs?: number;
  totalCount?: number;
  fromCache?: boolean;
  cacheExpiresAt?: Date;
}

/**
 * Pagination Parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated Result
 */
export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Search Parameters
 */
export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  pagination?: PaginationParams;
}
