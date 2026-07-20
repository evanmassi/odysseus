/**
 * Bulk Assignment CQRS Commands
 *
 * Bulk operations for clearing or transferring user resource assignments.
 */

import type { EventBus } from '@application/contracts/EventBus';
import { requireUser } from '@application/guards/UserGuards';
import type { Storage } from '@domain/entities/Storage';
import type { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';
import { ValidationError } from '@domain/errors/ValidationError';
import {
  BulkResourcesUnassignedEvent,
  BulkResourcesReassignedEvent,
} from '@domain/events/StorageEvents';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';

// COMMAND INTERFACES

export interface BulkUnassignResourcesCommand {
  userId: string;
  labId: string;
  fromUserId: string;
}

export interface BulkReassignResourcesCommand {
  userId: string;
  labId: string;
  fromUserId: string;
  toUserId: string;
}

// COMMAND HANDLERS

/** Applies `apply` to every rack and box currently assigned to `fromUserId` (skipping seeded
    resources for demo users) and persists the config when anything changed. Returns counts. */
async function applyBulkAssignment(
  storageRepository: StorageRepository,
  currentConfig: Storage,
  user: User,
  command: { userId: string; labId: string; fromUserId: string },
  saveMessage: string,
  apply: (holder: { assignedUserId?: string | null }) => void
): Promise<{ racksAffected: number; boxesAffected: number }> {
  const configData = currentConfig.toData();
  let racksAffected = 0;
  let boxesAffected = 0;

  for (const tank of configData.tanks) {
    for (const rack of tank.racks) {
      if (rack.assignedUserId === command.fromUserId && !(user.isDemo && rack.isSeeded)) {
        apply(rack);
        racksAffected++;
      }
      for (const box of rack.boxes) {
        if (box.assignedUserId === command.fromUserId && !(user.isDemo && box.isSeeded)) {
          apply(box);
          boxesAffected++;
        }
      }
    }
  }

  if (racksAffected === 0 && boxesAffected === 0) {
    return { racksAffected: 0, boxesAffected: 0 };
  }

  const expectedVersion = currentConfig.version;
  currentConfig.updateFromData({
    tanks: configData.tanks,
    systemSettings: configData.systemSettings,
  });
  const newVersion = await storageRepository.saveWithOptimisticLock(
    command.labId,
    currentConfig,
    expectedVersion,
    saveMessage,
    command.userId
  );
  currentConfig.applyPersistedVersion(newVersion);

  return { racksAffected, boxesAffected };
}

/** Unassigns all resources (racks and boxes) from a user. */
export class BulkUnassignResourcesCommandHandler {
  constructor(
    private storageRepository: StorageRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(
    command: BulkUnassignResourcesCommand
  ): Promise<{ racksAffected: number; boxesAffected: number }> {
    const currentConfig = await this.storageRepository.getForLab(command.labId);
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await requireUser(this.userRepository, command.userId);
    if (!user.isAdmin()) {
      throw PermissionError.configurationManagement('bulk unassign resources', command.userId);
    }

    const fromUser = await this.userRepository.findById(command.fromUserId, command.labId);
    if (!fromUser) {
      throw new NotFoundError('The user you are reassigning from could not be found.');
    }

    const { racksAffected, boxesAffected } = await applyBulkAssignment(
      this.storageRepository,
      currentConfig,
      user,
      command,
      `Bulk unassigned all resources from user '${fromUser.username}'`,
      holder => {
        holder.assignedUserId = undefined;
      }
    );

    if (racksAffected === 0 && boxesAffected === 0) {
      return { racksAffected: 0, boxesAffected: 0 };
    }

    const event = new BulkResourcesUnassignedEvent(
      command.userId,
      command.fromUserId,
      fromUser.username,
      racksAffected,
      boxesAffected,
      command.labId
    );
    await this.eventBus.publish(event);

    return { racksAffected, boxesAffected };
  }
}

/** Reassigns all resources (racks and boxes) from one user to another. */
export class BulkReassignResourcesCommandHandler {
  constructor(
    private storageRepository: StorageRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(
    command: BulkReassignResourcesCommand
  ): Promise<{ racksAffected: number; boxesAffected: number }> {
    if (command.fromUserId === command.toUserId) {
      throw new ValidationError('Cannot reassign resources to the same user');
    }

    const currentConfig = await this.storageRepository.getForLab(command.labId);
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await requireUser(this.userRepository, command.userId);
    if (!user.isAdmin()) {
      throw PermissionError.configurationManagement('bulk reassign resources', command.userId);
    }

    const fromUser = await this.userRepository.findById(command.fromUserId, command.labId);
    if (!fromUser) {
      throw new NotFoundError('The user you are reassigning from could not be found.');
    }

    const toUser = await this.userRepository.findById(command.toUserId, command.labId);
    if (!toUser) {
      throw new NotFoundError('The user you are reassigning to could not be found.');
    }

    const { racksAffected, boxesAffected } = await applyBulkAssignment(
      this.storageRepository,
      currentConfig,
      user,
      command,
      `Bulk reassigned resources from '${fromUser.username}' to '${toUser.username}'`,
      holder => {
        holder.assignedUserId = command.toUserId;
      }
    );

    if (racksAffected === 0 && boxesAffected === 0) {
      return { racksAffected: 0, boxesAffected: 0 };
    }

    const event = new BulkResourcesReassignedEvent(
      command.userId,
      command.fromUserId,
      fromUser.username,
      command.toUserId,
      toUser.username,
      racksAffected,
      boxesAffected,
      command.labId
    );
    await this.eventBus.publish(event);

    return { racksAffected, boxesAffected };
  }
}
