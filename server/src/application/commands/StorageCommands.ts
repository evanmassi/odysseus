/**
 * Storage CQRS Commands
 *
 * System-wide storage operations not tied to a single tank, rack, or box.
 */

import type { EventBus } from '@application/contracts/EventBus';
import { rejectDemoConfigOperation, rejectIfSeeded } from '@application/guards/DemoGuards';
import { requireUser } from '@application/guards/UserGuards';
import { Storage } from '@domain/entities/Storage';
import { PermissionError } from '@domain/errors/PermissionError';
import { ValidationError } from '@domain/errors/ValidationError';
import { RackLabelUpdatedEvent, BoxLabelUpdatedEvent } from '@domain/events/StorageEvents';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { TubeRepository } from '@domain/repositories/TubeRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type {
  AccessControlService,
  ResourceWithOwnership,
} from '@domain/services/AccessControlService';
import type { ValidationService } from '@domain/services/ValidationService';
import type { StorageImportData } from '@domain/types/storageTypes';

// COMMAND INTERFACES

export interface UpdateSystemStorageCommand {
  userId: string;
  labId: string;
  systemSettings: { labName?: string };
}

export interface ResetStorageToDefaultCommand {
  userId: string;
  labId: string;
  confirmationToken: string;
}

export interface ImportStorageCommand {
  userId: string;
  labId: string;
  configurationData: StorageImportData;
  validateOnly?: boolean;
}

export interface UpdateResourceLabelCommand {
  userId: string;
  labId: string;
  resourceType: 'rack' | 'box';
  tankId: string;
  rackId: string;
  boxId?: string;
  customLabel?: string;
}

// RESPONSE TYPES

export interface ImportResult {
  isValid: boolean;
  configuration: Storage | null;
  warnings: string[];
  errors: string[];
}

// COMMAND HANDLERS

export class UpdateSystemStorageCommandHandler {
  constructor(
    private storageRepository: StorageRepository,
    private validationService: ValidationService,
    private userRepository: UserRepository
  ) {}

  async handle(command: UpdateSystemStorageCommand): Promise<Storage> {
    const currentConfig = await this.storageRepository.getForLab(command.labId);
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await requireUser(this.userRepository, command.userId);
    // The only setting here is the lab's display name, and this route is reachable by any
    // lab_admin — which every demo visitor is. Renaming the lab would outlast their visit.
    rejectDemoConfigOperation(user, 'Renaming the lab');

    const updatedConfig = currentConfig.updateSystemSettings(command.systemSettings);

    const validationResult = await this.validationService.validateStorageUpdate(
      currentConfig,
      updatedConfig,
      user,
      command.labId
    );

    if (!validationResult.isValid) {
      throw new ValidationError(
        `Configuration update validation failed: ${validationResult.errors.join(', ')}`
      );
    }

    const expectedVersion = currentConfig.version;
    const newVersion = await this.storageRepository.saveWithOptimisticLock(
      command.labId,
      updatedConfig,
      expectedVersion,
      'Updated system configuration',
      command.userId
    );
    updatedConfig.applyPersistedVersion(newVersion);

    return updatedConfig;
  }
}

/**
 * Resets entire system configuration to factory defaults.
 * Destructive operation requiring confirmation token.
 * Validates that no tubes exist before resetting to prevent orphaned data.
 */
export class ResetStorageToDefaultCommandHandler {
  private static readonly CONFIRMATION_TOKEN = 'RESET_CONFIRM_TOKEN';

  constructor(
    private storageRepository: StorageRepository,
    private tubeRepository: TubeRepository,
    private userRepository: UserRepository
  ) {}

  async handle(command: ResetStorageToDefaultCommand): Promise<Storage> {
    if (command.confirmationToken !== ResetStorageToDefaultCommandHandler.CONFIRMATION_TOKEN) {
      throw new ValidationError('Invalid confirmation token for configuration reset');
    }

    const user = await requireUser(this.userRepository, command.userId);
    if (!user.isAdmin()) {
      throw PermissionError.configurationManagement('reset configuration', command.userId);
    }
    rejectDemoConfigOperation(user, 'Reset to default');

    const tubeCount = await this.tubeRepository.countByLabId(command.labId);
    if (tubeCount > 0) {
      throw new ValidationError(
        `Cannot reset configuration: ${tubeCount} tube(s) exist in the system. ` +
          `Delete all tubes before resetting the configuration to prevent orphaned data.`
      );
    }

    const currentConfig = await this.storageRepository.getForLab(command.labId);
    const expectedVersion = currentConfig?.version ?? 0;

    const defaultConfig = Storage.createDefault();

    const newVersion = await this.storageRepository.saveWithOptimisticLock(
      command.labId,
      defaultConfig,
      expectedVersion,
      'Reset configuration to defaults',
      command.userId
    );
    defaultConfig.applyPersistedVersion(newVersion);

    return defaultConfig;
  }
}

export class ImportStorageCommandHandler {
  constructor(
    private storageRepository: StorageRepository,
    private validationService: ValidationService,
    private userRepository: UserRepository
  ) {}

  async handle(command: ImportStorageCommand): Promise<ImportResult> {
    try {
      const user = await requireUser(this.userRepository, command.userId);
      rejectDemoConfigOperation(user, 'Import configuration');

      const importedConfig = Storage.fromData(command.configurationData);

      if (command.validateOnly) {
        return {
          isValid: true,
          configuration: importedConfig,
          warnings: [],
          errors: [],
        };
      }

      const currentConfig = await this.storageRepository.getForLab(command.labId);

      if (currentConfig) {
        const validationResult = await this.validationService.validateStorageUpdate(
          currentConfig,
          importedConfig,
          user,
          command.labId
        );

        if (!validationResult.isValid) {
          return {
            isValid: false,
            configuration: null,
            warnings: [],
            errors: validationResult.errors,
          };
        }
      }

      const expectedVersion = currentConfig?.version ?? 0;
      const newVersion = await this.storageRepository.saveWithOptimisticLock(
        command.labId,
        importedConfig,
        expectedVersion,
        'Imported configuration',
        command.userId
      );
      importedConfig.applyPersistedVersion(newVersion);

      return {
        isValid: true,
        configuration: importedConfig,
        warnings: [],
        errors: [],
      };
    } catch (error) {
      return {
        isValid: false,
        configuration: null,
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Unknown import error'],
      };
    }
  }
}

/**
 * Updates custom labels on racks and boxes.
 * Uses AccessControlService.canEditResource() for permission checking,
 * allowing resource owners (not just admins) to set their own labels.
 */
export class UpdateResourceLabelCommandHandler {
  constructor(
    private storageRepository: StorageRepository,
    private userRepository: UserRepository,
    private accessControlService: AccessControlService,
    private eventBus: EventBus
  ) {}

  async handle(command: UpdateResourceLabelCommand): Promise<Storage> {
    if (command.resourceType === 'box' && !command.boxId) {
      throw new ValidationError('boxId is required for box label updates');
    }

    const MAX_LABEL_LENGTH = 50;
    if (command.customLabel && command.customLabel.length > MAX_LABEL_LENGTH) {
      throw new ValidationError(`Custom label cannot exceed ${MAX_LABEL_LENGTH} characters`);
    }

    const currentConfig = await this.storageRepository.getForLab(command.labId);
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    const user = await requireUser(this.userRepository, command.userId);
    // Relabelling a seeded tank outlasts the visit and the nightly reset, which restores content
    // but not storage names. Their own tanks stay theirs to label.
    rejectIfSeeded(user, currentConfig, command.tankId, command.rackId, command.boxId);

    let resource: (ResourceWithOwnership & { customLabel?: string }) | null = null;
    let parentRack: ResourceWithOwnership | undefined = undefined;
    let tankName = '';
    let rackName = '';
    let boxName = '';

    if (command.resourceType === 'rack') {
      const result = currentConfig.getRack(command.tankId, command.rackId);
      if (!result) {
        throw new ValidationError(`Rack '${command.rackId}' not found in tank '${command.tankId}'`);
      }
      resource = result.rack;
      tankName = result.tank.name;
      rackName = result.rack.name;
    } else {
      const result = currentConfig.getBox(command.tankId, command.rackId, command.boxId!);
      if (!result) {
        throw new ValidationError(
          `Box '${command.boxId}' not found in tank '${command.tankId}', rack '${command.rackId}'`
        );
      }
      resource = result.box;
      parentRack = result.rack;
      tankName = result.tank.name;
      rackName = result.rack.name;
      boxName = result.box.name;
    }

    const canEdit = this.accessControlService.canEditResource(user, resource, parentRack);

    if (!canEdit) {
      throw new PermissionError(
        `You do not have permission to edit this ${command.resourceType}'s label.`
      );
    }

    const oldLabel = resource.customLabel;

    const expectedVersion = currentConfig.version;
    currentConfig.updateResourceCustomLabel(
      command.resourceType,
      command.tankId,
      command.rackId,
      command.boxId,
      command.customLabel
    );

    const newVersion = await this.storageRepository.saveWithOptimisticLock(
      command.labId,
      currentConfig,
      expectedVersion,
      `Updated ${command.resourceType} label`,
      command.userId
    );
    currentConfig.applyPersistedVersion(newVersion);

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty/whitespace label must coerce to undefined; ?? would keep ''
    const newLabel = command.customLabel?.trim() || undefined;
    if (oldLabel !== newLabel) {
      if (command.resourceType === 'rack') {
        const event = new RackLabelUpdatedEvent(
          command.userId,
          command.tankId,
          tankName,
          command.rackId,
          rackName,
          oldLabel,
          newLabel,
          command.labId
        );
        await this.eventBus.publish(event);
      } else {
        const event = new BoxLabelUpdatedEvent(
          command.userId,
          command.tankId,
          tankName,
          command.rackId,
          rackName,
          command.boxId!,
          boxName,
          oldLabel,
          newLabel,
          command.labId
        );
        await this.eventBus.publish(event);
      }
    }

    return currentConfig;
  }
}
