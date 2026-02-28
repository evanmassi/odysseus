/**
 * Rack CQRS Commands
 *
 * Atomic operations for rack management with domain event emission.
 * Parent context (tankId) required since rackId is not globally unique.
 */

import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { TubeRepository } from '@domain/repositories/TubeRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { User } from '@domain/entities/User';
import { Box } from '@domain/valueObjects/Equipment';
import { ValidationError } from '@domain/errors/ValidationError';
import { PermissionError } from '@domain/errors/PermissionError';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { EventBus } from '@application/contracts/EventBus';
import { EQUIPMENT_DEFAULTS, NAMING_PATTERNS } from '@odysseus/shared-schemas';
import { generateId } from '@domain/utils/generateId';
import {
  RackAddedEvent,
  RackUpdatedEvent,
  RackDeletedEvent,
  RackAssignedEvent,
  RackUnassignedEvent,
  RackReassignedEvent
} from '@domain/events/ConfigurationEvents';
import type { FieldChange } from '@domain/types/FieldChange';

// COMMAND INTERFACES

export interface AddRacksCommand {
  userId: string;
  labId: string;
  tankId: string;
  count: number;
}

export interface UpdateRackCommand {
  userId: string;
  labId: string;
  tankId: string;
  rackId: string;
  name?: string;
  capacity?: number;
  isActive?: boolean;
}

export interface DeleteRackCommand {
  userId: string;
  labId: string;
  tankId: string;
  rackId: string;
}

export interface AssignRackCommand {
  userId: string;
  labId: string;
  tankId: string;
  rackId: string;
  assignedUserId: string | null;
}

// COMMAND HANDLERS

/** Creates one or more racks in a tank. Pass count > 1 for bulk add. */
export class AddRacksCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: AddRacksCommand): Promise<{ rackIds: string[] }> {
    if (command.count < 1 || command.count > 100) {
      throw new ValidationError('Count must be between 1 and 100');
    }

    const currentConfig = await this.configurationRepository.getForLab(command.labId);
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await this.getUserById(command.userId);
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('add rack', command.userId);
    }

    const tank = currentConfig.tanks.find(t => t.id === command.tankId);
    if (!tank) {
      throw new NotFoundError(`Tank '${command.tankId}' not found`);
    }

    const rackIds: string[] = [];
    const events: RackAddedEvent[] = [];

    for (let i = 0; i < command.count; i++) {
      const rackIdStr = generateId('rack');
      const rackName = NAMING_PATTERNS.RACK.DEFAULT_NAME(tank.racks.length + i + 1);

      const defaultBoxes: Box[] = [];
      for (let j = 0; j < EQUIPMENT_DEFAULTS.BOXES_PER_RACK; j++) {
        const boxName = NAMING_PATTERNS.BOX.LETTER_NAME(j);
        defaultBoxes.push(Box.create(
          boxName,
          { rows: EQUIPMENT_DEFAULTS.GRID_ROWS, cols: EQUIPMENT_DEFAULTS.GRID_COLS },
          EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX,
          undefined,
          true
        ));
      }

      currentConfig.addRack(command.tankId, rackIdStr, rackName, EQUIPMENT_DEFAULTS.BOXES_PER_RACK, defaultBoxes);

      rackIds.push(rackIdStr);
      events.push(new RackAddedEvent(
        command.userId,
        command.tankId,
        tank.name,
        rackIdStr,
        rackName
      ));
    }

    const expectedVersion = currentConfig.version;
    const newVersion = await this.configurationRepository.saveWithOptimisticLock(
      currentConfig,
      expectedVersion,
      `Added ${command.count} rack(s) to tank '${tank.name}'`,
      command.userId,
      command.labId
    );
    currentConfig.applyPersistedVersion(newVersion);

    for (const event of events) {
      event.labId = command.labId;
      await this.eventBus.publish(event);
    }

    return { rackIds };
  }

  private async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError(`User not found: ${userId}`);
    }
    return user;
  }
}

/** Updates an existing rack's properties. */
export class UpdateRackCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: UpdateRackCommand): Promise<void> {
    const currentConfig = await this.configurationRepository.getForLab(command.labId);
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await this.getUserById(command.userId);
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('update rack', command.userId);
    }

    const tank = currentConfig.tanks.find(t => t.id === command.tankId);
    if (!tank) {
      throw new NotFoundError(`Tank '${command.tankId}' not found`);
    }

    const rack = tank.racks.find(r => r.id === command.rackId);
    if (!rack) {
      throw new NotFoundError(`Rack '${command.rackId}' not found in tank '${command.tankId}'`);
    }

    const changes: FieldChange[] = [];
    const configData = currentConfig.toData();
    const tankIndex = configData.tanks.findIndex(t => t.id === command.tankId);
    const rackIndex = configData.tanks[tankIndex].racks.findIndex(r => r.id === command.rackId);

    if (command.name !== undefined && command.name !== rack.name) {
      changes.push({ field: 'name', oldValue: rack.name, newValue: command.name });
      configData.tanks[tankIndex].racks[rackIndex].name = command.name;
    }

    if (command.capacity !== undefined && command.capacity !== rack.capacity) {
      changes.push({ field: 'capacity', oldValue: rack.capacity, newValue: command.capacity });
      configData.tanks[tankIndex].racks[rackIndex].capacity = command.capacity;
      configData.tanks[tankIndex].racks[rackIndex].maxBoxes = command.capacity;
    }

    if (command.isActive !== undefined && command.isActive !== rack.isActive) {
      changes.push({ field: 'isActive', oldValue: rack.isActive, newValue: command.isActive });
      configData.tanks[tankIndex].racks[rackIndex].isActive = command.isActive;
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
      `Updated rack '${configData.tanks[tankIndex].racks[rackIndex].name}' in tank '${tank.name}'`,
      command.userId,
      command.labId
    );
    currentConfig.applyPersistedVersion(newVersion);

    const event = new RackUpdatedEvent(
      command.userId,
      command.tankId,
      tank.name,
      command.rackId,
      configData.tanks[tankIndex].racks[rackIndex].name,
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
 * Removes a rack and all its boxes. Uses atomic check-and-delete to prevent TOCTOU race
 * conditions where tubes could be added between the emptiness check and the actual deletion.
 */
export class DeleteRackCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private tubeRepository: TubeRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: DeleteRackCommand): Promise<void> {
    const user = await this.getUserById(command.userId);
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('delete rack', command.userId);
    }

    // Atomic delete: tube check and configuration update in same SERIALIZABLE transaction
    const { tankName, rackName } = await this.configurationRepository.deleteEmptyRack(
      command.labId,
      command.tankId,
      command.rackId,
      command.userId
    );

    const event = new RackDeletedEvent(
      command.userId,
      command.tankId,
      tankName,
      command.rackId,
      rackName
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

/** Assigns or unassigns a rack to/from a user. */
export class AssignRackCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: AssignRackCommand): Promise<void> {
    const currentConfig = await this.configurationRepository.getForLab(command.labId);
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await this.getUserById(command.userId);
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('assign rack', command.userId);
    }

    const tank = currentConfig.tanks.find(t => t.id === command.tankId);
    if (!tank) {
      throw new NotFoundError(`Tank '${command.tankId}' not found`);
    }

    const rack = tank.racks.find(r => r.id === command.rackId);
    if (!rack) {
      throw new NotFoundError(`Rack '${command.rackId}' not found in tank '${command.tankId}'`);
    }

    let assignedUser: User | null = null;
    if (command.assignedUserId) {
      assignedUser = await this.userRepository.findById(command.assignedUserId);
      if (!assignedUser) {
        throw new ValidationError(`User '${command.assignedUserId}' not found`);
      }
    }

    const previousUserId = rack.assignedUserId;
    const previousUsername = previousUserId
      ? (await this.userRepository.findById(previousUserId))?.username ?? 'Unknown'
      : '';

    if (previousUserId === command.assignedUserId) {
      return;
    }

    const configData = currentConfig.toData();
    const tankIndex = configData.tanks.findIndex(t => t.id === command.tankId);
    const rackIndex = configData.tanks[tankIndex].racks.findIndex(r => r.id === command.rackId);

    configData.tanks[tankIndex].racks[rackIndex].assignedUserId = command.assignedUserId ?? undefined;

    // Clear inherited box labels when unassigning
    if (!command.assignedUserId && previousUserId) {
      currentConfig.clearInheritedBoxLabelsForRack(command.tankId, command.rackId);
    }

    const expectedVersion = currentConfig.version;
    currentConfig.updateFromData({
      tanks: configData.tanks,
      systemSettings: configData.systemSettings
    });

    const action = command.assignedUserId
      ? (previousUserId ? 'Reassigned' : 'Assigned')
      : 'Unassigned';
    const newVersion = await this.configurationRepository.saveWithOptimisticLock(
      currentConfig,
      expectedVersion,
      `${action} rack '${rack.name}' in tank '${tank.name}'`,
      command.userId,
      command.labId
    );
    currentConfig.applyPersistedVersion(newVersion);

    if (command.assignedUserId && previousUserId) {
      const event = new RackReassignedEvent(
        command.userId,
        command.tankId,
        tank.name,
        command.rackId,
        rack.name,
        previousUserId,
        previousUsername,
        command.assignedUserId,
        assignedUser!.username
      );
      event.labId = command.labId;
      await this.eventBus.publish(event);
    } else if (command.assignedUserId) {
      const event = new RackAssignedEvent(
        command.userId,
        command.tankId,
        tank.name,
        command.rackId,
        rack.name,
        command.assignedUserId,
        assignedUser!.username
      );
      event.labId = command.labId;
      await this.eventBus.publish(event);
    } else {
      const event = new RackUnassignedEvent(
        command.userId,
        command.tankId,
        tank.name,
        command.rackId,
        rack.name,
        previousUserId!,
        previousUsername
      );
      event.labId = command.labId;
      await this.eventBus.publish(event);
    }
  }

  private async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError(`User not found: ${userId}`);
    }
    return user;
  }
}
