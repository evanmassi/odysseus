/**
 * Tank CQRS Commands
 *
 * Atomic operations for tank management. Each command performs a single
 * operation and emits appropriate domain events for real-time sync.
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

/**
 * Add Tank Command Handler
 *
 * Creates a new tank in the configuration.
 * Emits TankAddedEvent for real-time sync.
 */
export class AddTankCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: AddTankCommand): Promise<{ tankId: string }> {
    // Get current configuration
    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    // Get and validate user
    const user = await this.getUserById(command.userId);

    // Check admin permission (only admins can add tanks)
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('add tank', command.userId);
    }

    // Generate tank ID based on existing tanks
    const existingTankIds = currentConfig.tanks.map(t => t.id);
    const tankId = this.generateTankId(existingTankIds);

    // Add tank using domain method
    currentConfig.addTank(tankId, command.name);

    // Save configuration
    await this.configurationRepository.save(currentConfig);

    // Emit domain event
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
    // Find the highest numeric suffix and increment
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

/**
 * Update Tank Command Handler
 *
 * Updates an existing tank's properties.
 * Emits TankUpdatedEvent for real-time sync.
 */
export class UpdateTankCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: UpdateTankCommand): Promise<void> {
    // Get current configuration
    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    // Get and validate user
    const user = await this.getUserById(command.userId);

    // Check admin permission
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('update tank', command.userId);
    }

    // Find tank
    const tank = currentConfig.tanks.find(t => t.id === command.tankId);
    if (!tank) {
      throw new NotFoundError(`Tank '${command.tankId}' not found`);
    }

    // Track changes for event
    const changes: { field: string; oldValue: any; newValue: any }[] = [];

    // Build updated tank data
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

    // Only update if there are changes
    if (changes.length === 0) {
      return; // No changes, skip update
    }

    // Update configuration using domain method
    currentConfig.updateFromData({
      tanks: configData.tanks,
      systemSettings: configData.systemSettings
    });

    // Save configuration
    await this.configurationRepository.save(currentConfig);

    // Emit domain event
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
 * Removes a tank and all its contents (racks, boxes).
 * BLOCKS deletion if any tubes exist in the tank.
 * Emits TankDeletedEvent for real-time sync.
 */
export class DeleteTankCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private tubeRepository: TubeRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: DeleteTankCommand): Promise<void> {
    // Get current configuration
    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    // Get and validate user
    const user = await this.getUserById(command.userId);

    // Check admin permission
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('delete tank', command.userId);
    }

    // Find tank
    const tank = currentConfig.tanks.find(t => t.id === command.tankId);
    if (!tank) {
      throw new NotFoundError(`Tank '${command.tankId}' not found`);
    }

    // Check for tubes in this tank (BLOCK deletion if tubes exist)
    const tubesInTank = await this.tubeRepository.findByTank(command.tankId);
    if (tubesInTank.length > 0) {
      throw new ValidationError(
        `Cannot delete tank: ${tubesInTank.length} tube(s) are stored in this location. ` +
        `Move or delete the tubes first.`
      );
    }

    const tankName = tank.name;

    // Remove tank using domain method
    currentConfig.removeTank(command.tankId);

    // Save configuration
    await this.configurationRepository.save(currentConfig);

    // Emit domain event
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
