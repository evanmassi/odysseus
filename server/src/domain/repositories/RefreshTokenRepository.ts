/**
 * Refresh Token Repository Interface
 *
 * Data access contract for OAuth 2.0 refresh token lifecycle.
 */

import type { RefreshToken } from '@domain/entities/RefreshToken';

export interface RefreshTokenRepository {
  /** Primary lookup path for token validation. */
  findByToken(token: string): Promise<RefreshToken | null>;

  save(refreshToken: RefreshToken): Promise<void>;
  delete(id: string): Promise<boolean>;

  /** Logout from all devices. */
  revokeAllForUser(userId: string): Promise<number>;

  /** Permanent deletion — should be called periodically by maintenance job. */
  cleanupExpiredTokens(olderThanDays?: number): Promise<number>;

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
