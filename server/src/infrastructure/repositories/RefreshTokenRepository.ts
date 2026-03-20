/**
 * Refresh Token Repository
 *
 * OAuth 2.0 refresh token persistence with revocation and cleanup support.
 */

import type { RefreshToken } from '@domain/entities/RefreshToken';
import type { RefreshTokenRepository as IRefreshTokenRepository, IpTokenCount } from '@domain/repositories/RefreshTokenRepository';
import type { RefreshTokenRow } from '@infrastructure/database/mappers/RefreshTokenMapper';
import { RefreshTokenMapper } from '@infrastructure/database/mappers/RefreshTokenMapper';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';
import { parseCount } from '@infrastructure/database/PostgresContext';

const REFRESH_TOKEN_COLUMNS = `
  id, user_id, token, expires_at, created_at, last_used_at, is_revoked, user_agent, ip_address
`.trim();

const DEFAULT_CLEANUP_DAYS = 30;

export class RefreshTokenRepository implements IRefreshTokenRepository {

  constructor(private context: PostgresContext) {}

  // Basic CRUD operations

  async findById(id: string): Promise<RefreshToken | null> {
    const row = await this.context.queryOne<RefreshTokenRow>(
      `SELECT ${REFRESH_TOKEN_COLUMNS} FROM refresh_tokens WHERE id = $1`,
      [id]
    );
    return row ? RefreshTokenMapper.fromRow(row) : null;
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    const row = await this.context.queryOne<RefreshTokenRow>(
      `SELECT ${REFRESH_TOKEN_COLUMNS} FROM refresh_tokens WHERE token = $1`,
      [token]
    );
    return row ? RefreshTokenMapper.fromRow(row) : null;
  }

  async findValidTokensByUserId(userId: string): Promise<RefreshToken[]> {
    const now = new Date();
    const rows = await this.context.queryMany<RefreshTokenRow>(
      `SELECT ${REFRESH_TOKEN_COLUMNS} FROM refresh_tokens
       WHERE user_id = $1
         AND is_revoked = FALSE
         AND expires_at > $2
       ORDER BY created_at DESC`,
      [userId, now]
    );
    return RefreshTokenMapper.fromRows(rows);
  }

  async findAllTokensByUserId(userId: string): Promise<RefreshToken[]> {
    const rows = await this.context.queryMany<RefreshTokenRow>(
      `SELECT ${REFRESH_TOKEN_COLUMNS} FROM refresh_tokens WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return RefreshTokenMapper.fromRows(rows);
  }

  async save(refreshToken: RefreshToken): Promise<void> {
    const row = RefreshTokenMapper.toRow(refreshToken);

    await this.context.execute(`
      INSERT INTO refresh_tokens (
        id, user_id, token, expires_at, created_at, last_used_at, is_revoked, user_agent, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        token = EXCLUDED.token,
        expires_at = EXCLUDED.expires_at,
        created_at = EXCLUDED.created_at,
        last_used_at = EXCLUDED.last_used_at,
        is_revoked = EXCLUDED.is_revoked,
        user_agent = EXCLUDED.user_agent,
        ip_address = EXCLUDED.ip_address
    `, [
      row.id, row.user_id, row.token, row.expires_at, row.created_at,
      row.last_used_at, row.is_revoked, row.user_agent, row.ip_address
    ]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.context.execute(
      'DELETE FROM refresh_tokens WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async deleteByToken(token: string): Promise<boolean> {
    const result = await this.context.execute(
      'DELETE FROM refresh_tokens WHERE token = $1',
      [token]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // OAuth 2.0 security operations

  async revoke(tokenId: string): Promise<boolean> {
    const result = await this.context.execute(
      'UPDATE refresh_tokens SET is_revoked = TRUE WHERE id = $1',
      [tokenId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async revokeAllForUser(userId: string): Promise<number> {
    const result = await this.context.execute(
      'UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1 AND is_revoked = FALSE',
      [userId]
    );
    return result.rowCount ?? 0;
  }

  async revokeExpiredTokens(): Promise<number> {
    const now = new Date();
    const result = await this.context.execute(
      'UPDATE refresh_tokens SET is_revoked = TRUE WHERE expires_at <= $1 AND is_revoked = FALSE',
      [now]
    );
    return result.rowCount ?? 0;
  }

  async recordTokenUsage(tokenId: string): Promise<boolean> {
    const now = new Date();
    const result = await this.context.execute(
      'UPDATE refresh_tokens SET last_used_at = $1 WHERE id = $2',
      [now, tokenId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Security & monitoring

  async countActiveTokensForUser(userId: string): Promise<number> {
    const now = new Date();
    const result = await this.context.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM refresh_tokens
       WHERE user_id = $1
         AND is_revoked = FALSE
         AND expires_at > $2`,
      [userId, now]
    );
    return parseCount(result);
  }

  // Maintenance operations

  async cleanupExpiredTokens(olderThanDays: number = DEFAULT_CLEANUP_DAYS): Promise<number> {
    const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
    const now = new Date();

    const result = await this.context.execute(
      `DELETE FROM refresh_tokens
       WHERE expires_at <= $1
         AND created_at <= $2`,
      [now, cutoffDate]
    );
    return result.rowCount ?? 0;
  }

  // Batch operations

  async batchRevoke(tokenIds: string[]): Promise<number> {
    if (tokenIds.length === 0) return 0;

    const placeholders = tokenIds.map((_, i) => `$${i + 1}`).join(',');
    const result = await this.context.execute(
      `UPDATE refresh_tokens SET is_revoked = TRUE WHERE id IN (${placeholders})`,
      tokenIds
    );
    return result.rowCount ?? 0;
  }

  async batchDelete(tokenIds: string[]): Promise<number> {
    if (tokenIds.length === 0) return 0;

    const placeholders = tokenIds.map((_, i) => `$${i + 1}`).join(',');
    const result = await this.context.execute(
      `DELETE FROM refresh_tokens WHERE id IN (${placeholders})`,
      tokenIds
    );
    return result.rowCount ?? 0;
  }

  // System-wide monitoring

  async countAllActiveTokens(): Promise<number> {
    const now = new Date();
    const result = await this.context.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM refresh_tokens
       WHERE is_revoked = FALSE AND expires_at > $1`,
      [now]
    );
    return parseCount(result);
  }

  async countExpiredTokens(): Promise<number> {
    const now = new Date();
    const result = await this.context.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM refresh_tokens
       WHERE expires_at <= $1 AND is_revoked = FALSE`,
      [now]
    );
    return parseCount(result);
  }

  async countRevokedTokens(): Promise<number> {
    const result = await this.context.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM refresh_tokens
       WHERE is_revoked = TRUE`
    );
    return parseCount(result);
  }

  async getAverageTokenLifespanDays(): Promise<number> {
    const result = await this.context.queryOne<{ avg: string | null }>(
      `SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (expires_at - created_at)) / 86400), 0) as avg
       FROM refresh_tokens`
    );
    const parsed = parseFloat(result?.avg ?? '0');
    return Number.isNaN(parsed) ? 0 : Math.round(parsed * 10) / 10;
  }

  async getTokenCountsByIp(startDate?: Date, endDate?: Date): Promise<IpTokenCount[]> {
    const params: (Date)[] = [];
    let dateFilter: string;

    if (startDate && endDate) {
      params.push(startDate, endDate);
      dateFilter = `AND created_at >= $1 AND created_at <= $2`;
    } else {
      const now = new Date();
      params.push(now);
      dateFilter = `AND is_revoked = FALSE AND expires_at > $1`;
    }

    const rows = await this.context.queryMany<{
      ip_address: string;
      token_count: string;
      user_ids: string[];
    }>(
      `SELECT ip_address,
              COUNT(*) as token_count,
              ARRAY_AGG(DISTINCT user_id) as user_ids
       FROM refresh_tokens
       WHERE ip_address IS NOT NULL ${dateFilter}
       GROUP BY ip_address
       ORDER BY COUNT(*) DESC`,
      params
    );

    return rows.map(row => ({
      ipAddress: row.ip_address,
      tokenCount: parseInt(row.token_count, 10),
      userIds: row.user_ids,
    }));
  }
}
