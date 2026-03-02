/**
 * Initialize Configuration CQRS Command
 *
 * Creates default configuration for fresh installs.
 */

import { Configuration } from '@domain/entities/Configuration';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { User } from '@domain/entities/User';
import { ValidationError } from '@domain/errors/ValidationError';
import { PermissionError } from '@domain/errors/PermissionError';
import { EventBus } from '@application/contracts/EventBus';
import { Tank, Rack, Box } from '@domain/valueObjects/Equipment';
import { EQUIPMENT_DEFAULTS, NAMING_PATTERNS } from '@odysseus/shared-schemas';
import { ConfigurationUpdatedEvent } from '@domain/events/ConfigurationEvents';
import { generateId } from '@domain/utils/generateId';

// COMMAND INTERFACE

export interface InitializeConfigurationCommand {
  userId: string;
  labId: string;
  labName: string;
  tankCount?: number;
  racksPerTank?: number;
  boxesPerRack?: number;
}

// COMMAND HANDLER

/** Creates default configuration for fresh installs. Only runs if no configuration exists. */
export class InitializeConfigurationCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: InitializeConfigurationCommand): Promise<void> {
    const existingConfig = await this.configurationRepository.getForLab(command.labId);
    if (existingConfig) {
      throw new ValidationError('Configuration already exists. Cannot reinitialize.');
    }

    const user = await this.getUserById(command.userId);
    if (!user.role.isAdmin()) {
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

    const config = Configuration.fromData({
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
    await this.configurationRepository.saveWithOptimisticLock(
      config,
      0,
      `Initialized configuration with ${tankCount} tank(s)`,
      command.userId,
      command.labId
    );

    await this.eventBus.publish(new ConfigurationUpdatedEvent(
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
      }
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
