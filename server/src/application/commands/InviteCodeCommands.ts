/**
 * Invite Code CQRS Commands
 *
 * Manages invite code lifecycle for lab registration.
 */

import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { InviteCodeRepository } from '@domain/repositories/InviteCodeRepository';
import { LabRepository } from '@domain/repositories/LabRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { InviteCode } from '@domain/entities/InviteCode';
import { User } from '@domain/entities/User';
import { ValidationError } from '@domain/errors/ValidationError';
import { PermissionError } from '@domain/errors/PermissionError';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { EventBus } from '@application/contracts/EventBus';
import { InviteCodeCreatedEvent } from '@domain/events/LabEvents';

// COMMAND INTERFACES

export interface CreateInviteCodeCommand {
  userId: string;
  labId: string;
  role?: 'lab_admin' | 'user';
  maxUses?: number;
  expiresAt?: string;
}

export interface DeactivateInviteCodeCommand {
  userId: string;
  codeId: string;
}

export interface ValidateInviteCodeQuery {
  code: string;
}

// COMMAND HANDLERS

export class CreateInviteCodeCommandHandler {
  constructor(
    private inviteCodeRepository: InviteCodeRepository,
    private labRepository: LabRepository,
    private userRepository: UserRepository,
    private configurationRepository: ConfigurationRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: CreateInviteCodeCommand): Promise<{ code: string; id: string }> {
    const user = await this.getUser(command.userId);

    const role = command.role ?? 'user';

    if (user.isSystemAdmin()) {
      // System admin can create codes for any lab with any role
    } else if (user.isLabAdmin()) {
      if (user.labId !== command.labId) {
        throw new PermissionError('Lab admins can only create invite codes for their own lab', { userId: command.userId });
      }
      if (role === 'lab_admin') {
        throw new PermissionError('Only system admins can create lab_admin invite codes', { userId: command.userId });
      }
    } else {
      throw new PermissionError('Only admins can create invite codes', { userId: command.userId });
    }

    const lab = await this.labRepository.findById(command.labId);
    if (!lab) {
      throw NotFoundError.forEntity('Lab', command.labId);
    }
    if (!lab.isActive) {
      throw new ValidationError('Cannot create invite codes for an inactive lab');
    }

    // Seeded demo labs are locked — only system admins can create codes
    if (lab.isDemo && !user.isSystemAdmin()) {
      const config = await this.configurationRepository.getForLab(command.labId);
      if (config?.hasAnySeededResources()) {
        throw new ValidationError('Cannot create invite codes for a seeded demo lab');
      }
    }

    const expiresAt = command.expiresAt ? new Date(command.expiresAt) : undefined;
    if (expiresAt && expiresAt <= new Date()) {
      throw new ValidationError('Expiry date must be in the future');
    }

    const inviteCode = InviteCode.create(
      command.labId,
      command.userId,
      role,
      command.maxUses,
      expiresAt
    );

    await this.inviteCodeRepository.save(inviteCode);

    await this.eventBus.publish(new InviteCodeCreatedEvent(
      inviteCode.id,
      inviteCode.labId,
      command.userId
    ));

    return { code: inviteCode.code, id: inviteCode.id };
  }

  private async getUser(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError(`User not found: ${userId}`);
    }
    return user;
  }
}

export class DeactivateInviteCodeCommandHandler {
  constructor(
    private inviteCodeRepository: InviteCodeRepository,
    private userRepository: UserRepository
  ) {}

  async handle(command: DeactivateInviteCodeCommand): Promise<void> {
    const user = await this.getUser(command.userId);

    const inviteCode = await this.inviteCodeRepository.findById(command.codeId);
    if (!inviteCode) {
      throw NotFoundError.forEntity('InviteCode', command.codeId);
    }

    if (user.isSystemAdmin()) {
      // System admin can deactivate any code
    } else if (user.isLabAdmin()) {
      if (user.labId !== inviteCode.labId) {
        throw new PermissionError('Lab admins can only manage invite codes for their own lab', { userId: command.userId });
      }
    } else {
      throw new PermissionError('Only admins can manage invite codes', { userId: command.userId });
    }

    if (!inviteCode.isActive) {
      return;
    }

    inviteCode.deactivate();
    await this.inviteCodeRepository.save(inviteCode);
  }

  private async getUser(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError(`User not found: ${userId}`);
    }
    return user;
  }
}

/** Public query — validates an invite code for the registration flow. */
export class ValidateInviteCodeQueryHandler {
  constructor(
    private inviteCodeRepository: InviteCodeRepository,
    private labRepository: LabRepository
  ) {}

  async handle(query: ValidateInviteCodeQuery): Promise<{ valid: boolean; labName?: string; labId?: string }> {
    if (!query.code || query.code.trim().length === 0) {
      return { valid: false };
    }

    const inviteCode = await this.inviteCodeRepository.findByCode(query.code.trim().toUpperCase());
    if (!inviteCode || !inviteCode.isValid()) {
      return { valid: false };
    }

    const lab = await this.labRepository.findById(inviteCode.labId);
    if (!lab || !lab.isActive) {
      return { valid: false };
    }

    return { valid: true, labName: lab.name, labId: lab.id };
  }
}
