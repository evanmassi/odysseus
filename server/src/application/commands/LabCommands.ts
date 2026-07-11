/**
 * Lab CQRS Commands
 *
 * System admin operations for lab tenant management.
 */

import type { EventBus } from '@application/contracts/EventBus';
import { requireSystemAdmin } from '@application/guards/UserGuards';
import { Lab } from '@domain/entities/Lab';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { ValidationError } from '@domain/errors/ValidationError';
import { LabCreatedEvent, LabRenamedEvent, LabActivatedEvent, LabDeactivatedEvent } from '@domain/events/LabEvents';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { UserSessionRepository } from '@domain/repositories/UserSessionRepository';

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

export class CreateLabCommandHandler {
  constructor(
    private labRepository: LabRepository,
    private storageRepository: StorageRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: CreateLabCommand): Promise<Lab> {
    await requireSystemAdmin(this.userRepository, command.userId);

    if (!command.name || command.name.trim().length === 0) {
      throw new ValidationError('Lab name is required');
    }

    const lab = command.isDemo ? Lab.createDemo(command.name) : Lab.create(command.name);

    const existingBySlug = await this.labRepository.findBySlug(lab.slug);
    if (existingBySlug) {
      throw new ValidationError(`A lab with a similar name already exists: '${existingBySlug.name}'`);
    }

    await this.labRepository.save(lab);
    await this.storageRepository.ensureDefaultForLab(lab.id);

    await this.eventBus.publish(new LabCreatedEvent(lab.id, lab.name));

    return lab;
  }
}

export class UpdateLabCommandHandler {
  constructor(
    private labRepository: LabRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: UpdateLabCommand): Promise<Lab> {
    await requireSystemAdmin(this.userRepository, command.userId);

    const lab = await this.labRepository.findById(command.labId);
    if (!lab) {
      throw NotFoundError.forEntity('Lab', command.labId);
    }

    if (lab.name === command.name) {
      return lab;
    }

    const oldName = lab.name;
    const newSlug = Lab.generateSlug(command.name);
    const existingBySlug = await this.labRepository.findBySlug(newSlug);
    if (existingBySlug && existingBySlug.id !== lab.id) {
      throw new ValidationError(`A lab with a similar name already exists: '${existingBySlug.name}'`);
    }

    lab.updateName(command.name);
    await this.labRepository.save(lab);

    await this.eventBus.publish(new LabRenamedEvent(command.labId, oldName, command.name, command.userId));

    return lab;
  }
}

export class DeactivateLabCommandHandler {
  constructor(
    private labRepository: LabRepository,
    private userRepository: UserRepository,
    private userSessionRepository: UserSessionRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: DeactivateLabCommand): Promise<void> {
    await requireSystemAdmin(this.userRepository, command.userId);

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

    await this.eventBus.publish(new LabDeactivatedEvent(command.labId, command.userId));
  }
}

export class ActivateLabCommandHandler {
  constructor(
    private labRepository: LabRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: ActivateLabCommand): Promise<void> {
    await requireSystemAdmin(this.userRepository, command.userId);

    const lab = await this.labRepository.findById(command.labId);
    if (!lab) {
      throw NotFoundError.forEntity('Lab', command.labId);
    }

    if (lab.isActive) {
      return;
    }

    lab.activate();
    await this.labRepository.save(lab);

    await this.eventBus.publish(new LabActivatedEvent(command.labId, command.userId));
  }
}
