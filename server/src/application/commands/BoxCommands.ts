/**
 * Box CQRS Commands
 *
 * Atomic operations for box management with domain event emission.
 * Full parent context (tankId + rackId) required since boxId is not globally unique.
 */

import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { TubeRepository } from '@domain/repositories/TubeRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { User } from '@domain/entities/User';
import { ValidationError } from '@domain/errors/ValidationError';
import { PermissionError } from '@domain/errors/PermissionError';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { EventBus } from '@application/contracts/EventBus';
import { EQUIPMENT_DEFAULTS, NAMING_PATTERNS } from '@odysseus/shared-schemas';
import type { PositionDisplayConfig } from '@odysseus/shared-schemas';
import {
  BoxAddedEvent,
  BoxUpdatedEvent,
  BoxDeletedEvent,
  BoxAssignedEvent,
  BoxUnassignedEvent,
  BoxReassignedEvent
} from '@domain/events/ConfigurationEvents';
import type { FieldChange } from '@domain/types/fieldChange';

// COMMAND INTERFACES

export interface AddBoxesCommand {
  userId: string;
  tankId: string;
  rackId: string;
  count: number;
}

export interface UpdateBoxCommand {
  userId: string;
  tankId: string;
  rackId: string;
  boxId: string;
  name?: string;
  gridConfig?: { rows: number; cols: number };
  positionDisplay?: PositionDisplayConfig | null;
  isActive?: boolean;
}

export interface DeleteBoxCommand {
  userId: string;
  tankId: string;
  rackId: string;
  boxId: string;
}

export interface AssignBoxCommand {
  userId: string;
  tankId: string;
  rackId: string;
  boxId: string;
  assignedUserId: string | null; // null = unassign
}

// COMMAND HANDLERS

/** Creates one or more boxes in a rack. Pass count > 1 for bulk add. */
export class AddBoxesCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: AddBoxesCommand): Promise<{ boxIds: string[] }> {
    if (command.count < 1 || command.count > 26) {
      throw new ValidationError('Count must be between 1 and 26 (A-Z)');
    }

    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await this.getUserById(command.userId);
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('add box', command.userId);
    }

    const tank = currentConfig.tanks.find(t => t.id === command.tankId);
    if (!tank) {
      throw new NotFoundError(`Tank '${command.tankId}' not found`);
    }

    const rack = tank.racks.find(r => r.id === command.rackId);
    if (!rack) {
      throw new NotFoundError(`Rack '${command.rackId}' not found in tank '${command.tankId}'`);
    }

    const existingBoxNames = new Set(rack.boxes.map(b => b.name.toUpperCase()));
    const boxIds: string[] = [];
    const events: BoxAddedEvent[] = [];

    let letterIndex = 0;
    for (let i = 0; i < command.count; i++) {
      while (letterIndex < 26 && existingBoxNames.has(NAMING_PATTERNS.BOX.LETTER_NAME(letterIndex))) {
        letterIndex++;
      }

      if (letterIndex >= 26) {
        throw new ValidationError('Cannot add more boxes: maximum 26 boxes (A-Z) per rack');
      }

      const boxName = NAMING_PATTERNS.BOX.LETTER_NAME(letterIndex);
      existingBoxNames.add(boxName);

      currentConfig.addBox(
        command.tankId,
        command.rackId,
        boxName,
        { rows: EQUIPMENT_DEFAULTS.GRID_ROWS, cols: EQUIPMENT_DEFAULTS.GRID_COLS }
      );

      boxIds.push(boxName);
      events.push(new BoxAddedEvent(
        command.userId,
        command.tankId,
        tank.name,
        command.rackId,
        rack.name,
        boxName,
        boxName
      ));

      letterIndex++;
    }

    await this.configurationRepository.save(currentConfig);

    for (const event of events) {
      await this.eventBus.publish(event);
    }

    return { boxIds };
  }

  private async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError(`User not found: ${userId}`);
    }
    return user;
  }
}

/** Updates an existing box's properties. */
export class UpdateBoxCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: UpdateBoxCommand): Promise<void> {
    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await this.getUserById(command.userId);
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('update box', command.userId);
    }

    const tank = currentConfig.tanks.find(t => t.id === command.tankId);
    if (!tank) {
      throw new NotFoundError(`Tank '${command.tankId}' not found`);
    }

    const rack = tank.racks.find(r => r.id === command.rackId);
    if (!rack) {
      throw new NotFoundError(`Rack '${command.rackId}' not found in tank '${command.tankId}'`);
    }

    const boxIdUpper = command.boxId.toUpperCase();
    const box = rack.boxes.find(b => b.name === boxIdUpper);
    if (!box) {
      throw new NotFoundError(`Box '${command.boxId}' not found in rack '${command.rackId}'`);
    }

    const changes: FieldChange[] = [];
    const configData = currentConfig.toData();
    const tankIndex = configData.tanks.findIndex(t => t.id === command.tankId);
    const rackIndex = configData.tanks[tankIndex].racks.findIndex(r => r.id === command.rackId);
    const boxIndex = configData.tanks[tankIndex].racks[rackIndex].boxes.findIndex(
      b => b.name === boxIdUpper
    );

    const boxData = configData.tanks[tankIndex].racks[rackIndex].boxes[boxIndex];

    if (command.name !== undefined && command.name !== box.name) {
      changes.push({ field: 'name', oldValue: box.name, newValue: command.name });
      boxData.name = command.name.toUpperCase();
    }

    if (command.gridConfig !== undefined) {
      const oldConfig = box.gridConfig;
      if (command.gridConfig.rows !== oldConfig.rows || command.gridConfig.cols !== oldConfig.cols) {
        changes.push({ field: 'gridConfig', oldValue: oldConfig, newValue: command.gridConfig });
        boxData.gridConfig = command.gridConfig;
        boxData.maxPositions = command.gridConfig.rows * command.gridConfig.cols;
      }
    }

    if (command.positionDisplay !== undefined) {
      const oldDisplay = box.positionDisplay;
      changes.push({ field: 'positionDisplay', oldValue: oldDisplay, newValue: command.positionDisplay });
      boxData.positionDisplay = command.positionDisplay === null ? undefined : command.positionDisplay;
    }

    if (command.isActive !== undefined && command.isActive !== box.isActive) {
      changes.push({ field: 'isActive', oldValue: box.isActive, newValue: command.isActive });
      boxData.isActive = command.isActive;
    }

    if (changes.length === 0) {
      return;
    }

    currentConfig.updateFromData({
      tanks: configData.tanks,
      systemSettings: configData.systemSettings
    });

    await this.configurationRepository.save(currentConfig);

    await this.eventBus.publish(new BoxUpdatedEvent(
      command.userId,
      command.tankId,
      tank.name,
      command.rackId,
      rack.name,
      boxIdUpper,
      boxData.name,
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

/** Removes a box from a rack. Blocks if tubes exist. */
export class DeleteBoxCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private tubeRepository: TubeRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: DeleteBoxCommand): Promise<void> {
    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await this.getUserById(command.userId);
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('delete box', command.userId);
    }

    const tank = currentConfig.tanks.find(t => t.id === command.tankId);
    if (!tank) {
      throw new NotFoundError(`Tank '${command.tankId}' not found`);
    }

    const rack = tank.racks.find(r => r.id === command.rackId);
    if (!rack) {
      throw new NotFoundError(`Rack '${command.rackId}' not found in tank '${command.tankId}'`);
    }

    const boxIdUpper = command.boxId.toUpperCase();
    const box = rack.boxes.find(b => b.name === boxIdUpper);
    if (!box) {
      throw new NotFoundError(`Box '${command.boxId}' not found in rack '${command.rackId}'`);
    }

    const tubesInBox = await this.tubeRepository.findByCompleteLocation(
      command.tankId,
      command.rackId,
      boxIdUpper
    );
    if (tubesInBox.length > 0) {
      throw new ValidationError(
        `Cannot delete box: ${tubesInBox.length} tube(s) are stored in this location. ` +
        `Move or delete the tubes first.`
      );
    }

    const boxName = box.name;
    const configData = currentConfig.toData();
    const tankIndex = configData.tanks.findIndex(t => t.id === command.tankId);
    const rackIndex = configData.tanks[tankIndex].racks.findIndex(r => r.id === command.rackId);
    configData.tanks[tankIndex].racks[rackIndex].boxes = configData.tanks[tankIndex].racks[rackIndex].boxes.filter(
      b => b.name !== boxIdUpper
    );

    currentConfig.updateFromData({
      tanks: configData.tanks,
      systemSettings: configData.systemSettings
    });

    await this.configurationRepository.save(currentConfig);

    await this.eventBus.publish(new BoxDeletedEvent(
      command.userId,
      command.tankId,
      tank.name,
      command.rackId,
      rack.name,
      boxIdUpper,
      boxName
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

/** Assigns or unassigns a box to/from a user. */
export class AssignBoxCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: AssignBoxCommand): Promise<void> {
    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await this.getUserById(command.userId);
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('assign box', command.userId);
    }

    const tank = currentConfig.tanks.find(t => t.id === command.tankId);
    if (!tank) {
      throw new NotFoundError(`Tank '${command.tankId}' not found`);
    }

    const rack = tank.racks.find(r => r.id === command.rackId);
    if (!rack) {
      throw new NotFoundError(`Rack '${command.rackId}' not found in tank '${command.tankId}'`);
    }

    const boxIdUpper = command.boxId.toUpperCase();
    const box = rack.boxes.find(b => b.name === boxIdUpper);
    if (!box) {
      throw new NotFoundError(`Box '${command.boxId}' not found in rack '${command.rackId}'`);
    }

    let assignedUser: User | null = null;
    if (command.assignedUserId) {
      assignedUser = await this.userRepository.findById(command.assignedUserId);
      if (!assignedUser) {
        throw new ValidationError(`User '${command.assignedUserId}' not found`);
      }
    }

    const previousUserId = box.assignedUserId;
    const previousUsername = previousUserId
      ? (await this.userRepository.findById(previousUserId))?.username ?? 'Unknown'
      : '';

    if (previousUserId === command.assignedUserId) {
      return;
    }

    const configData = currentConfig.toData();
    const tankIndex = configData.tanks.findIndex(t => t.id === command.tankId);
    const rackIndex = configData.tanks[tankIndex].racks.findIndex(r => r.id === command.rackId);
    const boxIndex = configData.tanks[tankIndex].racks[rackIndex].boxes.findIndex(
      b => b.name === boxIdUpper
    );

    configData.tanks[tankIndex].racks[rackIndex].boxes[boxIndex].assignedUserId = command.assignedUserId ?? undefined;

    currentConfig.updateFromData({
      tanks: configData.tanks,
      systemSettings: configData.systemSettings
    });

    await this.configurationRepository.save(currentConfig);

    if (command.assignedUserId && previousUserId) {
      await this.eventBus.publish(new BoxReassignedEvent(
        command.userId,
        command.tankId,
        tank.name,
        command.rackId,
        rack.name,
        boxIdUpper,
        box.name,
        previousUserId,
        previousUsername,
        command.assignedUserId,
        assignedUser!.username
      ));
    } else if (command.assignedUserId) {
      await this.eventBus.publish(new BoxAssignedEvent(
        command.userId,
        command.tankId,
        tank.name,
        command.rackId,
        rack.name,
        boxIdUpper,
        box.name,
        command.assignedUserId,
        assignedUser!.username
      ));
    } else {
      await this.eventBus.publish(new BoxUnassignedEvent(
        command.userId,
        command.tankId,
        tank.name,
        command.rackId,
        rack.name,
        boxIdUpper,
        box.name,
        previousUserId!,
        previousUsername
      ));
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
