import { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import { UserSession } from '@domain/entities/UserSession';
import { PostgresContext } from '@infrastructure/database/PostgresContext';
import { UserSessionMapper, UserSessionRow } from '@infrastructure/database/mappers/UserSessionMapper';

/**
 * Explicit column list for user_sessions table queries
 */
const SESSION_COLUMNS = `
  id, user_id, refresh_token, device_info, ip_address, user_agent,
  created_at, last_used_at, expires_at, is_active
`.trim();

/**
 * SessionRepository - User session persistence
 *
 * Handles session tracking for concurrent session limit enforcement.
 */
export class UserSessionRepositoryImpl implements UserSessionRepository {

  constructor(private context: PostgresContext) {}

  // BASIC CRUD OPERATIONS

  async findById(id: string): Promise<UserSession | null> {
    const row = await this.context.queryOne<UserSessionRow>(
      `SELECT ${SESSION_COLUMNS} FROM user_sessions WHERE id = $1`,
      [id]
    );
    return row ? UserSessionMapper.fromRow(row) : null;
  }

  async findByRefreshToken(refreshToken: string): Promise<UserSession | null> {
    const row = await this.context.queryOne<UserSessionRow>(
      `SELECT ${SESSION_COLUMNS} FROM user_sessions WHERE refresh_token = $1`,
      [refreshToken]
    );
    return row ? UserSessionMapper.fromRow(row) : null;
  }

  async findAllByUserId(userId: string): Promise<UserSession[]> {
    const rows = await this.context.queryMany<UserSessionRow>(
      `SELECT ${SESSION_COLUMNS} FROM user_sessions WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return UserSessionMapper.fromRows(rows);
  }

  async findActiveSessionsByUserId(userId: string): Promise<UserSession[]> {
    const now = new Date();
    const rows = await this.context.queryMany<UserSessionRow>(
      `SELECT ${SESSION_COLUMNS} FROM user_sessions
       WHERE user_id = $1
         AND is_active = TRUE
         AND expires_at > $2
       ORDER BY last_used_at DESC`,
      [userId, now]
    );
    return UserSessionMapper.fromRows(rows);
  }

  async save(session: UserSession): Promise<void> {
    const row = UserSessionMapper.toRow(session);

    await this.context.execute(`
      INSERT INTO user_sessions (
        id, user_id, refresh_token, device_info, ip_address, user_agent,
        created_at, last_used_at, expires_at, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        refresh_token = EXCLUDED.refresh_token,
        device_info = EXCLUDED.device_info,
        ip_address = EXCLUDED.ip_address,
        user_agent = EXCLUDED.user_agent,
        created_at = EXCLUDED.created_at,
        last_used_at = EXCLUDED.last_used_at,
        expires_at = EXCLUDED.expires_at,
        is_active = EXCLUDED.is_active
    `, [
      row.id, row.user_id, row.refresh_token, row.device_info, row.ip_address, row.user_agent,
      row.created_at, row.last_used_at, row.expires_at, row.is_active
    ]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.context.execute(
      'DELETE FROM user_sessions WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // SESSION MANAGEMENT OPERATIONS

  async createSession(session: UserSession): Promise<void> {
    await this.save(session);
  }

  async countActiveSessions(userId: string): Promise<number> {
    const now = new Date();
    const result = await this.context.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM user_sessions
       WHERE user_id = $1
         AND is_active = TRUE
         AND expires_at > $2`,
      [userId, now]
    );
    return parseInt(result?.count || '0', 10);
  }

  async revokeSession(sessionId: string): Promise<boolean> {
    const result = await this.context.execute(
      'UPDATE user_sessions SET is_active = FALSE WHERE id = $1',
      [sessionId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async revokeAllSessions(userId: string): Promise<number> {
    const result = await this.context.execute(
      'UPDATE user_sessions SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE',
      [userId]
    );
    return result.rowCount ?? 0;
  }

  async updateLastUsed(sessionId: string, timestamp: Date): Promise<boolean> {
    const result = await this.context.execute(
      'UPDATE user_sessions SET last_used_at = $1 WHERE id = $2',
      [timestamp, sessionId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // SECURITY & MONITORING

  async findByIpAddress(ipAddress: string): Promise<UserSession[]> {
    const rows = await this.context.queryMany<UserSessionRow>(
      `SELECT ${SESSION_COLUMNS} FROM user_sessions WHERE ip_address = $1 ORDER BY created_at DESC`,
      [ipAddress]
    );
    return UserSessionMapper.fromRows(rows);
  }

  async findRecentlyActiveSessions(userId: string, minutesAgo: number): Promise<UserSession[]> {
    const cutoffTime = new Date(Date.now() - (minutesAgo * 60 * 1000));

    const rows = await this.context.queryMany<UserSessionRow>(
      `SELECT ${SESSION_COLUMNS} FROM user_sessions
       WHERE user_id = $1
         AND last_used_at >= $2
       ORDER BY last_used_at DESC`,
      [userId, cutoffTime]
    );
    return UserSessionMapper.fromRows(rows);
  }

  async findSessionsCreatedBetween(startDate: Date, endDate: Date): Promise<UserSession[]> {
    const rows = await this.context.queryMany<UserSessionRow>(
      `SELECT ${SESSION_COLUMNS} FROM user_sessions WHERE created_at BETWEEN $1 AND $2 ORDER BY created_at DESC`,
      [startDate, endDate]
    );
    return UserSessionMapper.fromRows(rows);
  }

  async getOldestActiveSession(userId: string): Promise<UserSession | null> {
    const now = new Date();
    const row = await this.context.queryOne<UserSessionRow>(
      `SELECT ${SESSION_COLUMNS} FROM user_sessions
       WHERE user_id = $1
         AND is_active = TRUE
         AND expires_at > $2
       ORDER BY created_at ASC
       LIMIT 1`,
      [userId, now]
    );
    return row ? UserSessionMapper.fromRow(row) : null;
  }

  // MAINTENANCE OPERATIONS

  async cleanupExpiredSessions(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
    const now = new Date();

    // Delete sessions that are both expired and older than the cutoff
    const result = await this.context.execute(
      `DELETE FROM user_sessions
       WHERE expires_at <= $1
         AND created_at <= $2`,
      [now, cutoffDate]
    );
    return result.rowCount ?? 0;
  }

  async revokeExpiredSessions(): Promise<number> {
    const now = new Date();
    const result = await this.context.execute(
      'UPDATE user_sessions SET is_active = FALSE WHERE expires_at <= $1 AND is_active = TRUE',
      [now]
    );
    return result.rowCount ?? 0;
  }

  async getSessionStatistics(): Promise<{
    total: number;
    active: number;
    expired: number;
    inactive: number;
    averageSessionDurationMinutes: number;
  }> {
    const now = new Date();

    // COUNT returns bigint as string, requires parseInt
    const totals = await this.context.queryOne<{
      total: string;
      active: string;
      expired: string;
      inactive: string;
    }>(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_active = TRUE AND expires_at > $1 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN is_active = TRUE AND expires_at <= $1 THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) as inactive
      FROM user_sessions
    `, [now]);

    // Average duration in minutes for completed sessions
    const durationResult = await this.context.queryOne<{ avgduration: string | null }>(`
      SELECT AVG(
        EXTRACT(EPOCH FROM (last_used_at - created_at)) / 60
      ) as avgduration
      FROM user_sessions
      WHERE is_active = FALSE OR expires_at <= $1
    `, [now]);

    return {
      total: parseInt(totals?.total || '0', 10),
      active: parseInt(totals?.active || '0', 10),
      expired: parseInt(totals?.expired || '0', 10),
      inactive: parseInt(totals?.inactive || '0', 10),
      averageSessionDurationMinutes: Math.round(parseFloat(durationResult?.avgduration || '0'))
    };
  }

  // BATCH OPERATIONS

  async batchRevoke(sessionIds: string[]): Promise<number> {
    if (sessionIds.length === 0) return 0;

    const placeholders = sessionIds.map((_, i) => `$${i + 1}`).join(',');
    const result = await this.context.execute(
      `UPDATE user_sessions SET is_active = FALSE WHERE id IN (${placeholders})`,
      sessionIds
    );
    return result.rowCount ?? 0;
  }

  async batchDelete(sessionIds: string[]): Promise<number> {
    if (sessionIds.length === 0) return 0;

    const placeholders = sessionIds.map((_, i) => `$${i + 1}`).join(',');
    const result = await this.context.execute(
      `DELETE FROM user_sessions WHERE id IN (${placeholders})`,
      sessionIds
    );
    return result.rowCount ?? 0;
  }
}
