/**
 * Password Reset Commands
 *
 * Admin-initiated password reset — supports direct reset and token-based reset flows.
 */

import type { EventBus } from '@application/contracts/EventBus';
import type { PasswordService } from '@application/contracts/PasswordService';
import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import { validatePasswordPolicy } from '@application/guards/PasswordGuards';
import { requireUser, requireAdmin } from '@application/guards/UserGuards';
import type { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { ValidationError } from '@domain/errors/ValidationError';
import { PasswordResetByAdminEvent, PasswordResetTokenGeneratedEvent, PasswordResetCompletedEvent } from '@domain/events/PasswordResetEvents';
import { UserPasswordChangedEvent } from '@domain/events/UserEvents';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import { logger } from '@infrastructure/logging/logger';

// COMMAND INTERFACES

export interface AdminResetPasswordCommand {
  adminUserId: string;
  targetUserId: string;
  newPassword: string;
  requirePasswordChange: boolean;
}

export interface GeneratePasswordResetTokenCommand {
  adminUserId: string;
  targetUserId: string;
}

export interface ResetPasswordWithTokenCommand {
  token: string;
  newPassword: string;
}

export interface ForceChangePasswordCommand {
  userId: string;
  newPassword: string;
}

interface RevokedCredentials {
  tokens: number;
  sessions: number;
}

/**
 * Persists the new password and revokes every existing refresh token and session as one
 * transaction. A partial write would leave the user's old sessions alive under a password they
 * just changed — which is exactly what someone resetting a compromised account is trying to end.
 */
function commitPasswordChange(unitOfWork: UnitOfWork, user: User): Promise<RevokedCredentials> {
  return unitOfWork.withTransaction(async (repos) => {
    await repos.users.save(user);

    return {
      tokens: await repos.refreshTokens.revokeAllForUser(user.id),
      sessions: await repos.userSessions.revokeAllSessions(user.id),
    };
  });
}

// COMMAND HANDLERS

export class AdminResetPasswordCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private eventBus: EventBus,
    private passwordService: PasswordService,
    private storageRepository: StorageRepository,
    private unitOfWork: UnitOfWork
  ) {}

  async handle(command: AdminResetPasswordCommand): Promise<void> {
    const admin = await requireAdmin(this.userRepository, command.adminUserId);
    const targetUser = await requireUser(this.userRepository, command.targetUserId);
    admin.requireCanManage(targetUser);

    await validatePasswordPolicy(this.storageRepository, command.newPassword);
    const passwordHash = await this.passwordService.hash(command.newPassword);

    targetUser.adminResetPassword(passwordHash, command.requirePasswordChange);

    const revoked = await commitPasswordChange(this.unitOfWork, targetUser);

    await this.eventBus.publish(new PasswordResetByAdminEvent(
      targetUser.id,
      admin.id,
      command.requirePasswordChange,
      targetUser.labId
    ));

    logger.info('Password reset by admin', {
      adminUserId: admin.id,
      adminUsername: admin.username,
      targetUserId: targetUser.id,
      targetUsername: targetUser.username,
      requirePasswordChange: command.requirePasswordChange,
      revokedRefreshTokens: revoked.tokens,
      revokedSessions: revoked.sessions,
      timestamp: new Date().toISOString()
    });
  }
}

export class GeneratePasswordResetTokenCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private eventBus: EventBus,
    private resetPasswordBaseUrl: string
  ) {}

  async handle(command: GeneratePasswordResetTokenCommand): Promise<{ resetUrl: string; expiresAt: Date }> {
    const admin = await requireAdmin(this.userRepository, command.adminUserId);
    const targetUser = await requireUser(this.userRepository, command.targetUserId);
    admin.requireCanManage(targetUser);

    const token = targetUser.generatePasswordResetToken();
    await this.userRepository.save(targetUser);

    const expiresAt = targetUser.passwordResetExpiry!;

    await this.eventBus.publish(new PasswordResetTokenGeneratedEvent(
      targetUser.id,
      admin.id,
      expiresAt,
      targetUser.labId
    ));

    logger.info('Password reset token generated', {
      adminUserId: admin.id,
      adminUsername: admin.username,
      targetUserId: targetUser.id,
      targetUsername: targetUser.username,
      expiresAt: expiresAt.toISOString(),
      timestamp: new Date().toISOString()
    });

    return {
      resetUrl: `${this.resetPasswordBaseUrl}?token=${token}`,
      expiresAt
    };
  }
}

export class ResetPasswordWithTokenCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private eventBus: EventBus,
    private passwordService: PasswordService,
    private storageRepository: StorageRepository,
    private unitOfWork: UnitOfWork
  ) {}

  async handle(command: ResetPasswordWithTokenCommand): Promise<void> {
    const user = await this.userRepository.findByPasswordResetToken(command.token);
    if (!user) {
      throw new ValidationError('Invalid or expired password reset token');
    }

    await validatePasswordPolicy(this.storageRepository, command.newPassword);
    const passwordHash = await this.passwordService.hash(command.newPassword);

    user.resetPasswordWithToken(command.token, passwordHash);

    const revoked = await commitPasswordChange(this.unitOfWork, user);

    await this.eventBus.publish(new PasswordResetCompletedEvent(user.id, user.labId));

    logger.info('Password reset completed with token', {
      userId: user.id,
      username: user.username,
      revokedRefreshTokens: revoked.tokens,
      revokedSessions: revoked.sessions,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Completes the force-change-password flow (temp-token identity resolved by the caller).
 * Mirrors a token reset: revokes all existing sessions/tokens so only the freshly
 * issued session survives. Returns the user for token-pair creation.
 */
export class ForceChangePasswordCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private eventBus: EventBus,
    private passwordService: PasswordService,
    private storageRepository: StorageRepository,
    private unitOfWork: UnitOfWork
  ) {}

  async handle(command: ForceChangePasswordCommand): Promise<User> {
    const user = await this.userRepository.findByIdAnyLab(command.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await validatePasswordPolicy(this.storageRepository, command.newPassword);
    const passwordHash = await this.passwordService.hash(command.newPassword);

    user.setPasswordHash(passwordHash);
    user.markPasswordChanged();

    const revoked = await commitPasswordChange(this.unitOfWork, user);

    await this.eventBus.publish(new UserPasswordChangedEvent(user.id, user.username, user.id, user.labId));

    logger.info('Password changed via force-change flow', {
      userId: user.id,
      username: user.username,
      revokedRefreshTokens: revoked.tokens,
      revokedSessions: revoked.sessions,
      timestamp: new Date().toISOString()
    });

    return user;
  }
}
