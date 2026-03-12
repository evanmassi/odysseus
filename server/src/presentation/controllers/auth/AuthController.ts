/**
 * Authenticated Session Controller
 *
 * Endpoints for logged-in users managing their own session — verify, logout, heartbeat,
 * password change, and email verification status.
 */

import { Request, Response, NextFunction } from 'express';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';
import { logger } from '@infrastructure/logging/logger';
import type { EventBus } from '@application/contracts/EventBus';
import { UserLoggedOutEvent } from '@domain/events/UserEvents';
import { ChangeUserPasswordCommand, ChangeUserPasswordCommandHandler } from '@application/commands/UserCommands';
import { ResendVerificationEmailCommandHandler } from '@application/commands/EmailVerificationCommands';
import { PersonRepository } from '@domain/repositories/PersonRepository';
import { PermissionError } from '@domain/errors/PermissionError';

export interface AuthControllerDeps {
  changePasswordHandler: ChangeUserPasswordCommandHandler;
  resendVerificationHandler: ResendVerificationEmailCommandHandler;
  personRepository: PersonRepository;
  eventBus: EventBus;
}

export class AuthController {
  constructor(private deps: AuthControllerDeps) {}

  async verifySession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;

      if (!user) {
        return next(new Error('User not found in request context'));
      }

      logger.debug('Session verified', {
        userId: user.id,
        username: user.username
      });

      const response = ResponseBuilder.success({
        user: user.toPublicData()
      });
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;

      if (!user) {
        return next(new Error('User not found in request context'));
      }

      const response = ResponseBuilder.success({
        user: user.toPublicData(),
        permissions: user.getPermissions()
      });
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        return next(new Error('User not found in request context'));
      }

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

      logger.info('Password changed successfully', {
        userId: user.id,
        username: user.username
      });

      const response = ResponseBuilder.success({ message: 'Password changed successfully' });
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        return next(new Error('User not found in request context'));
      }

      await this.deps.eventBus.publish(new UserLoggedOutEvent(
        user.id,
        user.username,
        user.labId
      ));

      logger.info('User logged out', {
        userId: user.id,
        username: user.username
      });

      const response = ResponseBuilder.success({ message: 'Logged out successfully' });
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Called by client "Stay Logged In" action. Auth middleware
   * updates lastUsedAt via validateSessionWithActivity.
   */
  async heartbeat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        return next(new Error('User not found in request context'));
      }

      logger.debug('Session heartbeat received', {
        userId: user.id,
        username: user.username,
        sessionId: req.sessionId
      });

      const response = ResponseBuilder.success({
        success: true,
        message: 'Session extended'
      });
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** Deprecated — use public endpoint. */
  async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new PermissionError('Authentication required');
      }

      const command = { userId: req.user.id };
      await this.deps.resendVerificationHandler.handle(command);

      if (req.user.personId) {
        const person = await this.deps.personRepository.findById(req.user.personId);
        logger.info('Verification email resent', {
          userId: req.user.id,
          email: person?.email || 'unknown'
        });
      }

      res.status(200).json(ResponseBuilder.success({
        message: 'Verification email sent. Check your inbox.',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      }));
    } catch (error) {
      next(error);
    }
  }

  async getVerificationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new PermissionError('Authentication required');
      }

      logger.info('Verification status checked', {
        userId: req.user.id,
        emailVerified: req.user.emailVerified
      });

      let email: string | null = null;
      if (req.user.personId) {
        const person = await this.deps.personRepository.findById(req.user.personId);
        email = person?.email || null;
      }

      res.status(200).json(ResponseBuilder.success({
        emailVerified: req.user.emailVerified,
        email
      }));
    } catch (error) {
      next(error);
    }
  }
}
