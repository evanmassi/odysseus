import { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import { UserSession } from '@domain/entities/UserSession';
import { SQLiteContext } from '@infrastructure/database/SQLiteContext';
import { UserSessionMapper, UserSessionRow } from '@infrastructure/database/mappers/UserSessionMapper';
import { SqliteDateMapper } from '@infrastructure/database/SqliteDateMapper';

/**
 * SQLiteSessionRepository - User session persistence
 *
 * Implements UserSessionRepository interface using SQLite.
 * Handles session tracking for concurrent session limit enforcement.
 */
export class SQLiteSessionRepository implements UserSessionRepository {

  constructor(private context: SQLiteContext) {}

  // BASIC CRUD OPERATIONS

  async findById(id: string): Promise<UserSession | null> {
    const row = await this.context.queryOne<UserSessionRow>(
      'SELECT * FROM user_sessions WHERE id = ?',
      [id]
    );
    return row ? UserSessionMapper.fromRow(row) : null;
  }

  async findByRefreshToken(refreshToken: string): Promise<UserSession | null> {
    const row = await this.context.queryOne<UserSessionRow>(
      'SELECT * FROM user_sessions WHERE refreshToken = ?',
      [refreshToken]
    );
    return row ? UserSessionMapper.fromRow(row) : null;
  }

  async findAllByUserId(userId: string): Promise<UserSession[]> {
    const rows = await this.context.queryMany<UserSessionRow>(
      'SELECT * FROM user_sessions WHERE userId = ? ORDER BY createdAt DESC',
      [userId]
    );
    return UserSessionMapper.fromRows(rows);
  }

  async findActiveSessionsByUserId(userId: string): Promise<UserSession[]> {
    const now = SqliteDateMapper.toDbDateTime(new Date());
    const rows = await this.context.queryMany<UserSessionRow>(
      `SELECT * FROM user_sessions
       WHERE userId = ?
         AND isActive = 1
         AND datetime(expiresAt) > datetime(?)
       ORDER BY lastUsedAt DESC`,
      [userId, now]
    );
    return UserSessionMapper.fromRows(rows);
  }

  async save(session: UserSession): Promise<void> {
    const row = UserSessionMapper.toRow(session);

    await this.context.execute(`
      INSERT OR REPLACE INTO user_sessions (
        id, userId, refreshToken, deviceInfo, ipAddress, userAgent,
        createdAt, lastUsedAt, expiresAt, isActive
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      row.id, row.userId, row.refreshToken, row.deviceInfo, row.ipAddress, row.userAgent,
      row.createdAt, row.lastUsedAt, row.expiresAt, row.isActive
    ]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.context.execute(
      'DELETE FROM user_sessions WHERE id = ?',
      [id]
    );
    return result.changes > 0;
  }

  // SESSION MANAGEMENT OPERATIONS

  async createSession(session: UserSession): Promise<void> {
    await this.save(session);
  }

  async countActiveSessions(userId: string): Promise<number> {
    const now = SqliteDateMapper.toDbDateTime(new Date());
    const result = await this.context.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM user_sessions
       WHERE userId = ?
         AND isActive = 1
         AND datetime(expiresAt) > datetime(?)`,
      [userId, now]
    );
    return result?.count || 0;
  }

  async revokeSession(sessionId: string): Promise<boolean> {
    const result = await this.context.execute(
      'UPDATE user_sessions SET isActive = 0 WHERE id = ?',
      [sessionId]
    );
    return result.changes > 0;
  }

  async revokeAllSessions(userId: string): Promise<number> {
    const result = await this.context.execute(
      'UPDATE user_sessions SET isActive = 0 WHERE userId = ? AND isActive = 1',
      [userId]
    );
    return result.changes;
  }

  async updateLastUsed(sessionId: string, timestamp: Date): Promise<boolean> {
    const timestampStr = SqliteDateMapper.toDbDateTime(timestamp);
    const result = await this.context.execute(
      'UPDATE user_sessions SET lastUsedAt = ? WHERE id = ?',
      [timestampStr, sessionId]
    );
    return result.changes > 0;
  }

  // SECURITY & MONITORING

  async findByIpAddress(ipAddress: string): Promise<UserSession[]> {
    const rows = await this.context.queryMany<UserSessionRow>(
      'SELECT * FROM user_sessions WHERE ipAddress = ? ORDER BY createdAt DESC',
      [ipAddress]
    );
    return UserSessionMapper.fromRows(rows);
  }

  async findRecentlyActiveSessions(userId: string, minutesAgo: number): Promise<UserSession[]> {
    const cutoffTime = new Date(Date.now() - (minutesAgo * 60 * 1000));
    const cutoffTimeStr = SqliteDateMapper.toDbDateTime(cutoffTime);

    const rows = await this.context.queryMany<UserSessionRow>(
      `SELECT * FROM user_sessions
       WHERE userId = ?
         AND lastUsedAt >= ?
       ORDER BY lastUsedAt DESC`,
      [userId, cutoffTimeStr]
    );
    return UserSessionMapper.fromRows(rows);
  }

  async findSessionsCreatedBetween(startDate: Date, endDate: Date): Promise<UserSession[]> {
    const startStr = SqliteDateMapper.toDbDateTime(startDate);
    const endStr = SqliteDateMapper.toDbDateTime(endDate);

    const rows = await this.context.queryMany<UserSessionRow>(
      'SELECT * FROM user_sessions WHERE createdAt BETWEEN ? AND ? ORDER BY createdAt DESC',
      [startStr, endStr]
    );
    return UserSessionMapper.fromRows(rows);
  }

  async getOldestActiveSession(userId: string): Promise<UserSession | null> {
    const now = SqliteDateMapper.toDbDateTime(new Date());
    const row = await this.context.queryOne<UserSessionRow>(
      `SELECT * FROM user_sessions
       WHERE userId = ?
         AND isActive = 1
         AND datetime(expiresAt) > datetime(?)
       ORDER BY createdAt ASC
       LIMIT 1`,
      [userId, now]
    );
    return row ? UserSessionMapper.fromRow(row) : null;
  }

  // MAINTENANCE OPERATIONS

  async cleanupExpiredSessions(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
    const cutoffDateStr = SqliteDateMapper.toDbDateTime(cutoffDate);
    const now = SqliteDateMapper.toDbDateTime(new Date());

    // Delete sessions that are both expired and older than the cutoff
    const result = await this.context.execute(
      `DELETE FROM user_sessions
       WHERE datetime(expiresAt) <= datetime(?)
         AND datetime(createdAt) <= datetime(?)`,
      [now, cutoffDateStr]
    );
    return result.changes;
  }

  async revokeExpiredSessions(): Promise<number> {
    const now = SqliteDateMapper.toDbDateTime(new Date());
    const result = await this.context.execute(
      'UPDATE user_sessions SET isActive = 0 WHERE datetime(expiresAt) <= datetime(?) AND isActive = 1',
      [now]
    );
    return result.changes;
  }

  async getSessionStatistics(): Promise<{
    total: number;
    active: number;
    expired: number;
    inactive: number;
    averageSessionDurationMinutes: number;
  }> {
    const now = SqliteDateMapper.toDbDateTime(new Date());

    // Get basic counts
    const totals = await this.context.queryOne<{
      total: number;
      active: number;
      expired: number;
      inactive: number;
    }>(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN isActive = 1 AND datetime(expiresAt) > datetime(?) THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN isActive = 1 AND datetime(expiresAt) <= datetime(?) THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN isActive = 0 THEN 1 ELSE 0 END) as inactive
      FROM user_sessions
    `, [now, now]);

    // Calculate average session duration for completed sessions
    const durationResult = await this.context.queryOne<{ avgDuration: number }>(`
      SELECT AVG(
        (julianday(lastUsedAt) - julianday(createdAt)) * 24 * 60
      ) as avgDuration
      FROM user_sessions
      WHERE isActive = 0 OR datetime(expiresAt) <= datetime(?)
    `, [now]);

    return {
      total: totals?.total || 0,
      active: totals?.active || 0,
      expired: totals?.expired || 0,
      inactive: totals?.inactive || 0,
      averageSessionDurationMinutes: Math.round(durationResult?.avgDuration || 0)
    };
  }

  // BATCH OPERATIONS

  async batchRevoke(sessionIds: string[]): Promise<number> {
    if (sessionIds.length === 0) return 0;

    const placeholders = sessionIds.map(() => '?').join(',');
    const result = await this.context.execute(
      `UPDATE user_sessions SET isActive = 0 WHERE id IN (${placeholders})`,
      sessionIds
    );
    return result.changes;
  }

  async batchDelete(sessionIds: string[]): Promise<number> {
    if (sessionIds.length === 0) return 0;

    const placeholders = sessionIds.map(() => '?').join(',');
    const result = await this.context.execute(
      `DELETE FROM user_sessions WHERE id IN (${placeholders})`,
      sessionIds
    );
    return result.changes;
  }
}
