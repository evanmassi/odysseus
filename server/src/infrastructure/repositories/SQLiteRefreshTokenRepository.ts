import { RefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';
import { RefreshToken } from '@domain/entities/RefreshToken';
import { SQLiteContext } from '@infrastructure/database/SQLiteContext';
import { RefreshTokenMapper, RefreshTokenRow } from '@infrastructure/database/mappers/RefreshTokenMapper';
import { SqliteDateMapper } from '@infrastructure/database/SqliteDateMapper';

/**
 * SQLiteRefreshTokenRepository - OAuth 2.0 token persistence
 *
 * Implements RefreshTokenRepository interface using SQLite.
 * Handles all refresh token persistence operations.
 */
export class SQLiteRefreshTokenRepository implements RefreshTokenRepository {
  
  constructor(private context: SQLiteContext) {}

  // Basic CRUD operations

  async findById(id: string): Promise<RefreshToken | null> {
    const row = await this.context.queryOne<RefreshTokenRow>(
      'SELECT * FROM refresh_tokens WHERE id = ?',
      [id]
    );
    return row ? RefreshTokenMapper.fromRow(row) : null;
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    const row = await this.context.queryOne<RefreshTokenRow>(
      'SELECT * FROM refresh_tokens WHERE token = ?',
      [token]
    );
    return row ? RefreshTokenMapper.fromRow(row) : null;
  }

  async findValidTokensByUserId(userId: string): Promise<RefreshToken[]> {
    const now = SqliteDateMapper.toDbDateTime(new Date());
    const rows = await this.context.queryMany<RefreshTokenRow>(
      `SELECT * FROM refresh_tokens 
       WHERE userId = ? 
         AND isRevoked = 0 
         AND expiresAt > ? 
       ORDER BY createdAt DESC`,
      [userId, now]
    );
    return RefreshTokenMapper.fromRows(rows);
  }

  async findAllTokensByUserId(userId: string): Promise<RefreshToken[]> {
    const rows = await this.context.queryMany<RefreshTokenRow>(
      'SELECT * FROM refresh_tokens WHERE userId = ? ORDER BY createdAt DESC',
      [userId]
    );
    return RefreshTokenMapper.fromRows(rows);
  }

  async save(refreshToken: RefreshToken): Promise<void> {
    const row = RefreshTokenMapper.toRow(refreshToken);
    
    await this.context.execute(`
      INSERT OR REPLACE INTO refresh_tokens (
        id, userId, token, expiresAt, createdAt, lastUsedAt, isRevoked, userAgent, ipAddress
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      row.id, row.userId, row.token, row.expiresAt, row.createdAt, 
      row.lastUsedAt, row.isRevoked, row.userAgent, row.ipAddress
    ]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.context.execute(
      'DELETE FROM refresh_tokens WHERE id = ?',
      [id]
    );
    return result.changes > 0;
  }

  async deleteByToken(token: string): Promise<boolean> {
    const result = await this.context.execute(
      'DELETE FROM refresh_tokens WHERE token = ?',
      [token]
    );
    return result.changes > 0;
  }

  // OAUTH 2.0 SECURITY OPERATIONS

  async revoke(tokenId: string): Promise<boolean> {
    const result = await this.context.execute(
      'UPDATE refresh_tokens SET isRevoked = 1 WHERE id = ?',
      [tokenId]
    );
    return result.changes > 0;
  }

  async revokeAllForUser(userId: string): Promise<number> {
    const result = await this.context.execute(
      'UPDATE refresh_tokens SET isRevoked = 1 WHERE userId = ? AND isRevoked = 0',
      [userId]
    );
    return result.changes;
  }

  async revokeExpiredTokens(): Promise<number> {
    const now = SqliteDateMapper.toDbDateTime(new Date());
    const result = await this.context.execute(
      'UPDATE refresh_tokens SET isRevoked = 1 WHERE expiresAt <= ? AND isRevoked = 0',
      [now]
    );
    return result.changes;
  }

  async recordTokenUsage(tokenId: string): Promise<boolean> {
    const now = SqliteDateMapper.toDbDateTime(new Date());
    const result = await this.context.execute(
      'UPDATE refresh_tokens SET lastUsedAt = ? WHERE id = ?',
      [now, tokenId]
    );
    return result.changes > 0;
  }

  // SECURITY & MONITORING

  async countActiveTokensForUser(userId: string): Promise<number> {
    const now = SqliteDateMapper.toDbDateTime(new Date());
    const result = await this.context.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM refresh_tokens 
       WHERE userId = ? 
         AND isRevoked = 0 
         AND expiresAt > ?`,
      [userId, now]
    );
    return result?.count || 0;
  }

  async findRecentlyUsedTokens(userId: string, minutesAgo: number): Promise<RefreshToken[]> {
    const cutoffTime = new Date(Date.now() - (minutesAgo * 60 * 1000));
    const cutoffTimeStr = SqliteDateMapper.toDbDateTime(cutoffTime);
    
    const rows = await this.context.queryMany<RefreshTokenRow>(
      `SELECT * FROM refresh_tokens 
       WHERE userId = ? 
         AND lastUsedAt IS NOT NULL 
         AND lastUsedAt >= ? 
       ORDER BY lastUsedAt DESC`,
      [userId, cutoffTimeStr]
    );
    return RefreshTokenMapper.fromRows(rows);
  }

  async findTokensByIpAddress(ipAddress: string): Promise<RefreshToken[]> {
    const rows = await this.context.queryMany<RefreshTokenRow>(
      'SELECT * FROM refresh_tokens WHERE ipAddress = ? ORDER BY createdAt DESC',
      [ipAddress]
    );
    return RefreshTokenMapper.fromRows(rows);
  }

  async findTokensCreatedBetween(startDate: Date, endDate: Date): Promise<RefreshToken[]> {
    const startStr = SqliteDateMapper.toDbDateTime(startDate);
    const endStr = SqliteDateMapper.toDbDateTime(endDate);
    
    const rows = await this.context.queryMany<RefreshTokenRow>(
      'SELECT * FROM refresh_tokens WHERE createdAt BETWEEN ? AND ? ORDER BY createdAt DESC',
      [startStr, endStr]
    );
    return RefreshTokenMapper.fromRows(rows);
  }

  // MAINTENANCE OPERATIONS

  async cleanupExpiredTokens(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
    const cutoffDateStr = SqliteDateMapper.toDbDateTime(cutoffDate);
    
    // Delete tokens that are both expired and older than the cutoff
    const result = await this.context.execute(
      `DELETE FROM refresh_tokens 
       WHERE expiresAt <= ? 
         AND createdAt <= ?`,
      [SqliteDateMapper.toDbDateTime(new Date()), cutoffDateStr]
    );
    return result.changes;
  }

  async getTokenStatistics(): Promise<{
    total: number;
    active: number;
    expired: number;
    revoked: number;
    averageLifespanDays: number;
  }> {
    const now = SqliteDateMapper.toDbDateTime(new Date());
    
    // Get basic counts
    const totals = await this.context.queryOne<{
      total: number;
      active: number;
      expired: number;
      revoked: number;
    }>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN isRevoked = 0 AND expiresAt > ? THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN isRevoked = 0 AND expiresAt <= ? THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN isRevoked = 1 THEN 1 ELSE 0 END) as revoked
      FROM refresh_tokens
    `, [now, now]);

    // Calculate average lifespan for completed tokens (revoked or expired)
    const lifespanResult = await this.context.queryOne<{ avgLifespan: number }>(`
      SELECT AVG(
        CASE 
          WHEN lastUsedAt IS NOT NULL THEN
            (julianday(lastUsedAt) - julianday(createdAt))
          ELSE
            (julianday(expiresAt) - julianday(createdAt))
        END
      ) as avgLifespan
      FROM refresh_tokens
      WHERE isRevoked = 1 OR expiresAt <= ?
    `, [now]);

    return {
      total: totals?.total || 0,
      active: totals?.active || 0,
      expired: totals?.expired || 0,
      revoked: totals?.revoked || 0,
      averageLifespanDays: Math.round((lifespanResult?.avgLifespan || 0) * 100) / 100
    };
  }

  // BATCH OPERATIONS

  async batchRevoke(tokenIds: string[]): Promise<number> {
    if (tokenIds.length === 0) return 0;
    
    const placeholders = tokenIds.map(() => '?').join(',');
    const result = await this.context.execute(
      `UPDATE refresh_tokens SET isRevoked = 1 WHERE id IN (${placeholders})`,
      tokenIds
    );
    return result.changes;
  }

  async batchDelete(tokenIds: string[]): Promise<number> {
    if (tokenIds.length === 0) return 0;
    
    const placeholders = tokenIds.map(() => '?').join(',');
    const result = await this.context.execute(
      `DELETE FROM refresh_tokens WHERE id IN (${placeholders})`,
      tokenIds
    );
    return result.changes;
  }

  // TRANSACTION SUPPORT

  async executeInTransaction<T>(
    operation: (repository: RefreshTokenRepository) => Promise<T>
  ): Promise<T> {
    // TODO: Implement transaction support in future enhancement
    // For now, execute operation directly (atomic operations via SQLite)
    return await operation(this);
  }
}
