/**
 * Box CQRS Commands
 *
 * Atomic operations for box management. Each command performs a single
 * operation and emits appropriate domain events for real-time sync.
 *
 * URL pattern: /api/configuration/tanks/:tankId/racks/:rackId/boxes[/:boxId]
 * Full parent context (tankId + rackId) is always required since boxId is NOT globally unique.
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

/**
 * Add Boxes Command Handler
 *
 * Creates one or more boxes in a rack.
 * Bulk add: Pass count > 1 to add multiple boxes at once.
 * Uses lab's default grid configuration for new boxes.
 * Emits one BoxAddedEvent per box created.
 */
export class AddBoxesCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: AddBoxesCommand): Promise<{ boxIds: string[] }> {
    // Validate count
    if (command.count < 1 || command.count > 26) {
      throw new ValidationError('Count must be between 1 and 26 (A-Z)');
    }

    // Get current configuration
    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    // Get and validate user
    const user = await this.getUserById(command.userId);

    // Check admin permission
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('add box', command.userId);
    }

    // Find tank
    const tank = currentConfig.tanks.find(t => t.id === command.tankId);
    if (!tank) {
      throw new NotFoundError(`Tank '${command.tankId}' not found`);
    }

    // Find rack
    const rack = tank.racks.find(r => r.id === command.rackId);
    if (!rack) {
      throw new NotFoundError(`Rack '${command.rackId}' not found in tank '${command.tankId}'`);
    }

    // Get existing box names (letters)
    const existingBoxNames = new Set(rack.boxes.map(b => b.name.toUpperCase()));

    // Generate box names (A, B, C, ..., Z)
    const boxIds: string[] = [];
    const events: BoxAddedEvent[] = [];

    // Find next available letter
    let letterIndex = 0;
    for (let i = 0; i < command.count; i++) {
      // Find next available letter
      while (letterIndex < 26 && existingBoxNames.has(NAMING_PATTERNS.BOX.LETTER_NAME(letterIndex))) {
        letterIndex++;
      }

      if (letterIndex >= 26) {
        throw new ValidationError('Cannot add more boxes: maximum 26 boxes (A-Z) per rack');
      }

      const boxName = NAMING_PATTERNS.BOX.LETTER_NAME(letterIndex);
      existingBoxNames.add(boxName);

      // Add box using domain method (uses default grid config)
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

    // Save configuration
    await this.configurationRepository.save(currentConfig);

    // Emit domain events (one per box)
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

/**
 * Update Box Command Handler
 *
 * Updates an existing box's properties.
 * Emits BoxUpdatedEvent for real-time sync.
 */
export class UpdateBoxCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: UpdateBoxCommand): Promise<void> {
    // Get current configuration
    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    // Get and validate user
    const user = await this.getUserById(command.userId);

    // Check admin permission
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('update box', command.userId);
    }

    // Find tank
    const tank = currentConfig.tanks.find(t => t.id === command.tankId);
    if (!tank) {
      throw new NotFoundError(`Tank '${command.tankId}' not found`);
    }

    // Find rack
    const rack = tank.racks.find(r => r.id === command.rackId);
    if (!rack) {
      throw new NotFoundError(`Rack '${command.rackId}' not found in tank '${command.tankId}'`);
    }

    // Find box (case-insensitive)
    const boxIdUpper = command.boxId.toUpperCase();
    const box = rack.boxes.find(b => b.name === boxIdUpper);
    if (!box) {
      throw new NotFoundError(`Box '${command.boxId}' not found in rack '${command.rackId}'`);
    }

    // Track changes for event
    const changes: { field: string; oldValue: any; newValue: any }[] = [];

    // Build updated configuration
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

    // Only update if there are changes
    if (changes.length === 0) {
      return;
    }

    // Update configuration
    currentConfig.updateFromData({
      tanks: configData.tanks,
      systemSettings: configData.systemSettings
    });

    // Save configuration
    await this.configurationRepository.save(currentConfig);

    // Emit domain event
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

/**
 * Delete Box Command Handler
 *
 * Removes a box from a rack.
 * BLOCKS deletion if any tubes exist in the box.
 * Emits BoxDeletedEvent for real-time sync.
 */
export class DeleteBoxCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private tubeRepository: TubeRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: DeleteBoxCommand): Promise<void> {
    // Get current configuration
    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    // Get and validate user
    const user = await this.getUserById(command.userId);

    // Check admin permission
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('delete box', command.userId);
    }

    // Find tank
    const tank = currentConfig.tanks.find(t => t.id === command.tankId);
    if (!tank) {
      throw new NotFoundError(`Tank '${command.tankId}' not found`);
    }

    // Find rack
    const rack = tank.racks.find(r => r.id === command.rackId);
    if (!rack) {
      throw new NotFoundError(`Rack '${command.rackId}' not found in tank '${command.tankId}'`);
    }

    // Find box (case-insensitive)
    const boxIdUpper = command.boxId.toUpperCase();
    const box = rack.boxes.find(b => b.name === boxIdUpper);
    if (!box) {
      throw new NotFoundError(`Box '${command.boxId}' not found in rack '${command.rackId}'`);
    }

    // Check for tubes in this box (BLOCK deletion if tubes exist)
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

    // Remove box by rebuilding configuration
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

    // Save configuration
    await this.configurationRepository.save(currentConfig);

    // Emit domain event
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

/**
 * Assign Box Command Handler
 *
 * Assigns or unassigns a box to/from a user.
 * Emits BoxAssignedEvent, BoxUnassignedEvent, or BoxReassignedEvent.
 */
export class AssignBoxCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: AssignBoxCommand): Promise<void> {
    // Get current configuration
    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    // Get and validate acting user
    const user = await this.getUserById(command.userId);

    // Check admin permission
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('assign box', command.userId);
    }

    // Find tank
    const tank = currentConfig.tanks.find(t => t.id === command.tankId);
    if (!tank) {
      throw new NotFoundError(`Tank '${command.tankId}' not found`);
    }

    // Find rack
    const rack = tank.racks.find(r => r.id === command.rackId);
    if (!rack) {
      throw new NotFoundError(`Rack '${command.rackId}' not found in tank '${command.tankId}'`);
    }

    // Find box (case-insensitive)
    const boxIdUpper = command.boxId.toUpperCase();
    const box = rack.boxes.find(b => b.name === boxIdUpper);
    if (!box) {
      throw new NotFoundError(`Box '${command.boxId}' not found in rack '${command.rackId}'`);
    }

    // Validate assigned user exists (if assigning)
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

    // No change needed
    if (previousUserId === command.assignedUserId) {
      return;
    }

    // Update configuration
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

    // Save configuration
    await this.configurationRepository.save(currentConfig);

    // Emit appropriate domain event
    if (command.assignedUserId && previousUserId) {
      // Reassignment
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
      // New assignment
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
      // Unassignment
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
