/**
 * Database Access Layer
 *
 * Manages the PostgreSQL connection lifecycle and ensures schema is up-to-date on startup.
 */

import { Pool } from 'pg';

import { logger } from '@infrastructure/logging/logger';

import { runMigrations } from './migrations/migrationRunner';

import type { PoolClient, QueryResult, QueryResultRow } from 'pg';

export interface DatabaseConnectionConfig {
  connectionString: string;
  ssl: boolean;
  maxConnections: number;
}

export class PostgresContext {
  private pool: Pool;
  private initialized: boolean = false;

  constructor(config: DatabaseConnectionConfig) {
    this.pool = new Pool({
      connectionString: config.connectionString,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: config.maxConnections,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected PostgreSQL pool error:', err);
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const client = await this.pool.connect();
      try {
        await client.query('SELECT NOW()');
      } finally {
        client.release();
      }

      await runMigrations(this.pool);

      this.initialized = true;
      logger.info('Database initialized');
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  async query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    return this.pool.query<T>(sql, params);
  }

  async queryOne<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | null> {
    try {
      const result = await this.pool.query<T>(sql, params);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Query error:', error);
      throw error;
    }
  }

  async queryMany<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
    try {
      const result = await this.pool.query<T>(sql, params);
      return result.rows;
    } catch (error) {
      logger.error('Query error:', error);
      throw error;
    }
  }

  /** Returns empty array for empty ID lists (no query executed). */
  async queryByIds<T extends QueryResultRow>(
    table: string,
    columns: string,
    ids: string[]
  ): Promise<T[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    return this.queryMany<T>(
      `SELECT ${columns} FROM ${table} WHERE id IN (${placeholders})`,
      ids
    );
  }

  async execute(sql: string, params: unknown[] = []): Promise<QueryResult> {
    try {
      return await this.pool.query(sql, params);
    } catch (error) {
      logger.error('Execute error:', error);
      throw error;
    }
  }

  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Transaction with SERIALIZABLE isolation level.
   * Prevents read/write anomalies but may fail with serialization errors on conflict.
   * Caller should handle retry logic for '40001' (serialization_failure) errors.
   */
  async transactionSerializable<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT 1 as test');
      return result.rows[0]?.test === 1;
    } catch {
      return false;
    }
  }

  getPoolStats(): { total: number; idle: number; waiting: number } {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export function parseCount(row: { count: string } | null): number {
  return parseInt(row?.count ?? '0', 10);
}

export function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function toISOString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
