/**
 * Refresh Token Repository
 *
 * OAuth 2.0 refresh token persistence with revocation and cleanup support.
 */

import { RefreshTokenRepository as IRefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';
import { RefreshToken } from '@domain/entities/RefreshToken';
import { PostgresContext } from '@infrastructure/database/PostgresContext';
import { RefreshTokenMapper, RefreshTokenRow } from '@infrastructure/database/mappers/RefreshTokenMapper';

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
    // COUNT returns bigint as string, requires parseInt
    const result = await this.context.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM refresh_tokens
       WHERE user_id = $1
         AND is_revoked = FALSE
         AND expires_at > $2`,
      [userId, now]
    );
    return parseInt(result?.count || '0', 10);
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
}
