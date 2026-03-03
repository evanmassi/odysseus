/**
 * Lab CQRS Commands
 *
 * System admin operations for lab tenant management.
 */

import { LabRepository } from '@domain/repositories/LabRepository';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import { Lab } from '@domain/entities/Lab';
import { User } from '@domain/entities/User';
import { ValidationError } from '@domain/errors/ValidationError';
import { PermissionError } from '@domain/errors/PermissionError';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { EventBus } from '@application/contracts/EventBus';
import { LabCreatedEvent } from '@domain/events/LabEvents';

// COMMAND INTERFACES

export interface CreateLabCommand {
  userId: string;
  name: string;
  isDemo?: boolean;
}

export interface UpdateLabCommand {
  userId: string;
  labId: string;
  name: string;
}

export interface DeactivateLabCommand {
  userId: string;
  labId: string;
}

export interface ActivateLabCommand {
  userId: string;
  labId: string;
}

// COMMAND HANDLERS

export class CreateLabCommandHandler {
  constructor(
    private labRepository: LabRepository,
    private configurationRepository: ConfigurationRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: CreateLabCommand): Promise<{ labId: string }> {
    const user = await this.requireSystemAdmin(command.userId);

    if (!command.name || command.name.trim().length === 0) {
      throw new ValidationError('Lab name is required');
    }

    const lab = command.isDemo ? Lab.createDemo(command.name) : Lab.create(command.name);

    const existingBySlug = await this.labRepository.findBySlug(lab.slug);
    if (existingBySlug) {
      throw new ValidationError(`A lab with a similar name already exists: '${existingBySlug.name}'`);
    }

    await this.labRepository.save(lab);
    await this.configurationRepository.ensureDefaultForLab(lab.id);

    await this.eventBus.publish(new LabCreatedEvent(lab.id, lab.name));

    return { labId: lab.id };
  }

  private async requireSystemAdmin(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError(`User not found: ${userId}`);
    }
    if (!user.isSystemAdmin()) {
      throw new PermissionError('Only system admins can manage labs', { userId });
    }
    return user;
  }
}

export class UpdateLabCommandHandler {
  constructor(
    private labRepository: LabRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: UpdateLabCommand): Promise<void> {
    await this.requireSystemAdmin(command.userId);

    const lab = await this.labRepository.findById(command.labId);
    if (!lab) {
      throw NotFoundError.forEntity('Lab', command.labId);
    }

    if (!command.name || command.name.trim().length === 0) {
      throw new ValidationError('Lab name is required');
    }

    if (lab.name === command.name) {
      return;
    }

    const newSlug = command.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const existingBySlug = await this.labRepository.findBySlug(newSlug);
    if (existingBySlug && existingBySlug.id !== lab.id) {
      throw new ValidationError(`A lab with a similar name already exists: '${existingBySlug.name}'`);
    }

    lab.updateName(command.name);
    await this.labRepository.save(lab);
  }

  private async requireSystemAdmin(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError(`User not found: ${userId}`);
    }
    if (!user.isSystemAdmin()) {
      throw new PermissionError('Only system admins can manage labs', { userId });
    }
    return user;
  }
}

export class DeactivateLabCommandHandler {
  constructor(
    private labRepository: LabRepository,
    private userRepository: UserRepository,
    private userSessionRepository: UserSessionRepository
  ) {}

  async handle(command: DeactivateLabCommand): Promise<void> {
    await this.requireSystemAdmin(command.userId);

    const lab = await this.labRepository.findById(command.labId);
    if (!lab) {
      throw NotFoundError.forEntity('Lab', command.labId);
    }

    if (!lab.isActive) {
      return;
    }

    lab.deactivate();
    await this.labRepository.save(lab);

    const labUsers = await this.userRepository.findByLabId(command.labId);
    await Promise.all(
      labUsers.map(user => this.userSessionRepository.revokeAllSessions(user.id))
    );
  }

  private async requireSystemAdmin(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError(`User not found: ${userId}`);
    }
    if (!user.isSystemAdmin()) {
      throw new PermissionError('Only system admins can manage labs', { userId });
    }
    return user;
  }
}

export class ActivateLabCommandHandler {
  constructor(
    private labRepository: LabRepository,
    private userRepository: UserRepository
  ) {}

  async handle(command: ActivateLabCommand): Promise<void> {
    await this.requireSystemAdmin(command.userId);

    const lab = await this.labRepository.findById(command.labId);
    if (!lab) {
      throw NotFoundError.forEntity('Lab', command.labId);
    }

    if (lab.isActive) {
      return;
    }

    lab.activate();
    await this.labRepository.save(lab);
  }

  private async requireSystemAdmin(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError(`User not found: ${userId}`);
    }
    if (!user.isSystemAdmin()) {
      throw new PermissionError('Only system admins can manage labs', { userId });
    }
    return user;
  }
}
