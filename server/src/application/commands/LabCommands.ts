import type { EventBus } from '@application/contracts/EventBus';
import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import { requireSystemAdmin } from '@application/guards/UserGuards';
import { Lab } from '@domain/entities/Lab';
import type { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { ValidationError } from '@domain/errors/ValidationError';
import {
  LabCreatedEvent,
  LabRenamedEvent,
  LabActivatedEvent,
  LabDeactivatedEvent,
} from '@domain/events/LabEvents';
import type { AttributeRepository } from '@domain/repositories/AttributeRepository';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import { allocateUsername, usernameBaseOf } from '@domain/services/usernameAllocation';

import type { UsernameReassignment } from '@odysseus/shared-schemas';

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
    private attributeRepository: AttributeRepository,
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
      throw new ValidationError(
        `A lab with a similar name already exists: '${existingBySlug.name}'`
      );
    }

    await this.labRepository.save(lab);
    await this.storageRepository.ensureDefaultForLab(lab.id);
    await this.attributeRepository.ensureSystemDefinitionsForLab(lab.id);

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
      throw new ValidationError(
        `A lab with a similar name already exists: '${existingBySlug.name}'`
      );
    }

    lab.updateName(command.name);
    await this.labRepository.save(lab);

    await this.eventBus.publish(
      new LabRenamedEvent(command.labId, oldName, command.name, command.userId)
    );

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
    await Promise.all(labUsers.map(user => this.userSessionRepository.revokeAllSessions(user.id)));

    await this.eventBus.publish(new LabDeactivatedEvent(command.labId, command.userId));
  }
}

export class ActivateLabCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private unitOfWork: UnitOfWork,
    private eventBus: EventBus
  ) {}

  async handle(command: ActivateLabCommand): Promise<void> {
    await requireSystemAdmin(this.userRepository, command.userId);

    const usernameReassignments = await this.unitOfWork.withTransaction(async repos => {
      const lab = await repos.labs.findById(command.labId);
      if (!lab) {
        throw NotFoundError.forEntity('Lab', command.labId);
      }

      if (lab.isActive) {
        return undefined;
      }

      const labUsers = await repos.users.findByLabId(command.labId);
      const reassignments = await reassignUsernamesTakenByActiveLabs(labUsers, repos.users);

      lab.activate();
      await repos.labs.save(lab);

      return reassignments;
    });

    if (!usernameReassignments) {
      return;
    }

    await this.eventBus.publish(
      new LabActivatedEvent(command.labId, command.userId, usernameReassignments)
    );
  }
}

async function reassignUsernamesTakenByActiveLabs(
  labUsers: User[],
  userRepository: UserRepository
): Promise<UsernameReassignment[]> {
  const labUsernames = new Set(labUsers.map(user => user.username));
  const isTaken = async (candidate: string): Promise<boolean> =>
    labUsernames.has(candidate) || userRepository.usernameExistsInActiveLabs(candidate);

  const reassignments: UsernameReassignment[] = [];
  for (const user of labUsers) {
    if (!(await userRepository.usernameExistsInActiveLabs(user.username))) {
      continue;
    }

    const from = user.username;
    const to = await allocateUsername(usernameBaseOf(from), isTaken);
    user.reassignUsername(to);
    await userRepository.save(user);
    labUsernames.add(to);
    reassignments.push({ from, to });
  }

  return reassignments;
}
