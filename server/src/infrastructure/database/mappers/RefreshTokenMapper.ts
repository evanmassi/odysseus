/**
 * Refresh Token Mapper
 *
 * Converts between database rows and RefreshToken domain entities.
 */

import { RefreshToken } from '@domain/entities/RefreshToken';
import { toDate } from '@infrastructure/database/PostgresContext';

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

export class RefreshTokenMapper {

  static toRow(refreshToken: RefreshToken): RefreshTokenRow {
    return {
      id: refreshToken.id,
      user_id: refreshToken.userId,
      token: refreshToken.token,
      expires_at: refreshToken.expiresAt,
      created_at: refreshToken.createdAt,
      last_used_at: refreshToken.lastUsedAt ?? null,
      is_revoked: refreshToken.isRevoked,
      user_agent: refreshToken.userAgent ?? null,
      ip_address: refreshToken.ipAddress ?? null
    };
  }

  static fromRow(row: RefreshTokenRow): RefreshToken {
    return RefreshToken.fromData({
      id: row.id,
      userId: row.user_id,
      token: row.token,
      expiresAt: toDate(row.expires_at),
      createdAt: toDate(row.created_at),
      lastUsedAt: row.last_used_at ? toDate(row.last_used_at) : undefined,
      isRevoked: row.is_revoked,
      userAgent: row.user_agent ?? undefined,
      ipAddress: row.ip_address ?? undefined
    });
  }

  static fromRows(rows: RefreshTokenRow[]): RefreshToken[] {
    return rows.map(row => this.fromRow(row));
  }
}
