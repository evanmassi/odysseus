/**
 * User Session Mapper
 *
 * Converts between database rows and UserSession domain entities.
 */

import { UserSession } from '@domain/entities/UserSession';

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

export class UserSessionMapper {

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

  static fromRows(rows: UserSessionRow[]): UserSession[] {
    return rows.map(row => this.fromRow(row));
  }
}
