import { UserSession } from '@domain/entities/UserSession';

/**
 * Database row structure for user_sessions table (PostgreSQL snake_case)
 */
export interface UserSessionRow {
  id: string;
  user_id: string;
  refresh_token: string;
  device_info: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date | string;
  last_used_at: Date | string;
  expires_at: Date | string;
  is_active: boolean;
}

/**
 * UserSessionMapper - Clean conversion between Domain Entity and Database Row
 *
 * Handles all mapping logic without business rules.
 * Pure transformation functions with proper date handling.
 * PostgreSQL version with snake_case columns and native boolean/date types.
 */
export class UserSessionMapper {

  /**
   * Convert Domain Entity to Database Row
   */
  static toRow(session: UserSession): UserSessionRow {
    return {
      id: session.id,
      user_id: session.userId,
      refresh_token: session.refreshToken,
      device_info: session.deviceInfo || null,
      ip_address: session.ipAddress || null,
      user_agent: session.userAgent || null,
      created_at: session.createdAt,
      last_used_at: session.lastUsedAt,
      expires_at: session.expiresAt,
      is_active: session.isActive
    };
  }

  /**
   * Convert Database Row to Domain Entity
   */
  static fromRow(row: UserSessionRow): UserSession {
    return UserSession.fromData({
      id: row.id,
      userId: row.user_id,
      refreshToken: row.refresh_token,
      createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      lastUsedAt: row.last_used_at instanceof Date ? row.last_used_at : new Date(row.last_used_at),
      expiresAt: row.expires_at instanceof Date ? row.expires_at : new Date(row.expires_at),
      isActive: row.is_active,
      deviceInfo: row.device_info || undefined,
      ipAddress: row.ip_address || undefined,
      userAgent: row.user_agent || undefined
    });
  }

  /**
   * Convert multiple rows to entities
   */
  static fromRows(rows: UserSessionRow[]): UserSession[] {
    return rows.map(row => this.fromRow(row));
  }

  /**
   * Convert multiple entities to rows
   */
  static toRows(sessions: UserSession[]): UserSessionRow[] {
    return sessions.map(session => this.toRow(session));
  }

  /**
   * Create row for activity update
   */
  static toActivityUpdateRow(session: UserSession): { id: string; last_used_at: Date } {
    return {
      id: session.id,
      last_used_at: session.lastUsedAt
    };
  }

  /**
   * Create row for revocation update
   */
  static toRevocationUpdateRow(session: UserSession): { id: string; is_active: boolean } {
    return {
      id: session.id,
      is_active: session.isActive
    };
  }
}
