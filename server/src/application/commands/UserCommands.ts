/**
 * User Commands
 * 
 * Commands for user-related operations in the CQRS pattern.
 */

import { BaseCommand, Command, CommandHandler, CommandResult } from '@application/commands/Command';
import { UserRole } from '@domain/valueObjects/UserRole';
import { User } from '@domain/entities/User';
import { UserRepository } from '@domain/repositories/UserRepository';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import { InviteCodeRepository } from '@domain/repositories/InviteCodeRepository';
import { LabRepository } from '@domain/repositories/LabRepository';
import { PasswordService } from '@application/contracts/PasswordService';
import { logger } from '@utils/logger';
import { EventBus } from '@application/contracts/EventBus';
import {
  UserCreatedEvent,
  UserPasswordChangedEvent,
  UserRoleChangedEvent,
  UserDeletedEvent,
  UserLoggedInEvent,
  UserLoggedOutEvent
} from '@domain/events/UserEvents';
import { BulkResourcesUnassignedEvent } from '@domain/events/ConfigurationEvents';
import { InviteCodeUsedEvent } from '@domain/events/LabEvents';
import { UserAlreadyExistsError, InvalidCredentialsError, UserNotFoundError } from '@domain/errors/UserErrors';
import { ValidationError } from '@domain/errors/ValidationError';
import { ConflictError } from '@domain/errors/ConflictError';
import { PermissionError } from '@domain/errors/PermissionError';
import { type UserSettings, PasswordValidator } from '@odysseus/shared-schemas';
import type { EnhancedLoginResponse, RefreshTokenResponse } from '@shared/types/Token';

// Create User Command

export class CreateUserCommand extends BaseCommand {
  constructor(
    public readonly username: string,
    public readonly password: string,
    public readonly role: UserRole,
    initiatedBy: string,
    public readonly inviteCode?: string
  ) {
    super(initiatedBy);
  }
}

export class CreateUserCommandHandler implements CommandHandler<CreateUserCommand, User> {
  constructor(
    private userRepository: UserRepository,
    private passwordService: PasswordService,
    private eventBus: EventBus,
    private configurationRepository: ConfigurationRepository,
    private inviteCodeRepository?: InviteCodeRepository
  ) {}

  async handle(command: CreateUserCommand): Promise<User> {
    const existingUser = await this.userRepository.findByUsername(command.username);
    if (existingUser) {
      throw new UserAlreadyExistsError(command.username);
    }

    await this.validatePasswordPolicy(command.password);

    let labId: string | undefined;
    let resolvedRole = command.role;
    let autoApprove = false;

    if (command.inviteCode && this.inviteCodeRepository) {
      const inviteCode = await this.inviteCodeRepository.findByCode(command.inviteCode);
      if (!inviteCode || !inviteCode.isValid()) {
        throw new ValidationError('Invalid or expired invite code');
      }

      labId = inviteCode.labId;
      resolvedRole = UserRole.create(inviteCode.role);

      // Lab admins designated by invite code are auto-approved
      if (inviteCode.role === 'lab_admin') {
        autoApprove = true;
      }

      inviteCode.recordUse();
      await this.inviteCodeRepository.save(inviteCode);

      await this.eventBus.publish(new InviteCodeUsedEvent(
        inviteCode.id,
        inviteCode.labId,
        command.initiatedBy
      ));
    }

    const status = autoApprove ? 'approved' : 'pending';
    const user = User.createWithPassword(
      command.username,
      command.password,
      resolvedRole,
      undefined,
      undefined,
      status,
      labId
    );

    await this.userRepository.save(user);

    const event = new UserCreatedEvent(user.id, user.username, user.role);
    await this.eventBus.publish(event);

    return user;
  }

  private async validatePasswordPolicy(password: string): Promise<void> {
    const securityConfig = await this.configurationRepository.getSecurityConfig();
    try {
      PasswordValidator.enforce(password, securityConfig);
    } catch (error) {
      throw new ValidationError((error as Error).message);
    }
  }
}

// Create System Admin Command

export class CreateSystemAdminCommand extends BaseCommand {
  constructor(
    public readonly username: string,
    public readonly password: string,
    public readonly email: string,
    public readonly setupKey?: string,
    initiatedBy: string = 'system'
  ) {
    super(initiatedBy);
  }
}

export class CreateSystemAdminCommandHandler implements CommandHandler<CreateSystemAdminCommand, User> {
  constructor(
    private userRepository: UserRepository,
    private configurationRepository: ConfigurationRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: CreateSystemAdminCommand): Promise<User> {
    // Only works when no system admin exists
    const existingAdmins = await this.userRepository.countByRole('system_admin');
    if (existingAdmins > 0) {
      throw new ValidationError('System admin already exists');
    }

    // In production, validate setup key
    const requiredKey = process.env.SYSTEM_ADMIN_SETUP_KEY;
    if (requiredKey) {
      if (!command.setupKey || command.setupKey !== requiredKey) {
        throw new PermissionError('Invalid setup key');
      }
    }

    const existingUser = await this.userRepository.findByUsername(command.username);
    if (existingUser) {
      throw new UserAlreadyExistsError(command.username);
    }

    const existingEmail = await this.userRepository.findByEmail(command.email);
    if (existingEmail) {
      throw new ValidationError('Email address already in use');
    }

    await this.validatePasswordPolicy(command.password);

    const user = User.createWithPassword(
      command.username,
      command.password,
      UserRole.systemAdmin(),
      undefined,
      undefined,
      'approved'
    );

    await this.userRepository.save(user);

    const event = new UserCreatedEvent(user.id, user.username, user.role);
    await this.eventBus.publish(event);

    return user;
  }

  private async validatePasswordPolicy(password: string): Promise<void> {
    const securityConfig = await this.configurationRepository.getSecurityConfig();
    try {
      PasswordValidator.enforce(password, securityConfig);
    } catch (error) {
      throw new ValidationError((error as Error).message);
    }
  }
}

// Change User Password Command

export class ChangeUserPasswordCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    public readonly currentPassword: string,
    public readonly newPassword: string,
    public readonly currentSessionId: string | undefined,
    initiatedBy: string
  ) {
    super(initiatedBy);
  }
}

export class ChangeUserPasswordCommandHandler implements CommandHandler<ChangeUserPasswordCommand, void> {
  constructor(
    private userRepository: UserRepository,
    private passwordService: PasswordService,
    private eventBus: EventBus,
    private configurationRepository: ConfigurationRepository,
    private userSessionRepository: UserSessionRepository
  ) {}

  async handle(command: ChangeUserPasswordCommand): Promise<void> {
    // Get user
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    // Verify current password using User's validatePassword method
    const isCurrentPasswordValid = user.validatePassword(command.currentPassword);
    if (!isCurrentPasswordValid) {
      throw new InvalidCredentialsError('Current password is incorrect');
    }

    // Validate new password against security policy
    await this.validatePasswordPolicy(command.newPassword);

    // Update user password
    user.setPassword(command.newPassword);

    // Persist
    await this.userRepository.save(user);

    // Revoke all other sessions for security (except current session)
    // Changing password logs out all other devices
    if (command.currentSessionId) {
      const activeSessions = await this.userSessionRepository.findActiveSessionsByUserId(user.id);
      const otherSessionIds = activeSessions
        .filter(s => s.id !== command.currentSessionId)
        .map(s => s.id);

      if (otherSessionIds.length > 0) {
        const revokedCount = await this.userSessionRepository.batchRevoke(otherSessionIds);
        logger.info(`Password changed - revoked ${revokedCount} other session(s) for user ${user.username}`);
      }
    }

    // Publish domain event
    const event = new UserPasswordChangedEvent(user.id, user.username, command.initiatedBy);
    await this.eventBus.publish(event);
  }

  /**
   * Validate password against configured security policy
   */
  private async validatePasswordPolicy(password: string): Promise<void> {
    const securityConfig = await this.configurationRepository.getSecurityConfig();
    try {
      PasswordValidator.enforce(password, securityConfig);
    } catch (error) {
      throw new ValidationError((error as Error).message);
    }
  }
}

// Change User Role Command

export class ChangeUserRoleCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    public readonly newRole: UserRole,
    initiatedBy: string
  ) {
    super(initiatedBy);
  }
}

export class ChangeUserRoleCommandHandler implements CommandHandler<ChangeUserRoleCommand, void> {
  constructor(
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: ChangeUserRoleCommand): Promise<void> {
    // Get user to be updated
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    // Get the user performing the action
    const performingUser = await this.userRepository.findById(command.initiatedBy);
    if (!performingUser) {
      throw new UserNotFoundError(command.initiatedBy);
    }

    // Store old role for event
    const oldRole = user.role;

    // Update role using domain logic (this will enforce business rules)
    user.changeRole(command.newRole.value, performingUser);

    // Persist
    await this.userRepository.save(user);

    // Publish domain event
    const event = new UserRoleChangedEvent(
      user.id,
      user.username,
      oldRole,
      command.newRole,
      command.initiatedBy
    );
    await this.eventBus.publish(event);
  }
}

// Delete User Command

export class DeleteUserCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    initiatedBy: string
  ) {
    super(initiatedBy);
  }
}

export class DeleteUserCommandHandler implements CommandHandler<DeleteUserCommand, void> {
  constructor(
    private userRepository: UserRepository,
    private eventBus: EventBus,
    private configurationRepository: ConfigurationRepository
  ) {}

  async handle(command: DeleteUserCommand): Promise<void> {
    // Get user
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    // Store user data for event before deletion
    const username = user.username;

    // Clear all resource assignments with retry logic for optimistic lock conflicts
    // Retry ensures cascade completes even during concurrent configuration changes
    const MAX_CASCADE_RETRIES = 3;
    let cascadeSucceeded = false;
    let racksAffected = 0;
    let boxesAffected = 0;

    for (let attempt = 1; attempt <= MAX_CASCADE_RETRIES; attempt++) {
      const configuration = user.labId
        ? await this.configurationRepository.getForLab(user.labId)
        : await this.configurationRepository.getCurrent();
      if (!configuration) {
        break; // No configuration to update
      }

      // Count affected resources before clearing
      const counts = configuration.countAssignmentsForUser(command.userId);
      const expectedVersion = configuration.version;
      const hadAssignments = configuration.clearAllAssignmentsForUser(command.userId);

      if (!hadAssignments) {
        cascadeSucceeded = true;
        break; // No assignments to clear
      }

      try {
        await this.configurationRepository.saveWithOptimisticLock(
          configuration,
          expectedVersion,
          `Cleared assignments for deleted user '${username}'`,
          command.initiatedBy,
          user.labId
        );

        racksAffected = counts.racks;
        boxesAffected = counts.boxes;
        cascadeSucceeded = true;

        logger.info(`Cleared resource assignments for deleted user ${username}`, {
          userId: command.userId,
          racksAffected,
          boxesAffected,
          attempt,
        });
        break;
      } catch (error) {
        if (error instanceof ConflictError && attempt < MAX_CASCADE_RETRIES) {
          logger.warn(`Cascade retry ${attempt}/${MAX_CASCADE_RETRIES} for user deletion`, {
            userId: command.userId,
            expectedVersion,
            currentVersion: error.currentVersion,
          });
          continue;
        }
        throw error;
      }
    }

    if (!cascadeSucceeded) {
      throw new ValidationError(
        'Failed to clear resource assignments after multiple attempts. Please try again.',
        { userId: command.userId }
      );
    }

    // Delete user only after cascade succeeds (atomic guarantee)
    await this.userRepository.delete(command.userId);

    // Publish domain events
    const deleteEvent = new UserDeletedEvent(command.userId, username, command.initiatedBy);
    await this.eventBus.publish(deleteEvent);

    // Emit configuration change event if assignments were cleared
    // This triggers socket notification for real-time client cache invalidation
    if (racksAffected > 0 || boxesAffected > 0) {
      const cascadeEvent = new BulkResourcesUnassignedEvent(
        command.initiatedBy,
        command.userId,
        username,
        racksAffected,
        boxesAffected
      );
      await this.eventBus.publish(cascadeEvent);
    }
  }
}

// Login Command

export class LoginCommand extends BaseCommand {
  constructor(
    public readonly username: string,
    public readonly password: string,
    initiatedBy: string = 'system'
  ) {
    super(initiatedBy);
  }
}

export interface LoginResult {
  user: User;
  sessionToken: string;
  requirePasswordChange: boolean;
}

export class LoginCommandHandler implements CommandHandler<LoginCommand, LoginResult> {
  constructor(
    private userRepository: UserRepository,
    private sessionService: SessionService,
    private eventBus: EventBus
  ) {}

  async handle(command: LoginCommand): Promise<LoginResult> {
    // Find user by username or email
    let user = await this.userRepository.findByUsername(command.username);

    // If not found by username, try email
    if (!user) {
      user = await this.userRepository.findByEmail(command.username);
    }

    if (!user) {
      throw new InvalidCredentialsError('Invalid username or password');
    }

    // Verify password using User's domain logic
    const isPasswordValid = user.validatePassword(command.password);
    if (!isPasswordValid) {
      throw new InvalidCredentialsError('Invalid username or password');
    }

    // Check admin approval status FIRST (gates access before email verification)
    if (user.status === 'pending') {
      throw new InvalidCredentialsError('Account pending administrator approval. You will be notified when approved.');
    }

    if (user.status === 'rejected') {
      throw new InvalidCredentialsError('Account access has been denied. Contact administrator for more information.');
    }

    // Check email verification if not admin-approved
    // Admin approval bypasses email verification requirement (admin manually vets users)
    // This allows system to work without email service - admin approval is primary security gate
    // Note: All users now have email via Person entity
    if (!user.isEmailVerified() && user.status !== 'approved') {
      throw new InvalidCredentialsError('Email not verified. Check your inbox for verification link.');
    }

    // Check if user must change password - return flag instead of blocking
    const requirePasswordChange = user.isPasswordChangeRequired();

    // Only publish login event if not requiring password change
    // Full login event published after password is changed
    if (!requirePasswordChange) {
      await this.eventBus.publish(new UserLoggedInEvent(
        user.id,
        user.username
      ));
    }

    // Return user with password change flag for AuthController to handle
    return {
      user,
      sessionToken: '', // Legacy field - OAuth 2.0 tokens created by AuthController
      requirePasswordChange
    };
  }
}

// User Settings Commands

/**
 * Update User Settings Command
 *
 * Updates per-user preferences and configuration settings.
 * Settings are optional and extensible for future customization features.
 */
export interface UpdateUserSettingsCommand {
  userId: string;
  settings: UserSettings;
}

/**
 * Update User Settings Command Handler
 *
 * Handles user settings updates with proper domain logic and persistence.
 * Uses immutable update pattern from User entity.
 */
export class UpdateUserSettingsCommandHandler {
  constructor(private userRepository: UserRepository) {}

  async handle(command: UpdateUserSettingsCommand): Promise<User> {
    // Fetch current user
    const user = await this.userRepository.findById(command.userId);

    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    // Update settings (immutable - returns new User instance)
    const updatedUser = user.updateSettings(command.settings);

    // Persist changes
    await this.userRepository.save(updatedUser);

    return updatedUser;
  }
}

/**
 * Get User Settings Query
 *
 * Retrieves current user settings for preferences UI.
 */
export interface GetUserSettingsQuery {
  userId: string;
}

/**
 * Get User Settings Query Handler
 *
 * Simple query handler to fetch user settings.
 */
export class GetUserSettingsQueryHandler {
  constructor(private userRepository: UserRepository) {}

  async handle(query: GetUserSettingsQuery): Promise<UserSettings> {
    const user = await this.userRepository.findById(query.userId);

    if (!user) {
      throw new UserNotFoundError(query.userId);
    }

    return user.settings;
  }
}

// Session Service Interface

/**
 * Session validation result containing authenticated user and session metadata
 */
export interface SessionValidationResult {
  user: User;
  sessionId: string;
}

/**
 * Session validation outcome with explicit error codes
 * Discriminated union for type-safe error handling in middleware
 */
export type SessionValidationOutcome =
  | { success: true; user: User; sessionId: string }
  | { success: false; code: 'INVALID_TOKEN' | 'SESSION_REVOKED' | 'SESSION_EXPIRED' | 'SESSION_IDLE_TIMEOUT' | 'SESSION_ABSOLUTE_TIMEOUT' };

export interface SessionService {
  // OAuth 2.0 dual token support (pure implementation)
  validateSession(token: string): Promise<SessionValidationResult | null>;
  revokeSession(token: string): Promise<void>;
  createTokenPair(user: User, userAgent?: string, ipAddress?: string, deviceInfo?: string): Promise<EnhancedLoginResponse>;
  refreshAccessToken(refreshToken: string): Promise<RefreshTokenResponse>;

  /**
   * Validate session with full timeout checks and optional activity update
   * Used by auth middleware for enforcing idle and absolute timeouts
   *
   * @param token - JWT access token
   * @param options.updateActivity - Whether to update lastUsedAt (default: true)
   */
  validateSessionWithActivity(
    token: string,
    options?: { updateActivity?: boolean }
  ): Promise<SessionValidationOutcome>;

  /**
   * Create temporary token for password change flow
   * Short-lived (5 min), only allows force-change-password endpoint
   */
  createPasswordChangeTempToken(user: User): string;

  /**
   * Verify temporary password change token
   * Returns user ID if valid, null if expired/invalid
   */
  verifyPasswordChangeTempToken(token: string): Promise<{ userId: string; username: string } | null>;
}
