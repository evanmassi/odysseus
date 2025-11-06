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
import { PasswordService } from '@application/contracts/PasswordService';
import { EventBus } from '@application/contracts/EventBus';
import {
  UserCreatedEvent,
  UserPasswordChangedEvent,
  UserRoleChangedEvent,
  UserDeletedEvent,
  UserLoggedInEvent,
  UserLoggedOutEvent
} from '@domain/events/UserEvents';
import { UserAlreadyExistsError, InvalidCredentialsError, UserNotFoundError } from '@domain/errors/UserErrors';
import { ValidationError } from '@domain/errors/ValidationError';
import { PermissionError } from '@domain/errors/PermissionError';
import { type UserSettings } from '@odysseus/shared-schemas';

// Create User Command

export class CreateUserCommand extends BaseCommand {
  constructor(
    public readonly username: string,
    public readonly password: string,
    public readonly role: UserRole,
    initiatedBy: string
  ) {
    super(initiatedBy);
  }
}

export class CreateUserCommandHandler implements CommandHandler<CreateUserCommand, User> {
  constructor(
    private userRepository: UserRepository,
    private passwordService: PasswordService,
    private eventBus: EventBus,
    private configurationRepository: ConfigurationRepository
  ) {}

  async handle(command: CreateUserCommand): Promise<User> {
    // Validate business rules
    const existingUser = await this.userRepository.findByUsername(command.username);
    if (existingUser) {
      throw new UserAlreadyExistsError(command.username);
    }

    // Validate password against security policy
    await this.validatePasswordPolicy(command.password);

    // Create domain entity with password
    const user = User.createWithPassword(command.username, command.password, command.role);

    // Persist
    await this.userRepository.save(user);

    // Publish domain event
    const event = new UserCreatedEvent(user.id, user.username, user.role);
    await this.eventBus.publish(event);

    return user;
  }

  /**
   * Validate password against configured security policy
   * Throws ValidationError if password doesn't meet requirements
   */
  private async validatePasswordPolicy(password: string): Promise<void> {
    const securityConfig = await this.configurationRepository.getSecurityConfig();

    // Check minimum length (configurable)
    if (password.length < securityConfig.passwordMinLength) {
      throw new ValidationError(
        `Password must be at least ${securityConfig.passwordMinLength} characters long`
      );
    }

    // Check maximum length for security
    if (password.length > 128) {
      throw new ValidationError('Password cannot exceed 128 characters');
    }

    // Check strong password requirement (uppercase, lowercase, numbers)
    if (securityConfig.requireStrongPasswords) {
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);

      if (!hasUppercase || !hasLowercase || !hasNumber) {
        throw new ValidationError(
          'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        );
      }
    }

    // Check special character requirement
    if (securityConfig.passwordRequireSpecialChars) {
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/'`~;]/.test(password);

      if (!hasSpecial) {
        throw new ValidationError(
          'Password must contain at least one special character (!@#$%^&* etc.)'
        );
      }
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
    // Industry standard: changing password logs out all other devices
    if (command.currentSessionId) {
      const activeSessions = await this.userSessionRepository.findActiveSessionsByUserId(user.id);
      const otherSessionIds = activeSessions
        .filter(s => s.id !== command.currentSessionId)
        .map(s => s.id);

      if (otherSessionIds.length > 0) {
        const revokedCount = await this.userSessionRepository.batchRevoke(otherSessionIds);
        console.log(`🔒 Password changed - revoked ${revokedCount} other session(s) for user ${user.username}`);
      }
    }

    // Publish domain event
    const event = new UserPasswordChangedEvent(user.id, user.username, command.initiatedBy);
    await this.eventBus.publish(event);
  }

  /**
   * Validate password against configured security policy
   * Throws ValidationError if password doesn't meet requirements
   */
  private async validatePasswordPolicy(password: string): Promise<void> {
    const securityConfig = await this.configurationRepository.getSecurityConfig();

    // Check minimum length (configurable)
    if (password.length < securityConfig.passwordMinLength) {
      throw new ValidationError(
        `Password must be at least ${securityConfig.passwordMinLength} characters long`
      );
    }

    // Check maximum length for security
    if (password.length > 128) {
      throw new ValidationError('Password cannot exceed 128 characters');
    }

    // Check strong password requirement (uppercase, lowercase, numbers)
    if (securityConfig.requireStrongPasswords) {
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);

      if (!hasUppercase || !hasLowercase || !hasNumber) {
        throw new ValidationError(
          'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        );
      }
    }

    // Check special character requirement
    if (securityConfig.passwordRequireSpecialChars) {
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/'`~;]/.test(password);

      if (!hasSpecial) {
        throw new ValidationError(
          'Password must contain at least one special character (!@#$%^&* etc.)'
        );
      }
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
    private eventBus: EventBus
  ) {}

  async handle(command: DeleteUserCommand): Promise<void> {
    // Get user
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    // Store user data for event before deletion
    const username = user.username;

    // Delete user
    await this.userRepository.delete(command.userId);

    // Publish domain event
    const event = new UserDeletedEvent(command.userId, username, command.initiatedBy);
    await this.eventBus.publish(event);
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

    // Check if user must change password before login
    if (user.isPasswordChangeRequired()) {
      throw new PermissionError('Password change required. Please contact an administrator for a password reset link.');
    }

    // Publish login event
    this.eventBus.publish(new UserLoggedInEvent(
      user.id,
      user.username
    ));

    // Return user for OAuth 2.0 token creation by AuthController
    return {
      user,
      sessionToken: '' // Legacy field - OAuth 2.0 tokens created by AuthController
    };
  }
}

// ============================================================================
// USER SETTINGS COMMANDS
// ============================================================================

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

export interface SessionService {
  // OAuth 2.0 dual token support (pure implementation)
  validateSession(token: string): Promise<SessionValidationResult | null>;
  revokeSession(token: string): Promise<void>;
  createTokenPair(user: User, userAgent?: string, ipAddress?: string, deviceInfo?: string): Promise<any>; // EnhancedLoginResponse
  refreshAccessToken(refreshToken: string): Promise<any>; // RefreshTokenResponse
}
