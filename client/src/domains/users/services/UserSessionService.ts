/**
 * Session Management Service
 *
 * Handles listing and revoking user sessions.
 */
import { activeSessionSchema, type ActiveSession } from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

export class UserSessionService {
  private static readonly BASE_PATH = '/users/me/sessions';

  static async getMySessions(): Promise<ActiveSession[]> {
    return await httpClient.getArray(this.BASE_PATH, activeSessionSchema);
  }

  /** @throws Error if attempting to revoke current session */
  static async revokeSession(sessionId: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${sessionId}`);
  }
}
