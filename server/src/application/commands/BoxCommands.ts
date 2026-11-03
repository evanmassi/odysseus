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
  BoxReassignedEvent,
} from '@domain/events/StorageEvents';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { TubeRepository } from '@domain/repositories/TubeRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { FieldChange } from '@domain/types/fieldChangeTypes';

import type { BoxGridUpdateResponse, GridConfiguration } from '@odysseus/shared-schemas';

export interface AddBoxesCommand {
  userId: string;
  labId: string;
  tankId: string;
  rackId: string;
  count: number;
}

export interface UpdateBoxGridCommand {
  userId: string;
  labId: string;
  tankId: string;
  rackId?: string;
  boxId?: string;
  gridConfig: GridConfiguration;
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
  assignedUserId: string | null | undefined;
}

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
    if (lab)
      enforceAddBoxesLimit(user, currentConfig, lab, command.tankId, command.rackId, command.count);

    const existingBoxNames = new Set(rack.boxes.map(b => b.name.toUpperCase()));
    const boxIds: string[] = [];
    const events: BoxAddedEvent[] = [];

    let letterIndex = 0;
    for (let i = 0; i < command.count; i++) {
      while (
        letterIndex < 26 &&
        existingBoxNames.has(NAMING_PATTERNS.BOX.LETTER_NAME(letterIndex))
      ) {
        letterIndex++;
      }

      if (letterIndex >= 26) {
        throw new ValidationError('Cannot add more boxes: maximum 26 boxes (A-Z) per rack');
      }

      const boxName = NAMING_PATTERNS.BOX.LETTER_NAME(letterIndex);
      existingBoxNames.add(boxName);

      currentConfig.addBox(command.tankId, command.rackId, boxName, {
        rows: EQUIPMENT_DEFAULTS.GRID_ROWS,
        cols: EQUIPMENT_DEFAULTS.GRID_COLS,
      });

      boxIds.push(boxName);
      events.push(
        new BoxAddedEvent(
          command.userId,
          command.tankId,
          tank.name,
          command.rackId,
          rack.name,
          boxName,
          boxName,
          command.labId
        )
      );

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

export class UpdateBoxGridCommandHandler {
  constructor(
    private storageRepository: StorageRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: UpdateBoxGridCommand): Promise<BoxGridUpdateResponse> {
    const currentConfig = await this.storageRepository.getForLab(command.labId);
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await requireUser(this.userRepository, command.userId);
    if (!user.isAdmin()) {
      throw PermissionError.configurationManagement('change box grids', command.userId);
    }

    const tank = currentConfig.tanks.find(t => t.id === command.tankId);
    if (!tank) {
      throw new NotFoundError('The selected tank could not be found.');
    }

    const racks =
      command.rackId === undefined ? tank.racks : tank.racks.filter(r => r.id === command.rackId);
    if (command.rackId !== undefined && racks.length === 0) {
      throw new NotFoundError('That rack could not be found in the selected tank.');
    }

    const boxIdUpper = command.boxId?.toUpperCase();
    const boxesInScope = racks.flatMap(rack =>
      rack.boxes
        .filter(box => boxIdUpper === undefined || box.name === boxIdUpper)
        .map(box => ({ rack, box }))
    );
    if (boxIdUpper !== undefined && boxesInScope.length === 0) {
      throw new NotFoundError('That box could not be found in the selected rack.');
    }

    const { rows, cols } = command.gridConfig;
    const needsChange = boxesInScope.filter(
      ({ box }) => box.gridConfig.rows !== rows || box.gridConfig.cols !== cols
    );
    const candidates = needsChange.filter(({ box }) => !(user.isDemo && box.isSeeded));
    const protectedSkipped = needsChange.length - candidates.length;

    if (candidates.length === 0) {
      return { boxesUpdated: 0, tubesRenumbered: 0, blockedSkipped: 0, protectedSkipped };
    }

    const { resized, tubesRenumbered } = await this.storageRepository.resizeBoxes(
      command.labId,
      candidates.map(({ rack, box }) => ({ tankId: tank.id, rackId: rack.id, boxId: box.name })),
      command.gridConfig,
      command.userId
    );

    const resizedKeys = new Set(resized.map(ref => `${ref.rackId}/${ref.boxId}`));
    for (const { rack, box } of candidates) {
      if (!resizedKeys.has(`${rack.id}/${box.name}`)) continue;

      const changes: FieldChange[] = [
        { field: 'gridConfig.rows', oldValue: box.gridConfig.rows, newValue: rows },
        { field: 'gridConfig.cols', oldValue: box.gridConfig.cols, newValue: cols },
      ];
      if (box.positionDisplay) {
        changes.push({
          field: 'positionDisplay',
          oldValue: box.positionDisplay,
          newValue: undefined,
        });
      }

      await this.eventBus.publish(
        new BoxUpdatedEvent(
          command.userId,
          tank.id,
          tank.name,
          rack.id,
          rack.name,
          box.name,
          box.name,
          changes,
          command.labId
        )
      );
    }

    return {
      boxesUpdated: resized.length,
      tubesRenumbered,
      blockedSkipped: candidates.length - resized.length,
      protectedSkipped,
    };
  }
}

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
    if (currentConfig)
      rejectIfSeeded(user, currentConfig, command.tankId, command.rackId, command.boxId);

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
          const rackIndex = configData.tanks[tankIndex].racks.findIndex(
            r => r.id === command.rackId
          );
          const boxIndex = configData.tanks[tankIndex].racks[rackIndex].boxes.findIndex(
            b => b.name === boxIdUpper
          );
          // PITFALL: null means common (everyone) and undefined means inherit; never coalesce them.
          configData.tanks[tankIndex].racks[rackIndex].boxes[boxIndex].assignedUserId =
            assignedUserId;
        },
        buildSaveMessage: action => `${action} box '${box.name}' in rack '${rack.name}'`,
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
