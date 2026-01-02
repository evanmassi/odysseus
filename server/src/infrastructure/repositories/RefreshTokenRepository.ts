import { RefreshTokenRepository as IRefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';
import { RefreshToken } from '@domain/entities/RefreshToken';
import { PostgresContext } from '@infrastructure/database/PostgresContext';
import { RefreshTokenMapper, RefreshTokenRow } from '@infrastructure/database/mappers/RefreshTokenMapper';

/**
 * RefreshTokenRepository - OAuth 2.0 token persistence
 *
 * Handles all refresh token persistence operations.
 */
export class RefreshTokenRepository implements IRefreshTokenRepository {

  constructor(private context: PostgresContext) {}

  // Basic CRUD operations

  async findById(id: string): Promise<RefreshToken | null> {
    const row = await this.context.queryOne<RefreshTokenRow>(
      'SELECT * FROM refresh_tokens WHERE id = $1',
      [id]
    );
    return row ? RefreshTokenMapper.fromRow(row) : null;
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    const row = await this.context.queryOne<RefreshTokenRow>(
      'SELECT * FROM refresh_tokens WHERE token = $1',
      [token]
    );
    return row ? RefreshTokenMapper.fromRow(row) : null;
  }

  async findValidTokensByUserId(userId: string): Promise<RefreshToken[]> {
    const now = new Date();
    const rows = await this.context.queryMany<RefreshTokenRow>(
      `SELECT * FROM refresh_tokens
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
      'SELECT * FROM refresh_tokens WHERE user_id = $1 ORDER BY created_at DESC',
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
    return parseInt(result?.count || '0', 10);
  }

  async findRecentlyUsedTokens(userId: string, minutesAgo: number): Promise<RefreshToken[]> {
    const cutoffTime = new Date(Date.now() - (minutesAgo * 60 * 1000));

    const rows = await this.context.queryMany<RefreshTokenRow>(
      `SELECT * FROM refresh_tokens
       WHERE user_id = $1
         AND last_used_at IS NOT NULL
         AND last_used_at >= $2
       ORDER BY last_used_at DESC`,
      [userId, cutoffTime]
    );
    return RefreshTokenMapper.fromRows(rows);
  }

  async findTokensByIpAddress(ipAddress: string): Promise<RefreshToken[]> {
    const rows = await this.context.queryMany<RefreshTokenRow>(
      'SELECT * FROM refresh_tokens WHERE ip_address = $1 ORDER BY created_at DESC',
      [ipAddress]
    );
    return RefreshTokenMapper.fromRows(rows);
  }

  async findTokensCreatedBetween(startDate: Date, endDate: Date): Promise<RefreshToken[]> {
    const rows = await this.context.queryMany<RefreshTokenRow>(
      'SELECT * FROM refresh_tokens WHERE created_at BETWEEN $1 AND $2 ORDER BY created_at DESC',
      [startDate, endDate]
    );
    return RefreshTokenMapper.fromRows(rows);
  }

  // Maintenance operations

  async cleanupExpiredTokens(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
    const now = new Date();

    // Delete tokens that are both expired and older than the cutoff
    const result = await this.context.execute(
      `DELETE FROM refresh_tokens
       WHERE expires_at <= $1
         AND created_at <= $2`,
      [now, cutoffDate]
    );
    return result.rowCount ?? 0;
  }

  async getTokenStatistics(): Promise<{
    total: number;
    active: number;
    expired: number;
    revoked: number;
    averageLifespanDays: number;
  }> {
    const now = new Date();

    // COUNT returns bigint as string, requires parseInt
    const totals = await this.context.queryOne<{
      total: string;
      active: string;
      expired: string;
      revoked: string;
    }>(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_revoked = FALSE AND expires_at > $1 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN is_revoked = FALSE AND expires_at <= $1 THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN is_revoked = TRUE THEN 1 ELSE 0 END) as revoked
      FROM refresh_tokens
    `, [now]);

    // Average lifespan in days for completed tokens
    const lifespanResult = await this.context.queryOne<{ avglifespan: string | null }>(`
      SELECT AVG(
        CASE
          WHEN last_used_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (last_used_at - created_at)) / 86400
          ELSE
            EXTRACT(EPOCH FROM (expires_at - created_at)) / 86400
        END
      ) as avglifespan
      FROM refresh_tokens
      WHERE is_revoked = TRUE OR expires_at <= $1
    `, [now]);

    return {
      total: parseInt(totals?.total || '0', 10),
      active: parseInt(totals?.active || '0', 10),
      expired: parseInt(totals?.expired || '0', 10),
      revoked: parseInt(totals?.revoked || '0', 10),
      averageLifespanDays: Math.round((parseFloat(lifespanResult?.avglifespan || '0')) * 100) / 100
    };
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

  // Transaction support

  async executeInTransaction<T>(
    operation: (repository: IRefreshTokenRepository) => Promise<T>
  ): Promise<T> {
    return await this.context.transaction(async () => {
      return await operation(this);
    });
  }
}
