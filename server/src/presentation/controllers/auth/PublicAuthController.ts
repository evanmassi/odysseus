/**
 * Public Authentication Controller
 *
 * Unauthenticated endpoints — login, registration, password reset, email verification, first-time setup.
 */

import { API_ERROR_CODES } from '@odysseus/shared-schemas';
import {
  registerWithProfileSchema,
  forceChangePasswordRequestSchema,
  type PasswordChangeRequiredResponse,
  type SessionInfoResponse,
  PasswordValidator
} from '@odysseus/shared-schemas';


import type { SendVerificationEmailCommandHandler, VerifyEmailCommand, VerifyEmailCommandHandler, ResendVerificationEmailCommandHandler } from '@application/commands/EmailVerificationCommands';
import type { ResetPasswordWithTokenCommandHandler } from '@application/commands/PasswordResetCommands';
import type {
  CreateUserCommand, CreateUserCommandHandler,
  CreateSystemAdminCommand, CreateSystemAdminCommandHandler,
  LoginCommand, LoginCommandHandler,
} from '@application/commands/UserCommands';
import type { EventBus } from '@application/contracts/EventBus';
import type { PasswordService } from '@application/contracts/PasswordService';
import type { SessionService } from '@application/contracts/SessionService';
import type { CheckFirstTimeSetupQueryHandler } from '@application/queries/UserQueries';
import { CheckFirstTimeSetupQuery } from '@application/queries/UserQueries';
import type { UserApplicationService } from '@application/services/UserApplicationService';
import { PermissionError } from '@domain/errors/PermissionError';
import { InvalidCredentialsError } from '@domain/errors/UserErrors';
import { UserLoginFailedEvent } from '@domain/events/UserEvents';
import type { PersonRepository } from '@domain/repositories/PersonRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import { UserRole } from '@domain/value-objects/UserRole';
import { logger } from '@infrastructure/logging/logger';
import { recordSuccessfulLogin, recordFailedLogin } from '@presentation/middleware/rateLimitMiddleware';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';


export interface PublicAuthControllerDeps {
  createUserHandler: CreateUserCommandHandler;
  loginHandler: LoginCommandHandler;
  createSystemAdminHandler: CreateSystemAdminCommandHandler;
  checkFirstTimeHandler: CheckFirstTimeSetupQueryHandler;
  sendVerificationEmailHandler: SendVerificationEmailCommandHandler;
  verifyEmailHandler: VerifyEmailCommandHandler;
  resendVerificationHandler: ResendVerificationEmailCommandHandler;
  resetPasswordWithTokenHandler: ResetPasswordWithTokenCommandHandler;
  sessionService: SessionService;
  userApplicationService: UserApplicationService;
  configRepository: StorageRepository;
  personRepository: PersonRepository;
  userSessionRepository: UserSessionRepository;
  userRepository: UserRepository;
  passwordService: PasswordService;
  eventBus: EventBus;
}

export class PublicAuthController {
  constructor(private deps: PublicAuthControllerDeps) {}

  async checkFirstTime(req: Request, res: Response): Promise<void> {
    try {

      const query = new CheckFirstTimeSetupQuery();
      const result = await this.deps.checkFirstTimeHandler.handle(query);

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

      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip ?? req.socket.remoteAddress;
      const authResult = await this.deps.sessionService.createTokenPair(user, userAgent, ipAddress);

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

      const securityConfig = await this.deps.configRepository.getSecurityConfig();

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

  async register(req: Request, res: Response): Promise<void> {
    try {

      const { username, password, role = 'admin' } = req.body;

      const command: CreateUserCommand = {
        username,
        password,
        role: UserRole.create(role),
        initiatedBy: 'system',
      };

      const user = await this.deps.createUserHandler.handle(command);

      logger.info('User registered successfully', {
        userId: user.id,
        username: user.username,
        role: user.role.value
      });

      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip ?? req.socket.remoteAddress;
      const authResult = await this.deps.sessionService.createTokenPair(user, userAgent, ipAddress);

      const response = ResponseBuilder.success({
        user: user.toPublicData(),
        tokens: authResult.tokens
      });
      res.status(201).json(response);
    } catch (error) {
      handleControllerError(error, res, 'Failed to register');
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

      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip ?? req.socket.remoteAddress;
      const enhancedResult = await this.deps.sessionService.createTokenPair(result.user, userAgent, ipAddress);

      const response = ResponseBuilder.success(enhancedResult);
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
      if (user.personId) {
        const person = await this.deps.personRepository.findById(user.personId);
        if (person?.email) {
          try {
            const sendCommand = { userId: user.id };
            await this.deps.sendVerificationEmailHandler.handle(sendCommand);
            logger.info('Verification email sent', { userId: user.id, email: person.email });
          } catch (emailError) {
            logger.error('Failed to send verification email', {
              userId: user.id,
              email: person.email,
              error: emailError instanceof Error ? emailError.message : String(emailError)
            });
          }
        }
      }

      if (user.isApproved()) {
        const userAgent = req.headers['user-agent'];
        const ipAddress = req.ip ?? req.socket.remoteAddress;
        const authResult = await this.deps.sessionService.createTokenPair(user, userAgent, ipAddress);

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

      if (user.personId) {
        const person = await this.deps.personRepository.findById(user.personId);
        logger.info('Email verified successfully', {
          userId: user.id,
          email: person?.email ?? 'unknown'
        });
      }

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

      logger.info('Verification email resent (public)', {
        userId: user.id,
        usernameOrEmail
      });

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

      const user = await this.deps.userRepository.findById(tokenData.userId);
      if (!user) {
        res.status(404).json(ResponseBuilder.error(API_ERROR_CODES.RESOURCE_NOT_FOUND, 'User not found'));
        return;
      }

      const securityConfig = await this.deps.configRepository.getSecurityConfig();
      try {
        PasswordValidator.enforce(newPassword, securityConfig);
      } catch (error) {
        res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.VALIDATION_FAILED, (error as Error).message));
        return;
      }

      const passwordHash = await this.deps.passwordService.hash(newPassword);
      user.setPasswordHash(passwordHash);
      user.markPasswordChanged();
      await this.deps.userRepository.save(user);

      logger.info('Password changed via force-change flow', {
        userId: user.id,
        username: user.username
      });

      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip ?? req.socket.remoteAddress;
      const authResult = await this.deps.sessionService.createTokenPair(user, userAgent, ipAddress);

      const response = ResponseBuilder.success({
        ...authResult,
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

      const result = await this.deps.sessionService.validateSessionWithActivity(token, { updateActivity: false });

      if (!result.success) {
        res.status(200).json(ResponseBuilder.success({
          isAuthenticated: false,
          reason: result.code
        }));
        return;
      }

      const session = await this.deps.userSessionRepository.findById(result.sessionId);
      const config = await this.deps.configRepository.getSecurityConfig();

      if (!session) {
        res.status(200).json(ResponseBuilder.success({
          isAuthenticated: false,
          reason: 'SESSION_NOT_FOUND'
        }));
        return;
      }

      const now = Date.now();
      const idleTimeoutMs = config.sessionTimeoutMinutes * 60 * 1000;
      const warningMs = config.idleWarningMinutes * 60 * 1000;

      const timeUntilIdleTimeoutMs = Math.max(0, (session.lastUsedAt.getTime() + idleTimeoutMs) - now);
      const showWarning = timeUntilIdleTimeoutMs <= warningMs && timeUntilIdleTimeoutMs > 0;

      res.status(200).json(ResponseBuilder.success<SessionInfoResponse>({
        isAuthenticated: true,
        timeUntilIdleTimeoutMs,
        showWarning,
        idleWarningMinutes: config.idleWarningMinutes
      }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get session info');
    }
  }
}
