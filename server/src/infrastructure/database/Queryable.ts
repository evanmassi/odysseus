/**
 * Database Queryable
 *
 * The query surface repositories depend on. Implemented by PostgresContext (pool-backed) and by
 * TransactionalContext (bound to one client inside a transaction), so the same repository works
 * identically whether or not it is enlisted in a unit of work.
 */

import type { PoolClient, QueryResult, QueryResultRow } from 'pg';

export interface Queryable {
  query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;
  queryOne<T extends QueryResultRow>(sql: string, params?: unknown[]): Promise<T | null>;
  queryMany<T extends QueryResultRow>(sql: string, params?: unknown[]): Promise<T[]>;
  queryByIds<T extends QueryResultRow>(table: string, columns: string, ids: string[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<QueryResult>;
  transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T>;
  transactionSerializable<T>(fn: (client: PoolClient) => Promise<T>): Promise<T>;
  isHealthy(): Promise<boolean>;
}
