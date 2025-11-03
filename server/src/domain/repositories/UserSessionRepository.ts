import { UserSession } from '@domain/entities/UserSession';

/**
 * UserSession Repository Interface
 *
 * Defines the contract for user session data access operations.
 * Used to enforce maxConcurrentSessions security policy and track active sessions.
 */
export interface UserSessionRepository {

  // BASIC CRUD OPERATIONS

  /**
   * Find session by unique identifier
   */
  findById(id: string): Promise<UserSession | null>;

  /**
   * Find session by refresh token
   */
  findByRefreshToken(refreshToken: string): Promise<UserSession | null>;

  /**
   * Find all sessions for a user (including expired/inactive)
   */
  findAllByUserId(userId: string): Promise<UserSession[]>;

  /**
   * Find all active sessions for a user (not expired, isActive=true)
   */
  findActiveSessionsByUserId(userId: string): Promise<UserSession[]>;

  /**
   * Save session (create or update)
   */
  save(session: UserSession): Promise<void>;

  /**
   * Delete session by ID
   */
  delete(id: string): Promise<boolean>;

  // SESSION MANAGEMENT OPERATIONS

  /**
   * Create new session
   */
  createSession(session: UserSession): Promise<void>;

  /**
   * Count active sessions for a user
   * Used to enforce maxConcurrentSessions limit
   */
  countActiveSessions(userId: string): Promise<number>;

  /**
   * Revoke single session (mark as inactive)
   */
  revokeSession(sessionId: string): Promise<boolean>;

  /**
   * Revoke all sessions for a user (logout from all devices)
   */
  revokeAllSessions(userId: string): Promise<number>;

  /**
   * Update last used timestamp for session
   */
  updateLastUsed(sessionId: string, timestamp: Date): Promise<boolean>;

  // SECURITY & MONITORING

  /**
   * Find sessions by IP address for security analysis
   */
  findByIpAddress(ipAddress: string): Promise<UserSession[]>;

  /**
   * Find recently active sessions for a user
   */
  findRecentlyActiveSessions(userId: string, minutesAgo: number): Promise<UserSession[]>;

  /**
   * Find sessions created within time range
   */
  findSessionsCreatedBetween(startDate: Date, endDate: Date): Promise<UserSession[]>;

  /**
   * Get oldest active session for a user
   * Used when enforcing session limits
   */
  getOldestActiveSession(userId: string): Promise<UserSession | null>;

  // MAINTENANCE OPERATIONS

  /**
   * Clean up expired sessions (permanent deletion)
   * Should be called periodically by maintenance job
   */
  cleanupExpiredSessions(olderThanDays?: number): Promise<number>;

  /**
   * Revoke all expired sessions
   * Marks expired sessions as inactive without deleting
   */
  revokeExpiredSessions(): Promise<number>;

  /**
   * Get session statistics for monitoring
   */
  getSessionStatistics(): Promise<{
    total: number;
    active: number;
    expired: number;
    inactive: number;
    averageSessionDurationMinutes: number;
  }>;

  // BATCH OPERATIONS

  /**
   * Batch revoke sessions by IDs
   */
  batchRevoke(sessionIds: string[]): Promise<number>;

  /**
   * Batch delete sessions by IDs
   */
  batchDelete(sessionIds: string[]): Promise<number>;
}
