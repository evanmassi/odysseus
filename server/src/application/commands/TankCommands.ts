/**
 * Tank CQRS Commands
 *
 * Atomic operations for tank management with domain event emission.
 */

import type { EventBus } from '@application/contracts/EventBus';
import { rejectIfSeeded, enforceAddTankLimit } from '@application/guards/DemoGuards';
import { requireUser } from '@application/guards/UserGuards';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';
import { ValidationError } from '@domain/errors/ValidationError';
import { TankAddedEvent, TankUpdatedEvent, TankDeletedEvent } from '@domain/events/StorageEvents';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { FieldChange } from '@domain/types/fieldChangeTypes';
import { generateId } from '@domain/utils/generateId';

// COMMAND INTERFACES

export interface AddTankCommand {
  userId: string;
  labId: string;
  name: string;
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

// COMMAND HANDLERS

export class AddTankCommandHandler {
  constructor(
    private storageRepository: StorageRepository,
    private labRepository: LabRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: AddTankCommand): Promise<{ tankId: string }> {
    const currentConfig = await this.storageRepository.getForLab(command.labId);
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await requireUser(this.userRepository, command.userId);
    if (!user.isAdmin()) {
      throw PermissionError.configurationManagement('add tank', command.userId);
    }

    const lab = await this.labRepository.findById(command.labId);
    if (lab) enforceAddTankLimit(user, currentConfig, lab);

    const tankId = generateId('tank');

    const expectedVersion = currentConfig.version;
    currentConfig.addTank(tankId, command.name);
    const newVersion = await this.storageRepository.saveWithOptimisticLock(
      command.labId,
      currentConfig,
      expectedVersion,
      `Added tank '${command.name}'`,
      command.userId
    );
    currentConfig.applyPersistedVersion(newVersion);

    const event = new TankAddedEvent(command.userId, tankId, command.name, command.labId);
    await this.eventBus.publish(event);

    return { tankId };
  }
}

export class UpdateTankCommandHandler {
  constructor(
    private storageRepository: StorageRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: UpdateTankCommand): Promise<void> {
    const currentConfig = await this.storageRepository.getForLab(command.labId);
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await requireUser(this.userRepository, command.userId);
    if (!user.isAdmin()) {
      throw PermissionError.configurationManagement('update tank', command.userId);
    }

    rejectIfSeeded(user, currentConfig, command.tankId);

    const tank = currentConfig.tanks.find(t => t.id === command.tankId);
    if (!tank) {
      throw new NotFoundError('The selected tank could not be found.');
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
      systemSettings: configData.systemSettings,
    });

    const newVersion = await this.storageRepository.saveWithOptimisticLock(
      command.labId,
      currentConfig,
      expectedVersion,
      `Updated tank '${configData.tanks[tankIndex].name}'`,
      command.userId
    );
    currentConfig.applyPersistedVersion(newVersion);

    const event = new TankUpdatedEvent(
      command.userId,
      command.tankId,
      configData.tanks[tankIndex].name,
      changes,
      command.labId
    );
    await this.eventBus.publish(event);
  }
}

/**
 * Uses atomic check-and-delete to prevent TOCTOU race conditions
 * where tubes could be added between the emptiness check and the actual deletion.
 */
export class DeleteTankCommandHandler {
  constructor(
    private storageRepository: StorageRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: DeleteTankCommand): Promise<void> {
    const user = await requireUser(this.userRepository, command.userId);
    if (!user.isAdmin()) {
      throw PermissionError.configurationManagement('delete tank', command.userId);
    }

    const currentConfig = await this.storageRepository.getForLab(command.labId);
    if (currentConfig) rejectIfSeeded(user, currentConfig, command.tankId);

    // Atomic delete: tube check and configuration update in same SERIALIZABLE transaction
    const { tankName } = await this.storageRepository.deleteEmptyTank(
      command.labId,
      command.tankId,
      command.userId
    );

    const event = new TankDeletedEvent(command.userId, command.tankId, tankName, command.labId);
    await this.eventBus.publish(event);
  }
}
