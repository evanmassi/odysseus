/**
 * User Session Repository Interface
 *
 * Data access contract for user sessions. Enforces maxConcurrentSessions security policy.
 */

import { UserSession } from '@domain/entities/UserSession';

export interface UserSessionRepository {

  // BASIC CRUD OPERATIONS

  findById(id: string): Promise<UserSession | null>;
  findByRefreshToken(refreshToken: string): Promise<UserSession | null>;
  findAllByUserId(userId: string): Promise<UserSession[]>;
  findActiveSessionsByUserId(userId: string): Promise<UserSession[]>;
  save(session: UserSession): Promise<void>;
  delete(id: string): Promise<boolean>;

  // SESSION MANAGEMENT OPERATIONS

  /** Used to enforce maxConcurrentSessions limit. */
  countActiveSessions(userId: string): Promise<number>;

  /** Soft-revoke (marks as inactive, does not delete). */
  revokeSession(sessionId: string): Promise<boolean>;

  /** Logout from all devices. */
  revokeAllSessions(userId: string): Promise<number>;

  updateLastUsed(sessionId: string, timestamp: Date): Promise<boolean>;

  // SECURITY & MONITORING

  findByIpAddress(ipAddress: string): Promise<UserSession[]>;
  findRecentlyActiveSessions(userId: string, minutesAgo: number): Promise<UserSession[]>;
  findSessionsCreatedBetween(startDate: Date, endDate: Date): Promise<UserSession[]>;

  /** Used when enforcing session limits. */
  getOldestActiveSession(userId: string): Promise<UserSession | null>;

  // MAINTENANCE OPERATIONS

  /** Permanent deletion — should be called periodically by maintenance job. */
  cleanupExpiredSessions(olderThanDays?: number): Promise<number>;

  /** Marks expired sessions as inactive without deleting. */
  revokeExpiredSessions(): Promise<number>;

  getSessionStatistics(): Promise<{
    total: number;
    active: number;
    expired: number;
    inactive: number;
    averageSessionDurationMinutes: number;
  }>;

  // BATCH OPERATIONS

  batchRevoke(sessionIds: string[]): Promise<number>;
  batchDelete(sessionIds: string[]): Promise<number>;
}
