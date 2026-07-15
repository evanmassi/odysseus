/**
 * Rack CQRS Commands
 *
 * Manages rack lifecycle within tanks.
 */

import { EQUIPMENT_DEFAULTS, NAMING_PATTERNS } from '@odysseus/shared-schemas';

import { executeResourceAssignment } from '@application/commands/resourceAssignment';
import type { EventBus } from '@application/contracts/EventBus';
import { rejectIfSeeded, enforceAddRacksLimit } from '@application/guards/DemoGuards';
import { requireUser } from '@application/guards/UserGuards';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';
import { ValidationError } from '@domain/errors/ValidationError';
import {
  RackAddedEvent,
  RackUpdatedEvent,
  RackDeletedEvent,
  RackAssignedEvent,
  RackUnassignedEvent,
  RackReassignedEvent
} from '@domain/events/StorageEvents';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { FieldChange } from '@domain/types/fieldChangeTypes';
import { generateId } from '@domain/utils/generateId';
import { Box } from '@domain/value-objects/Equipment';

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
    private storageRepository: StorageRepository,
    private labRepository: LabRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: AddRacksCommand): Promise<{ rackIds: string[] }> {
    if (command.count < 1 || command.count > 100) {
      throw new ValidationError('Count must be between 1 and 100');
    }

    const currentConfig = await this.storageRepository.getForLab(command.labId);
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await requireUser(this.userRepository, command.userId);
    if (!user.isAdmin()) {
      throw PermissionError.configurationManagement('add rack', command.userId);
    }

    const tank = currentConfig.tanks.find(t => t.id === command.tankId);
    if (!tank) {
      throw new NotFoundError('The selected tank could not be found.');
    }

    const lab = await this.labRepository.findById(command.labId);
    if (lab) enforceAddRacksLimit(user, currentConfig, lab, command.tankId, command.count);

    const rackIds: string[] = [];
    const events: RackAddedEvent[] = [];

    for (let i = 0; i < command.count; i++) {
      const rackIdStr = generateId('rack');
      const rackName = NAMING_PATTERNS.RACK.DEFAULT_NAME(tank.racks.length + i + 1);

      const defaultBoxes: Box[] = [];
      for (let j = 0; j < EQUIPMENT_DEFAULTS.BOXES_PER_RACK; j++) {
        const boxName = NAMING_PATTERNS.BOX.LETTER_NAME(j);
        defaultBoxes.push(Box.create({
          name: boxName,
          gridConfig: { rows: EQUIPMENT_DEFAULTS.GRID_ROWS, cols: EQUIPMENT_DEFAULTS.GRID_COLS },
          maxPositions: EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX,
        }));
      }

      currentConfig.addRack(command.tankId, rackIdStr, rackName, EQUIPMENT_DEFAULTS.BOXES_PER_RACK, defaultBoxes);

      rackIds.push(rackIdStr);
      events.push(new RackAddedEvent(
        command.userId,
        command.tankId,
        tank.name,
        rackIdStr,
        rackName,
        command.labId
      ));
    }

    const expectedVersion = currentConfig.version;
    const newVersion = await this.storageRepository.saveWithOptimisticLock(
      command.labId,
      currentConfig,
      expectedVersion,
      `Added ${command.count} rack(s) to tank '${tank.name}'`,
      command.userId
    );
    currentConfig.applyPersistedVersion(newVersion);

    for (const event of events) {
      await this.eventBus.publish(event);
    }

    return { rackIds };
  }
}

export class UpdateRackCommandHandler {
  constructor(
    private storageRepository: StorageRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: UpdateRackCommand): Promise<void> {
    const currentConfig = await this.storageRepository.getForLab(command.labId);
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await requireUser(this.userRepository, command.userId);
    if (!user.isAdmin()) {
      throw PermissionError.configurationManagement('update rack', command.userId);
    }

    rejectIfSeeded(user, currentConfig, command.tankId, command.rackId);

    const tank = currentConfig.tanks.find(t => t.id === command.tankId);
    if (!tank) {
      throw new NotFoundError('The selected tank could not be found.');
    }

    const rack = tank.racks.find(r => r.id === command.rackId);
    if (!rack) {
      throw new NotFoundError('That rack could not be found in the selected tank.');
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

    const newVersion = await this.storageRepository.saveWithOptimisticLock(
      command.labId,
      currentConfig,
      expectedVersion,
      `Updated rack '${configData.tanks[tankIndex].racks[rackIndex].name}' in tank '${tank.name}'`,
      command.userId
    );
    currentConfig.applyPersistedVersion(newVersion);

    const event = new RackUpdatedEvent(
      command.userId,
      command.tankId,
      tank.name,
      command.rackId,
      configData.tanks[tankIndex].racks[rackIndex].name,
      changes,
      command.labId
    );
    await this.eventBus.publish(event);
  }
}

/**
 * Removes a rack and all its boxes. Uses atomic check-and-delete to prevent TOCTOU race
 * conditions where tubes could be added between the emptiness check and the actual deletion.
 */
export class DeleteRackCommandHandler {
  constructor(
    private storageRepository: StorageRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: DeleteRackCommand): Promise<void> {
    const user = await requireUser(this.userRepository, command.userId);
    if (!user.isAdmin()) {
      throw PermissionError.configurationManagement('delete rack', command.userId);
    }

    const currentConfig = await this.storageRepository.getForLab(command.labId);
    if (currentConfig) rejectIfSeeded(user, currentConfig, command.tankId, command.rackId);

    // Atomic delete: tube check and configuration update in same SERIALIZABLE transaction
    const { tankName, rackName } = await this.storageRepository.deleteEmptyRack(
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
      rackName,
      command.labId
    );
    await this.eventBus.publish(event);
  }
}

export class AssignRackCommandHandler {
  constructor(
    private storageRepository: StorageRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: AssignRackCommand): Promise<void> {
    const currentConfig = await this.storageRepository.getForLab(command.labId);
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await requireUser(this.userRepository, command.userId);
    if (!user.isAdmin()) {
      throw PermissionError.configurationManagement('assign rack', command.userId);
    }

    rejectIfSeeded(user, currentConfig, command.tankId, command.rackId);

    const tank = currentConfig.tanks.find(t => t.id === command.tankId);
    if (!tank) {
      throw new NotFoundError('The selected tank could not be found.');
    }

    const rack = tank.racks.find(r => r.id === command.rackId);
    if (!rack) {
      throw new NotFoundError('That rack could not be found in the selected tank.');
    }

    await executeResourceAssignment(
      {
        storageRepository: this.storageRepository,
        userRepository: this.userRepository,
        eventBus: this.eventBus,
      },
      currentConfig,
      command,
      {
        resourceType: 'rack',
        previousUserId: rack.assignedUserId,
        applyAssignment: (configData, assignedUserId) => {
          const tankIndex = configData.tanks.findIndex(t => t.id === command.tankId);
          const rackIndex = configData.tanks[tankIndex].racks.findIndex(r => r.id === command.rackId);
          // A rack has no parent to inherit from, so it is two-state: owned or unassigned.
          configData.tanks[tankIndex].racks[rackIndex].assignedUserId = assignedUserId ?? undefined;
        },
        // Clear inherited box labels when unassigning
        onUnassign: () => currentConfig.clearInheritedBoxLabelsForRack(command.tankId, command.rackId),
        buildSaveMessage: (action) => `${action} rack '${rack.name}' in tank '${tank.name}'`,
        buildReassignedEvent: (previousUserId, previousUsername, newUserId, newUsername) =>
          new RackReassignedEvent(
            command.userId,
            command.tankId,
            tank.name,
            command.rackId,
            rack.name,
            previousUserId,
            previousUsername,
            newUserId,
            newUsername,
            command.labId
          ),
        buildAssignedEvent: (newUserId, newUsername) =>
          new RackAssignedEvent(
            command.userId,
            command.tankId,
            tank.name,
            command.rackId,
            rack.name,
            newUserId,
            newUsername,
            command.labId
          ),
        buildUnassignedEvent: (previousUserId, previousUsername) =>
          new RackUnassignedEvent(
            command.userId,
            command.tankId,
            tank.name,
            command.rackId,
            rack.name,
            previousUserId,
            previousUsername,
            command.labId
          ),
      }
    );
  }
}
