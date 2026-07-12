/**
 * Transactional Context
 *
 * A Queryable bound to a single client already inside a transaction. Repositories constructed
 * against it enlist every write in that transaction instead of drawing their own pooled connection.
 */

import { logger } from '@infrastructure/logging/logger';

import type { Queryable } from './Queryable';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';

export class TransactionalContext implements Queryable {
  constructor(private client: PoolClient) {}

  async query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    return this.client.query<T>(sql, params);
  }

  async queryOne<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | null> {
    try {
      const result = await this.client.query<T>(sql, params);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Query error:', error);
      throw error;
    }
  }

  async queryMany<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
    try {
      const result = await this.client.query<T>(sql, params);
      return result.rows;
    } catch (error) {
      logger.error('Query error:', error);
      throw error;
    }
  }

  async queryByIds<T extends QueryResultRow>(table: string, columns: string, ids: string[]): Promise<T[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    return this.queryMany<T>(`SELECT ${columns} FROM ${table} WHERE id IN (${placeholders})`, ids);
  }

  async execute(sql: string, params: unknown[] = []): Promise<QueryResult> {
    try {
      return await this.client.query(sql, params);
    } catch (error) {
      logger.error('Execute error:', error);
      throw error;
    }
  }

  /**
   * Joins the transaction already in progress rather than opening a nested one: a second BEGIN on
   * this client is a no-op, and the inner COMMIT would then commit the caller's outer transaction.
   */
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    return fn(this.client);
  }

  /** Isolation is fixed when the outer transaction begins, so this also joins rather than nests. */
  async transactionSerializable<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    return fn(this.client);
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.client.query('SELECT 1 as test');
      return result.rows[0]?.test === 1;
    } catch {
      return false;
    }
  }
}
