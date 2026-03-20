/**
 * User Session Repository Interface
 *
 * Data access contract for user sessions. Enforces maxConcurrentSessions security policy.
 */

import type { UserSession } from '@domain/entities/UserSession';

export interface UserSessionRepository {

  // BASIC CRUD OPERATIONS

  findById(id: string): Promise<UserSession | null>;
  findByIds(ids: string[]): Promise<UserSession[]>;
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

  // SYSTEM-WIDE MONITORING

  countAllActiveSessions(): Promise<number>;
  countExpiredSessions(): Promise<number>;
  getAverageSessionDurationMinutes(): Promise<number>;
  findAllActiveSessionsWithUserInfo(): Promise<ActiveSessionWithUser[]>;
  purgeExpiredSessions(): Promise<number>;
  getSessionCountsByIp(startDate?: Date, endDate?: Date): Promise<IpSessionCount[]>;
  getSessionActivityByHour(hours: number): Promise<Array<{ hour: Date; count: number }>>;
}

export interface ActiveSessionWithUser {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  ipAddress: string | null;
  loginTime: Date;
  lastActivity: Date;
  deviceInfo: string | null;
  userAgent: string | null;
}

export interface IpSessionCount {
  ipAddress: string;
  sessionCount: number;
  userIds: string[];
}
