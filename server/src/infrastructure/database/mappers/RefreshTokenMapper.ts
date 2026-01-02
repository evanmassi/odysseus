import { RefreshToken } from '@domain/entities/RefreshToken';

/**
 * Database row structure for refresh_tokens table
 */
export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date | string;
  created_at: Date | string;
  last_used_at: Date | string | null;
  is_revoked: boolean;
  user_agent: string | null;
  ip_address: string | null;
}

/**
 * RefreshTokenMapper - Conversion between domain entity and database row
 *
 * Pure transformation functions with proper date handling.
 */
export class RefreshTokenMapper {

  /**
   * Convert domain entity to database row
   */
  static toRow(refreshToken: RefreshToken): RefreshTokenRow {
    return {
      id: refreshToken.id,
      user_id: refreshToken.userId,
      token: refreshToken.token,
      expires_at: refreshToken.expiresAt,
      created_at: refreshToken.createdAt,
      last_used_at: refreshToken.lastUsedAt || null,
      is_revoked: refreshToken.isRevoked,
      user_agent: refreshToken.userAgent || null,
      ip_address: refreshToken.ipAddress || null
    };
  }

  /**
   * Convert database row to domain entity
   */
  static fromRow(row: RefreshTokenRow): RefreshToken {
    return RefreshToken.fromData({
      id: row.id,
      userId: row.user_id,
      token: row.token,
      expiresAt: row.expires_at instanceof Date ? row.expires_at : new Date(row.expires_at),
      createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      lastUsedAt: row.last_used_at
        ? (row.last_used_at instanceof Date ? row.last_used_at : new Date(row.last_used_at))
        : undefined,
      isRevoked: row.is_revoked,
      userAgent: row.user_agent || undefined,
      ipAddress: row.ip_address || undefined
    });
  }

  /**
   * Convert multiple rows to entities
   */
  static fromRows(rows: RefreshTokenRow[]): RefreshToken[] {
    return rows.map(row => this.fromRow(row));
  }

  /**
   * Convert multiple entities to rows
   */
  static toRows(refreshTokens: RefreshToken[]): RefreshTokenRow[] {
    return refreshTokens.map(token => this.toRow(token));
  }

  /**
   * Create partial row for updates (only changed fields)
   */
  static toPartialRow(refreshToken: RefreshToken, fields: (keyof RefreshTokenRow)[]): Partial<RefreshTokenRow> {
    const fullRow = this.toRow(refreshToken);
    const partialRow: Partial<RefreshTokenRow> = {};

    fields.forEach(field => {
      (partialRow as Record<string, unknown>)[field] = fullRow[field];
    });

    return partialRow;
  }

  /**
   * Create row for token usage update
   */
  static toUsageUpdateRow(refreshToken: RefreshToken): { id: string; last_used_at: Date | null } {
    return {
      id: refreshToken.id,
      last_used_at: refreshToken.lastUsedAt || null
    };
  }

  /**
   * Create row for revocation update
   */
  static toRevocationUpdateRow(refreshToken: RefreshToken): { id: string; is_revoked: boolean } {
    return {
      id: refreshToken.id,
      is_revoked: refreshToken.isRevoked
    };
  }
}
