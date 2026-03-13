/**
 * Password Reset Commands
 *
 * Admin-initiated password reset — supports direct reset and token-based reset flows.
 */

import type { EventBus } from '@application/contracts/EventBus';
import type { PasswordService } from '@application/contracts/PasswordService';
import { validatePasswordPolicy } from '@application/guards/PasswordGuards';
import { requireUser, requireAdmin } from '@application/guards/UserGuards';
import { ValidationError } from '@domain/errors/ValidationError';
import { PasswordResetByAdminEvent, PasswordResetTokenGeneratedEvent, PasswordResetCompletedEvent } from '@domain/events/PasswordResetEvents';
import type { RefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
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

// COMMAND HANDLERS

export class AdminResetPasswordCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private eventBus: EventBus,
    private refreshTokenRepository: RefreshTokenRepository,
    private userSessionRepository: UserSessionRepository,
    private passwordService: PasswordService,
    private storageRepository: StorageRepository
  ) {}

  async handle(command: AdminResetPasswordCommand): Promise<void> {
    const admin = await requireAdmin(this.userRepository, command.adminUserId);
    const targetUser = await requireUser(this.userRepository, command.targetUserId);

    await validatePasswordPolicy(this.storageRepository, command.newPassword);
    const passwordHash = await this.passwordService.hash(command.newPassword);

    targetUser.adminResetPassword(passwordHash, command.requirePasswordChange);
    await this.userRepository.save(targetUser);

    const revokedTokens = await this.refreshTokenRepository.revokeAllForUser(targetUser.id);
    const revokedSessions = await this.userSessionRepository.revokeAllSessions(targetUser.id);

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
      revokedRefreshTokens: revokedTokens,
      revokedSessions: revokedSessions,
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
    private refreshTokenRepository: RefreshTokenRepository,
    private userSessionRepository: UserSessionRepository,
    private passwordService: PasswordService,
    private storageRepository: StorageRepository
  ) {}

  async handle(command: ResetPasswordWithTokenCommand): Promise<void> {
    const user = await this.userRepository.findByPasswordResetToken(command.token);
    if (!user) {
      throw new ValidationError('Invalid or expired password reset token');
    }

    await validatePasswordPolicy(this.storageRepository, command.newPassword);
    const passwordHash = await this.passwordService.hash(command.newPassword);

    user.resetPasswordWithToken(command.token, passwordHash);
    await this.userRepository.save(user);

    const revokedTokens = await this.refreshTokenRepository.revokeAllForUser(user.id);
    const revokedSessions = await this.userSessionRepository.revokeAllSessions(user.id);

    await this.eventBus.publish(new PasswordResetCompletedEvent(user.id, user.labId));

    logger.info('Password reset completed with token', {
      userId: user.id,
      username: user.username,
      revokedRefreshTokens: revokedTokens,
      revokedSessions: revokedSessions,
      timestamp: new Date().toISOString()
    });
  }
}
