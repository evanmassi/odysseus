/**
 * Password Reset Commands
 *
 * Admin-initiated password reset — supports direct reset and token-based reset flows.
 */

import { UserRepository } from '@domain/repositories/UserRepository';
import { RefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';
import { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import { EventBus } from '@application/contracts/EventBus';
import { ValidationError } from '@domain/errors/ValidationError';
import { PasswordResetByAdminEvent, PasswordResetTokenGeneratedEvent, PasswordResetCompletedEvent } from '@domain/events/PasswordResetEvents';
import { requireUser, requireAdmin } from '@application/guards/UserGuards';
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
    private userSessionRepository: UserSessionRepository
  ) {}

  async handle(command: AdminResetPasswordCommand): Promise<void> {
    const admin = await requireAdmin(this.userRepository, command.adminUserId);
    const targetUser = await requireUser(this.userRepository, command.targetUserId);

    targetUser.adminResetPassword(command.newPassword, command.requirePasswordChange);
    await this.userRepository.save(targetUser);

    const revokedTokens = await this.refreshTokenRepository.revokeAllForUser(targetUser.id);
    const revokedSessions = await this.userSessionRepository.revokeAllSessions(targetUser.id);

    await this.eventBus.publish(new PasswordResetByAdminEvent(
      targetUser.id,
      admin.id,
      command.requirePasswordChange
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
      expiresAt
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
    private userSessionRepository: UserSessionRepository
  ) {}

  async handle(command: ResetPasswordWithTokenCommand): Promise<void> {
    const user = await this.userRepository.findByPasswordResetToken(command.token);
    if (!user) {
      throw new ValidationError('Invalid or expired password reset token');
    }

    user.resetPasswordWithToken(command.token, command.newPassword);
    await this.userRepository.save(user);

    const revokedTokens = await this.refreshTokenRepository.revokeAllForUser(user.id);
    const revokedSessions = await this.userSessionRepository.revokeAllSessions(user.id);

    await this.eventBus.publish(new PasswordResetCompletedEvent(user.id));

    logger.info('Password reset completed with token', {
      userId: user.id,
      username: user.username,
      revokedRefreshTokens: revokedTokens,
      revokedSessions: revokedSessions,
      timestamp: new Date().toISOString()
    });
  }
}
