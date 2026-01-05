/**
 * Rack CQRS Commands
 *
 * Atomic operations for rack management. Each command performs a single
 * operation and emits appropriate domain events for real-time sync.
 *
 * URL pattern: /api/configuration/tanks/:tankId/racks[/:rackId]
 * Parent context (tankId) is always required since rackId is NOT globally unique.
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
import {
  RackAddedEvent,
  RackUpdatedEvent,
  RackDeletedEvent,
  RackAssignedEvent,
  RackUnassignedEvent,
  RackReassignedEvent
} from '@domain/events/ConfigurationEvents';

// COMMAND INTERFACES

export interface AddRacksCommand {
  userId: string;
  tankId: string;
  count: number;
}

export interface UpdateRackCommand {
  userId: string;
  tankId: string;
  rackId: string;
  name?: string;
  capacity?: number;
  isActive?: boolean;
}

export interface DeleteRackCommand {
  userId: string;
  tankId: string;
  rackId: string;
}

export interface AssignRackCommand {
  userId: string;
  tankId: string;
  rackId: string;
  assignedUserId: string | null; // null = unassign
}

// COMMAND HANDLERS

/**
 * Add Racks Command Handler
 *
 * Creates one or more racks in a tank.
 * Bulk add: Pass count > 1 to add multiple racks at once.
 * Emits one RackAddedEvent per rack created.
 */
export class AddRacksCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: AddRacksCommand): Promise<{ rackIds: string[] }> {
    // Validate count
    if (command.count < 1 || command.count > 100) {
      throw new ValidationError('Count must be between 1 and 100');
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
      throw PermissionError.configurationManagement('add rack', command.userId);
    }

    // Find tank
    const tank = currentConfig.tanks.find(t => t.id === command.tankId);
    if (!tank) {
      throw new NotFoundError(`Tank '${command.tankId}' not found`);
    }

    // Generate rack IDs and add racks
    const existingRackIds = tank.racks.map(r => parseInt(r.id, 10)).filter(n => !isNaN(n));
    const maxRackId = existingRackIds.length > 0 ? Math.max(...existingRackIds) : 0;

    const rackIds: string[] = [];
    const events: RackAddedEvent[] = [];

    for (let i = 0; i < command.count; i++) {
      const newRackId = maxRackId + i + 1;
      const rackIdStr = String(newRackId);
      const rackName = NAMING_PATTERNS.RACK.DEFAULT_NAME(newRackId);

      // Create default boxes for the new rack
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

      // Add rack with default boxes
      currentConfig.addRack(command.tankId, newRackId, rackName, EQUIPMENT_DEFAULTS.BOXES_PER_RACK, defaultBoxes);

      rackIds.push(rackIdStr);
      events.push(new RackAddedEvent(
        command.userId,
        command.tankId,
        tank.name,
        rackIdStr,
        rackName
      ));
    }

    // Save configuration
    await this.configurationRepository.save(currentConfig);

    // Emit domain events (one per rack)
    for (const event of events) {
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

/**
 * Update Rack Command Handler
 *
 * Updates an existing rack's properties.
 * Emits RackUpdatedEvent for real-time sync.
 */
export class UpdateRackCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: UpdateRackCommand): Promise<void> {
    // Get current configuration
    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    // Get and validate user
    const user = await this.getUserById(command.userId);

    // Check admin permission
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('update rack', command.userId);
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

    // Track changes for event
    const changes: { field: string; oldValue: any; newValue: any }[] = [];

    // Build updated configuration
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
    await this.eventBus.publish(new RackUpdatedEvent(
      command.userId,
      command.tankId,
      tank.name,
      command.rackId,
      configData.tanks[tankIndex].racks[rackIndex].name,
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
 * Delete Rack Command Handler
 *
 * Removes a rack and all its boxes.
 * BLOCKS deletion if any tubes exist in the rack.
 * Emits RackDeletedEvent for real-time sync.
 */
export class DeleteRackCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private tubeRepository: TubeRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: DeleteRackCommand): Promise<void> {
    // Get current configuration
    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    // Get and validate user
    const user = await this.getUserById(command.userId);

    // Check admin permission
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('delete rack', command.userId);
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

    // Check for tubes in this rack (BLOCK deletion if tubes exist)
    const tubesInRack = await this.tubeRepository.findByTankAndRack(command.tankId, command.rackId);
    if (tubesInRack.length > 0) {
      throw new ValidationError(
        `Cannot delete rack: ${tubesInRack.length} tube(s) are stored in this location. ` +
        `Move or delete the tubes first.`
      );
    }

    const rackName = rack.name;

    // Remove rack by rebuilding configuration
    const configData = currentConfig.toData();
    const tankIndex = configData.tanks.findIndex(t => t.id === command.tankId);
    configData.tanks[tankIndex].racks = configData.tanks[tankIndex].racks.filter(
      r => r.id !== command.rackId
    );

    currentConfig.updateFromData({
      tanks: configData.tanks,
      systemSettings: configData.systemSettings
    });

    // Save configuration
    await this.configurationRepository.save(currentConfig);

    // Emit domain event
    await this.eventBus.publish(new RackDeletedEvent(
      command.userId,
      command.tankId,
      tank.name,
      command.rackId,
      rackName
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
 * Assign Rack Command Handler
 *
 * Assigns or unassigns a rack to/from a user.
 * Emits RackAssignedEvent, RackUnassignedEvent, or RackReassignedEvent.
 */
export class AssignRackCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: AssignRackCommand): Promise<void> {
    // Get current configuration
    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    // Get and validate acting user
    const user = await this.getUserById(command.userId);

    // Check admin permission
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('assign rack', command.userId);
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

    // Validate assigned user exists (if assigning)
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

    // No change needed
    if (previousUserId === command.assignedUserId) {
      return;
    }

    // Update configuration
    const configData = currentConfig.toData();
    const tankIndex = configData.tanks.findIndex(t => t.id === command.tankId);
    const rackIndex = configData.tanks[tankIndex].racks.findIndex(r => r.id === command.rackId);

    configData.tanks[tankIndex].racks[rackIndex].assignedUserId = command.assignedUserId ?? undefined;

    // If unassigning, clear inherited box labels
    if (!command.assignedUserId && previousUserId) {
      currentConfig.clearInheritedBoxLabelsForRack(command.tankId, command.rackId);
    }

    currentConfig.updateFromData({
      tanks: configData.tanks,
      systemSettings: configData.systemSettings
    });

    // Save configuration
    await this.configurationRepository.save(currentConfig);

    // Emit appropriate domain event
    if (command.assignedUserId && previousUserId) {
      // Reassignment
      await this.eventBus.publish(new RackReassignedEvent(
        command.userId,
        command.tankId,
        tank.name,
        command.rackId,
        rack.name,
        previousUserId,
        previousUsername,
        command.assignedUserId,
        assignedUser!.username
      ));
    } else if (command.assignedUserId) {
      // New assignment
      await this.eventBus.publish(new RackAssignedEvent(
        command.userId,
        command.tankId,
        tank.name,
        command.rackId,
        rack.name,
        command.assignedUserId,
        assignedUser!.username
      ));
    } else {
      // Unassignment
      await this.eventBus.publish(new RackUnassignedEvent(
        command.userId,
        command.tankId,
        tank.name,
        command.rackId,
        rack.name,
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
