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
import {
  TankAddedEvent,
  TankUpdatedEvent,
  TankDeletedEvent
} from '@domain/events/ConfigurationEvents';
import type { FieldChange } from '@domain/types/fieldChange';

// COMMAND INTERFACES

export interface AddTankCommand {
  userId: string;
  name: string;
  location?: string;
}

export interface UpdateTankCommand {
  userId: string;
  tankId: string;
  name?: string;
  location?: string;
  isActive?: boolean;
}

export interface DeleteTankCommand {
  userId: string;
  tankId: string;
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
    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await this.getUserById(command.userId);
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('add tank', command.userId);
    }

    const existingTankIds = currentConfig.tanks.map(t => t.id);
    const tankId = this.generateTankId(existingTankIds);

    currentConfig.addTank(tankId, command.name);
    await this.configurationRepository.save(currentConfig);

    await this.eventBus.publish(new TankAddedEvent(
      command.userId,
      tankId,
      command.name
    ));

    return { tankId };
  }

  private async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError(`User not found: ${userId}`);
    }
    return user;
  }

  private generateTankId(existingIds: string[]): string {
    let maxNum = 0;
    for (const id of existingIds) {
      const match = id.match(/tank-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return `tank-${maxNum + 1}`;
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
    const currentConfig = await this.configurationRepository.getCurrent();
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

    currentConfig.updateFromData({
      tanks: configData.tanks,
      systemSettings: configData.systemSettings
    });

    await this.configurationRepository.save(currentConfig);

    await this.eventBus.publish(new TankUpdatedEvent(
      command.userId,
      command.tankId,
      configData.tanks[tankIndex].name,
      changes
    ));
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
 * Removes a tank and all its contents. Blocks if tubes exist in the tank.
 */
export class DeleteTankCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private tubeRepository: TubeRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: DeleteTankCommand): Promise<void> {
    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await this.getUserById(command.userId);
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('delete tank', command.userId);
    }

    const tank = currentConfig.tanks.find(t => t.id === command.tankId);
    if (!tank) {
      throw new NotFoundError(`Tank '${command.tankId}' not found`);
    }

    const tubesInTank = await this.tubeRepository.findByTank(command.tankId);
    if (tubesInTank.length > 0) {
      throw new ValidationError(
        `Cannot delete tank: ${tubesInTank.length} tube(s) are stored in this location. ` +
        `Move or delete the tubes first.`
      );
    }

    const tankName = tank.name;
    currentConfig.removeTank(command.tankId);
    await this.configurationRepository.save(currentConfig);

    await this.eventBus.publish(new TankDeletedEvent(
      command.userId,
      command.tankId,
      tankName
    ));
  }

  private async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError(`User not found: ${userId}`);
    }
    return user;
  }
}
