/**
 * Session Management Service
 *
 * Handles listing and revoking user sessions.
 */
import {
  activeSessionSchema,
  revokeAllResponseSchema,
  type ActiveSession,
} from '@odysseus/shared-schemas';
import { z } from 'zod';

export type { ActiveSession } from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

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
