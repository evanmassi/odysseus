/**
 * User Session Service
 *
 * Self-service listing and revocation of the authenticated user's own sessions.
 */

import type { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';
import type { UserSessionRepository } from '@domain/repositories/UserSessionRepository';

import type { ActiveSession } from '@odysseus/shared-schemas';

/** Server-serialized shape: dates are ISO strings (the schema coerces them back to Date on parse). */
type ActiveSessionResponse = Omit<ActiveSession, 'createdAt' | 'lastUsedAt' | 'expiresAt'> & {
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
};

export interface UserSessionApplicationServiceDeps {
  userSessionRepository: UserSessionRepository;
}

export class UserSessionApplicationService {
  constructor(private deps: UserSessionApplicationServiceDeps) {}

  async getActiveSessions(
    user: User,
    currentSessionId: string | undefined
  ): Promise<ActiveSessionResponse[]> {
    const sessions = await this.deps.userSessionRepository.findActiveSessionsByUserId(user.id);

    return sessions.map(session => ({
      id: session.id,
      deviceInfo: session.deviceInfo,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt.toISOString(),
      lastUsedAt: session.lastUsedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      isCurrentSession: session.id === currentSessionId,
    }));
  }

  async revokeSession(
    user: User,
    sessionId: string,
    currentSessionId: string | undefined
  ): Promise<void> {
    if (sessionId === currentSessionId) {
      throw new PermissionError('Cannot revoke your current session. Use logout instead.');
    }

    const session = await this.deps.userSessionRepository.findById(sessionId);
    if (!session || session.userId !== user.id) {
      throw new NotFoundError('Session not found');
    }

    const revoked = await this.deps.userSessionRepository.revokeSession(sessionId);
    if (!revoked) {
      throw new NotFoundError('Session not found or already revoked');
    }
  }

  /**
   * Revokes several of the user's own sessions in one call. The current session and any id that
   * isn't one of the user's active sessions are silently skipped — a user can never revoke another
   * account's session, and bulk revoke is best-effort rather than all-or-nothing.
   */
  async bulkRevokeSessions(
    user: User,
    sessionIds: string[],
    currentSessionId: string | undefined
  ): Promise<{ revokedCount: number }> {
    const activeSessions = await this.deps.userSessionRepository.findActiveSessionsByUserId(
      user.id
    );
    const ownedIds = new Set(activeSessions.map(session => session.id));

    const revocableIds = sessionIds.filter(id => id !== currentSessionId && ownedIds.has(id));
    if (revocableIds.length === 0) {
      return { revokedCount: 0 };
    }

    const revokedCount = await this.deps.userSessionRepository.bulkRevoke(revocableIds);
    return { revokedCount };
  }
}
