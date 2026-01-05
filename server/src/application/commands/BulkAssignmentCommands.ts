/**
 * Bulk Assignment CQRS Commands
 *
 * Batch operations for clearing or transferring user resource assignments.
 */

import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { User } from '@domain/entities/User';
import { ValidationError } from '@domain/errors/ValidationError';
import { PermissionError } from '@domain/errors/PermissionError';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { EventBus } from '@application/contracts/EventBus';
import {
  BulkResourcesUnassignedEvent,
  BulkResourcesReassignedEvent
} from '@domain/events/ConfigurationEvents';

// COMMAND INTERFACES

export interface BulkUnassignResourcesCommand {
  userId: string;
  fromUserId: string;
}

export interface BulkReassignResourcesCommand {
  userId: string;
  fromUserId: string;
  toUserId: string;
}

// COMMAND HANDLERS

/** Unassigns all resources (racks and boxes) from a user. */
export class BulkUnassignResourcesCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: BulkUnassignResourcesCommand): Promise<{ racksAffected: number; boxesAffected: number }> {
    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await this.getUserById(command.userId);
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('bulk unassign resources', command.userId);
    }

    const fromUser = await this.userRepository.findById(command.fromUserId);
    if (!fromUser) {
      throw new NotFoundError(`User '${command.fromUserId}' not found`);
    }

    const configData = currentConfig.toData();
    let racksAffected = 0;
    let boxesAffected = 0;

    for (const tank of configData.tanks) {
      for (const rack of tank.racks) {
        if (rack.assignedUserId === command.fromUserId) {
          racksAffected++;
        }
        for (const box of rack.boxes) {
          if (box.assignedUserId === command.fromUserId) {
            boxesAffected++;
          }
        }
      }
    }

    if (racksAffected === 0 && boxesAffected === 0) {
      return { racksAffected: 0, boxesAffected: 0 };
    }

    currentConfig.clearAllAssignmentsForUser(command.fromUserId);
    await this.configurationRepository.save(currentConfig);

    await this.eventBus.publish(new BulkResourcesUnassignedEvent(
      command.userId,
      command.fromUserId,
      fromUser.username,
      racksAffected,
      boxesAffected
    ));

    return { racksAffected, boxesAffected };
  }

  private async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError(`User not found: ${userId}`);
    }
    return user;
  }
}

/** Reassigns all resources (racks and boxes) from one user to another. */
export class BulkReassignResourcesCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: BulkReassignResourcesCommand): Promise<{ racksAffected: number; boxesAffected: number }> {
    if (command.fromUserId === command.toUserId) {
      throw new ValidationError('Cannot reassign resources to the same user');
    }

    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await this.getUserById(command.userId);
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('bulk reassign resources', command.userId);
    }

    const fromUser = await this.userRepository.findById(command.fromUserId);
    if (!fromUser) {
      throw new NotFoundError(`User '${command.fromUserId}' not found`);
    }

    const toUser = await this.userRepository.findById(command.toUserId);
    if (!toUser) {
      throw new NotFoundError(`User '${command.toUserId}' not found`);
    }

    const configData = currentConfig.toData();
    let racksAffected = 0;
    let boxesAffected = 0;

    for (const tank of configData.tanks) {
      for (const rack of tank.racks) {
        if (rack.assignedUserId === command.fromUserId) {
          rack.assignedUserId = command.toUserId;
          racksAffected++;
        }
        for (const box of rack.boxes) {
          if (box.assignedUserId === command.fromUserId) {
            box.assignedUserId = command.toUserId;
            boxesAffected++;
          }
        }
      }
    }

    if (racksAffected === 0 && boxesAffected === 0) {
      return { racksAffected: 0, boxesAffected: 0 };
    }

    currentConfig.updateFromData({
      tanks: configData.tanks,
      systemSettings: configData.systemSettings
    });

    await this.configurationRepository.save(currentConfig);

    await this.eventBus.publish(new BulkResourcesReassignedEvent(
      command.userId,
      command.fromUserId,
      fromUser.username,
      command.toUserId,
      toUser.username,
      racksAffected,
      boxesAffected
    ));

    return { racksAffected, boxesAffected };
  }

  private async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError(`User not found: ${userId}`);
    }
    return user;
  }
}
