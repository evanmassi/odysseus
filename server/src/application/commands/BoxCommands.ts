/**
 * Box CQRS Commands
 *
 * Atomic operations for box management with domain event emission.
 * Full parent context (tankId + rackId) required since boxId is not globally unique.
 */

import { EQUIPMENT_DEFAULTS, NAMING_PATTERNS } from '@odysseus/shared-schemas';

import { executeResourceAssignment } from '@application/commands/resourceAssignment';
import type { EventBus } from '@application/contracts/EventBus';
import { rejectIfSeeded, enforceAddBoxesLimit } from '@application/guards/DemoGuards';
import { requireUser } from '@application/guards/UserGuards';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';
import { ValidationError } from '@domain/errors/ValidationError';
import {
  BoxAddedEvent,
  BoxUpdatedEvent,
  BoxDeletedEvent,
  BoxAssignedEvent,
  BoxUnassignedEvent,
  BoxReassignedEvent
} from '@domain/events/StorageEvents';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { TubeRepository } from '@domain/repositories/TubeRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { FieldChange } from '@domain/types/fieldChangeTypes';

import type { PositionDisplayConfig } from '@odysseus/shared-schemas';


// COMMAND INTERFACES

export interface AddBoxesCommand {
  userId: string;
  labId: string;
  tankId: string;
  rackId: string;
  count: number;
}

export interface UpdateBoxCommand {
  userId: string;
  labId: string;
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
  labId: string;
  tankId: string;
  rackId: string;
  boxId: string;
}

export interface AssignBoxCommand {
  userId: string;
  labId: string;
  tankId: string;
  rackId: string;
  boxId: string;
  /** A user id, null (common — everyone), or undefined (inherit from the rack). */
  assignedUserId: string | null | undefined;
}

// COMMAND HANDLERS

/** Creates one or more boxes in a rack. Pass count > 1 for bulk add. */
export class AddBoxesCommandHandler {
  constructor(
    private storageRepository: StorageRepository,
    private labRepository: LabRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: AddBoxesCommand): Promise<{ boxIds: string[] }> {
    if (command.count < 1 || command.count > 26) {
      throw new ValidationError('Count must be between 1 and 26 (A-Z)');
    }

    const currentConfig = await this.storageRepository.getForLab(command.labId);
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await requireUser(this.userRepository, command.userId);
    if (!user.isAdmin()) {
      throw PermissionError.configurationManagement('add box', command.userId);
    }

    const tank = currentConfig.tanks.find(t => t.id === command.tankId);
    if (!tank) {
      throw new NotFoundError('The selected tank could not be found.');
    }

    const rack = tank.racks.find(r => r.id === command.rackId);
    if (!rack) {
      throw new NotFoundError('That rack could not be found in the selected tank.');
    }

    rejectIfSeeded(user, currentConfig, command.tankId, command.rackId);

    const lab = await this.labRepository.findById(command.labId);
    if (lab) enforceAddBoxesLimit(user, currentConfig, lab, command.tankId, command.rackId, command.count);

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
        boxName,
        command.labId
      ));

      letterIndex++;
    }

    const expectedVersion = currentConfig.version;
    const newVersion = await this.storageRepository.saveWithOptimisticLock(
      command.labId,
      currentConfig,
      expectedVersion,
      `Added ${command.count} box(es) to rack '${rack.name}' in tank '${tank.name}'`,
      command.userId
    );
    currentConfig.applyPersistedVersion(newVersion);

    for (const event of events) {
      await this.eventBus.publish(event);
    }

    return { boxIds };
  }
}

export class UpdateBoxCommandHandler {
  constructor(
    private storageRepository: StorageRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: UpdateBoxCommand): Promise<void> {
    const currentConfig = await this.storageRepository.getForLab(command.labId);
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await requireUser(this.userRepository, command.userId);
    if (!user.isAdmin()) {
      throw PermissionError.configurationManagement('update box', command.userId);
    }

    rejectIfSeeded(user, currentConfig, command.tankId, command.rackId, command.boxId);

    const tank = currentConfig.tanks.find(t => t.id === command.tankId);
    if (!tank) {
      throw new NotFoundError('The selected tank could not be found.');
    }

    const rack = tank.racks.find(r => r.id === command.rackId);
    if (!rack) {
      throw new NotFoundError('That rack could not be found in the selected tank.');
    }

    const boxIdUpper = command.boxId.toUpperCase();
    const box = rack.boxes.find(b => b.name === boxIdUpper);
    if (!box) {
      throw new NotFoundError('That box could not be found in the selected rack.');
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
      boxData.positionDisplay = command.positionDisplay ?? undefined;
    }

    if (command.isActive !== undefined && command.isActive !== box.isActive) {
      changes.push({ field: 'isActive', oldValue: box.isActive, newValue: command.isActive });
      boxData.isActive = command.isActive;
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
      `Updated box '${boxData.name}' in rack '${rack.name}'`,
      command.userId
    );
    currentConfig.applyPersistedVersion(newVersion);

    const event = new BoxUpdatedEvent(
      command.userId,
      command.tankId,
      tank.name,
      command.rackId,
      rack.name,
      boxIdUpper,
      boxData.name,
      changes,
      command.labId
    );
    await this.eventBus.publish(event);
  }
}

/**
 * Removes a box from a rack. Uses atomic check-and-delete to prevent TOCTOU race
 * conditions where tubes could be added between the emptiness check and the actual deletion.
 */
export class DeleteBoxCommandHandler {
  constructor(
    private storageRepository: StorageRepository,
    private tubeRepository: TubeRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: DeleteBoxCommand): Promise<void> {
    const user = await requireUser(this.userRepository, command.userId);
    if (!user.isAdmin()) {
      throw PermissionError.configurationManagement('delete box', command.userId);
    }

    const currentConfig = await this.storageRepository.getForLab(command.labId);
    if (currentConfig) rejectIfSeeded(user, currentConfig, command.tankId, command.rackId, command.boxId);

    // Atomic delete: tube check and configuration update in same SERIALIZABLE transaction
    const { tankName, rackName, boxName } = await this.storageRepository.deleteEmptyBox(
      command.labId,
      command.tankId,
      command.rackId,
      command.boxId,
      command.userId
    );

    const event = new BoxDeletedEvent(
      command.userId,
      command.tankId,
      tankName,
      command.rackId,
      rackName,
      command.boxId.toUpperCase(),
      boxName,
      command.labId
    );
    await this.eventBus.publish(event);
  }
}

export class AssignBoxCommandHandler {
  constructor(
    private storageRepository: StorageRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: AssignBoxCommand): Promise<void> {
    const currentConfig = await this.storageRepository.getForLab(command.labId);
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await requireUser(this.userRepository, command.userId);
    if (!user.isAdmin()) {
      throw PermissionError.configurationManagement('assign box', command.userId);
    }

    rejectIfSeeded(user, currentConfig, command.tankId, command.rackId, command.boxId);

    const tank = currentConfig.tanks.find(t => t.id === command.tankId);
    if (!tank) {
      throw new NotFoundError('The selected tank could not be found.');
    }

    const rack = tank.racks.find(r => r.id === command.rackId);
    if (!rack) {
      throw new NotFoundError('That rack could not be found in the selected tank.');
    }

    const boxIdUpper = command.boxId.toUpperCase();
    const box = rack.boxes.find(b => b.name === boxIdUpper);
    if (!box) {
      throw new NotFoundError('That box could not be found in the selected rack.');
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
        resourceType: 'box',
        previousUserId: box.assignedUserId,
        applyAssignment: (configData, assignedUserId) => {
          const tankIndex = configData.tanks.findIndex(t => t.id === command.tankId);
          const rackIndex = configData.tanks[tankIndex].racks.findIndex(r => r.id === command.rackId);
          const boxIndex = configData.tanks[tankIndex].racks[rackIndex].boxes.findIndex(
            b => b.name === boxIdUpper
          );
          // Kept as-is: null means common (everyone), undefined means inherit from the rack.
          configData.tanks[tankIndex].racks[rackIndex].boxes[boxIndex].assignedUserId = assignedUserId;
        },
        buildSaveMessage: (action) => `${action} box '${box.name}' in rack '${rack.name}'`,
        buildReassignedEvent: (previousUserId, previousUsername, newUserId, newUsername) =>
          new BoxReassignedEvent(
            command.userId,
            command.tankId,
            tank.name,
            command.rackId,
            rack.name,
            boxIdUpper,
            box.name,
            previousUserId,
            previousUsername,
            newUserId,
            newUsername,
            command.labId
          ),
        buildAssignedEvent: (newUserId, newUsername) =>
          new BoxAssignedEvent(
            command.userId,
            command.tankId,
            tank.name,
            command.rackId,
            rack.name,
            boxIdUpper,
            box.name,
            newUserId,
            newUsername,
            command.labId
          ),
        buildUnassignedEvent: (previousUserId, previousUsername) =>
          new BoxUnassignedEvent(
            command.userId,
            command.tankId,
            tank.name,
            command.rackId,
            rack.name,
            boxIdUpper,
            box.name,
            previousUserId,
            previousUsername,
            command.labId
          ),
      }
    );
  }

}
