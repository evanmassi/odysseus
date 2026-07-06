/**
 * User Session Controller
 *
 * HTTP handlers for session listing and revocation.
 */


import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';
import type { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import { logger } from '@infrastructure/logging/logger';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';

export interface UserSessionControllerDeps {
  userSessionRepository: UserSessionRepository;
}

export class UserSessionController extends BaseController {
  constructor(private deps: UserSessionControllerDeps) {
    super();
  }

  /** GET /api/users/me/sessions */
  async getUserSessions(req: Request, res: Response): Promise<void> {
    try {
      const user = this.getAuthenticatedUser(req);
      const sessions = await this.deps.userSessionRepository.findActiveSessionsByUserId(user.id);
      const currentSessionId = req.sessionId;

      const sessionData = sessions.map(session => ({
        id: session.id,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt.toISOString(),
        lastUsedAt: session.lastUsedAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        isCurrentSession: session.id === currentSessionId
      }));

      logger.debug('Sessions retrieved', { userId: user.id, count: sessions.length, requestId: req.requestId });

      res.status(200).json(ResponseBuilder.success(sessionData));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get user sessions');
    }
  }

  /** DELETE /api/users/me/sessions/:id */
  async revokeSession(req: Request, res: Response): Promise<void> {
    try {
      const user = this.getAuthenticatedUser(req);
      const sessionId = req.params.id;

      if (sessionId === req.sessionId) {
        throw new PermissionError('Cannot revoke your current session. Use logout instead.');
      }

      const session = await this.deps.userSessionRepository.findById(sessionId);
      if (!session) {
        throw new NotFoundError('Session not found');
      }

      if (session.userId !== user.id) {
        throw new NotFoundError('Session not found');
      }

      const revoked = await this.deps.userSessionRepository.revokeSession(sessionId);
      if (!revoked) {
        throw new NotFoundError('Session not found or already revoked');
      }

      logger.debug('Session revoked', { userId: user.id, sessionId, requestId: req.requestId });

      res.status(200).json(ResponseBuilder.success({ message: 'Session revoked successfully' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to revoke session');
    }
  }
}
