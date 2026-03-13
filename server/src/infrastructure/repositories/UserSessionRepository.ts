/**
 * User Session Repository
 *
 * PostgreSQL implementation of session persistence for concurrent session enforcement.
 */

import type { UserSession } from '@domain/entities/UserSession';
import type { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import type { UserSessionRow } from '@infrastructure/database/mappers/UserSessionMapper';
import { UserSessionMapper } from '@infrastructure/database/mappers/UserSessionMapper';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';

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

  async delete(id: string): Promise<boolean> {
    const result = await this.context.execute(
      'DELETE FROM user_sessions WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
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
    return parseInt(result?.count ?? '0', 10);
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

}
