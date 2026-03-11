/**
 * User Commands
 *
 * Commands for user-related operations.
 */

import { UserRole } from '@domain/value-objects/UserRole';
import { User } from '@domain/entities/User';
import { UserRepository } from '@domain/repositories/UserRepository';
import { StorageRepository } from '@domain/repositories/StorageRepository';
import { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import { InviteCodeRepository } from '@domain/repositories/InviteCodeRepository';
import { LabRepository } from '@domain/repositories/LabRepository';
import { PersonRepository } from '@domain/repositories/PersonRepository';
import { Person } from '@domain/entities/Person';
import { PasswordService } from '@application/contracts/PasswordService';
import { logger } from '@infrastructure/logging/logger';
import { EventBus } from '@application/contracts/EventBus';
import {
  UserCreatedEvent,
  UserPasswordChangedEvent,
  UserRoleChangedEvent,
  UserDeletedEvent,
  UserLoggedInEvent,
  UserLoggedOutEvent
} from '@domain/events/UserEvents';
import { BulkResourcesUnassignedEvent } from '@domain/events/StorageEvents';
import { InviteCodeUsedEvent } from '@domain/events/LabEvents';
import { UserAlreadyExistsError, InvalidCredentialsError, UserNotFoundError } from '@domain/errors/UserErrors';
import { ValidationError } from '@domain/errors/ValidationError';
import { ConflictError } from '@domain/errors/ConflictError';
import { PermissionError } from '@domain/errors/PermissionError';
import { type UserSettings, PasswordValidator } from '@odysseus/shared-schemas';
import type { EnhancedLoginResponse, RefreshTokenResponse } from '@application/types/tokenTypes';

// COMMAND INTERFACES

export interface CreateUserCommand {
  username: string;
  password: string;
  role: UserRole;
  initiatedBy: string;
  inviteCode?: string;
}

export interface CreateSystemAdminCommand {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  setupKey?: string;
  department?: string;
  position?: string;
  initiatedBy?: string;
}

export interface ChangeUserPasswordCommand {
  userId: string;
  currentPassword: string;
  newPassword: string;
  currentSessionId: string | undefined;
  initiatedBy: string;
}

export interface ChangeUserRoleCommand {
  userId: string;
  newRole: UserRole;
  initiatedBy: string;
}

export interface DeleteUserCommand {
  userId: string;
  initiatedBy: string;
}

export interface LoginCommand {
  username: string;
  password: string;
}

// COMMAND HANDLERS

export class CreateUserCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private passwordService: PasswordService,
    private eventBus: EventBus,
    private storageRepository: StorageRepository,
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

    const event = new UserCreatedEvent(user.id, user.username, user.role, user.labId);
    await this.eventBus.publish(event);

    return user;
  }

  private async validatePasswordPolicy(password: string): Promise<void> {
    const securityConfig = await this.storageRepository.getSecurityConfig();
    try {
      PasswordValidator.enforce(password, securityConfig);
    } catch (error) {
      throw new ValidationError((error as Error).message);
    }
  }
}

export class CreateSystemAdminCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private storageRepository: StorageRepository,
    private eventBus: EventBus,
    private personRepository: PersonRepository
  ) {}

  async handle(command: CreateSystemAdminCommand): Promise<User> {
    const existingAdmins = await this.userRepository.countByRole('system_admin');
    if (existingAdmins > 0) {
      throw new ValidationError('System admin already exists');
    }

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

    const person = Person.create(command.firstName, command.lastName, command.email, command.position, command.department);
    await this.personRepository.save(person);

    const user = User.createWithPassword(
      command.username,
      command.password,
      UserRole.systemAdmin(),
      undefined,
      person.id,
      'approved'
    );

    await this.userRepository.save(user);

    const event = new UserCreatedEvent(user.id, user.username, user.role, user.labId);
    await this.eventBus.publish(event);

    return user;
  }

  private async validatePasswordPolicy(password: string): Promise<void> {
    const securityConfig = await this.storageRepository.getSecurityConfig();
    try {
      PasswordValidator.enforce(password, securityConfig);
    } catch (error) {
      throw new ValidationError((error as Error).message);
    }
  }
}

export class ChangeUserPasswordCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private passwordService: PasswordService,
    private eventBus: EventBus,
    private storageRepository: StorageRepository,
    private userSessionRepository: UserSessionRepository
  ) {}

  async handle(command: ChangeUserPasswordCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    const isCurrentPasswordValid = user.validatePassword(command.currentPassword);
    if (!isCurrentPasswordValid) {
      throw new InvalidCredentialsError('Current password is incorrect');
    }

    await this.validatePasswordPolicy(command.newPassword);

    user.setPassword(command.newPassword);
    await this.userRepository.save(user);

    // Changing password revokes all other sessions for security
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

    const event = new UserPasswordChangedEvent(user.id, user.username, command.initiatedBy, user.labId);
    await this.eventBus.publish(event);
  }

  private async validatePasswordPolicy(password: string): Promise<void> {
    const securityConfig = await this.storageRepository.getSecurityConfig();
    try {
      PasswordValidator.enforce(password, securityConfig);
    } catch (error) {
      throw new ValidationError((error as Error).message);
    }
  }
}

export class ChangeUserRoleCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: ChangeUserRoleCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    const performingUser = await this.userRepository.findById(command.initiatedBy);
    if (!performingUser) {
      throw new UserNotFoundError(command.initiatedBy);
    }

    const oldRole = user.role;
    user.changeRole(command.newRole.value, performingUser);
    await this.userRepository.save(user);

    const event = new UserRoleChangedEvent(
      user.id,
      user.username,
      oldRole,
      command.newRole,
      command.initiatedBy,
      user.labId
    );
    await this.eventBus.publish(event);
  }
}

export class DeleteUserCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private eventBus: EventBus,
    private storageRepository: StorageRepository
  ) {}

  async handle(command: DeleteUserCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    const username = user.username;

    // Retry ensures cascade completes even during concurrent configuration changes
    const MAX_CASCADE_RETRIES = 3;
    let cascadeSucceeded = false;
    let racksAffected = 0;
    let boxesAffected = 0;

    for (let attempt = 1; attempt <= MAX_CASCADE_RETRIES; attempt++) {
      if (!user.labId) {
        break;
      }
      const configuration = await this.storageRepository.getForLab(user.labId);
      if (!configuration) {
        break;
      }

      const counts = configuration.countAssignmentsForUser(command.userId);
      const expectedVersion = configuration.version;
      const hadAssignments = configuration.clearAllAssignmentsForUser(command.userId);

      if (!hadAssignments) {
        cascadeSucceeded = true;
        break;
      }

      try {
        await this.storageRepository.saveWithOptimisticLock(
          user.labId!,
          configuration,
          expectedVersion,
          `Cleared assignments for deleted user '${username}'`,
          command.initiatedBy
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

    await this.userRepository.delete(command.userId);

    const deleteEvent = new UserDeletedEvent(command.userId, username, command.initiatedBy, user.labId);
    await this.eventBus.publish(deleteEvent);

    // Trigger socket notification for real-time client cache invalidation
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

export interface LoginResult {
  user: User;
  sessionToken: string;
  requirePasswordChange: boolean;
}

export class LoginCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private sessionService: SessionService,
    private eventBus: EventBus,
    private labRepository?: LabRepository
  ) {}

  async handle(command: LoginCommand): Promise<LoginResult> {
    let user = await this.userRepository.findByUsername(command.username);

    if (!user) {
      user = await this.userRepository.findByEmail(command.username);
    }

    if (!user) {
      throw new InvalidCredentialsError('Invalid username or password');
    }

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

    if (user.status === 'deactivated') {
      throw new InvalidCredentialsError('Account has been deactivated. Contact your lab administrator.');
    }

    if (user.status === 'suspended') {
      throw new InvalidCredentialsError('Account has been suspended. Contact your system administrator.');
    }

    if (this.labRepository && user.labId) {
      const lab = await this.labRepository.findById(user.labId);
      if (lab && !lab.isActive) {
        throw new InvalidCredentialsError('Your lab has been deactivated. Contact your system administrator.');
      }
    }

    // Admin approval bypasses email verification (admin manually vets users)
    if (!user.isEmailVerified() && user.status !== 'approved') {
      throw new InvalidCredentialsError('Email not verified. Check your inbox for verification link.');
    }

    const requirePasswordChange = user.isPasswordChangeRequired();

    if (!requirePasswordChange) {
      await this.eventBus.publish(new UserLoggedInEvent(
        user.id,
        user.username,
        user.labId
      ));
    }

    return {
      user,
      sessionToken: '', // Legacy field - OAuth 2.0 tokens created by AuthController
      requirePasswordChange
    };
  }
}

// USER SETTINGS

export interface UpdateUserSettingsCommand {
  userId: string;
  settings: UserSettings;
}

export class UpdateUserSettingsCommandHandler {
  constructor(private userRepository: UserRepository) {}

  async handle(command: UpdateUserSettingsCommand): Promise<User> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    const updatedUser = user.updateSettings(command.settings);
    await this.userRepository.save(updatedUser);

    return updatedUser;
  }
}

export interface GetUserSettingsQuery {
  userId: string;
}

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

// SESSION SERVICE INTERFACE

export interface SessionValidationResult {
  user: User;
  sessionId: string;
}

export type SessionValidationOutcome =
  | { success: true; user: User; sessionId: string }
  | { success: false; code: 'INVALID_TOKEN' | 'SESSION_REVOKED' | 'SESSION_EXPIRED' | 'SESSION_IDLE_TIMEOUT' | 'SESSION_ABSOLUTE_TIMEOUT' | 'LAB_DEACTIVATED' };

export interface SessionService {
  validateSession(token: string): Promise<SessionValidationResult | null>;
  revokeSession(token: string): Promise<void>;
  createTokenPair(user: User, userAgent?: string, ipAddress?: string, deviceInfo?: string): Promise<EnhancedLoginResponse>;
  refreshAccessToken(refreshToken: string): Promise<RefreshTokenResponse>;

  /**
   * Validate session with full timeout checks and optional activity update.
   * Used by auth middleware for enforcing idle and absolute timeouts.
   */
  validateSessionWithActivity(
    token: string,
    options?: { updateActivity?: boolean }
  ): Promise<SessionValidationOutcome>;

  /** Short-lived (5 min) token that only allows force-change-password endpoint. */
  createPasswordChangeTempToken(user: User): string;

  /** Returns user ID if valid, null if expired/invalid. */
  verifyPasswordChangeTempToken(token: string): Promise<{ userId: string; username: string } | null>;
}
