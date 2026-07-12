/**
 * Public Authentication Controller
 *
 * Unauthenticated endpoints — login, registration, password reset, email verification, first-time setup.
 */

import { API_ERROR_CODES } from '@odysseus/shared-schemas';
import {
  registerWithProfileSchema,
  forceChangePasswordRequestSchema,
  type PasswordChangeRequiredResponse
} from '@odysseus/shared-schemas';


import type { SendVerificationEmailCommandHandler, VerifyEmailCommand, VerifyEmailCommandHandler, ResendVerificationEmailCommandHandler } from '@application/commands/EmailVerificationCommands';
import type { ForceChangePasswordCommandHandler, ResetPasswordWithTokenCommandHandler } from '@application/commands/PasswordResetCommands';
import type {
  CreateSystemAdminCommand, CreateSystemAdminCommandHandler,
  LoginCommand, LoginCommandHandler,
} from '@application/commands/UserCommands';
import type { EventBus } from '@application/contracts/EventBus';
import type { SessionService } from '@application/contracts/SessionService';
import type { GetSessionInfoQueryHandler } from '@application/queries/SessionQueries';
import type { CheckFirstTimeSetupQueryHandler } from '@application/queries/UserQueries';
import type { PersonApplicationService } from '@application/services/PersonApplicationService';
import type { SecurityConfigApplicationService } from '@application/services/SecurityConfigApplicationService';
import type { UserApplicationService } from '@application/services/UserApplicationService';
import type { User } from '@domain/entities/User';
import { PermissionError } from '@domain/errors/PermissionError';
import { InvalidCredentialsError } from '@domain/errors/UserErrors';
import { UserLoginFailedEvent } from '@domain/events/UserEvents';
import { logger } from '@infrastructure/logging/logger';
import { recordSuccessfulLogin, recordFailedLogin } from '@presentation/middleware/rateLimitMiddleware';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';


export interface PublicAuthControllerDeps {
  loginHandler: LoginCommandHandler;
  createSystemAdminHandler: CreateSystemAdminCommandHandler;
  checkFirstTimeHandler: CheckFirstTimeSetupQueryHandler;
  sendVerificationEmailHandler: SendVerificationEmailCommandHandler;
  verifyEmailHandler: VerifyEmailCommandHandler;
  resendVerificationHandler: ResendVerificationEmailCommandHandler;
  resetPasswordWithTokenHandler: ResetPasswordWithTokenCommandHandler;
  forceChangePasswordHandler: ForceChangePasswordCommandHandler;
  getSessionInfoHandler: GetSessionInfoQueryHandler;
  sessionService: SessionService;
  userApplicationService: UserApplicationService;
  securityConfigService: SecurityConfigApplicationService;
  personApplicationService: PersonApplicationService;
  eventBus: EventBus;
}

export class PublicAuthController {
  constructor(private deps: PublicAuthControllerDeps) {}

  async checkFirstTime(req: Request, res: Response): Promise<void> {
    try {

      const result = await this.deps.checkFirstTimeHandler.handle();

      logger.info('First-time setup check completed', { isFirstTime: result.isFirstTime });

      res.status(200).json(ResponseBuilder.success({
        isFirstTime: result.isFirstTime,
        needsSystemAdmin: result.needsSystemAdmin
      }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to check first time setup');
    }
  }

  /** One-time system admin creation. */
  async setupSystemAdmin(req: Request, res: Response): Promise<void> {
    try {

      const { username, password, email, firstName, lastName, setupKey, department, position } = req.body;

      const command: CreateSystemAdminCommand = { username, password, email, firstName, lastName, setupKey, department, position };
      const user = await this.deps.createSystemAdminHandler.handle(command);

      logger.info('System admin created', { userId: user.id, username: user.username });

      const authResult = await this.issueTokens(req, user);

      const response = ResponseBuilder.success({
        user: user.toPublicData(),
        sessionToken: authResult.tokens.accessToken,
        tokens: authResult.tokens,
      });
      res.status(201).json(response);
    } catch (error) {
      handleControllerError(error, res, 'Failed to setup system admin');
    }
  }

  async getPasswordRequirements(req: Request, res: Response): Promise<void> {
    try {

      const securityConfig = await this.deps.securityConfigService.getSecurityConfig();

      const passwordRequirements = {
        passwordMinLength: securityConfig.passwordMinLength,
        requireStrongPasswords: securityConfig.requireStrongPasswords,
        passwordRequireSpecialChars: securityConfig.passwordRequireSpecialChars
      };

      logger.info('Password requirements retrieved');

      res.status(200).json(ResponseBuilder.success(passwordRequirements));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get password requirements');
    }
  }

  /**
   * If requirePasswordChange is set, returns a temporary token
   * for the force-change-password endpoint instead of full login tokens.
   */
  async login(req: Request, res: Response): Promise<void> {
    try {

      const { username, password } = req.body;

      const command: LoginCommand = { username, password };
      const result = await this.deps.loginHandler.handle(command);

      if (result.user.isPending()) {
        this.denyLogin(req, result.user.username, 'Account is awaiting administrator approval', result.user.id);
      }

      if (result.user.isRejected()) {
        this.denyLogin(req, result.user.username, 'Account access has been denied', result.user.id);
      }

      if (result.user.isDeactivated()) {
        this.denyLogin(req, result.user.username, 'Account has been deactivated. Contact your lab administrator', result.user.id);
      }

      if (result.user.isSuspended()) {
        this.denyLogin(req, result.user.username, 'Account has been suspended. Contact your system administrator', result.user.id);
      }

      if (!result.user.isApproved()) {
        this.denyLogin(req, result.user.username, 'Account is not approved for access', result.user.id);
      }

      recordSuccessfulLogin(req);

      if (result.requirePasswordChange) {
        logger.info('User requires password change', {
          userId: result.user.id,
          username: result.user.username
        });

        const tempToken = this.deps.sessionService.createPasswordChangeTempToken(result.user);

        const passwordChangeResponse: PasswordChangeRequiredResponse = {
          requirePasswordChange: true,
          tempToken,
          user: {
            id: result.user.id,
            username: result.user.username
          }
        };

        const response = ResponseBuilder.success(passwordChangeResponse);
        res.status(200).json(response);
        return;
      }

      logger.info('User logged in successfully', {
        userId: result.user.id,
        username: result.user.username,
        status: result.user.status
      });

      const enhancedResult = await this.issueTokens(req, result.user);

      // authResponseSchema requires sessionToken alongside tokens (legacy wire contract)
      const response = ResponseBuilder.success({
        ...enhancedResult,
        sessionToken: enhancedResult.tokens.accessToken,
      });
      res.status(200).json(response);
    } catch (error) {
      await recordFailedLogin(req);

      if (error instanceof InvalidCredentialsError) {
        this.publishLoginFailed(req, req.body.username ?? 'unknown', error.message);
      }

      handleControllerError(error, res, 'Failed to login');
    }
  }

  private publishLoginFailed(req: Request, username: string, reason: string, userId?: string): void {
    const ipAddress = req.ip ?? req.socket.remoteAddress;
    void this.deps.eventBus.publish(new UserLoginFailedEvent(username, ipAddress, reason, userId));
  }

  private denyLogin(req: Request, username: string, reason: string, userId: string): never {
    this.publishLoginFailed(req, username, reason, userId);
    throw new PermissionError(reason);
  }

  /** Creates a session token pair stamped with the request's user agent and IP. */
  private issueTokens(req: Request, user: User) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip ?? req.socket.remoteAddress;
    return this.deps.sessionService.createTokenPair(user, userAgent, ipAddress);
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {

      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.MISSING_TOKEN, 'Refresh token is required'));
        return;
      }

      try {
        const refreshResult = await this.deps.sessionService.refreshAccessToken(refreshToken);

        const response = ResponseBuilder.success(refreshResult);
        res.status(200).json(response);

        logger.info('Access token refreshed successfully');

      } catch (error) {
        res.status(401).json(ResponseBuilder.error(API_ERROR_CODES.INVALID_TOKEN, 'Invalid or expired refresh token'));
      }

    } catch (error) {
      handleControllerError(error, res, 'Failed to refresh token');
    }
  }

  /**
   * Registers user with optional researcher profile. First user is auto-approved
   * with tokens; subsequent users await admin approval.
   */
  async registerWithProfile(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = registerWithProfileSchema.parse(req.body);

      const user = await this.deps.userApplicationService.registerWithProfile(validatedData);

      logger.info('User registered', {
        userId: user.id,
        username: user.username,
        hasResearcher: !!user.researcherId,
        status: user.status,
        role: user.role.isAdmin() ? 'admin' : 'user'
      });

      // First user is auto-verified but still gets the email for record keeping
      const email = await this.deps.personApplicationService.getContactEmail(user);
      if (email) {
        try {
          await this.deps.sendVerificationEmailHandler.handle({ userId: user.id });
          logger.info('Verification email sent', { userId: user.id });
        } catch (emailError) {
          logger.error('Failed to send verification email', {
            userId: user.id,
            email,
            error: emailError instanceof Error ? emailError.message : String(emailError)
          });
        }
      }

      if (user.isApproved()) {
        const authResult = await this.issueTokens(req, user);

        const response = ResponseBuilder.success({
          user: user.toPublicData(),
          tokens: authResult.tokens,
          status: 'approved',
          message: 'Account created and approved'
        });

        res.status(201).json(response);
        return;
      }

      const response = ResponseBuilder.success({
        user: user.toPublicData(),
        status: 'pending',
        message: 'Account created. Awaiting administrator approval.'
      });

      res.status(201).json(response);
    } catch (error) {
      handleControllerError(error, res, 'Failed to register');
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.MISSING_TOKEN, 'Verification token is required'));
        return;
      }

      const command: VerifyEmailCommand = { token };
      const user = await this.deps.verifyEmailHandler.handle(command);

      logger.info('Email verified successfully', { userId: user.id });

      res.status(200).json(ResponseBuilder.success({ emailVerified: true }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to verify email');
    }
  }

  async resendVerificationPublic(req: Request, res: Response): Promise<void> {
    try {
      const { usernameOrEmail } = req.body;

      if (!usernameOrEmail) {
        res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.REQUIRED_FIELD_MISSING, 'Username or email is required'));
        return;
      }

      const userByUsername = await this.deps.userApplicationService.getUserByUsername(usernameOrEmail);
      const userByEmail = userByUsername ? null : await this.deps.userApplicationService.getUserByEmail(usernameOrEmail);
      const user = userByUsername ?? userByEmail;

      if (!user) {
        // Opaque response prevents user enumeration
        res.status(200).json(ResponseBuilder.success({
          message: 'If an account exists with that information, a verification email has been sent.'
        }));
        return;
      }

      const command = { userId: user.id };
      await this.deps.resendVerificationHandler.handle(command);

      logger.info('Verification email resent (public)', { userId: user.id });

      res.status(200).json(ResponseBuilder.success({
        message: 'Verification email sent. Please check your inbox.'
      }));
    } catch (error) {
      logger.error('Error in public resend verification', { error });
      res.status(200).json(ResponseBuilder.success({
        message: 'If an account exists with that information, a verification email has been sent.'
      }));
    }
  }

  async resetPasswordWithToken(req: Request, res: Response): Promise<void> {
    try {

      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.REQUIRED_FIELD_MISSING, 'Token and new password are required'));
        return;
      }

      await this.deps.resetPasswordWithTokenHandler.handle({
        token,
        newPassword
      });

      logger.info('Password reset completed with token');

      const response = ResponseBuilder.success({
        message: 'Password reset successfully. You can now login with your new password.'
      });

      res.status(200).json(response);
    } catch (error) {
      handleControllerError(error, res, 'Failed to reset password');
    }
  }

  /**
   * Called when login returns requirePasswordChange=true.
   * Uses temporary token from login response; returns full login tokens on success.
   */
  async forceChangePassword(req: Request, res: Response): Promise<void> {
    try {

      const parseResult = forceChangePasswordRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.VALIDATION_FAILED, parseResult.error.issues[0].message));
        return;
      }

      const { tempToken, newPassword } = parseResult.data;

      const tokenData = await this.deps.sessionService.verifyPasswordChangeTempToken(tempToken);
      if (!tokenData) {
        res.status(401).json(ResponseBuilder.error(API_ERROR_CODES.INVALID_TOKEN, 'Password change link has expired or is invalid'));
        return;
      }

      const user = await this.deps.forceChangePasswordHandler.handle({ userId: tokenData.userId, newPassword });

      const authResult = await this.issueTokens(req, user);

      // authResponseSchema requires sessionToken alongside tokens (legacy wire contract)
      const response = ResponseBuilder.success({
        ...authResult,
        sessionToken: authResult.tokens.accessToken,
        message: 'Password changed successfully'
      });

      res.status(200).json(response);
    } catch (error) {
      handleControllerError(error, res, 'Failed to force change password');
    }
  }

  /**
   * Public endpoint — handles its own validation with updateActivity: false
   * to prevent polling from extending the session.
   */
  async getSessionInfo(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(200).json(ResponseBuilder.success({ isAuthenticated: false }));
        return;
      }

      const token = authHeader.substring(7);
      const info = await this.deps.getSessionInfoHandler.handle({ token });

      res.status(200).json(ResponseBuilder.success(info));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get session info');
    }
  }
}
