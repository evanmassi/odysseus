/**
 * Tank CQRS Commands
 *
 * Atomic operations for tank management with domain event emission.
 */

import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { TubeRepository } from '@domain/repositories/TubeRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { User } from '@domain/entities/User';
import { ValidationError } from '@domain/errors/ValidationError';
import { PermissionError } from '@domain/errors/PermissionError';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { EventBus } from '@application/contracts/EventBus';
import { generateId } from '@domain/utils/generateId';
import {
  TankAddedEvent,
  TankUpdatedEvent,
  TankDeletedEvent
} from '@domain/events/ConfigurationEvents';
import type { FieldChange } from '@domain/types/FieldChange';

// COMMAND INTERFACES

export interface AddTankCommand {
  userId: string;
  labId: string;
  name: string;
  location?: string;
}

export interface UpdateTankCommand {
  userId: string;
  labId: string;
  tankId: string;
  name?: string;
  location?: string;
  isActive?: boolean;
}

export interface DeleteTankCommand {
  userId: string;
  labId: string;
  tankId: string;
}

export interface ResetDemoDataCommand {
  userId: string;
  labId: string;
}

// COMMAND HANDLERS

/** Creates a new tank in the configuration. */
export class AddTankCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: AddTankCommand): Promise<{ tankId: string }> {
    const currentConfig = await this.configurationRepository.getForLab(command.labId);
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await this.getUserById(command.userId);
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('add tank', command.userId);
    }

    const tankId = generateId('tank');

    const expectedVersion = currentConfig.version;
    currentConfig.addTank(tankId, command.name);
    const newVersion = await this.configurationRepository.saveWithOptimisticLock(
      currentConfig,
      expectedVersion,
      `Added tank '${command.name}'`,
      command.userId,
      command.labId
    );
    currentConfig.applyPersistedVersion(newVersion);

    const event = new TankAddedEvent(
      command.userId,
      tankId,
      command.name
    );
    event.labId = command.labId;
    await this.eventBus.publish(event);

    return { tankId };
  }

  private async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError(`User not found: ${userId}`);
    }
    return user;
  }

}

/** Updates an existing tank's properties. */
export class UpdateTankCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: UpdateTankCommand): Promise<void> {
    const currentConfig = await this.configurationRepository.getForLab(command.labId);
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await this.getUserById(command.userId);
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('update tank', command.userId);
    }

    const tank = currentConfig.tanks.find(t => t.id === command.tankId);
    if (!tank) {
      throw new NotFoundError(`Tank '${command.tankId}' not found`);
    }

    const changes: FieldChange[] = [];
    const configData = currentConfig.toData();
    const tankIndex = configData.tanks.findIndex(t => t.id === command.tankId);

    if (command.name !== undefined && command.name !== tank.name) {
      changes.push({ field: 'name', oldValue: tank.name, newValue: command.name });
      configData.tanks[tankIndex].name = command.name;
    }

    if (command.location !== undefined && command.location !== tank.location) {
      changes.push({ field: 'location', oldValue: tank.location, newValue: command.location });
      configData.tanks[tankIndex].location = command.location;
    }

    if (command.isActive !== undefined && command.isActive !== tank.isActive) {
      changes.push({ field: 'isActive', oldValue: tank.isActive, newValue: command.isActive });
      configData.tanks[tankIndex].isActive = command.isActive;
    }

    if (changes.length === 0) {
      return;
    }

    const expectedVersion = currentConfig.version;
    currentConfig.updateFromData({
      tanks: configData.tanks,
      systemSettings: configData.systemSettings
    });

    const newVersion = await this.configurationRepository.saveWithOptimisticLock(
      currentConfig,
      expectedVersion,
      `Updated tank '${configData.tanks[tankIndex].name}'`,
      command.userId,
      command.labId
    );
    currentConfig.applyPersistedVersion(newVersion);

    const event = new TankUpdatedEvent(
      command.userId,
      command.tankId,
      configData.tanks[tankIndex].name,
      changes
    );
    event.labId = command.labId;
    await this.eventBus.publish(event);
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
 * Delete Tank Command Handler
 *
 * Removes a tank. Uses atomic check-and-delete to prevent TOCTOU race conditions
 * where tubes could be added between the emptiness check and the actual deletion.
 */
export class DeleteTankCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private tubeRepository: TubeRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: DeleteTankCommand): Promise<void> {
    const user = await this.getUserById(command.userId);
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('delete tank', command.userId);
    }

    // Atomic delete: tube check and configuration update in same SERIALIZABLE transaction
    const { tankName } = await this.configurationRepository.deleteEmptyTank(
      command.labId,
      command.tankId,
      command.userId
    );

    const event = new TankDeletedEvent(
      command.userId,
      command.tankId,
      tankName
    );
    event.labId = command.labId;
    await this.eventBus.publish(event);
  }

  private async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError(`User not found: ${userId}`);
    }
    return user;
  }
}

/** Deletes all tubes in the lab (used for demo lab reset). */
export class ResetDemoDataCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private tubeRepository: TubeRepository,
    private userRepository: UserRepository
  ) {}

  async handle(command: ResetDemoDataCommand): Promise<{ deletedTubes: number }> {
    const user = await this.getUserById(command.userId);
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('reset demo data', command.userId);
    }

    const currentConfig = await this.configurationRepository.getForLab(command.labId);
    if (!currentConfig) {
      throw new ValidationError('No configuration found.');
    }

    const allTankIds = currentConfig.tanks.map(t => t.id);

    if (allTankIds.length === 0) {
      return { deletedTubes: 0 };
    }

    const deletedTubes = await this.tubeRepository.deleteByTankIds(allTankIds, command.labId);
    return { deletedTubes };
  }

  private async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError(`User not found: ${userId}`);
    }
    return user;
  }
}
