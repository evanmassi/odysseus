/**
 * User Session Controller
 *
 * HTTP handlers for session listing and revocation.
 */

import { Request, Response, NextFunction } from 'express';
import { BaseController } from '@presentation/controllers/BaseController';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';
import { logger } from '@infrastructure/logging/logger';
import { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';

export class UserSessionController extends BaseController {
  constructor(private userSessionRepository: UserSessionRepository) {
    super();
  }

  /** GET /api/users/me/sessions */
  async getUserSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.getAuthenticatedUser(req);
      const sessions = await this.userSessionRepository.findActiveSessionsByUserId(user.id);
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
      next(error);
    }
  }

  /** DELETE /api/users/me/sessions/:id */
  async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.getAuthenticatedUser(req);
      const sessionId = req.params.id;

      if (sessionId === req.sessionId) {
        throw new PermissionError('Cannot revoke your current session. Use logout instead.');
      }

      const session = await this.userSessionRepository.findById(sessionId);
      if (!session) {
        throw new NotFoundError('Session not found');
      }

      if (session.userId !== user.id) {
        throw new PermissionError('You can only revoke your own sessions');
      }

      const revoked = await this.userSessionRepository.revokeSession(sessionId);
      if (!revoked) {
        throw new NotFoundError('Session not found or already revoked');
      }

      logger.debug('Session revoked', { userId: user.id, sessionId, requestId: req.requestId });

      res.status(200).json(ResponseBuilder.success({ message: 'Session revoked successfully' }));
    } catch (error) {
      next(error);
    }
  }

  /** DELETE /api/users/me/sessions/all */
  async revokeAllOtherSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.getAuthenticatedUser(req);
      const currentSessionId = req.sessionId;

      const sessions = await this.userSessionRepository.findActiveSessionsByUserId(user.id);
      const otherSessionIds = sessions
        .filter(s => s.id !== currentSessionId)
        .map(s => s.id);

      const revokedCount = await this.userSessionRepository.batchRevoke(otherSessionIds);

      logger.debug('All other sessions revoked', { userId: user.id, revokedCount, requestId: req.requestId });

      res.status(200).json(ResponseBuilder.success({
        message: `${revokedCount} session(s) revoked successfully`,
        revokedCount
      }));
    } catch (error) {
      next(error);
    }
  }
}
