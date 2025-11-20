import { Configuration } from '@domain/entities/Configuration';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { ValidationService } from '@domain/services/ValidationService';
import { ConfigurationChangeDetector } from '@domain/services/ConfigurationChangeDetector';
import { User } from '@domain/entities/User';
import { Tank, Rack, Box } from '@domain/valueObjects/Equipment';
import { ValidationError } from '@domain/errors/ValidationError';
import { PermissionError } from '@domain/errors/PermissionError';
import { EventBus } from '@application/contracts/EventBus';
import type { PositionDisplayConfig } from '@odysseus/shared-schemas';
import {
  RackAssignedEvent,
  RackUnassignedEvent,
  RackReassignedEvent,
  BoxAssignedEvent,
  BoxUnassignedEvent,
  BoxReassignedEvent,
  RackLabelUpdatedEvent,
  BoxLabelUpdatedEvent
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
  configurationData: any; // JSON configuration data
  validateOnly?: boolean; // If true, validate but don't save
}

/**
 * Update Configuration Command
 * Used by frontend to update complete system + lab configuration
 */
export interface UpdateConfigurationCommand {
  userId: string;
  systemConfig: any; // SystemConfiguration from shared-schemas
  currentLab: any; // LabConfiguration from shared-schemas
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

    // Save the updated configuration
    await this.configurationRepository.save(updatedConfig);

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
    // For nested structure updates, use UpdateConfigurationCommandHandler instead
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
    // These operations should be done through UpdateConfigurationCommandHandler instead
    if (command.racks || command.boxes) {
      throw new ValidationError(
        'Updating racks and boxes requires nested structure. Use UpdateConfigurationCommandHandler instead.'
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

    // Save the updated configuration
    await this.configurationRepository.save(updatedConfig);

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
 * 
 * @example
 * const handler = new ResetConfigurationToDefaultCommandHandler(configRepo);
 * await handler.handle({
 *   userId: 'admin-user-id',
 *   confirmationToken: 'RESET_CONFIRM_TOKEN'
 * });
 */
export class ResetConfigurationToDefaultCommandHandler {
  private static readonly CONFIRMATION_TOKEN = 'RESET_CONFIRM_TOKEN';

  constructor(
    private configurationRepository: ConfigurationRepository,
    private validationService: ValidationService
  ) {}

  async handle(command: ResetConfigurationToDefaultCommand): Promise<Configuration> {
    // Validate confirmation token
    if (command.confirmationToken !== ResetConfigurationToDefaultCommandHandler.CONFIRMATION_TOKEN) {
      throw new ValidationError('Invalid confirmation token for configuration reset');
    }

    // Get user for permission validation
    const user = await this.getUserById(command.userId);
    
    // Check user has admin permissions (configuration reset is admin-only)
    if (!user.role.isAdmin()) {
      throw PermissionError.configurationManagement('reset configuration', command.userId);
    }

    // Create default configuration
    const defaultConfig = Configuration.createDefault();
    
    // Save the default configuration (this replaces current config)
    await this.configurationRepository.save(defaultConfig);

    return defaultConfig;
  }

  private async getUserById(userId: string): Promise<User> {
    throw new Error('User repository dependency needed for proper implementation');
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

      // Save imported configuration
      await this.configurationRepository.save(importedConfig);

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
 * Update Configuration Command Handler
 *
 * Updates complete system and lab configuration in one operation.
 * Used by frontend when saving full configuration changes (e.g., rack/tank modifications).
 * Validates permissions and business rules before applying changes.
 *
 * @example
 * const handler = new UpdateConfigurationCommandHandler(configRepo, validationService, userRepo);
 * await handler.handle({
 *   userId: 'user-id',
 *   systemConfig: { ... },
 *   currentLab: { ... }
 * });
 */
export class UpdateConfigurationCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private validationService: ValidationService,
    private userRepository: UserRepository,
    private eventBus: EventBus,
    private changeDetector: ConfigurationChangeDetector
  ) {}

  async handle(command: UpdateConfigurationCommand): Promise<Configuration> {
    // Get current configuration (source of truth)
    const currentConfig = await this.configurationRepository.getCurrent();
    if (!currentConfig) {
      throw new ValidationError('No configuration found. Initialize system first.');
    }

    // Get user for permission validation
    const user = await this.getUserById(command.userId);

    // Snapshot current state for change detection
    const beforeSnapshot = currentConfig.toData();
    const beforeVersion = currentConfig.version;

    // Update existing aggregate using domain method (increments version automatically)
    // Frontend sends: tanks[racks[boxes]] (nested) - MATCHES domain model now
    currentConfig.updateFromData({
      tanks: command.currentLab.equipment?.tanks || [],
      systemSettings: {
        labName: command.currentLab.name,
        defaultResearcher: '',
        autoSave: command.currentLab.settings?.enableRealTimeSync || true,
        auditTrailEnabled: command.currentLab.settings?.requireAuth || false,
        syncEnabled: command.currentLab.settings?.enableRealTimeSync || false
      }
    });

    const afterVersion = currentConfig.version;
    console.log(`[ConfigurationCommand] Version change: ${beforeVersion} → ${afterVersion}`);

    // Detect assignment changes and validate
    const assignmentChanges = this.detectAssignmentChanges(
      Configuration.fromData(beforeSnapshot),
      currentConfig
    );

    // Validate each assignment change
    for (const change of assignmentChanges) {
      if (change.type === 'assign') {
        // Check if assigned user exists
        const assignedUser = await this.userRepository.findById(change.userId!);
        if (!assignedUser) {
          throw new ValidationError(`User ${change.userId} does not exist`);
        }
        // TODO: When user deactivation is implemented, check assignedUser.isActive here
        // if (!assignedUser.isActive) {
        //   throw new ValidationError(
        //     `User ${assignedUser.username} is inactive and cannot be assigned resources`
        //   );
        // }
      }
    }

    // Enforce cascade logic: When rack unassigned, clear cascaded boxes
    const cascadeConfigData = currentConfig.toData() as any;
    for (const change of assignmentChanges) {
      if (change.type === 'unassign' && change.resourceType === 'rack') {
        // Find the rack in the new configuration
        const rack = this.findRack(currentConfig, change.resourceId);

        if (rack) {
          // Clear boxes that cascaded from this rack (no explicit assignment)
          rack.boxes.forEach((box: any) => {
            if (!box.assignedUserId) {
              // This box had no explicit assignment - it was cascaded from the rack
              // Clear its custom label (ownership is gone)
              box.customLabel = undefined;
            }
            // Boxes WITH explicit assignedUserId are left alone (preserve other users' assignments)
          });
        }
      }
    }

    // Validate the configuration update
    const validationResult = await this.validationService.validateConfigurationUpdate(
      Configuration.fromData(beforeSnapshot), // old state
      currentConfig, // new state (after mutations)
      user
    );

    if (!validationResult.isValid) {
      throw new ValidationError(
        `Configuration update validation failed: ${validationResult.errors.join(', ')}`
      );
    }

    // Detect changes for event emission (but don't emit yet)
    const changeEvents = this.changeDetector.detectChanges(
      Configuration.fromData(beforeSnapshot),
      currentConfig,
      command.userId
    );

    // Detect label changes
    const labelChanges = this.detectLabelChanges(
      Configuration.fromData(beforeSnapshot),
      currentConfig
    );

    // Emit assignment events
    const configData = currentConfig.toData() as any;
    for (const change of assignmentChanges) {
      // Find tank and rack/box names
      let tankName = '';
      let rackName = '';
      let boxName = '';

      for (const tank of configData.tanks) {
        for (const rack of tank.racks) {
          if (change.resourceType === 'rack' && rack.id === change.resourceId) {
            tankName = tank.name;
            rackName = rack.name;
            break;
          }
          for (const box of (rack.boxes as any[])) {
            if (change.resourceType === 'box' && box.id === change.resourceId) {
              tankName = tank.name;
              rackName = rack.name;
              boxName = box.name;
              break;
            }
          }
        }
      }

      // Get usernames for events
      let assignedUsername = '';
      let previousUsername = '';

      if (change.userId) {
        const assignedUser = await this.userRepository.findById(change.userId);
        assignedUsername = assignedUser?.username || 'Unknown';
      }

      if (change.previousUserId) {
        const previousUser = await this.userRepository.findById(change.previousUserId);
        previousUsername = previousUser?.username || 'Unknown';
      }

      // Emit events
      if (change.resourceType === 'rack') {
        if (change.type === 'assign') {
          // Check if this is a reassignment (had previous user)
          if (change.previousUserId) {
            changeEvents.push(new RackReassignedEvent(
              command.userId,
              change.tankId,
              tankName,
              change.rackId,
              rackName,
              change.previousUserId,
              previousUsername,
              change.userId!,
              assignedUsername
            ));
          } else {
            changeEvents.push(new RackAssignedEvent(
              command.userId,
              change.tankId,
              tankName,
              change.rackId,
              rackName,
              change.userId!,
              assignedUsername
            ));
          }
        } else {
          changeEvents.push(new RackUnassignedEvent(
            command.userId,
            change.tankId,
            tankName,
            change.rackId,
            rackName,
            change.previousUserId!,
            previousUsername
          ));
        }
      } else {
        // Box events
        if (change.type === 'assign') {
          // Check if this is a reassignment
          if (change.previousUserId) {
            changeEvents.push(new BoxReassignedEvent(
              command.userId,
              change.tankId,
              tankName,
              change.rackId,
              rackName,
              change.boxId!,
              boxName,
              change.previousUserId,
              previousUsername,
              change.userId!,
              assignedUsername
            ));
          } else {
            changeEvents.push(new BoxAssignedEvent(
              command.userId,
              change.tankId,
              tankName,
              change.rackId,
              rackName,
              change.boxId!,
              boxName,
              change.userId!,
              assignedUsername
            ));
          }
        } else {
          changeEvents.push(new BoxUnassignedEvent(
            command.userId,
            change.tankId,
            tankName,
            change.rackId,
            rackName,
            change.boxId!,
            boxName,
            change.previousUserId!,
            previousUsername
          ));
        }
      }
    }

    // Emit label events
    for (const change of labelChanges) {
      // Find tank and rack/box names from config
      const tank = configData.tanks.find((t: any) => t.id === change.tankId);
      const tankName = tank?.name || '';

      if (change.type === 'rack') {
        const rack = tank?.racks.find((r: any) => r.id === change.rackId);
        const rackName = rack?.name || '';

        changeEvents.push(new RackLabelUpdatedEvent(
          command.userId,
          change.tankId,
          tankName,
          change.rackId,
          rackName,
          change.oldLabel,
          change.newLabel
        ));
      } else {
        const rack = tank?.racks.find((r: any) => r.id === change.rackId);
        const rackName = rack?.name || '';
        const box = rack?.boxes.find((b: any) => b.id === change.boxId);
        const boxName = box?.name || '';

        changeEvents.push(new BoxLabelUpdatedEvent(
          command.userId,
          change.tankId,
          tankName,
          change.rackId,
          rackName,
          change.boxId!,
          boxName,
          change.oldLabel,
          change.newLabel
        ));
      }
    }

    // Save the updated configuration (with incremented version) FIRST
    // This ensures the database has the new version before Socket events fire
    await this.configurationRepository.save(currentConfig);

    // Emit domain events AFTER save completes
    // This ensures clients refetch the correct version from database
    for (const event of changeEvents) {
      this.eventBus.publish(event);
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

  /**
   * Find a rack by ID across all tanks in configuration
   */
  private findRack(config: Configuration, rackId: string): any | undefined {
    const configData = config.toData();
    for (const tank of configData.tanks) {
      const rack = tank.racks.find((r: any) => r.id === rackId);
      if (rack) return rack;
    }
    return undefined;
  }

  /**
   * Detect changes in resource assignments between configurations
   * Compares assignedUserId fields on racks and boxes
   */
  private detectAssignmentChanges(
    before: Configuration,
    after: Configuration
  ): AssignmentChange[] {
    const changes: AssignmentChange[] = [];
    const beforeData = before.toData() as any;
    const afterData = after.toData() as any;

    // Compare each tank
    afterData.tanks.forEach((tank: any) => {
      const beforeTank = beforeData.tanks.find((t: any) => t.id === tank.id);
      if (!beforeTank) return;

      // Compare each rack
      tank.racks.forEach((rack: any) => {
        const beforeRack = beforeTank.racks.find((r: any) => r.id === rack.id);
        if (!beforeRack) return;

        // Rack assignment changed
        if (rack.assignedUserId !== beforeRack.assignedUserId) {
          if (rack.assignedUserId) {
            changes.push({
              type: 'assign',
              resourceType: 'rack',
              resourceId: rack.id,
              userId: rack.assignedUserId,
              previousUserId: beforeRack.assignedUserId,
              tankId: tank.id,
              rackId: rack.id
            });
          } else {
            changes.push({
              type: 'unassign',
              resourceType: 'rack',
              resourceId: rack.id,
              previousUserId: beforeRack.assignedUserId,
              tankId: tank.id,
              rackId: rack.id
            });
          }
        }

        // Compare each box
        rack.boxes.forEach((box: any) => {
          const beforeBox = beforeRack.boxes.find((b: any) => b.id === box.id);
          if (!beforeBox) return;

          // Box assignment changed
          if (box.assignedUserId !== beforeBox.assignedUserId) {
            if (box.assignedUserId) {
              changes.push({
                type: 'assign',
                resourceType: 'box',
                resourceId: box.id,
                userId: box.assignedUserId,
                previousUserId: beforeBox.assignedUserId,
                tankId: tank.id,
                rackId: rack.id,
                boxId: box.id
              });
            } else {
              changes.push({
                type: 'unassign',
                resourceType: 'box',
                resourceId: box.id,
                previousUserId: beforeBox.assignedUserId,
                tankId: tank.id,
                rackId: rack.id,
                boxId: box.id
              });
            }
          }
        });
      });
    });

    return changes;
  }

  /**
   * Detect changes in custom labels between configurations
   * Compares customLabel fields on racks and boxes
   */
  private detectLabelChanges(
    before: Configuration,
    after: Configuration
  ): { type: 'rack' | 'box'; resourceId: string; oldLabel?: string; newLabel?: string; tankId: string; rackId: string; boxId?: string }[] {
    const changes: { type: 'rack' | 'box'; resourceId: string; oldLabel?: string; newLabel?: string; tankId: string; rackId: string; boxId?: string }[] = [];
    const beforeData = before.toData() as any;
    const afterData = after.toData() as any;

    // Compare each tank
    afterData.tanks.forEach((tank: any) => {
      const beforeTank = beforeData.tanks.find((t: any) => t.id === tank.id);
      if (!beforeTank) return;

      // Compare each rack
      tank.racks.forEach((rack: any) => {
        const beforeRack = beforeTank.racks.find((r: any) => r.id === rack.id);
        if (!beforeRack) return;

        // Rack label changed
        if (rack.customLabel !== beforeRack.customLabel) {
          changes.push({
            type: 'rack',
            resourceId: rack.id,
            oldLabel: beforeRack.customLabel,
            newLabel: rack.customLabel,
            tankId: tank.id,
            rackId: rack.id
          });
        }

        // Compare each box
        rack.boxes.forEach((box: any) => {
          const beforeBox = beforeRack.boxes.find((b: any) => b.id === box.id);
          if (!beforeBox) return;

          // Box label changed
          if (box.customLabel !== beforeBox.customLabel) {
            changes.push({
              type: 'box',
              resourceId: box.id,
              oldLabel: beforeBox.customLabel,
              newLabel: box.customLabel,
              tankId: tank.id,
              rackId: rack.id,
              boxId: box.id
            });
          }
        });
      });
    });

    return changes;
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

    // Save the updated configuration
    await this.configurationRepository.saveWithVersioning(
      updatedConfig,
      `Updated position display for box ${command.boxId} in tank ${command.tankId}, rack ${command.rackId}`
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

    // Save the updated configuration
    await this.configurationRepository.saveWithVersioning(
      updatedConfig,
      command.positionDisplay
        ? `Updated lab default position display to ${command.positionDisplay.format}`
        : 'Cleared lab default position display'
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
  userId?: string;
  previousUserId?: string;
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
