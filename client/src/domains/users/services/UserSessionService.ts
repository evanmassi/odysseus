/**
 * Session Management Service
 *
 * Handles listing and revoking user sessions.
 */
import {
  activeSessionSchema,
  bulkRevokeResponseSchema,
  type ActiveSession,
  type BulkRevokeResponse,
} from '@odysseus/shared-schemas';

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

  /** Revokes several of the user's own sessions in one request; the current session is skipped. */
  static async bulkRevokeSessions(sessionIds: string[]): Promise<BulkRevokeResponse> {
    return await httpClient.postData(
      `${this.BASE_PATH}/bulk-revoke`,
      { sessionIds },
      bulkRevokeResponseSchema
    );
  }
}
