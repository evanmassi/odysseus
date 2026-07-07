/**
 * Session Queries
 *
 * Read-side session inspection for the public session-info polling endpoint.
 */

import type { SessionService } from '@application/contracts/SessionService';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { UserSessionRepository } from '@domain/repositories/UserSessionRepository';

import type { SessionInfoResponse } from '@odysseus/shared-schemas';

export interface GetSessionInfoQuery {
  token: string;
}

/**
 * Validates a bearer token without extending the session and reports idle-timeout
 * status for the client's "stay logged in" warning.
 */
export class GetSessionInfoQueryHandler {
  constructor(
    private sessionService: SessionService,
    private userSessionRepository: UserSessionRepository,
    private storageRepository: StorageRepository
  ) {}

  async handle(query: GetSessionInfoQuery): Promise<SessionInfoResponse> {
    const result = await this.sessionService.validateSessionWithActivity(query.token, { updateActivity: false });
    if (!result.success) {
      return { isAuthenticated: false, reason: result.code };
    }

    const session = await this.userSessionRepository.findById(result.sessionId);
    if (!session) {
      return { isAuthenticated: false, reason: 'SESSION_NOT_FOUND' };
    }

    const config = await this.storageRepository.getSecurityConfig();
    const now = Date.now();
    const idleTimeoutMs = config.sessionTimeoutMinutes * 60 * 1000;
    const warningMs = config.idleWarningMinutes * 60 * 1000;
    const timeUntilIdleTimeoutMs = Math.max(0, (session.lastUsedAt.getTime() + idleTimeoutMs) - now);
    const showWarning = timeUntilIdleTimeoutMs <= warningMs && timeUntilIdleTimeoutMs > 0;

    return {
      isAuthenticated: true,
      timeUntilIdleTimeoutMs,
      showWarning,
      idleWarningMinutes: config.idleWarningMinutes,
    };
  }
}
