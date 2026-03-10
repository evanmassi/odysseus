/**
 * Refresh Token Repository Interface
 *
 * Data access contract for OAuth 2.0 refresh token lifecycle.
 */

import { RefreshToken } from '@domain/entities/RefreshToken';

export interface RefreshTokenRepository {

  // BASIC CRUD OPERATIONS

  findById(id: string): Promise<RefreshToken | null>;

  /** Primary lookup path for token validation. */
  findByToken(token: string): Promise<RefreshToken | null>;

  findValidTokensByUserId(userId: string): Promise<RefreshToken[]>;
  findAllTokensByUserId(userId: string): Promise<RefreshToken[]>;
  save(refreshToken: RefreshToken): Promise<void>;
  delete(id: string): Promise<boolean>;
  deleteByToken(token: string): Promise<boolean>;

  // OAUTH 2.0 SECURITY OPERATIONS

  /** Soft-revoke (marks as revoked, does not delete). */
  revoke(tokenId: string): Promise<boolean>;

  /** Logout from all devices. */
  revokeAllForUser(userId: string): Promise<number>;

  revokeExpiredTokens(): Promise<number>;

  /** Updates lastUsedAt. */
  recordTokenUsage(tokenId: string): Promise<boolean>;

  // SECURITY & MONITORING

  /** Used for device limit enforcement. */
  countActiveTokensForUser(userId: string): Promise<number>;

  findRecentlyUsedTokens(userId: string, minutesAgo: number): Promise<RefreshToken[]>;
  findTokensByIpAddress(ipAddress: string): Promise<RefreshToken[]>;
  findTokensCreatedBetween(startDate: Date, endDate: Date): Promise<RefreshToken[]>;

  // MAINTENANCE OPERATIONS

  /** Permanent deletion — should be called periodically by maintenance job. */
  cleanupExpiredTokens(olderThanDays?: number): Promise<number>;

  getTokenStatistics(): Promise<{
    total: number;
    active: number;
    expired: number;
    revoked: number;
    averageLifespanDays: number;
  }>;

  // BATCH OPERATIONS

  batchRevoke(tokenIds: string[]): Promise<number>;
  batchDelete(tokenIds: string[]): Promise<number>;

  // TRANSACTION SUPPORT

  /** Used for atomic token rotation. */
  executeInTransaction<T>(operation: (repository: RefreshTokenRepository) => Promise<T>): Promise<T>;
}
