/**
 * Authenticated Session Controller
 *
 * Endpoints for logged-in users managing their own session — logout, heartbeat,
 * and password change.
 */

import type { ChangeUserPasswordCommand, ChangeUserPasswordCommandHandler } from '@application/commands/UserCommands';
import type { EventBus } from '@application/contracts/EventBus';
import { UserLoggedOutEvent } from '@domain/events/UserEvents';
import type { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import { logger } from '@infrastructure/logging/logger';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { MessageResponse } from '@odysseus/shared-schemas';
import type { Request, Response } from 'express';

export interface AuthControllerDeps {
  changePasswordHandler: ChangeUserPasswordCommandHandler;
  userSessionRepository: UserSessionRepository;
  eventBus: EventBus;
}

export class AuthController extends BaseController {
  constructor(private deps: AuthControllerDeps) {
    super();
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const user = this.getAuthenticatedUser(req);

      if (user.isDemo) {
        res.status(403).json(ResponseBuilder.forbidden('Password change is not available in demo mode'));
        return;
      }

      const { currentPassword, newPassword } = req.body;

      const command: ChangeUserPasswordCommand = {
        userId: user.id,
        currentPassword,
        newPassword,
        currentSessionId: req.sessionId,
        initiatedBy: user.id,
      };

      await this.deps.changePasswordHandler.handle(command);

      logger.info('Password changed successfully', { userId: user.id, username: user.username });

      const payload: MessageResponse = { message: 'Password changed successfully' };

      res.status(200).json(ResponseBuilder.success(payload));
    } catch (error) {
      handleControllerError(error, res, 'Failed to change password');
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const user = this.getAuthenticatedUser(req);

      // Revoke the session server-side so the access token and its refresh token
      // (rejected on an inactive session) stop working immediately, not just client-side.
      if (req.sessionId) {
        await this.deps.userSessionRepository.revokeSession(req.sessionId);
      }

      await this.deps.eventBus.publish(new UserLoggedOutEvent(user.id, user.username, user.labId));

      logger.info('User logged out', { userId: user.id, username: user.username });

      const payload: MessageResponse = { message: 'Logged out successfully' };

      res.status(200).json(ResponseBuilder.success(payload));
    } catch (error) {
      handleControllerError(error, res, 'Failed to logout');
    }
  }

  /**
   * Called by client "Stay Logged In" action. Auth middleware
   * updates lastUsedAt via validateSessionWithActivity.
   */
  async heartbeat(req: Request, res: Response): Promise<void> {
    try {
      const user = this.getAuthenticatedUser(req);

      logger.debug('Session heartbeat received', { userId: user.id, username: user.username, sessionId: req.sessionId });

      const payload: MessageResponse = { message: 'Session extended' };

      res.status(200).json(ResponseBuilder.success(payload));
    } catch (error) {
      handleControllerError(error, res, 'Failed to process heartbeat');
    }
  }
}
