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

  // BATCH OPERATIONS

  batchRevoke(sessionIds: string[]): Promise<number>;
}
