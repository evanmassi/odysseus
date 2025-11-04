/**
 * UserSessionService - Session management operations
 *
 * Handles listing and revoking user sessions.
 */

import { httpClient } from '@infra/api/httpClient';
import { z } from 'zod';

/**
 * Active session data returned from GET /api/users/me/sessions
 * Subset of UserSession with isCurrentSession flag
 */
const activeSessionSchema = z.object({
  id: z.string(),
  deviceInfo: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.string().datetime(),
  lastUsedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  isCurrentSession: z.boolean(),
});

export type ActiveSession = z.infer<typeof activeSessionSchema>;

const revokeSessionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

const revokeAllResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  revokedCount: z.number(),
});

export class UserSessionService {
  private static readonly BASE_PATH = '/users/me/sessions';

  /**
   * Get all active sessions for current user
   */
  static async getMySessions(): Promise<ActiveSession[]> {
    return await httpClient.getData(
      this.BASE_PATH,
      z.array(activeSessionSchema)
    );
  }

  /**
   * Revoke a specific session
   *
   * @param sessionId - Session ID to revoke
   * @throws Error if attempting to revoke current session
   */
  static async revokeSession(sessionId: string): Promise<void> {
    await httpClient.getData(
      `${this.BASE_PATH}/${sessionId}`,
      revokeSessionResponseSchema
    );
  }

  /**
   * Revoke all sessions except current session
   *
   * @returns Number of sessions revoked
   */
  static async revokeAllOtherSessions(): Promise<number> {
    const response = await httpClient.getData(
      `${this.BASE_PATH}/all`,
      revokeAllResponseSchema
    );
    return response.revokedCount;
  }
}
