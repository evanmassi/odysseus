import { Request, Response, NextFunction } from 'express';
import { logger } from '@utils/logger';
import { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';

/**
 * Session Controller
 *
 * Handles user session management (list, revoke sessions)
 */
export class SessionController {
  constructor(private userSessionRepository: UserSessionRepository) {}

  /**
   * GET /api/users/me/sessions
   * Get all active sessions for current user
   */
  async getUserSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new PermissionError('Authentication required');
      }

      const sessions = await this.userSessionRepository.findActiveSessionsByUserId(req.user.id);

      // Get current session ID from JWT token (if available)
      const currentSessionId = (req as any).sessionId;

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

      logger.info('Sessions retrieved', { userId: req.user.id, count: sessions.length });

      res.status(200).json({
        success: true,
        data: sessionData
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/users/me/sessions/:id
   * Revoke a specific session
   */
  async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new PermissionError('Authentication required');
      }

      const sessionId = req.params.id;

      // Get current session ID to prevent self-revocation
      const currentSessionId = (req as any).sessionId;
      if (sessionId === currentSessionId) {
        throw new PermissionError('Cannot revoke your current session. Use logout instead.');
      }

      // Verify session belongs to user
      const session = await this.userSessionRepository.findById(sessionId);
      if (!session) {
        throw new NotFoundError('Session not found');
      }

      if (session.userId !== req.user.id) {
        throw new PermissionError('You can only revoke your own sessions');
      }

      // Revoke session
      const revoked = await this.userSessionRepository.revokeSession(sessionId);

      if (!revoked) {
        throw new NotFoundError('Session not found or already revoked');
      }

      logger.info('Session revoked', { userId: req.user.id, sessionId });

      res.status(200).json({
        success: true,
        message: 'Session revoked successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/users/me/sessions/all
   * Revoke all other sessions (except current)
   */
  async revokeAllOtherSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new PermissionError('Authentication required');
      }

      const currentSessionId = (req as any).sessionId;

      // Get all active sessions for user
      const sessions = await this.userSessionRepository.findActiveSessionsByUserId(req.user.id);

      // Filter out current session
      const otherSessionIds = sessions
        .filter(s => s.id !== currentSessionId)
        .map(s => s.id);

      // Revoke all other sessions
      const revokedCount = await this.userSessionRepository.batchRevoke(otherSessionIds);

      logger.info('All other sessions revoked', { userId: req.user.id, revokedCount });

      res.status(200).json({
        success: true,
        message: `${revokedCount} session(s) revoked successfully`,
        revokedCount
      });
    } catch (error) {
      next(error);
    }
  }
}
