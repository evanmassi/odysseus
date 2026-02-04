/**
 * Auth Controller
 * 
 * Clean presentation layer that uses CQRS command/query handlers.
 * Handles HTTP concerns only and delegates to command/query handlers.
 */

import { Request, Response, NextFunction } from 'express';
import { ResponseBuilder } from '@presentation/utilities/ResponseBuilder';
import { ErrorMapper } from '@presentation/responses/ErrorMapper';
import { logger } from '@utils/logger';
import { recordSuccessfulLogin, recordFailedLogin } from '@middleware/RateLimiting';
import type { EventBus } from '@application/contracts/EventBus';
import { UserLoggedOutEvent } from '@domain/events/UserEvents';

// CQRS Commands
import { SessionService, CreateUserCommand, CreateUserCommandHandler } from '@application/commands/UserCommands';
import { LoginCommand, LoginCommandHandler } from '@application/commands/UserCommands';
import { ChangeUserPasswordCommand, ChangeUserPasswordCommandHandler } from '@application/commands/UserCommands';
import { ChangeUserRoleCommand, ChangeUserRoleCommandHandler } from '@application/commands/UserCommands';
import { DeleteUserCommand, DeleteUserCommandHandler } from '@application/commands/UserCommands';
import { SendVerificationEmailCommand, SendVerificationEmailCommandHandler, VerifyEmailCommand, VerifyEmailCommandHandler, ResendVerificationEmailCommand, ResendVerificationEmailCommandHandler } from '@application/commands/EmailVerificationCommands';
import { AdminResetPasswordCommandHandler, GeneratePasswordResetTokenCommandHandler, ResetPasswordWithTokenCommandHandler } from '@application/commands/PasswordResetCommands';

// CQRS Queries
import { CheckFirstTimeSetupQuery, CheckFirstTimeSetupQueryHandler } from '@application/queries/UserQueries';
import { GetUserByIdQuery, GetUserByIdQueryHandler } from '@application/queries/UserQueries';
import { GetAllUsersQuery, GetAllUsersQueryHandler } from '@application/queries/UserQueries';
import { GetUserStatisticsQuery, GetUserStatisticsQueryHandler } from '@application/queries/UserQueries';

import { UserRole } from '@domain/valueObjects/UserRole';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
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

export class AuthController {
  constructor(
    // Command handlers
    private createUserHandler: CreateUserCommandHandler,
    private loginHandler: LoginCommandHandler,
    private changePasswordHandler: ChangeUserPasswordCommandHandler,
    private changeRoleHandler: ChangeUserRoleCommandHandler,
    private deleteUserHandler: DeleteUserCommandHandler,
    private sendVerificationEmailHandler: SendVerificationEmailCommandHandler,
    private verifyEmailHandler: VerifyEmailCommandHandler,
    private resendVerificationHandler: ResendVerificationEmailCommandHandler,
    private adminResetPasswordHandler: AdminResetPasswordCommandHandler,
    private generatePasswordResetTokenHandler: GeneratePasswordResetTokenCommandHandler,
    private resetPasswordWithTokenHandler: ResetPasswordWithTokenCommandHandler,

    // Query handlers
    private checkFirstTimeHandler: CheckFirstTimeSetupQueryHandler,
    private getUserByIdHandler: GetUserByIdQueryHandler,
    private getAllUsersHandler: GetAllUsersQueryHandler,
    private getUserStatsHandler: GetUserStatisticsQueryHandler,

    // Services
    private sessionService: SessionService,
    private userApplicationService: UserApplicationService,
    private researcherApplicationService: ResearcherApplicationService,

    // Repositories (for admin endpoints)
    private configRepository: ConfigurationRepository,
    private researcherRepository: ResearcherRepository,
    private personRepository: PersonRepository,
    private userSessionRepository: UserSessionRepository,
    private userRepository: UserRepository,

    // Event bus
    private eventBus: EventBus
  ) {}

  // PUBLIC ENDPOINTS (No auth required)

  /**
   * Check if this is first-time setup
   * GET /api/public/auth/first-time
   */
  async checkFirstTime(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const query = new CheckFirstTimeSetupQuery();
      const isFirstTime = await this.checkFirstTimeHandler.handle(query);

      logger.info('First-time setup check completed', { isFirstTime });

      res.status(200).json({
        success: true,
        data: { isFirstTime }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get password requirements (public - for registration form)
   * GET /api/public/auth/password-requirements
   */
  async getPasswordRequirements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const securityConfig = await this.configRepository.getSecurityConfig();

      // Return only password validation fields (not sensitive security config)
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

  /**
   * Register new user (first-time setup)
   * POST /api/public/auth/register
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { username, password, role = 'admin' } = req.body;
      
      const command = new CreateUserCommand(
        username,
        password,
        UserRole.create(role),
        'system' // First user is created by system
      );
      
      const user = await this.createUserHandler.handle(command);
      
      logger.info('User registered successfully', {
        userId: user.id,
        username: user.username,
        role: user.role.value
      });

      // Extract device info from request
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;

      // Create token pair for immediate authentication (OAuth 2.0 standard)
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
   * Login with credentials
   * POST /api/public/auth/login
   *
   * Validates credentials and checks approval status.
   * Only approved users can login.
   *
   * If requirePasswordChange is set (admin reset password flow),
   * returns a temporary token for the force-change-password endpoint.
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { username, password } = req.body;

      const command = new LoginCommand(username, password);
      const result = await this.loginHandler.handle(command);

      // Check approval status before issuing tokens
      if (result.user.isPending()) {
        throw new PermissionError('Account is awaiting administrator approval');
      }

      if (result.user.isRejected()) {
        throw new PermissionError('Account access has been denied');
      }

      if (!result.user.isApproved()) {
        throw new PermissionError('Account is not approved for access');
      }

      // Clear rate limit attempts on successful login
      recordSuccessfulLogin(req);

      // Handle force password change flow
      // User credentials are valid but they must change password before full login
      if (result.requirePasswordChange) {
        logger.info('User requires password change', {
          userId: result.user.id,
          username: result.user.username
        });

        // Generate short-lived temp token (5 min) for password change only
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

      // Extract device info from request
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;

      // Enhanced response with token pair (backward compatible)
      const enhancedResult = await this.sessionService.createTokenPair(result.user, userAgent, ipAddress);

      const response = ResponseBuilder.withTiming(startTime, enhancedResult);
      res.status(200).json(response);
    } catch (error) {
      // Record failed login attempt for rate limiting
      await recordFailedLogin(req);
      next(error);
    }
  }

  /**
   * Refresh access token using refresh token
   * POST /api/public/auth/refresh
   */
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
        // Refresh token invalid, expired, or revoked
        res.status(401).json(ResponseBuilder.error('INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token'));
      }
      
    } catch (error) {
      next(error);
    }
  }

  // AUTHENTICATED ENDPOINTS

  /**
   * Verify current session
   * GET /api/auth/verify
   */
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

  /**
   * Get current user profile
   * GET /api/auth/me
   */
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

  /**
   * Change current user's password
   * POST /api/auth/change-password
   */
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        return next(new Error('User not found in request context'));
      }

      const { currentPassword, newPassword } = req.body;

      const command = new ChangeUserPasswordCommand(
        user.id,
        currentPassword,
        newPassword,
        req.sessionId,
        user.id
      );
      
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

  /**
   * Logout (placeholder for session invalidation)
   * POST /api/auth/logout
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        return next(new Error('User not found in request context'));
      }

      // Publish logout event
      await this.eventBus.publish(new UserLoggedOutEvent(
        user.id,
        user.username
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
   * Heartbeat - extend session by recording activity
   * POST /api/auth/heartbeat
   *
   * Called by client when user clicks "Stay Logged In" on warning modal.
   * Goes through auth middleware which updates lastUsedAt via validateSessionWithActivity.
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
   * Get session info for idle timeout warning
   * GET /api/public/auth/session-info
   *
   * PUBLIC ENDPOINT - handles its own validation with updateActivity: false
   * This prevents polling from extending the session (which would defeat idle timeout).
   *
   * Returns:
   * - isAuthenticated: Whether session is valid
   * - timeUntilIdleTimeoutMs: Milliseconds until idle timeout
   * - timeUntilAbsoluteTimeoutMs: Milliseconds until absolute timeout
   * - showWarning: Whether to show the warning modal
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

      // Validate WITHOUT updating activity (this is just a status check)
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

      // Get session and security config for timing info
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

  /**
   * Get all users (admin only)
   * GET /api/admin/users
   *
   * Returns users enriched with linked researcher information
   */
  async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const query = new GetAllUsersQuery(false); // Don't include inactive by default
      const users = await this.getAllUsersHandler.handle(query);

      // Batch fetch all related data to avoid N+1 queries
      const publicDataList = users.map(u => u.toPublicData());

      // Collect IDs for batch fetching
      const directPersonIds = publicDataList
        .map(u => u.personId)
        .filter((id): id is string => id != null);
      const researcherIds = publicDataList
        .map(u => u.researcherId)
        .filter((id): id is string => id != null);

      // Batch fetch persons (direct) and researchers
      const [directPersons, researchers] = await Promise.all([
        this.personRepository.findByIds(directPersonIds),
        this.researcherRepository.findByIds(researcherIds)
      ]);

      // Collect researcher's personIds and batch fetch those too
      const researcherPersonIds = researchers
        .map(r => r.personId)
        .filter((id): id is string => id != null);
      const researcherPersons = await this.personRepository.findByIds(researcherPersonIds);

      // Build lookup maps
      const directPersonMap = new Map(directPersons.map(p => [p.id, p]));
      const researcherMap = new Map(researchers.map(r => [r.id, r]));
      const researcherPersonMap = new Map(researcherPersons.map(p => [p.id, p]));

      // Enrich user data with Person name information
      const enrichedUsers = publicDataList.map(publicData => {
        // Priority 1: User's direct personId
        if (publicData.personId) {
          const person = directPersonMap.get(publicData.personId);
          if (person) {
            return {
              ...publicData,
              firstName: person.firstName,
              lastName: person.lastName
            };
          }
        }

        // Priority 2: Linked researcher's person
        if (publicData.researcherId) {
          const researcher = researcherMap.get(publicData.researcherId);
          if (researcher) {
            const person = researcherPersonMap.get(researcher.personId);
            if (person) {
              return {
                ...publicData,
                firstName: person.firstName,
                lastName: person.lastName
              };
            }
          }
        }

        return publicData;
      });

      const response = ResponseBuilder.withTiming(startTime, {
        users: enrichedUsers
      });
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID (admin only)
   * GET /api/admin/users/:id
   */
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

  /**
   * Update user role (admin only)
   * PUT /api/admin/users/:id/role
   */
  async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const adminUser = req.user;

      if (!adminUser) {
        return next(new Error('Admin user not found in request context'));
      }
      
      const command = new ChangeUserRoleCommand(
        id,
        UserRole.create(role),
        adminUser.id
      );
      
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

  /**
   * Delete user (admin only)
   * DELETE /api/admin/users/:id
   */
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const adminUser = req.user;

      if (!adminUser) {
        return next(new Error('Admin user not found in request context'));
      }
      
      const command = new DeleteUserCommand(id, adminUser.id);
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

  /**
   * Get user statistics (admin only)
   * GET /api/admin/stats/users
   */
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

  /**
   * Get security configuration (admin only)
   * GET /api/admin/security-config
   */
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

  /**
   * Update security configuration (admin only)
   * PUT /api/admin/security-config
   */
  async updateSecurityConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const adminUser = req.user;

      if (!adminUser) {
        return next(new Error('Admin user not found in request context'));
      }

      const updates: Partial<SecurityConfig> = req.body;

      // Validate that updates is an object
      if (!updates || typeof updates !== 'object') {
        res.status(400).json(ResponseBuilder.error('INVALID_REQUEST', 'Request body must be an object'));
        return;
      }

      // Update security configuration using repository
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

  /**
   * Get system metrics (admin only)
   * GET /api/admin/metrics
   */
  async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const metrics = await this.configRepository.getSystemMetrics();

      const response = ResponseBuilder.withTiming(startTime, metrics);
      res.status(200).json(response);

      logger.debug('System metrics retrieved', {
        requestedBy: req.user?.username
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get synchronization status (admin only)
   * GET /api/admin/sync-status
   */
  async getSyncStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const syncStatus = await this.configRepository.getSyncStatus();

      const response = ResponseBuilder.withTiming(startTime, {
        sync: syncStatus
      });
      res.status(200).json(response);

      logger.debug('Sync status retrieved', {
        requestedBy: req.user?.username
      });
    } catch (error) {
      next(error);
    }
  }

  // USER-RESEARCHER REGISTRATION & APPROVAL WORKFLOW

  /**
   * Register with researcher profile (new user flow with approval workflow)
   * POST /api/public/auth/register-with-researcher
   *
   * Creates both User and Researcher entities atomically.
   * Response varies based on user status:
   * - First user (admin): Returns tokens for immediate login
   * - Subsequent users (pending): Returns user data without tokens (awaiting approval)
   */
  async registerWithResearcher(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();

      // Validate request body against shared schema
      const validatedData = registerWithResearcherSchema.parse(req.body);

      // Create user + optional researcher via application service
      // createResearcher flag determines whether to create researcher profile
      const user = await this.userApplicationService.registerWithResearcher(
        validatedData,
        validatedData.createResearcher
      );

      logger.info('User registered with researcher profile', {
        userId: user.id,
        username: user.username,
        researcherId: user.researcherId,
        status: user.status,
        role: user.role.isAdmin() ? 'admin' : 'user'
      });

      // Send verification email for all users with email addresses
      // (First user will be auto-verified, but still gets the email for record keeping)
      // Get email from Person entity
      if (user.personId) {
        const person = await this.personRepository.findById(user.personId);
        if (person && person.email) {
          try {
            const sendCommand = new SendVerificationEmailCommand(user.id, user.id);
            await this.sendVerificationEmailHandler.handle(sendCommand);
            logger.info('Verification email sent', { userId: user.id, email: person.email });
          } catch (emailError) {
            logger.error('Failed to send verification email', {
              userId: user.id,
              email: person.email,
              error: emailError instanceof Error ? emailError.message : String(emailError)
            });
            // Don't fail registration if email sending fails - user is still created
          }
        }
      }

      // First user (admin): Immediately authenticated
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

      // Subsequent users (pending): No tokens, awaiting approval
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

  /**
   * Get all pending users (admin only)
   * GET /api/admin/users/pending
   *
   * Returns list of users awaiting admin approval.
   */
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

  /**
   * Approve pending user (admin only)
   * POST /api/admin/users/:userId/approve
   *
   * Changes user status from 'pending' to 'approved', allowing login.
   */
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

  /**
   * Reject pending user (admin only)
   * POST /api/admin/users/:userId/reject
   *
   * Changes user status from 'pending' to 'rejected', blocking login.
   */
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

  /**
   * Link researcher to user (admin only)
   * POST /api/admin/users/:userId/link-researcher
   * Body: { researcherId?: string, newResearcher?: CreateResearcherProfile }
   *
   * Associates a researcher profile with a user account.
   * Supports two modes:
   * 1. Link existing researcher (provide researcherId)
   * 2. Create new researcher and link (provide newResearcher)
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

      // If newResearcher provided, create it first
      if (newResearcher) {
        const created = await this.researcherApplicationService.createResearcher(
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

      // Link researcher to user
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
   * Unlink researcher from user (admin only)
   * POST /api/admin/users/:userId/unlink-researcher
   *
   * Removes researcher profile link from user account while preserving researcher record.
   * Used when user should no longer have researcher privileges but tubes must preserve history.
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

  /**
   * Verify email with token (public endpoint)
   * POST /api/public/auth/verify-email
   */
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

      const command = new VerifyEmailCommand(token);
      const user = await this.verifyEmailHandler.handle(command);

      // Get email from Person entity for logging
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

  /**
   * Resend verification email (public endpoint - no auth required)
   * POST /api/public/auth/resend-verification
   * Accepts username or email to identify the user
   */
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

      // Find user by username or email
      const userByUsername = await this.userApplicationService.getUserByUsername(usernameOrEmail);
      const userByEmail = userByUsername ? null : await this.userApplicationService.getUserByEmail(usernameOrEmail);
      const user = userByUsername || userByEmail;

      if (!user) {
        // Don't reveal if user exists (security)
        res.status(200).json({
          success: true,
          message: 'If an account exists with that information, a verification email has been sent.'
        });
        return;
      }

      const command = new ResendVerificationEmailCommand(user.id, user.id);
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
      // Don't expose detailed errors to prevent user enumeration
      logger.error('Error in public resend verification', { error });
      res.status(200).json({
        success: true,
        message: 'If an account exists with that information, a verification email has been sent.'
      });
    }
  }

  /**
   * Resend verification email (protected endpoint - deprecated, use public endpoint)
   * POST /api/auth/resend-verification
   */
  async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new PermissionError('Authentication required');
      }

      const command = new ResendVerificationEmailCommand(req.user.id, req.user.id);
      await this.resendVerificationHandler.handle(command);

      // Get email from Person entity for logging
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

  /**
   * Get email verification status (protected endpoint)
   * GET /api/auth/verification-status
   */
  async getVerificationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new PermissionError('Authentication required');
      }

      logger.info('Verification status checked', {
        userId: req.user.id,
        emailVerified: req.user.emailVerified
      });

      // Get email from Person entity
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
   * Admin directly resets user password (admin only)
   * POST /api/admin/users/:userId/reset-password
   *
   * Use when: Admin needs immediate access restoration (locked account, forgotten password)
   * Security: requirePasswordChange=true forces user to set own password on next login
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

      await this.adminResetPasswordHandler.execute({
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
   * Admin generates password reset token (admin only)
   * POST /api/admin/users/:userId/generate-reset-token
   *
   * Use when: User prefers to set own password (15-minute one-time link)
   * Delivery: Admin shares link manually (no email dependency)
   */
  async generatePasswordResetToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { userId } = req.params;
      const adminUser = req.user;

      if (!adminUser) {
        throw new PermissionError('Authentication required');
      }

      const result = await this.generatePasswordResetTokenHandler.execute({
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
   * User resets password with token (public endpoint)
   * POST /api/public/auth/reset-password
   *
   * Public endpoint - no authentication required (token is the authentication)
   * Token expires after 15 minutes or one-time use
   */
  async resetPasswordWithToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json(ResponseBuilder.error('MISSING_FIELDS', 'Token and new password are required'));
        return;
      }

      await this.resetPasswordWithTokenHandler.execute({
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
   * Force change password (public endpoint)
   * POST /api/public/auth/force-change-password
   *
   * Called when user logs in with requirePasswordChange=true.
   * Uses temporary token from login response to authenticate.
   * After successful password change, returns full login tokens.
   */
  async forceChangePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();

      // Validate request body
      const parseResult = forceChangePasswordRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json(ResponseBuilder.error('VALIDATION_ERROR', parseResult.error.issues[0].message));
        return;
      }

      const { tempToken, newPassword } = parseResult.data;

      // Verify temp token
      const tokenData = await this.sessionService.verifyPasswordChangeTempToken(tempToken);
      if (!tokenData) {
        res.status(401).json(ResponseBuilder.error('INVALID_TOKEN', 'Password change link has expired or is invalid'));
        return;
      }

      // Get user from repository
      const user = await this.userRepository.findById(tokenData.userId);
      if (!user) {
        res.status(404).json(ResponseBuilder.error('USER_NOT_FOUND', 'User not found'));
        return;
      }

      // Validate password against security policy
      const securityConfig = await this.configRepository.getSecurityConfig();
      try {
        PasswordValidator.enforce(newPassword, securityConfig);
      } catch (error) {
        res.status(400).json(ResponseBuilder.error('VALIDATION_ERROR', (error as Error).message));
        return;
      }

      // Update password and clear requirePasswordChange flag
      user.setPassword(newPassword);
      user.markPasswordChanged();
      await this.userRepository.save(user);

      logger.info('Password changed via force-change flow', {
        userId: user.id,
        username: user.username
      });

      // Now complete full login - create token pair
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

  // DEMO MANAGEMENT ENDPOINTS

  /**
   * Get all demo users (admin only)
   * GET /api/admin/demo/users
   */
  async getDemoUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const adminApiKey = req.user?.apiKey;

      if (!adminApiKey) {
        throw new PermissionError('Authentication required');
      }

      const users = await this.userApplicationService.getDemoUsers(adminApiKey);

      const response = ResponseBuilder.withTiming(startTime, {
        success: true,
        users
      });

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set user demo status (admin only)
   * PUT /api/admin/users/:userId/demo-status
   */
  async setUserDemoStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { userId } = req.params;
      const { isDemo } = req.body;
      const adminApiKey = req.user?.apiKey;

      if (!adminApiKey) {
        throw new PermissionError('Authentication required');
      }

      if (typeof isDemo !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'isDemo must be a boolean'
        });
        return;
      }

      await this.userApplicationService.setUserDemoStatus(userId, isDemo, adminApiKey);

      const response = ResponseBuilder.withTiming(startTime, {
        success: true,
        message: `User demo status set to ${isDemo}`
      });

      res.status(200).json(response);

      logger.info('User demo status updated', {
        userId,
        isDemo,
        updatedBy: req.user?.username
      });
    } catch (error) {
      next(error);
    }
  }
}
