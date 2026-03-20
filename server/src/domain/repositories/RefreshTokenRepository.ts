/**
 * Refresh Token Repository Interface
 *
 * Data access contract for OAuth 2.0 refresh token lifecycle.
 */

import type { RefreshToken } from '@domain/entities/RefreshToken';

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

  // MAINTENANCE OPERATIONS

  /** Permanent deletion — should be called periodically by maintenance job. */
  cleanupExpiredTokens(olderThanDays?: number): Promise<number>;

  // BATCH OPERATIONS

  batchRevoke(tokenIds: string[]): Promise<number>;
  batchDelete(tokenIds: string[]): Promise<number>;

  // SYSTEM-WIDE MONITORING

  countAllActiveTokens(): Promise<number>;
  countExpiredTokens(): Promise<number>;
  countRevokedTokens(): Promise<number>;
  getAverageTokenLifespanDays(): Promise<number>;
  getTokenCountsByIp(startDate?: Date, endDate?: Date): Promise<IpTokenCount[]>;
}

export interface IpTokenCount {
  ipAddress: string;
  tokenCount: number;
  userIds: string[];
}
