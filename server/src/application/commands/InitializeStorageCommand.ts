/**
 * Initialize Storage CQRS Command
 *
 * Creates default storage layout for fresh installs.
 */

import { Storage } from '@domain/entities/Storage';
import { StorageRepository } from '@domain/repositories/StorageRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { ValidationError } from '@domain/errors/ValidationError';
import { PermissionError } from '@domain/errors/PermissionError';
import { EventBus } from '@application/contracts/EventBus';
import { requireUser } from '@application/guards/UserGuards';
import { Tank, Rack, Box } from '@domain/value-objects/Equipment';
import { EQUIPMENT_DEFAULTS, NAMING_PATTERNS } from '@odysseus/shared-schemas';
import { StorageUpdatedEvent } from '@domain/events/StorageEvents';
import { generateId } from '@domain/utils/generateId';

// COMMAND INTERFACE

export interface InitializeStorageCommand {
  userId: string;
  labId: string;
  labName: string;
  tankCount?: number;
  racksPerTank?: number;
  boxesPerRack?: number;
}

// COMMAND HANDLER

/** Creates default configuration for fresh installs. Only runs if no configuration exists. */
export class InitializeStorageCommandHandler {
  constructor(
    private storageRepository: StorageRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: InitializeStorageCommand): Promise<void> {
    const existingConfig = await this.storageRepository.getForLab(command.labId);
    if (existingConfig) {
      throw new ValidationError('Storage configuration already exists. Cannot reinitialize.');
    }

    const user = await requireUser(this.userRepository, command.userId);
    if (!user.isAdmin()) {
      throw PermissionError.configurationManagement('initialize configuration', command.userId);
    }

    const tankCount = command.tankCount ?? 1;
    const racksPerTank = command.racksPerTank ?? EQUIPMENT_DEFAULTS.MAX_RACKS_PER_TANK;
    const boxesPerRack = command.boxesPerRack ?? EQUIPMENT_DEFAULTS.BOXES_PER_RACK;

    if (tankCount < 1 || tankCount > 10) {
      throw new ValidationError('Tank count must be between 1 and 10');
    }
    if (racksPerTank < 1 || racksPerTank > 20) {
      throw new ValidationError('Racks per tank must be between 1 and 20');
    }
    // 26 = letters A–Z used for box naming
    if (boxesPerRack < 1 || boxesPerRack > 26) {
      throw new ValidationError('Boxes per rack must be between 1 and 26');
    }

    const tanks: Tank[] = [];

    for (let t = 0; t < tankCount; t++) {
      const tankId = generateId('tank');
      const tankName = NAMING_PATTERNS.TANK.DEFAULT_NAME(t + 1);

      const racks: Rack[] = [];

      for (let r = 0; r < racksPerTank; r++) {
        const rackId = generateId('rack');
        const rackName = NAMING_PATTERNS.RACK.DEFAULT_NAME(r + 1);

        const boxes: Box[] = [];

        for (let b = 0; b < boxesPerRack; b++) {
          const boxName = NAMING_PATTERNS.BOX.LETTER_NAME(b);
          boxes.push(Box.create({
            name: boxName,
            gridConfig: { rows: EQUIPMENT_DEFAULTS.GRID_ROWS, cols: EQUIPMENT_DEFAULTS.GRID_COLS },
            maxPositions: EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX,
          }));
        }

        racks.push(Rack.create({
          id: rackId,
          name: rackName,
          boxes,
          maxBoxes: boxesPerRack,
          capacity: boxesPerRack,
        }));
      }

      tanks.push(Tank.create({
        id: tankId,
        name: tankName,
        racks,
      }));
    }

    const config = Storage.fromData({
      tanks: tanks.map(t => t.toData()),
      systemSettings: {
        labName: command.labName,
        defaultResearcher: '',
        autoSave: true,
        auditTrailEnabled: true,
        syncEnabled: true
      }
    });

    // Use version 0 since no config exists yet (protects against concurrent initialization)
    await this.storageRepository.saveWithOptimisticLock(
      command.labId,
      config,
      0,
      `Initialized configuration with ${tankCount} tank(s)`,
      command.userId
    );

    await this.eventBus.publish(new StorageUpdatedEvent(
      command.userId,
      {
        tanksAdded: tankCount,
        tanksUpdated: 0,
        tanksDeleted: 0,
        racksAdded: tankCount * racksPerTank,
        racksUpdated: 0,
        racksDeleted: 0,
        boxesAdded: tankCount * racksPerTank * boxesPerRack,
        boxesUpdated: 0,
        boxesDeleted: 0,
        labNameChanged: true
      },
      command.labId
    ));
  }
}
