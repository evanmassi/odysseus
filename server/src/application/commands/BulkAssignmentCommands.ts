/**
 * Bulk Assignment CQRS Commands
 *
 * Batch operations for resource assignment management.
 * Used when deactivating users or reassigning all their resources.
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

/**
 * Bulk Unassign Resources Command Handler
 *
 * Unassigns all resources (racks and boxes) from a user.
 * Used when deactivating a user to clear their assignments.
 * Emits BulkResourcesUnassignedEvent for real-time sync.
 */
export class BulkUnassignResourcesCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: BulkUnassignResourcesCommand): Promise<{ racksAffected: number; boxesAffected: number }> {
    // Get current configuration
    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    // Get and validate acting user
    const user = await this.getUserById(command.userId);

    // Check admin permission
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('bulk unassign resources', command.userId);
    }

    // Validate from user exists
    const fromUser = await this.userRepository.findById(command.fromUserId);
    if (!fromUser) {
      throw new NotFoundError(`User '${command.fromUserId}' not found`);
    }

    // Count affected resources before clearing
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

    // If no resources affected, return early
    if (racksAffected === 0 && boxesAffected === 0) {
      return { racksAffected: 0, boxesAffected: 0 };
    }

    // Clear assignments using domain method
    currentConfig.clearAllAssignmentsForUser(command.fromUserId);

    // Save configuration
    await this.configurationRepository.save(currentConfig);

    // Emit domain event
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

/**
 * Bulk Reassign Resources Command Handler
 *
 * Reassigns all resources (racks and boxes) from one user to another.
 * Used when transferring a user's resources to another researcher.
 * Emits BulkResourcesReassignedEvent for real-time sync.
 */
export class BulkReassignResourcesCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: BulkReassignResourcesCommand): Promise<{ racksAffected: number; boxesAffected: number }> {
    // Validate not reassigning to same user
    if (command.fromUserId === command.toUserId) {
      throw new ValidationError('Cannot reassign resources to the same user');
    }

    // Get current configuration
    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    // Get and validate acting user
    const user = await this.getUserById(command.userId);

    // Check admin permission
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('bulk reassign resources', command.userId);
    }

    // Validate from user exists
    const fromUser = await this.userRepository.findById(command.fromUserId);
    if (!fromUser) {
      throw new NotFoundError(`User '${command.fromUserId}' not found`);
    }

    // Validate to user exists
    const toUser = await this.userRepository.findById(command.toUserId);
    if (!toUser) {
      throw new NotFoundError(`User '${command.toUserId}' not found`);
    }

    // Count and reassign resources
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

    // If no resources affected, return early
    if (racksAffected === 0 && boxesAffected === 0) {
      return { racksAffected: 0, boxesAffected: 0 };
    }

    // Update configuration
    currentConfig.updateFromData({
      tanks: configData.tanks,
      systemSettings: configData.systemSettings
    });

    // Save configuration
    await this.configurationRepository.save(currentConfig);

    // Emit domain event
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
