import { RefreshToken } from '@domain/entities/RefreshToken';
import { SqliteDateMapper } from '@infrastructure/database/SqliteDateMapper';

/**
 * Database row structure for refresh_tokens table
 */
export interface RefreshTokenRow {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  lastUsedAt: string | null;
  isRevoked: number; // SQLite uses 0/1 for boolean
  userAgent: string | null;
  ipAddress: string | null;
}

/**
 * RefreshTokenMapper - Clean conversion between Domain Entity and Database Row
 * 
 * Handles all mapping logic without business rules.
 * Pure transformation functions with proper date handling.
 */
export class RefreshTokenMapper {
  
  /**
   * Convert Domain Entity to Database Row
   */
  static toRow(refreshToken: RefreshToken): RefreshTokenRow {
    return {
      id: refreshToken.id,
      userId: refreshToken.userId,
      token: refreshToken.token,
      expiresAt: SqliteDateMapper.toDbDateTime(refreshToken.expiresAt),
      createdAt: SqliteDateMapper.toDbDateTime(refreshToken.createdAt),
      lastUsedAt: refreshToken.lastUsedAt ? SqliteDateMapper.toDbDateTime(refreshToken.lastUsedAt) : null,
      isRevoked: refreshToken.isRevoked ? 1 : 0,
      userAgent: refreshToken.userAgent || null,
      ipAddress: refreshToken.ipAddress || null
    };
  }

  /**
   * Convert Database Row to Domain Entity
   */
  static fromRow(row: RefreshTokenRow): RefreshToken {
    return RefreshToken.fromData({
      id: row.id,
      userId: row.userId,
      token: row.token,
      expiresAt: SqliteDateMapper.fromDbDateTime(row.expiresAt)!,
      createdAt: SqliteDateMapper.fromDbDateTime(row.createdAt)!,
      lastUsedAt: row.lastUsedAt ? SqliteDateMapper.fromDbDateTime(row.lastUsedAt) : undefined,
      isRevoked: row.isRevoked === 1,
      userAgent: row.userAgent || undefined,
      ipAddress: row.ipAddress || undefined
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
      (partialRow as any)[field] = fullRow[field];
    });
    
    return partialRow;
  }

  /**
   * Create row for token usage update
   */
  static toUsageUpdateRow(refreshToken: RefreshToken): { id: string; lastUsedAt: string | null } {
    return {
      id: refreshToken.id,
      lastUsedAt: refreshToken.lastUsedAt ? SqliteDateMapper.toDbDateTime(refreshToken.lastUsedAt) : null
    };
  }

  /**
   * Create row for revocation update
   */
  static toRevocationUpdateRow(refreshToken: RefreshToken): Pick<RefreshTokenRow, 'id' | 'isRevoked'> {
    return {
      id: refreshToken.id,
      isRevoked: refreshToken.isRevoked ? 1 : 0
    };
  }
}
