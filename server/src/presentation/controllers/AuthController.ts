/**
 * Auth Controller
 *
 * HTTP handlers for authentication, user management, and security configuration.
 */

import { Request, Response, NextFunction } from 'express';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';
import { logger } from '@infrastructure/logging/logger';
import { recordSuccessfulLogin, recordFailedLogin } from '@presentation/middleware/rateLimitMiddleware';
import type { EventBus } from '@application/contracts/EventBus';
import { UserLoggedOutEvent } from '@domain/events/UserEvents';
import type { SessionService } from '@application/contracts/SessionService';
import {
  CreateUserCommand, CreateUserCommandHandler,
  CreateSystemAdminCommand, CreateSystemAdminCommandHandler,
  LoginCommand, LoginCommandHandler,
  ChangeUserPasswordCommand, ChangeUserPasswordCommandHandler,
  ChangeUserRoleCommand, ChangeUserRoleCommandHandler,
  DeleteUserCommand, DeleteUserCommandHandler
} from '@application/commands/UserCommands';
import { SendVerificationEmailCommand, SendVerificationEmailCommandHandler, VerifyEmailCommand, VerifyEmailCommandHandler, ResendVerificationEmailCommand, ResendVerificationEmailCommandHandler } from '@application/commands/EmailVerificationCommands';
import { AdminResetPasswordCommandHandler, GeneratePasswordResetTokenCommandHandler, ResetPasswordWithTokenCommandHandler } from '@application/commands/PasswordResetCommands';
import { CheckFirstTimeSetupQuery, CheckFirstTimeSetupQueryHandler, GetUserByIdQuery, GetUserByIdQueryHandler, GetUserStatisticsQuery, GetUserStatisticsQueryHandler } from '@application/queries/UserQueries';

import { UserRole } from '@domain/value-objects/UserRole';
import { StorageRepository } from '@domain/repositories/StorageRepository';
import { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import { PersonRepository } from '@domain/repositories/PersonRepository';
import { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { UserApplicationService } from '@application/services/UserApplicationService';
import { ResearcherApplicationService } from '@application/services/ResearcherApplicationService';
import { PermissionError } from '@domain/errors/PermissionError';
import type { SecurityConfig } from '@odysseus/shared-schemas';
import {
  registerWithResearcherSchema,
  type RegisterWithResearcherRequest,
  forceChangePasswordRequestSchema,
  type PasswordChangeRequiredResponse,
  PasswordValidator
} from '@odysseus/shared-schemas';

export interface AuthControllerDeps {
  createUserHandler: CreateUserCommandHandler;
  loginHandler: LoginCommandHandler;
  changePasswordHandler: ChangeUserPasswordCommandHandler;
  changeRoleHandler: ChangeUserRoleCommandHandler;
  deleteUserHandler: DeleteUserCommandHandler;
  sendVerificationEmailHandler: SendVerificationEmailCommandHandler;
  verifyEmailHandler: VerifyEmailCommandHandler;
  resendVerificationHandler: ResendVerificationEmailCommandHandler;
  adminResetPasswordHandler: AdminResetPasswordCommandHandler;
  generatePasswordResetTokenHandler: GeneratePasswordResetTokenCommandHandler;
  resetPasswordWithTokenHandler: ResetPasswordWithTokenCommandHandler;
  checkFirstTimeHandler: CheckFirstTimeSetupQueryHandler;
  getUserByIdHandler: GetUserByIdQueryHandler;
  getUserStatsHandler: GetUserStatisticsQueryHandler;
  sessionService: SessionService;
  userApplicationService: UserApplicationService;
  researcherApplicationService: ResearcherApplicationService;
  configRepository: StorageRepository;
  researcherRepository: ResearcherRepository;
  personRepository: PersonRepository;
  userSessionRepository: UserSessionRepository;
  userRepository: UserRepository;
  eventBus: EventBus;
  createSystemAdminHandler: CreateSystemAdminCommandHandler;
}

export class AuthController {
  private createUserHandler: CreateUserCommandHandler;
  private loginHandler: LoginCommandHandler;
  private changePasswordHandler: ChangeUserPasswordCommandHandler;
  private changeRoleHandler: ChangeUserRoleCommandHandler;
  private deleteUserHandler: DeleteUserCommandHandler;
  private sendVerificationEmailHandler: SendVerificationEmailCommandHandler;
  private verifyEmailHandler: VerifyEmailCommandHandler;
  private resendVerificationHandler: ResendVerificationEmailCommandHandler;
  private adminResetPasswordHandler: AdminResetPasswordCommandHandler;
  private generatePasswordResetTokenHandler: GeneratePasswordResetTokenCommandHandler;
  private resetPasswordWithTokenHandler: ResetPasswordWithTokenCommandHandler;
  private checkFirstTimeHandler: CheckFirstTimeSetupQueryHandler;
  private getUserByIdHandler: GetUserByIdQueryHandler;
  private getUserStatsHandler: GetUserStatisticsQueryHandler;
  private sessionService: SessionService;
  private userApplicationService: UserApplicationService;
  private researcherApplicationService: ResearcherApplicationService;
  private configRepository: StorageRepository;
  private researcherRepository: ResearcherRepository;
  private personRepository: PersonRepository;
  private userSessionRepository: UserSessionRepository;
  private userRepository: UserRepository;
  private eventBus: EventBus;
  private createSystemAdminHandler: CreateSystemAdminCommandHandler;

  constructor(deps: AuthControllerDeps) {
    this.createUserHandler = deps.createUserHandler;
    this.loginHandler = deps.loginHandler;
    this.changePasswordHandler = deps.changePasswordHandler;
    this.changeRoleHandler = deps.changeRoleHandler;
    this.deleteUserHandler = deps.deleteUserHandler;
    this.sendVerificationEmailHandler = deps.sendVerificationEmailHandler;
    this.verifyEmailHandler = deps.verifyEmailHandler;
    this.resendVerificationHandler = deps.resendVerificationHandler;
    this.adminResetPasswordHandler = deps.adminResetPasswordHandler;
    this.generatePasswordResetTokenHandler = deps.generatePasswordResetTokenHandler;
    this.resetPasswordWithTokenHandler = deps.resetPasswordWithTokenHandler;
    this.checkFirstTimeHandler = deps.checkFirstTimeHandler;
    this.getUserByIdHandler = deps.getUserByIdHandler;
    this.getUserStatsHandler = deps.getUserStatsHandler;
    this.sessionService = deps.sessionService;
    this.userApplicationService = deps.userApplicationService;
    this.researcherApplicationService = deps.researcherApplicationService;
    this.configRepository = deps.configRepository;
    this.researcherRepository = deps.researcherRepository;
    this.personRepository = deps.personRepository;
    this.userSessionRepository = deps.userSessionRepository;
    this.userRepository = deps.userRepository;
    this.eventBus = deps.eventBus;
    this.createSystemAdminHandler = deps.createSystemAdminHandler;
  }

  // PUBLIC ENDPOINTS (No auth required)

  /** GET /api/public/auth/first-time */
  async checkFirstTime(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const query = new CheckFirstTimeSetupQuery();
      const result = await this.checkFirstTimeHandler.handle(query);

      logger.info('First-time setup check completed', { isFirstTime: result.isFirstTime });

      res.status(200).json({
        success: true,
        data: {
          isFirstTime: result.isFirstTime,
          needsSystemAdmin: result.needsSystemAdmin
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /** One-time system admin creation. POST /api/public/auth/setup-system-admin */
  async setupSystemAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { username, password, email, firstName, lastName, setupKey, department, position } = req.body;

      const command: CreateSystemAdminCommand = { username, password, email, firstName, lastName, setupKey, department, position };
      const user = await this.createSystemAdminHandler.handle(command);

      logger.info('System admin created', { userId: user.id, username: user.username });

      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;
      const authResult = await this.sessionService.createTokenPair(user, userAgent, ipAddress);

      const response = ResponseBuilder.withTiming(startTime, {
        user: user.toPublicData(),
        tokens: authResult.tokens,
      });
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/public/auth/password-requirements */
  async getPasswordRequirements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const securityConfig = await this.configRepository.getSecurityConfig();

      const passwordRequirements = {
        passwordMinLength: securityConfig.passwordMinLength,
        requireStrongPasswords: securityConfig.requireStrongPasswords,
        passwordRequireSpecialChars: securityConfig.passwordRequireSpecialChars
      };

      logger.info('Password requirements retrieved');

      res.status(200).json({
        success: true,
        data: passwordRequirements
      });
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/public/auth/register */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { username, password, role = 'admin' } = req.body;
      
      const command: CreateUserCommand = {
        username,
        password,
        role: UserRole.create(role),
        initiatedBy: 'system',
      };
      
      const user = await this.createUserHandler.handle(command);
      
      logger.info('User registered successfully', {
        userId: user.id,
        username: user.username,
        role: user.role.value
      });

      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;
      const authResult = await this.sessionService.createTokenPair(user, userAgent, ipAddress);

      const response = ResponseBuilder.withTiming(startTime, {
        user: user.toPublicData(),
        tokens: authResult.tokens
      });
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/public/auth/login
   *
   * If requirePasswordChange is set, returns a temporary token
   * for the force-change-password endpoint instead of full login tokens.
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { username, password } = req.body;

      const command: LoginCommand = { username, password };
      const result = await this.loginHandler.handle(command);

      if (result.user.isPending()) {
        throw new PermissionError('Account is awaiting administrator approval');
      }

      if (result.user.isRejected()) {
        throw new PermissionError('Account access has been denied');
      }

      if (result.user.isDeactivated()) {
        throw new PermissionError('Account has been deactivated. Contact your lab administrator');
      }

      if (result.user.isSuspended()) {
        throw new PermissionError('Account has been suspended. Contact your system administrator');
      }

      if (!result.user.isApproved()) {
        throw new PermissionError('Account is not approved for access');
      }

      recordSuccessfulLogin(req);

      if (result.requirePasswordChange) {
        logger.info('User requires password change', {
          userId: result.user.id,
          username: result.user.username
        });

        const tempToken = this.sessionService.createPasswordChangeTempToken(result.user);

        const passwordChangeResponse: PasswordChangeRequiredResponse = {
          requirePasswordChange: true,
          tempToken,
          user: {
            id: result.user.id,
            username: result.user.username
          }
        };

        const response = ResponseBuilder.withTiming(startTime, passwordChangeResponse);
        res.status(200).json(response);
        return;
      }

      logger.info('User logged in successfully', {
        userId: result.user.id,
        username: result.user.username,
        status: result.user.status
      });

      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;
      const enhancedResult = await this.sessionService.createTokenPair(result.user, userAgent, ipAddress);

      const response = ResponseBuilder.withTiming(startTime, enhancedResult);
      res.status(200).json(response);
    } catch (error) {
      await recordFailedLogin(req);
      next(error);
    }
  }

  /** POST /api/public/auth/refresh */
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        res.status(400).json(ResponseBuilder.error('MISSING_REFRESH_TOKEN', 'Refresh token is required'));
        return;
      }
      
      try {
        const refreshResult = await this.sessionService.refreshAccessToken(refreshToken);
        
        const response = ResponseBuilder.withTiming(startTime, refreshResult);
        res.status(200).json(response);
        
        logger.info('Access token refreshed successfully');
        
      } catch (error) {
        res.status(401).json(ResponseBuilder.error('INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token'));
      }
      
    } catch (error) {
      next(error);
    }
  }

  // AUTHENTICATED ENDPOINTS

  /** GET /api/auth/verify */
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

  /** GET /api/auth/me */
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

  /** POST /api/auth/change-password */
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        return next(new Error('User not found in request context'));
      }

      if (user.isDemo) {
        res.status(403).json({
          success: false,
          error: 'Password change is not available in demo mode'
        });
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
      
      await this.changePasswordHandler.handle(command);
      
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

  /** POST /api/auth/logout */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        return next(new Error('User not found in request context'));
      }

      await this.eventBus.publish(new UserLoggedOutEvent(
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
   * POST /api/auth/heartbeat
   *
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

  /**
   * GET /api/public/auth/session-info
   *
   * Public endpoint — handles its own validation with updateActivity: false
   * to prevent polling from extending the session.
   */
  async getSessionInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(200).json({
          success: true,
          data: {
            isAuthenticated: false
          }
        });
        return;
      }

      const token = authHeader.substring(7);

      const result = await this.sessionService.validateSessionWithActivity(token, { updateActivity: false });

      if (!result.success) {
        res.status(200).json({
          success: true,
          data: {
            isAuthenticated: false,
            reason: result.code
          }
        });
        return;
      }

      const session = await this.userSessionRepository.findById(result.sessionId);
      const config = await this.configRepository.getSecurityConfig();

      if (!session) {
        res.status(200).json({
          success: true,
          data: {
            isAuthenticated: false,
            reason: 'SESSION_NOT_FOUND'
          }
        });
        return;
      }

      const now = Date.now();
      const idleTimeoutMs = config.sessionTimeoutMinutes * 60 * 1000;
      const absoluteTimeoutMs = config.absoluteSessionTimeoutHours * 60 * 60 * 1000;
      const warningMs = config.idleWarningMinutes * 60 * 1000;

      const timeUntilIdleTimeoutMs = Math.max(0, (session.lastUsedAt.getTime() + idleTimeoutMs) - now);
      const timeUntilAbsoluteTimeoutMs = Math.max(0, (session.createdAt.getTime() + absoluteTimeoutMs) - now);
      const showWarning = timeUntilIdleTimeoutMs <= warningMs && timeUntilIdleTimeoutMs > 0;

      res.status(200).json({
        success: true,
        data: {
          isAuthenticated: true,
          timeUntilIdleTimeoutMs,
          timeUntilAbsoluteTimeoutMs,
          showWarning,
          idleWarningMinutes: config.idleWarningMinutes
        }
      });
    } catch (error) {
      logger.error('Session info error', { error });
      next(error);
    }
  }

  // ADMIN ENDPOINTS

  /** GET /api/admin/users */
  async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const labId = req.user?.labId;
      if (!labId) {
        res.status(403).json(ResponseBuilder.error('LAB_REQUIRED', 'Lab context required'));
        return;
      }

      const enrichedUsers = await this.userApplicationService.getEnrichedLabUsers(labId);

      const response = ResponseBuilder.withTiming(startTime, {
        users: enrichedUsers
      });
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/admin/users/:id */
  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const query = new GetUserByIdQuery(id);
      const user = await this.getUserByIdHandler.handle(query);
      
      const response = ResponseBuilder.success({
        user: user.toPublicData()
      });
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** PUT /api/admin/users/:id/role */
  async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const adminUser = req.user;

      if (!adminUser) {
        return next(new Error('Admin user not found in request context'));
      }
      
      const command: ChangeUserRoleCommand = {
        userId: id,
        newRole: UserRole.create(role),
        initiatedBy: adminUser.id,
      };
      
      await this.changeRoleHandler.handle(command);
      
      logger.info('User role updated', {
        targetUserId: id,
        newRole: role,
        performedBy: adminUser.username
      });
      
      const response = ResponseBuilder.success({ message: 'User role updated successfully' });
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** DELETE /api/admin/users/:id */
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const adminUser = req.user;

      if (!adminUser) {
        return next(new Error('Admin user not found in request context'));
      }
      
      const command: DeleteUserCommand = { userId: id, initiatedBy: adminUser.id };
      await this.deleteUserHandler.handle(command);
      
      logger.info('User deleted', {
        deletedUserId: id,
        performedBy: adminUser.username
      });
      
      const response = ResponseBuilder.success({ message: 'User deleted successfully' });
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/admin/stats/users */
  async getUserStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const query = new GetUserStatisticsQuery();
      const stats = await this.getUserStatsHandler.handle(query);
      
      const response = ResponseBuilder.withTiming(startTime, { statistics: stats });
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  // ADMIN SECURITY & CONFIGURATION ENDPOINTS

  /** GET /api/admin/security-config */
  async getSecurityConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const securityConfig = await this.configRepository.getSecurityConfig();

      const response = ResponseBuilder.withTiming(startTime, {
        config: securityConfig
      });
      res.status(200).json(response);

      logger.debug('Security configuration retrieved', {
        requestedBy: req.user?.username
      });
    } catch (error) {
      next(error);
    }
  }

  /** PUT /api/admin/security-config */
  async updateSecurityConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const adminUser = req.user;

      if (!adminUser) {
        return next(new Error('Admin user not found in request context'));
      }

      if (adminUser.isDemo) {
        res.status(403).json(ResponseBuilder.error('FORBIDDEN', 'Security configuration changes are restricted in the demo environment'));
        return;
      }

      const updates: Partial<SecurityConfig> = req.body;

      if (!updates || typeof updates !== 'object') {
        res.status(400).json(ResponseBuilder.error('INVALID_REQUEST', 'Request body must be an object'));
        return;
      }

      const updatedConfig = await this.configRepository.updateSecurityConfig(updates);

      logger.info('Security configuration updated', {
        updatedBy: adminUser.username,
        changes: Object.keys(updates)
      });

      const response = ResponseBuilder.withTiming(startTime, {
        config: updatedConfig
      });
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/admin/metrics */
  async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const labId = req.user?.labId;
      if (!labId) {
        res.status(400).json(ResponseBuilder.error('LAB_REQUIRED', 'Lab context required for metrics'));
        return;
      }
      const metrics = await this.configRepository.getSystemMetrics(labId);

      const response = ResponseBuilder.withTiming(startTime, metrics);
      res.status(200).json(response);

      logger.debug('System metrics retrieved', {
        requestedBy: req.user?.username
      });
    } catch (error) {
      next(error);
    }
  }


  // USER-RESEARCHER REGISTRATION & APPROVAL WORKFLOW

  /**
   * POST /api/public/auth/register-with-researcher
   *
   * Creates User and Researcher atomically. First user gets tokens
   * for immediate login; subsequent users return pending status.
   */
  async registerWithResearcher(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();

      const validatedData = registerWithResearcherSchema.parse(req.body);
      const inviteCode = req.body.inviteCode as string | undefined;

      const user = await this.userApplicationService.registerWithResearcher(
        { ...validatedData, inviteCode },
        validatedData.createResearcher
      );

      logger.info('User registered with researcher profile', {
        userId: user.id,
        username: user.username,
        researcherId: user.researcherId,
        status: user.status,
        role: user.role.isAdmin() ? 'admin' : 'user'
      });

      // First user is auto-verified but still gets the email for record keeping
      if (user.personId) {
        const person = await this.personRepository.findById(user.personId);
        if (person && person.email) {
          try {
            const sendCommand = { userId: user.id };
            await this.sendVerificationEmailHandler.handle(sendCommand);
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
        const ipAddress = req.ip || req.socket.remoteAddress;
        const authResult = await this.sessionService.createTokenPair(user, userAgent, ipAddress);

        const response = ResponseBuilder.withTiming(startTime, {
          user: user.toPublicData(),
          tokens: authResult.tokens,
          status: 'approved',
          message: 'Account created and approved'
        });

        res.status(201).json(response);
        return;
      }

      const response = ResponseBuilder.withTiming(startTime, {
        user: user.toPublicData(),
        status: 'pending',
        message: 'Account created. Awaiting administrator approval.'
      });

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/admin/users/pending */
  async getPendingUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const adminApiKey = req.user?.apiKey;

      if (!adminApiKey) {
        throw new PermissionError('Authentication required');
      }

      const pendingUsers = await this.userApplicationService.getPendingUsers(adminApiKey);

      const response = ResponseBuilder.withTiming(startTime, {
        users: pendingUsers
      });

      res.status(200).json(response);

      logger.debug('Pending users retrieved', {
        count: pendingUsers.length,
        requestedBy: req.user?.username
      });
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/admin/users/:userId/approve */
  async approveUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { userId } = req.params;
      const adminApiKey = req.user?.apiKey;

      if (!adminApiKey) {
        throw new PermissionError('Authentication required');
      }

      await this.userApplicationService.approveUser(userId, adminApiKey);

      const response = ResponseBuilder.withTiming(startTime, {
        success: true,
        message: 'User approved successfully'
      });

      res.status(200).json(response);

      logger.info('User approved', {
        userId,
        approvedBy: req.user?.username
      });
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/admin/users/:userId/reject */
  async rejectUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { userId } = req.params;
      const adminApiKey = req.user?.apiKey;

      if (!adminApiKey) {
        throw new PermissionError('Authentication required');
      }

      await this.userApplicationService.rejectUser(userId, adminApiKey);

      const response = ResponseBuilder.withTiming(startTime, {
        success: true,
        message: 'User rejected successfully'
      });

      res.status(200).json(response);

      logger.info('User rejected', {
        userId,
        rejectedBy: req.user?.username
      });
    } catch (error) {
      next(error);
    }
  }

  async deactivateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { userId } = req.params;
      const adminApiKey = req.user?.apiKey;

      if (!adminApiKey) {
        throw new PermissionError('Authentication required');
      }

      await this.userApplicationService.deactivateUser(userId, adminApiKey);

      const response = ResponseBuilder.withTiming(startTime, {
        success: true,
        message: 'User deactivated successfully'
      });

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async activateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { userId } = req.params;
      const adminApiKey = req.user?.apiKey;

      if (!adminApiKey) {
        throw new PermissionError('Authentication required');
      }

      await this.userApplicationService.approveUser(userId, adminApiKey);

      const response = ResponseBuilder.withTiming(startTime, {
        success: true,
        message: 'User activated successfully'
      });

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/users/:userId/link-researcher
   *
   * Links existing researcher (researcherId) or creates new one (newResearcher).
   */
  async linkResearcherToUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { userId } = req.params;
      const { researcherId, newResearcher } = req.body;
      const adminApiKey = req.user?.apiKey;

      if (!adminApiKey) {
        throw new PermissionError('Authentication required');
      }

      let targetResearcherId = researcherId;

      if (newResearcher) {
        const created = await this.researcherApplicationService.createResearcher(
          req.user!.labId!,
          newResearcher,
          adminApiKey
        );
        targetResearcherId = created.id;

        logger.info('New researcher created for user linking', {
          researcherId: created.id,
          researcherName: `${created.firstName} ${created.lastName}`,
          userId,
          createdBy: req.user?.username
        });
      }

      await this.userApplicationService.linkResearcherToUser(userId, targetResearcherId, adminApiKey);

      const response = ResponseBuilder.withTiming(startTime, {
        success: true,
        researcherId: targetResearcherId,
        message: 'Researcher linked to user successfully'
      });

      res.status(200).json(response);

      logger.info('Researcher linked to user', {
        userId,
        researcherId: targetResearcherId,
        linkedBy: req.user?.username
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/users/:userId/unlink-researcher
   *
   * Preserves researcher record for tube history while removing user link.
   */
  async unlinkResearcherFromUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { userId } = req.params;
      const adminApiKey = req.user?.apiKey;

      if (!adminApiKey) {
        throw new PermissionError('Authentication required');
      }

      await this.userApplicationService.unlinkResearcherFromUser(userId, adminApiKey);

      const response = ResponseBuilder.withTiming(startTime, {
        success: true,
        message: 'Researcher unlinked from user successfully'
      });

      res.status(200).json(response);

      logger.info('Researcher unlinked from user', {
        userId,
        unlinkedBy: req.user?.username
      });
    } catch (error) {
      next(error);
    }
  }

  // EMAIL VERIFICATION ENDPOINTS

  /** POST /api/public/auth/verify-email */
  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          error: 'Verification token is required'
        });
        return;
      }

      const command: VerifyEmailCommand = { token };
      const user = await this.verifyEmailHandler.handle(command);

      if (user.personId) {
        const person = await this.personRepository.findById(user.personId);
        logger.info('Email verified successfully', {
          userId: user.id,
          email: person?.email || 'unknown'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Email verified successfully. You can now login.',
        data: { emailVerified: true }
      });
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/public/auth/resend-verification */
  async resendVerificationPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { usernameOrEmail } = req.body;

      if (!usernameOrEmail) {
        res.status(400).json({
          success: false,
          message: 'Username or email is required'
        });
        return;
      }

      const userByUsername = await this.userApplicationService.getUserByUsername(usernameOrEmail);
      const userByEmail = userByUsername ? null : await this.userApplicationService.getUserByEmail(usernameOrEmail);
      const user = userByUsername || userByEmail;

      if (!user) {
        // Opaque response prevents user enumeration
        res.status(200).json({
          success: true,
          message: 'If an account exists with that information, a verification email has been sent.'
        });
        return;
      }

      const command = { userId: user.id };
      await this.resendVerificationHandler.handle(command);

      logger.info('Verification email resent (public)', {
        userId: user.id,
        usernameOrEmail
      });

      res.status(200).json({
        success: true,
        message: 'Verification email sent. Please check your inbox.'
      });
    } catch (error) {
      logger.error('Error in public resend verification', { error });
      res.status(200).json({
        success: true,
        message: 'If an account exists with that information, a verification email has been sent.'
      });
    }
  }

  /** POST /api/auth/resend-verification (deprecated — use public endpoint) */
  async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new PermissionError('Authentication required');
      }

      const command = { userId: req.user.id };
      await this.resendVerificationHandler.handle(command);

      if (req.user.personId) {
        const person = await this.personRepository.findById(req.user.personId);
        logger.info('Verification email resent', {
          userId: req.user.id,
          email: person?.email || 'unknown'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Verification email sent. Check your inbox.',
        data: {
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/auth/verification-status */
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
        const person = await this.personRepository.findById(req.user.personId);
        email = person?.email || null;
      }

      res.status(200).json({
        success: true,
        data: {
          emailVerified: req.user.emailVerified,
          email
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // PASSWORD RESET ENDPOINTS

  /**
   * POST /api/admin/users/:userId/reset-password
   *
   * Use when admin needs immediate access restoration.
   * requirePasswordChange=true forces user to set own password on next login.
   */
  async adminResetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { userId } = req.params;
      const { newPassword, requirePasswordChange = true } = req.body;
      const adminUser = req.user;

      if (!adminUser) {
        throw new PermissionError('Authentication required');
      }

      await this.adminResetPasswordHandler.handle({
        adminUserId: adminUser.id,
        targetUserId: userId,
        newPassword,
        requirePasswordChange
      });

      logger.info('Password reset by admin', {
        adminUserId: adminUser.id,
        adminUsername: adminUser.username,
        targetUserId: userId,
        requirePasswordChange
      });

      const response = ResponseBuilder.withTiming(startTime, {
        success: true,
        message: 'Password reset successfully'
      });

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/users/:userId/generate-reset-token
   *
   * Generates 15-minute one-time reset link for user to set own password.
   */
  async generatePasswordResetToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { userId } = req.params;
      const adminUser = req.user;

      if (!adminUser) {
        throw new PermissionError('Authentication required');
      }

      const result = await this.generatePasswordResetTokenHandler.handle({
        adminUserId: adminUser.id,
        targetUserId: userId
      });

      logger.info('Password reset token generated', {
        adminUserId: adminUser.id,
        adminUsername: adminUser.username,
        targetUserId: userId
      });

      const response = ResponseBuilder.withTiming(startTime, {
        resetUrl: result.resetUrl,
        expiresAt: result.expiresAt.toISOString(),
        message: 'Password reset token generated. Share this link with the user.'
      });

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/public/auth/reset-password
   *
   * Token serves as authentication; expires after 15 minutes or one-time use.
   */
  async resetPasswordWithToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json(ResponseBuilder.error('MISSING_FIELDS', 'Token and new password are required'));
        return;
      }

      await this.resetPasswordWithTokenHandler.handle({
        token,
        newPassword
      });

      logger.info('Password reset completed with token');

      const response = ResponseBuilder.withTiming(startTime, {
        success: true,
        message: 'Password reset successfully. You can now login with your new password.'
      });

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/public/auth/force-change-password
   *
   * Called when login returns requirePasswordChange=true.
   * Uses temporary token from login response; returns full login tokens on success.
   */
  async forceChangePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();

      const parseResult = forceChangePasswordRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json(ResponseBuilder.error('VALIDATION_ERROR', parseResult.error.issues[0].message));
        return;
      }

      const { tempToken, newPassword } = parseResult.data;

      const tokenData = await this.sessionService.verifyPasswordChangeTempToken(tempToken);
      if (!tokenData) {
        res.status(401).json(ResponseBuilder.error('INVALID_TOKEN', 'Password change link has expired or is invalid'));
        return;
      }

      const user = await this.userRepository.findById(tokenData.userId);
      if (!user) {
        res.status(404).json(ResponseBuilder.error('USER_NOT_FOUND', 'User not found'));
        return;
      }

      const securityConfig = await this.configRepository.getSecurityConfig();
      try {
        PasswordValidator.enforce(newPassword, securityConfig);
      } catch (error) {
        res.status(400).json(ResponseBuilder.error('VALIDATION_ERROR', (error as Error).message));
        return;
      }

      user.setPassword(newPassword);
      user.markPasswordChanged();
      await this.userRepository.save(user);

      logger.info('Password changed via force-change flow', {
        userId: user.id,
        username: user.username
      });

      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;
      const authResult = await this.sessionService.createTokenPair(user, userAgent, ipAddress);

      const response = ResponseBuilder.withTiming(startTime, {
        ...authResult,
        message: 'Password changed successfully'
      });

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async activateUserForLab(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { userId } = req.params;
      const adminApiKey = req.user?.apiKey;

      if (!adminApiKey) {
        throw new PermissionError('Authentication required');
      }

      await this.userApplicationService.approveUser(userId, adminApiKey);

      const response = ResponseBuilder.withTiming(startTime, {
        success: true,
        message: 'User activated successfully'
      });

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async deactivateUserForLab(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { labId, userId } = req.params;
      const adminApiKey = req.user?.apiKey;

      if (!adminApiKey) {
        throw new PermissionError('Authentication required');
      }

      await this.userApplicationService.deactivateUser(userId, adminApiKey, labId);

      const response = ResponseBuilder.withTiming(startTime, {
        success: true,
        message: 'User deactivated successfully'
      });

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async suspendUserForLab(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { labId, userId } = req.params;
      const adminApiKey = req.user?.apiKey;

      if (!adminApiKey) {
        throw new PermissionError('Authentication required');
      }

      await this.userApplicationService.suspendUser(userId, adminApiKey, labId);

      const response = ResponseBuilder.withTiming(startTime, {
        success: true,
        message: 'User suspended successfully'
      });

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async deleteUserForLab(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { userId } = req.params;
      const adminApiKey = req.user?.apiKey;

      if (!adminApiKey) {
        throw new PermissionError('Authentication required');
      }

      await this.userApplicationService.deleteUser(userId, adminApiKey);

      const response = ResponseBuilder.withTiming(startTime, {
        success: true,
        message: 'User deleted successfully'
      });

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
