/**
 * User Session Repository
 *
 * PostgreSQL implementation of session persistence for concurrent session enforcement.
 */

import type { UserSession } from '@domain/entities/UserSession';
import type { UserSessionRepository, ActiveSessionWithUser, IpSessionCount } from '@domain/repositories/UserSessionRepository';
import type { UserSessionRow } from '@infrastructure/database/mappers/UserSessionMapper';
import { UserSessionMapper } from '@infrastructure/database/mappers/UserSessionMapper';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';
import { parseCount } from '@infrastructure/database/PostgresContext';

const SESSION_COLUMNS = `
  id, user_id, refresh_token, device_info, ip_address, user_agent,
  created_at, last_used_at, expires_at, is_active
`.trim();

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

  async findByIds(ids: string[]): Promise<UserSession[]> {
    if (ids.length === 0) return [];

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const rows = await this.context.queryMany<UserSessionRow>(
      `SELECT ${SESSION_COLUMNS} FROM user_sessions WHERE id IN (${placeholders})`,
      ids
    );
    return UserSessionMapper.fromRows(rows);
  }

  async findByRefreshToken(refreshToken: string): Promise<UserSession | null> {
    const row = await this.context.queryOne<UserSessionRow>(
      `SELECT ${SESSION_COLUMNS} FROM user_sessions WHERE refresh_token = $1`,
      [refreshToken]
    );
    return row ? UserSessionMapper.fromRow(row) : null;
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

  // SESSION MANAGEMENT OPERATIONS

  async countActiveSessions(userId: string): Promise<number> {
    const now = new Date();
    const result = await this.context.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM user_sessions
       WHERE user_id = $1
         AND is_active = TRUE
         AND expires_at > $2`,
      [userId, now]
    );
    return parseCount(result);
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

  // BULK OPERATIONS

  async bulkRevoke(sessionIds: string[]): Promise<number> {
    if (sessionIds.length === 0) return 0;

    const placeholders = sessionIds.map((_, i) => `$${i + 1}`).join(',');
    const result = await this.context.execute(
      `UPDATE user_sessions SET is_active = FALSE WHERE id IN (${placeholders})`,
      sessionIds
    );
    return result.rowCount ?? 0;
  }

  // SYSTEM-WIDE MONITORING

  async countAllActiveSessions(): Promise<number> {
    const now = new Date();
    const result = await this.context.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM user_sessions
       WHERE is_active = TRUE AND expires_at > $1`,
      [now]
    );
    return parseCount(result);
  }

  async countExpiredSessions(): Promise<number> {
    const now = new Date();
    const result = await this.context.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM user_sessions
       WHERE expires_at <= $1`,
      [now]
    );
    return parseCount(result);
  }

  async getAverageSessionDurationMinutes(): Promise<number> {
    const result = await this.context.queryOne<{ avg: string | null }>(
      `SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (last_used_at - created_at)) / 60), 0) as avg
       FROM user_sessions
       WHERE last_used_at > created_at`
    );
    const parsed = parseFloat(result?.avg ?? '0');
    return Number.isNaN(parsed) ? 0 : Math.round(parsed * 10) / 10;
  }

  async findAllActiveSessionsWithUserInfo(): Promise<ActiveSessionWithUser[]> {
    const now = new Date();
    const rows = await this.context.queryMany<{
      id: string;
      user_id: string;
      user_name: string;
      user_email: string;
      user_role: string;
      ip_address: string | null;
      login_time: Date;
      last_activity: Date;
      device_info: string | null;
      user_agent: string | null;
    }>(
      `SELECT s.id, s.user_id,
              CONCAT(p.first_name, ' ', p.last_name) AS user_name,
              p.email AS user_email,
              u.role AS user_role,
              s.ip_address,
              s.created_at AS login_time,
              s.last_used_at AS last_activity,
              s.device_info,
              s.user_agent
       FROM user_sessions s
       JOIN users u ON s.user_id = u.id
       JOIN persons p ON u.person_id = p.id
       WHERE s.is_active = TRUE AND s.expires_at > $1
       ORDER BY s.last_used_at DESC`,
      [now]
    );

    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      userRole: row.user_role,
      ipAddress: row.ip_address,
      loginTime: new Date(row.login_time),
      lastActivity: new Date(row.last_activity),
      deviceInfo: row.device_info,
      userAgent: row.user_agent,
    }));
  }

  async purgeExpiredSessions(): Promise<number> {
    const now = new Date();
    const result = await this.context.execute(
      `DELETE FROM user_sessions WHERE expires_at <= $1`,
      [now]
    );
    return result.rowCount ?? 0;
  }

  async getSessionCountsByIp(startDate?: Date, endDate?: Date): Promise<IpSessionCount[]> {
    const params: (Date)[] = [];
    let dateFilter: string;

    if (startDate && endDate) {
      params.push(startDate, endDate);
      dateFilter = `AND created_at >= $1 AND created_at <= $2`;
    } else {
      const now = new Date();
      params.push(now);
      dateFilter = `AND is_active = TRUE AND expires_at > $1`;
    }

    const rows = await this.context.queryMany<{
      ip_address: string;
      session_count: string;
      user_ids: string[];
    }>(
      `SELECT ip_address,
              COUNT(*) as session_count,
              ARRAY_AGG(DISTINCT user_id) as user_ids
       FROM user_sessions
       WHERE ip_address IS NOT NULL ${dateFilter}
       GROUP BY ip_address
       ORDER BY COUNT(*) DESC`,
      params
    );

    return rows.map(row => ({
      ipAddress: row.ip_address,
      sessionCount: parseInt(row.session_count, 10),
      userIds: row.user_ids,
    }));
  }

  async getSessionActivityByHour(hours: number): Promise<Array<{ hour: Date; count: number }>> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const rows = await this.context.queryMany<{ hour: Date; count: string }>(
      `SELECT date_trunc('hour', created_at) AS hour, COUNT(*) AS count
       FROM user_sessions
       WHERE created_at >= $1
       GROUP BY date_trunc('hour', created_at)
       ORDER BY hour ASC`,
      [cutoff]
    );

    return rows.map(row => ({
      hour: new Date(row.hour),
      count: parseInt(row.count, 10),
    }));
  }

}
