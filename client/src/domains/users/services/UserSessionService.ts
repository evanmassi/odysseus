/**
 * Session Management Service
 *
 * Handles listing and revoking user sessions.
 */
import { z } from 'zod';

import { httpClient } from '@infra/api/HttpClient';

/**
 * Active session data returned from GET /api/users/me/sessions.
 * Subset of UserSession with isCurrentSession flag.
 */
const activeSessionSchema = z.object({
  id: z.string(),
  deviceInfo: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.date(),
  lastUsedAt: z.date(),
  expiresAt: z.date(),
  isCurrentSession: z.boolean(),
});

export type ActiveSession = z.infer<typeof activeSessionSchema>;

const revokeAllResponseSchema = z.object({
  message: z.string(),
  revokedCount: z.number(),
});

export class UserSessionService {
  private static readonly BASE_PATH = '/users/me/sessions';

  static async getMySessions(): Promise<ActiveSession[]> {
    return await httpClient.getData(this.BASE_PATH, z.array(activeSessionSchema));
  }

  /** @throws Error if attempting to revoke current session */
  static async revokeSession(sessionId: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${sessionId}`);
  }

  /** @returns Number of sessions revoked */
  static async revokeAllOtherSessions(): Promise<number> {
    const response = await httpClient.deleteWithData(
      `${this.BASE_PATH}/all`,
      revokeAllResponseSchema
    );
    return response.revokedCount;
  }
}
