/**
 * User CQRS Commands
 *
 * Account lifecycle operations — registration, login, password changes, role changes, deletion.
 */

import { verifyCurrentPassword, upgradePasswordHashIfNeeded } from '@application/authentication/passwordCredentials';
import { findByIdForRequester } from '@application/authorization/findByIdForRequester';
import type { EventBus } from '@application/contracts/EventBus';
import type { PasswordService } from '@application/contracts/PasswordService';
import { validatePasswordPolicy } from '@application/guards/PasswordGuards';
import { Person } from '@domain/entities/Person';
import { User } from '@domain/entities/User';
import { PermissionError } from '@domain/errors/PermissionError';
import { UserAlreadyExistsError, InvalidCredentialsError, UserNotFoundError } from '@domain/errors/UserErrors';
import { ValidationError } from '@domain/errors/ValidationError';
import {
  UserCreatedEvent,
  UserPasswordChangedEvent,
  UserRoleChangedEvent,
  UserLoggedInEvent
} from '@domain/events/UserEvents';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { PersonRepository } from '@domain/repositories/PersonRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import { UserRole } from '@domain/value-objects/UserRole';
import { logger } from '@infrastructure/logging/logger';

import type { UserSettings } from '@odysseus/shared-schemas';

// COMMAND INTERFACES

export interface CreateSystemAdminCommand {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  setupKey?: string;
  department?: string;
  position?: string;
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

export interface LoginCommand {
  username: string;
  password: string;
}

export interface UpdateUserSettingsCommand {
  userId: string;
  settings: UserSettings;
}

// COMMAND HANDLERS

export class CreateSystemAdminCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private storageRepository: StorageRepository,
    private eventBus: EventBus,
    private personRepository: PersonRepository,
    private passwordService: PasswordService,
    private setupKey?: string
  ) {}

  async handle(command: CreateSystemAdminCommand): Promise<User> {
    const existingAdmins = await this.userRepository.countByRole('system_admin');
    if (existingAdmins > 0) {
      throw new ValidationError('System admin already exists');
    }

    if (this.setupKey) {
      if (!command.setupKey || command.setupKey !== this.setupKey) {
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

    await validatePasswordPolicy(this.storageRepository, command.password);
    const passwordHash = await this.passwordService.hash(command.password);

    const person = Person.create(command.firstName, command.lastName, command.email, command.position, command.department);
    await this.personRepository.save(person);

    const user = User.createWithPassword(
      command.username,
      passwordHash,
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
}

export class ChangeUserPasswordCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private eventBus: EventBus,
    private storageRepository: StorageRepository,
    private userSessionRepository: UserSessionRepository,
    private passwordService: PasswordService
  ) {}

  async handle(command: ChangeUserPasswordCommand): Promise<void> {
    const user = await this.userRepository.findByIdAnyLab(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    await verifyCurrentPassword(user, command.currentPassword, this.passwordService);

    await validatePasswordPolicy(this.storageRepository, command.newPassword);
    const newHash = await this.passwordService.hash(command.newPassword);

    user.setPasswordHash(newHash);
    await this.userRepository.save(user);

    // Changing password revokes all other sessions for security
    if (command.currentSessionId) {
      const activeSessions = await this.userSessionRepository.findActiveSessionsByUserId(user.id);
      const otherSessionIds = activeSessions
        .filter(s => s.id !== command.currentSessionId)
        .map(s => s.id);

      if (otherSessionIds.length > 0) {
        const revokedCount = await this.userSessionRepository.bulkRevoke(otherSessionIds);
        logger.info(`Password changed - revoked ${revokedCount} other session(s) for user ${user.username}`);
      }
    }

    const event = new UserPasswordChangedEvent(user.id, user.username, command.initiatedBy, user.labId);
    await this.eventBus.publish(event);
  }
}

export class ChangeUserRoleCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: ChangeUserRoleCommand): Promise<void> {
    const performingUser = await this.userRepository.findByIdAnyLab(command.initiatedBy);
    if (!performingUser) {
      throw new UserNotFoundError(command.initiatedBy);
    }

    const user = await findByIdForRequester(this.userRepository, command.userId, {
      labId: performingUser.labId,
      isSystemAdmin: performingUser.isSystemAdmin(),
    });
    if (!user) {
      throw new UserNotFoundError(command.userId);
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


export interface LoginResult {
  user: User;
  requirePasswordChange: boolean;
}

export class LoginCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private eventBus: EventBus,
    private passwordService: PasswordService,
    private labRepository?: LabRepository
  ) {}

  async handle(command: LoginCommand): Promise<LoginResult> {
    let user = await this.userRepository.findByUsername(command.username);

    if (!user) {
      user = await this.userRepository.findByEmail(command.username);
    }

    if (!user || !user.hasPassword()) {
      // Equalize response time with the valid-user path (which runs a bcrypt verify below) so
      // login latency can't be used to enumerate which usernames/emails exist.
      await this.passwordService.hash(command.password);
      throw new InvalidCredentialsError('Invalid username or password');
    }

    const isPasswordValid = await this.passwordService.verify(command.password, user.passwordHash!, user.salt);
    if (!isPasswordValid) {
      throw new InvalidCredentialsError('Invalid username or password');
    }

    // Lazy migration: re-hash PBKDF2 passwords to bcrypt on successful login
    await upgradePasswordHashIfNeeded(user, command.password, this.passwordService, this.userRepository);

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
      requirePasswordChange
    };
  }
}

// USER SETTINGS

export class UpdateUserSettingsCommandHandler {
  constructor(private userRepository: UserRepository) {}

  async handle(command: UpdateUserSettingsCommand): Promise<User> {
    const user = await this.userRepository.findByIdAnyLab(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    const updatedUser = user.updateSettings(command.settings);
    await this.userRepository.save(updatedUser);

    return updatedUser;
  }
}
