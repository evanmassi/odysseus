/**
 * Password Reset Commands
 *
 * Admin-initiated password reset without email dependency.
 * Two flows supported:
 * 1. Direct reset - Admin sets password immediately (force change recommended)
 * 2. Token-based - Admin generates 15-minute one-time link for user
 */

import { UserRepository } from '@domain/repositories/UserRepository';
import { RefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';
import { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import { EventBus } from '@application/contracts/EventBus';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';
import { ValidationError } from '@domain/errors/ValidationError';
import { PasswordResetByAdminEvent, PasswordResetTokenGeneratedEvent, PasswordResetCompletedEvent } from '@domain/events/PasswordResetEvents';
import { logger } from '@utils/logger';

/**
 * Command: Admin directly resets user password
 */
export interface AdminResetPasswordCommand {
  adminUserId: string;           // Who performed reset (audit)
  targetUserId: string;          // User getting password reset
  newPassword: string;
  requirePasswordChange: boolean; // Forces user to set own password on next login
}

export class AdminResetPasswordCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private eventBus: EventBus,
    private refreshTokenRepository: RefreshTokenRepository,
    private userSessionRepository: UserSessionRepository
  ) {}

  async execute(command: AdminResetPasswordCommand): Promise<void> {
    // Verify admin permissions
    const admin = await this.userRepository.findById(command.adminUserId);
    if (!admin) {
      throw new NotFoundError('Admin user not found');
    }

    if (!admin.isAdmin()) {
      throw new PermissionError('Only administrators can reset user passwords');
    }

    // Find target user
    const targetUser = await this.userRepository.findById(command.targetUserId);
    if (!targetUser) {
      throw new NotFoundError('Target user not found');
    }

    targetUser.adminResetPassword(command.newPassword, command.requirePasswordChange);
    await this.userRepository.save(targetUser);

    const revokedTokens = await this.refreshTokenRepository.revokeAllForUser(targetUser.id);
    const revokedSessions = await this.userSessionRepository.revokeAllSessions(targetUser.id);

    // Publish event
    this.eventBus.publish(new PasswordResetByAdminEvent(
      targetUser.id,
      admin.id,
      command.requirePasswordChange
    ));

    // Audit logging
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

/**
 * Command: Admin generates password reset token
 */
export interface GeneratePasswordResetTokenCommand {
  adminUserId: string;
  targetUserId: string;
}

export class GeneratePasswordResetTokenCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async execute(command: GeneratePasswordResetTokenCommand): Promise<string> {
    // Verify admin permissions
    const admin = await this.userRepository.findById(command.adminUserId);
    if (!admin) {
      throw new NotFoundError('Admin user not found');
    }

    if (!admin.isAdmin()) {
      throw new PermissionError('Only administrators can generate password reset tokens');
    }

    // Find target user
    const targetUser = await this.userRepository.findById(command.targetUserId);
    if (!targetUser) {
      throw new NotFoundError('Target user not found');
    }

    const token = targetUser.generatePasswordResetToken();
    await this.userRepository.save(targetUser);

    // Publish event
    this.eventBus.publish(new PasswordResetTokenGeneratedEvent(
      targetUser.id,
      admin.id,
      targetUser.passwordResetExpiry!
    ));

    // Audit logging
    logger.info('Password reset token generated', {
      adminUserId: admin.id,
      adminUsername: admin.username,
      targetUserId: targetUser.id,
      targetUsername: targetUser.username,
      expiresAt: targetUser.passwordResetExpiry?.toISOString(),
      timestamp: new Date().toISOString()
    });

    // Environment-configurable base URL for deployment flexibility
    const baseUrl = process.env.RESET_PASSWORD_BASE_URL || 'http://localhost:3000/reset-password';
    return `${baseUrl}?token=${token}`;
  }
}

/**
 * Command: User resets password with token
 */
export interface ResetPasswordWithTokenCommand {
  token: string;
  newPassword: string;
}

export class ResetPasswordWithTokenCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private eventBus: EventBus,
    private refreshTokenRepository: RefreshTokenRepository,
    private userSessionRepository: UserSessionRepository
  ) {}

  async execute(command: ResetPasswordWithTokenCommand): Promise<void> {
    const user = await this.userRepository.findByPasswordResetToken(command.token);
    if (!user) {
      throw new ValidationError('Invalid or expired password reset token');
    }

    user.resetPasswordWithToken(command.token, command.newPassword);
    await this.userRepository.save(user);

    const revokedTokens = await this.refreshTokenRepository.revokeAllForUser(user.id);
    const revokedSessions = await this.userSessionRepository.revokeAllSessions(user.id);

    // Publish event
    this.eventBus.publish(new PasswordResetCompletedEvent(user.id));

    logger.info('Password reset completed with token', {
      userId: user.id,
      username: user.username,
      revokedRefreshTokens: revokedTokens,
      revokedSessions: revokedSessions,
      timestamp: new Date().toISOString()
    });
  }
}
