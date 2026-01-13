import { Configuration } from '@domain/entities/Configuration';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { TubeRepository } from '@domain/repositories/TubeRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { ValidationService } from '@domain/services/ValidationService';
import { ConfigurationChangeDetector } from '@domain/services/ConfigurationChangeDetector';
import { AccessControlService } from '@domain/services/AccessControlService';
import { User } from '@domain/entities/User';
import { Tank, Rack, Box } from '@domain/valueObjects/Equipment';
import { ValidationError } from '@domain/errors/ValidationError';
import { PermissionError } from '@domain/errors/PermissionError';
import { EventBus } from '@application/contracts/EventBus';
import { logger } from '@utils/logger';
import type { PositionDisplayConfig } from '@odysseus/shared-schemas';
import type { ResourceWithOwnership } from '@domain/services/AccessControlService';
import type { ConfigurationImportData } from '@domain/types/Configuration';
import {
  RackAssignedEvent,
  RackUnassignedEvent,
  RackReassignedEvent,
  BoxAssignedEvent,
  BoxUnassignedEvent,
  BoxReassignedEvent,
  RackLabelUpdatedEvent,
  BoxLabelUpdatedEvent,
  BulkResourcesUnassignedEvent,
  BulkResourcesReassignedEvent
} from '@domain/events/ConfigurationEvents';

// CONFIGURATION COMMAND CONTRACTS

/**
 * Update System Configuration Command
 */
export interface UpdateSystemConfigurationCommand {
  userId: string;
  systemSettings: {
    labName?: string;
    timezone?: string;
    dateFormat?: string;
    temperatureUnit?: 'celsius' | 'fahrenheit';
    enableAuditTrail?: boolean;
    autoBackupEnabled?: boolean;
    backupRetentionDays?: number;
  };
}

/**
 * Update Equipment Configuration Command
 */
export interface UpdateEquipmentConfigurationCommand {
  userId: string;
  tanks?: Array<{
    id: string;
    name: string;
    capacity: number;
    isActive: boolean;
  }>;
  racks?: Array<{
    id: string;
    tankId: string;
    capacity: number;
    isActive: boolean;
  }>;
  boxes?: Array<{
    name: string;
    rackId: number;
    tankId: string;
    rows: number;
    columns: number;
    isActive: boolean;
  }>;
}

/**
 * Reset Configuration to Default Command
 */
export interface ResetConfigurationToDefaultCommand {
  userId: string;
  confirmationToken: string; // Safety mechanism for destructive operation
}

/**
 * Import Configuration Command
 */
export interface ImportConfigurationCommand {
  userId: string;
  configurationData: ConfigurationImportData;
  validateOnly?: boolean;
}

// CONFIGURATION COMMAND HANDLERS

/**
 * Update System Configuration Command Handler
 * 
 * Updates system-wide configuration settings like lab name, timezone, etc.
 * Validates permissions and business rules before applying changes.
 * 
 * @example
 * const handler = new UpdateSystemConfigurationCommandHandler(configRepo, validationService);
 * await handler.handle({
 *   userId: 'admin-user-id',
 *   systemSettings: { labName: 'New Lab Name', timezone: 'UTC' }
 * });
 */
export class UpdateSystemConfigurationCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private validationService: ValidationService,
    private userRepository: UserRepository
  ) {}

  async handle(command: UpdateSystemConfigurationCommand): Promise<Configuration> {
    // Get current configuration
    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    // Validate user permissions through validation service
    // (ValidationService will check user permissions via AccessControlService)
    const user = await this.getUserById(command.userId);
    
    // Create updated configuration with new system settings
    const updatedConfig = currentConfig.updateSystemSettings(command.systemSettings);
    
    // Validate the configuration update
    const validationResult = await this.validationService.validateConfigurationUpdate(
      currentConfig,
      updatedConfig,
      user
    );

    if (!validationResult.isValid) {
      throw new ValidationError(
        `Configuration update validation failed: ${validationResult.errors.join(', ')}`
      );
    }

    // Save the updated configuration with optimistic locking
    const expectedVersion = currentConfig.version;
    await this.configurationRepository.saveWithOptimisticLock(
      updatedConfig,
      expectedVersion,
      'Updated system configuration',
      command.userId
    );

    return updatedConfig;
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
 * Update Equipment Configuration Command Handler
 * 
 * Updates equipment configuration (tanks, racks, boxes).
 * Validates that changes don't break existing tube assignments.
 * 
 * @example
 * const handler = new UpdateEquipmentConfigurationCommandHandler(configRepo, validationService);
 * await handler.handle({
 *   userId: 'admin-user-id',
 *   tanks: [{ id: 'tank-1', name: 'Main Tank', capacity: 100, isActive: true }]
 * });
 */
export class UpdateEquipmentConfigurationCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private validationService: ValidationService
  ) {}

  async handle(command: UpdateEquipmentConfigurationCommand): Promise<Configuration> {
    // Get current configuration
    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    // Get user for permission validation
    const user = await this.getUserById(command.userId);

    // NOTE: This handler uses flat structure (legacy API)
    // For equipment updates, use the CQRS handlers (AddTankCommandHandler, etc.)
    // This handler is deprecated but kept for backward compatibility

    // Build updated equipment configuration with nested structure
    let updatedConfig = currentConfig;

    if (command.tanks) {
      // Convert flat tank data to nested structure (tanks with empty racks for now)
      const tanks = command.tanks.map(t =>
        Tank.create(t.id, t.name, [], t.capacity, t.isActive)
      );
      updatedConfig = updatedConfig.updateTanks(tanks);
    }

    // Note: racks and boxes updates require tankId/rackId context in nested model
    // These operations should be done through CQRS handlers (AddRacksCommandHandler, etc.)
    if (command.racks || command.boxes) {
      throw new ValidationError(
        'Updating racks and boxes requires nested structure. Use CQRS endpoints instead.'
      );
    }

    // Validate the configuration update
    const validationResult = await this.validationService.validateConfigurationUpdate(
      currentConfig,
      updatedConfig,
      user
    );

    if (!validationResult.isValid) {
      throw new ValidationError(
        `Equipment configuration update failed: ${validationResult.errors.join(', ')}`
      );
    }

    // Save the updated configuration with optimistic locking
    const expectedVersion = currentConfig.version;
    await this.configurationRepository.saveWithOptimisticLock(
      updatedConfig,
      expectedVersion,
      'Updated equipment configuration',
      command.userId
    );

    return updatedConfig;
  }

  private async getUserById(userId: string): Promise<User> {
    throw new Error('User repository dependency needed for proper implementation');
  }
}

/**
 * Reset Configuration to Default Command Handler
 *
 * Resets entire system configuration to factory defaults.
 * This is a destructive operation requiring special confirmation.
 * Validates that no tubes exist before resetting to prevent orphaned data.
 */
export class ResetConfigurationToDefaultCommandHandler {
  private static readonly CONFIRMATION_TOKEN = 'RESET_CONFIRM_TOKEN';

  constructor(
    private configurationRepository: ConfigurationRepository,
    private tubeRepository: TubeRepository,
    private userRepository: UserRepository
  ) {}

  async handle(command: ResetConfigurationToDefaultCommand): Promise<Configuration> {
    if (command.confirmationToken !== ResetConfigurationToDefaultCommandHandler.CONFIRMATION_TOKEN) {
      throw new ValidationError('Invalid confirmation token for configuration reset');
    }

    const user = await this.getUserById(command.userId);
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('reset configuration', command.userId);
    }

    // Prevent orphaning tubes - check if any exist before resetting
    const tubeCount = await this.tubeRepository.count();
    if (tubeCount > 0) {
      throw new ValidationError(
        `Cannot reset configuration: ${tubeCount} tube(s) exist in the system. ` +
        `Delete all tubes before resetting the configuration to prevent orphaned data.`
      );
    }

    const currentConfig = await this.configurationRepository.getCurrent();
    const expectedVersion = currentConfig?.version ?? 0;

    const defaultConfig = Configuration.createDefault();

    await this.configurationRepository.saveWithOptimisticLock(
      defaultConfig,
      expectedVersion,
      'Reset configuration to defaults',
      command.userId
    );

    return defaultConfig;
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
 * Import Configuration Command Handler
 * 
 * Imports configuration from external JSON data.
 * Validates imported data before applying changes.
 * 
 * @example
 * const handler = new ImportConfigurationCommandHandler(configRepo, validationService);
 * const result = await handler.handle({
 *   userId: 'admin-user-id',
 *   configurationData: importedJson,
 *   validateOnly: true
 * });
 */
export class ImportConfigurationCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private validationService: ValidationService
  ) {}

  async handle(command: ImportConfigurationCommand): Promise<ImportResult> {
    try {
      // Get user for permission validation
      const user = await this.getUserById(command.userId);

      // Parse and validate imported configuration
      const importedConfig = Configuration.fromData(command.configurationData);
      
      // If validate-only mode, return validation results without saving
      if (command.validateOnly) {
        return {
          isValid: true,
          configuration: importedConfig,
          warnings: [],
          errors: []
        };
      }

      // Get current configuration for comparison
      const currentConfig = await this.configurationRepository.getCurrent();
      
      if (currentConfig) {
        // Validate the configuration update
        const validationResult = await this.validationService.validateConfigurationUpdate(
          currentConfig,
          importedConfig,
          user
        );

        if (!validationResult.isValid) {
          return {
            isValid: false,
            configuration: null,
            warnings: [],
            errors: validationResult.errors
          };
        }
      }

      // Save imported configuration with optimistic locking
      const expectedVersion = currentConfig?.version ?? 0;
      await this.configurationRepository.saveWithOptimisticLock(
        importedConfig,
        expectedVersion,
        'Imported configuration',
        command.userId
      );

      return {
        isValid: true,
        configuration: importedConfig,
        warnings: [],
        errors: []
      };

    } catch (error) {
      return {
        isValid: false,
        configuration: null,
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Unknown import error']
      };
    }
  }

  private async getUserById(userId: string): Promise<User> {
    throw new Error('User repository dependency needed for proper implementation');
  }
}

/**
 * Update Box Position Display Command
 */
export interface UpdateBoxPositionDisplayCommand {
  userId: string;
  tankId: string;
  rackId: string;
  boxId: string;
  positionDisplay: PositionDisplayConfig | null; // null means reset to default
}

/**
 * Update Box Position Display Command Handler
 *
 * Updates the position display configuration for a specific box.
 * This allows boxes to use different labeling formats (numeric vs alphanumeric).
 *
 * Uses domain method to update box configuration rather than direct manipulation,
 * ensuring business rules and validation are applied.
 *
 * @example
 * await handler.handle({
 *   userId: 'user-id',
 *   tankId: 'tank-1',
 *   rackId: '1',
 *   boxId: 'A',
 *   positionDisplay: { format: 'alphanumeric', alphanumericConfig: { ... } }
 * });
 */
export class UpdateBoxPositionDisplayCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private validationService: ValidationService,
    private userRepository: UserRepository
  ) {}

  async handle(command: UpdateBoxPositionDisplayCommand): Promise<Configuration> {
    // Get current configuration
    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    // Get user for permission validation
    const user = await this.getUserById(command.userId);

    // Validate that the box exists
    const box = currentConfig.equipment.findBox(
      command.tankId,
      command.rackId,
      command.boxId
    );

    if (!box) {
      throw new ValidationError(
        `Box '${command.boxId}' not found in tank '${command.tankId}', rack ${command.rackId}`
      );
    }

    // Update box position display configuration
    const updatedConfig = currentConfig.updateBoxPositionDisplay(
      command.tankId,
      command.rackId,
      command.boxId,
      command.positionDisplay
    );

    // Validate the configuration update
    const validationResult = await this.validationService.validateConfigurationUpdate(
      currentConfig,
      updatedConfig,
      user
    );

    if (!validationResult.isValid) {
      throw new ValidationError(
        `Box position display update failed: ${validationResult.errors.join(', ')}`
      );
    }

    // Save the updated configuration with optimistic locking
    const expectedVersion = currentConfig.version;
    await this.configurationRepository.saveWithOptimisticLock(
      updatedConfig,
      expectedVersion,
      `Updated position display for box ${command.boxId} in tank ${command.tankId}, rack ${command.rackId}`,
      command.userId
    );

    return updatedConfig;
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
 * Update Lab Default Position Display Command
 *
 * Sets the lab-wide default position display format.
 * This affects all boxes that don't have a custom position display override.
 */
export interface UpdateLabDefaultPositionDisplayCommand {
  userId: string;
  positionDisplay: PositionDisplayConfig | null;
}

/**
 * Update Lab Default Position Display Command Handler
 *
 * Handles updating the lab-wide default position display configuration.
 * Pass null to clear the lab default and fall back to system default (alphanumeric).
 */
export class UpdateLabDefaultPositionDisplayCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private validationService: ValidationService,
    private userRepository: UserRepository
  ) {}

  async handle(command: UpdateLabDefaultPositionDisplayCommand): Promise<Configuration> {
    // Get current configuration
    const currentConfig = await this.configurationRepository.getCurrent();

    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize configuration first.');
    }

    // Get user for permission validation
    const user = await this.getUserById(command.userId);

    // Update lab default position display
    const updatedConfig = currentConfig.updateLabDefaultPositionDisplay(
      command.positionDisplay
    );

    // Validate the configuration update
    const validationResult = await this.validationService.validateConfigurationUpdate(
      currentConfig,
      updatedConfig,
      user
    );

    if (!validationResult.isValid) {
      throw new ValidationError(
        `Lab default position display update failed: ${validationResult.errors.join(', ')}`
      );
    }

    // Save the updated configuration with optimistic locking
    const expectedVersion = currentConfig.version;
    await this.configurationRepository.saveWithOptimisticLock(
      updatedConfig,
      expectedVersion,
      command.positionDisplay
        ? `Updated lab default position display to ${command.positionDisplay.format}`
        : 'Cleared lab default position display',
      command.userId
    );

    return updatedConfig;
  }

  private async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError(`User not found: ${userId}`);
    }
    return user;
  }
}

// ASSIGNMENT TYPES

/**
 * Assignment Change Tracking
 * Used to detect and validate resource assignment changes
 */
export interface AssignmentChange {
  type: 'assign' | 'unassign';
  resourceType: 'rack' | 'box';
  resourceId: string;
  userId?: string | null;
  previousUserId?: string | null;
  tankId: string;
  rackId: string;
  boxId?: string;
}

// RESPONSE TYPES

/**
 * Configuration Import Result
 */
export interface ImportResult {
  isValid: boolean;
  configuration: Configuration | null;
  warnings: string[];
  errors: string[];
}

/**
 * Update Resource Label Command
 *
 * Allows resource owners to set a custom label on their assigned resources.
 * This uses fine-grained permissions (canEditResource) rather than admin-only
 * config management permissions.
 */
export interface UpdateResourceLabelCommand {
  userId: string;
  resourceType: 'rack' | 'box';
  tankId: string;
  rackId: string;
  boxId?: string; // Required for box type
  customLabel?: string; // Empty/undefined = clear label
}

/**
 * Update Resource Label Command Handler
 *
 * Handles updating custom labels on racks and boxes.
 * Uses AccessControlService.canEditResource() for permission checking,
 * allowing resource owners (not just admins) to set their own labels.
 *
 * @example
 * await handler.handle({
 *   userId: 'user-id',
 *   resourceType: 'rack',
 *   tankId: 'tank-1',
 *   rackId: '1',
 *   customLabel: 'My Samples'
 * });
 */
export class UpdateResourceLabelCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private userRepository: UserRepository,
    private accessControlService: AccessControlService,
    private eventBus: EventBus
  ) {}

  async handle(command: UpdateResourceLabelCommand): Promise<Configuration> {
    // Validate required fields
    if (command.resourceType === 'box' && !command.boxId) {
      throw new ValidationError('boxId is required for box label updates');
    }

    // Validate label length (matches client-side 50 char limit)
    const MAX_LABEL_LENGTH = 50;
    if (command.customLabel && command.customLabel.length > MAX_LABEL_LENGTH) {
      throw new ValidationError(`Custom label cannot exceed ${MAX_LABEL_LENGTH} characters`);
    }

    // Get current configuration
    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    // Get user for permission validation
    const user = await this.getUserById(command.userId);

    // Get resource and parent for permission check
    let resource: ResourceWithOwnership & { customLabel?: string } | null = null;
    let parentRack: ResourceWithOwnership | undefined = undefined;
    let tankName = '';
    let rackName = '';
    let boxName = '';

    if (command.resourceType === 'rack') {
      const result = currentConfig.getRack(command.tankId, command.rackId);
      if (!result) {
        throw new ValidationError(
          `Rack '${command.rackId}' not found in tank '${command.tankId}'`
        );
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

    // Check permission using AccessControlService
    const canEdit = this.accessControlService.canEditResource(
      user,
      resource,
      parentRack
    );

    if (!canEdit) {
      throw new PermissionError(
        `User ${user.username} does not have permission to edit this ${command.resourceType}'s label`
      );
    }

    // Store old label for event
    const oldLabel = resource.customLabel;

    // Update the label
    const expectedVersion = currentConfig.version;
    currentConfig.updateResourceCustomLabel(
      command.resourceType,
      command.tankId,
      command.rackId,
      command.boxId,
      command.customLabel
    );

    // Save the updated configuration with optimistic locking
    await this.configurationRepository.saveWithOptimisticLock(
      currentConfig,
      expectedVersion,
      `Updated ${command.resourceType} label`,
      command.userId
    );

    // Emit label change event if label actually changed
    const newLabel = command.customLabel?.trim() || undefined;
    if (oldLabel !== newLabel) {
      if (command.resourceType === 'rack') {
        await this.eventBus.publish(new RackLabelUpdatedEvent(
          command.userId,
          command.tankId,
          tankName,
          command.rackId,
          rackName,
          oldLabel,
          newLabel
        ));
      } else {
        await this.eventBus.publish(new BoxLabelUpdatedEvent(
          command.userId,
          command.tankId,
          tankName,
          command.rackId,
          rackName,
          command.boxId!,
          boxName,
          oldLabel,
          newLabel
        ));
      }
    }

    return currentConfig;
  }

  private async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError(`User not found: ${userId}`);
    }
    return user;
  }
}
