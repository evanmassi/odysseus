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

  async getActiveSessions(user: User, currentSessionId: string | undefined): Promise<ActiveSessionResponse[]> {
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

  async revokeSession(user: User, sessionId: string, currentSessionId: string | undefined): Promise<void> {
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
}
