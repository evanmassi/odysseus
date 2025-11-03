import { UserSession } from '@domain/entities/UserSession';
import { SqliteDateMapper } from '@infrastructure/database/SqliteDateMapper';

/**
 * Database row structure for user_sessions table
 */
export interface UserSessionRow {
  id: string;
  userId: string;
  refreshToken: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  isActive: number; // SQLite uses 0/1 for boolean
}

/**
 * UserSessionMapper - Clean conversion between Domain Entity and Database Row
 *
 * Handles all mapping logic without business rules.
 * Pure transformation functions with proper date handling.
 */
export class UserSessionMapper {

  /**
   * Convert Domain Entity to Database Row
   */
  static toRow(session: UserSession): UserSessionRow {
    return {
      id: session.id,
      userId: session.userId,
      refreshToken: session.refreshToken,
      deviceInfo: session.deviceInfo || null,
      ipAddress: session.ipAddress || null,
      userAgent: session.userAgent || null,
      createdAt: SqliteDateMapper.toDbDateTime(session.createdAt),
      lastUsedAt: SqliteDateMapper.toDbDateTime(session.lastUsedAt),
      expiresAt: SqliteDateMapper.toDbDateTime(session.expiresAt),
      isActive: session.isActive ? 1 : 0
    };
  }

  /**
   * Convert Database Row to Domain Entity
   */
  static fromRow(row: UserSessionRow): UserSession {
    return UserSession.fromData({
      id: row.id,
      userId: row.userId,
      refreshToken: row.refreshToken,
      createdAt: SqliteDateMapper.fromDbDateTime(row.createdAt)!,
      lastUsedAt: SqliteDateMapper.fromDbDateTime(row.lastUsedAt)!,
      expiresAt: SqliteDateMapper.fromDbDateTime(row.expiresAt)!,
      isActive: row.isActive === 1,
      deviceInfo: row.deviceInfo || undefined,
      ipAddress: row.ipAddress || undefined,
      userAgent: row.userAgent || undefined
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
  static toActivityUpdateRow(session: UserSession): { id: string; lastUsedAt: string } {
    return {
      id: session.id,
      lastUsedAt: SqliteDateMapper.toDbDateTime(session.lastUsedAt)
    };
  }

  /**
   * Create row for revocation update
   */
  static toRevocationUpdateRow(session: UserSession): { id: string; isActive: number } {
    return {
      id: session.id,
      isActive: session.isActive ? 1 : 0
    };
  }
}
