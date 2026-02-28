import { EquipmentConfiguration, Tank, Rack, Box } from '@domain/valueObjects/Equipment';
import { ValidationError } from '@domain/errors/ValidationError';
import { PermissionError } from '@domain/errors/PermissionError';
import { Location } from '@domain/valueObjects/Location';
import { generateId } from '@domain/utils/generateId';
import {
  EQUIPMENT_DEFAULTS,
  NAMING_PATTERNS,
  SYSTEM_DEFAULTS,
  type PositionDisplayConfig,
} from '@odysseus/shared-schemas';

/**
 * Configuration Entity (System Settings Aggregate Root)
 * Represents the complete system configuration including equipment
 * Contains all business logic for system configuration management
 */
export class Configuration {
  private constructor(
    private _equipment: EquipmentConfiguration,
    private _systemSettings: SystemSettings,
    private _updatedAt: Date,
    private _version: number
  ) {
    this.validate();
  }

  /**
   * Factory method to create default configuration
   */
  static createDefault(): Configuration {
    // Create default boxes A-J for each rack
    const defaultBoxes: Box[] = [];
    for (let i = 0; i < EQUIPMENT_DEFAULTS.BOXES_PER_RACK; i++) {
      const boxName = NAMING_PATTERNS.BOX.LETTER_NAME(i); // A, B, C, ..., J
      defaultBoxes.push(Box.create(
        boxName,
        { rows: EQUIPMENT_DEFAULTS.GRID_ROWS, cols: EQUIPMENT_DEFAULTS.GRID_COLS },
        EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX,
        undefined, // positionDisplay - use default
        true
      ));
    }

    const defaultRacks = [
      Rack.create(generateId('rack'), NAMING_PATTERNS.RACK.DEFAULT_NAME(1), [...defaultBoxes], EQUIPMENT_DEFAULTS.BOXES_PER_RACK, EQUIPMENT_DEFAULTS.BOXES_PER_RACK, true),
      Rack.create(generateId('rack'), NAMING_PATTERNS.RACK.DEFAULT_NAME(2), [...defaultBoxes], EQUIPMENT_DEFAULTS.BOXES_PER_RACK, EQUIPMENT_DEFAULTS.BOXES_PER_RACK, true),
      Rack.create(generateId('rack'), NAMING_PATTERNS.RACK.DEFAULT_NAME(3), [...defaultBoxes], EQUIPMENT_DEFAULTS.BOXES_PER_RACK, EQUIPMENT_DEFAULTS.BOXES_PER_RACK, true)
    ];

    const defaultTanks = [
      Tank.create(generateId('tank'), NAMING_PATTERNS.TANK.DEFAULT_NAME(1), defaultRacks, EQUIPMENT_DEFAULTS.MAX_RACKS_PER_TANK, true, 'Main Lab')
    ];

    const equipment = EquipmentConfiguration.create(defaultTanks);
    const systemSettings = SystemSettings.createDefault();

    return new Configuration(equipment, systemSettings, new Date(), 1);
  }

  /**
   * Factory method to create configuration from data
   * Accepts nested structure matching shared-schemas
   */
  static fromData(data: {
    tanks: Array<{
      id: string;
      name: string;
      location?: string;
      racks: Array<{
        id: number | string;
        name: string;
        boxes: Array<{
          name: string;
          gridConfig?: { rows: number; cols: number };
          maxPositions?: number;
          positionDisplay?: PositionDisplayConfig;
          isActive?: boolean;
          assignedUserId?: string | null;
          customLabel?: string;
        }>;
        maxBoxes?: number;
        capacity?: number;
        isActive?: boolean;
        assignedUserId?: string;
        customLabel?: string;
      }>;
      maxRacks?: number;
      isActive?: boolean;
    }>;
    systemSettings: {
      labName: string;
      defaultResearcher: string;
      autoSave: boolean;
      auditTrailEnabled: boolean;
      syncEnabled: boolean;
      defaultPositionDisplay?: PositionDisplayConfig;
    };
    updatedAt?: string;
    version?: number;
  }): Configuration {
    // Reconstruct tanks with nested racks and boxes
    const tanks = data.tanks.map(tankData => {
      const racks = tankData.racks.map(rackData => {
        const boxes = rackData.boxes.map(boxData =>
          Box.create(
            boxData.name,
            boxData.gridConfig || { rows: EQUIPMENT_DEFAULTS.GRID_ROWS, cols: EQUIPMENT_DEFAULTS.GRID_COLS },
            boxData.maxPositions,
            boxData.positionDisplay,
            boxData.isActive ?? true,
            boxData.assignedUserId,
            boxData.customLabel
          )
        );

        // Use the maximum of: actual box count, requested capacity, or default
        // This handles legacy data migration where old capacity=9 but new boxes.length=10
        const effectiveCapacity = Math.max(
          boxes.length,
          rackData.maxBoxes || 0,
          rackData.capacity || 0,
          EQUIPMENT_DEFAULTS.BOXES_PER_RACK
        );

        return Rack.create(
          rackData.id,
          rackData.name,
          boxes,
          effectiveCapacity,
          effectiveCapacity,
          rackData.isActive ?? true,
          rackData.assignedUserId,
          rackData.customLabel
        );
      });

      return Tank.create(
        tankData.id,
        tankData.name,
        racks,
        tankData.maxRacks || tankData.racks.length || EQUIPMENT_DEFAULTS.MAX_RACKS_PER_TANK,
        tankData.isActive ?? true,
        tankData.location || 'Main Lab'
      );
    });

    const equipment = EquipmentConfiguration.create(tanks);
    const systemSettings = SystemSettings.fromData(data.systemSettings);

    return new Configuration(
      equipment,
      systemSettings,
      data.updatedAt ? new Date(data.updatedAt) : new Date(),
      data.version || 1
    );
  }

  /**
   * Validate configuration state (invariants)
   */
  private validate(): void {
    if (this._version < 1) {
      throw new ValidationError('Configuration version must be at least 1');
    }
    
    // Equipment configuration validates itself
    // System settings validate themselves
  }

  /**
   * Business method: Add new tank
   */
  addTank(id: string, name: string, maxRacks: number = EQUIPMENT_DEFAULTS.MAX_RACKS_PER_TANK): Tank {
    const newTank = Tank.create(id, name, [], maxRacks, true);

    // Business rule: Tank IDs must be unique
    if (this._equipment.tanks.some(t => t.id === id)) {
      throw new ValidationError(`Tank with ID '${id}' already exists`);
    }

    // Recreate equipment configuration with new tank
    const newTanks = [...this._equipment.tanks, newTank];
    this._equipment = EquipmentConfiguration.create(newTanks);

    this.touch();
    return newTank;
  }

  /**
   * Business method: Add rack to tank
   * @param initialBoxes - Optional boxes to include in the new rack (defaults to empty)
   */
  addRack(
    tankId: string,
    rackId: string | number,
    rackName: string,
    maxBoxes: number = EQUIPMENT_DEFAULTS.BOXES_PER_RACK,
    initialBoxes: Box[] = []
  ): Rack {
    const tankIndex = this._equipment.tanks.findIndex(t => t.id === tankId);
    if (tankIndex === -1) {
      throw new ValidationError(`Tank '${tankId}' not found`);
    }

    const tank = this._equipment.tanks[tankIndex];
    const rackIdStr = String(rackId);

    if (!tank.canAccommodateRack(rackId)) {
      throw new ValidationError(`Tank '${tankId}' cannot accommodate rack ${rackId}`);
    }

    // Business rule: Rack IDs must be unique within a tank
    if (tank.racks.some(r => r.id === rackIdStr)) {
      throw new ValidationError(`Rack ${rackId} already exists in tank '${tankId}'`);
    }

    const newRack = Rack.create(rackIdStr, rackName, initialBoxes, maxBoxes, maxBoxes, true);

    // Recreate tank with new rack
    const updatedTank = Tank.create(
      tank.id,
      tank.name,
      [...tank.racks, newRack] as Rack[],
      tank.maxRacks,
      tank.isActive,
      tank.location
    );

    // Recreate equipment with updated tank
    const newTanks = [...this._equipment.tanks];
    newTanks[tankIndex] = updatedTank;
    this._equipment = EquipmentConfiguration.create(newTanks);

    this.touch();
    return newRack;
  }

  /**
   * Business method: Add box to rack
   */
  addBox(tankId: string, rackId: string | number, boxId: string, gridConfig: { rows: number; cols: number } = { rows: EQUIPMENT_DEFAULTS.GRID_ROWS, cols: EQUIPMENT_DEFAULTS.GRID_COLS }): Box {
    const tankIndex = this._equipment.tanks.findIndex(t => t.id === tankId);
    if (tankIndex === -1) {
      throw new ValidationError(`Tank '${tankId}' not found`);
    }

    const tank = this._equipment.tanks[tankIndex];
    const rackIdStr = String(rackId);
    const rackIndex = tank.racks.findIndex(r => r.id === rackIdStr);
    if (rackIndex === -1) {
      throw new ValidationError(`Rack ${rackId} not found in tank '${tankId}'`);
    }

    const rack = tank.racks[rackIndex];

    if (!rack.canAccommodateBox(boxId)) {
      throw new ValidationError(`Rack ${rackId} cannot accommodate box '${boxId}'`);
    }

    // Business rule: Box names must be unique within a rack
    if (rack.boxes.some(b => b.name === boxId.toUpperCase())) {
      throw new ValidationError(`Box '${boxId}' already exists in rack ${rackId} of tank '${tankId}'`);
    }

    const newBox = Box.create(boxId, gridConfig, gridConfig.rows * gridConfig.cols, undefined, true);

    // Recreate rack with new box
    const updatedRack = Rack.create(
      rack.id,
      rack.name,
      [...rack.boxes, newBox] as Box[],
      rack.maxBoxes,
      rack.capacity,
      rack.isActive
    );

    // Recreate tank with updated rack
    const newRacks = [...tank.racks];
    newRacks[rackIndex] = updatedRack;
    const updatedTank = Tank.create(
      tank.id,
      tank.name,
      newRacks as Rack[],
      tank.maxRacks,
      tank.isActive,
      tank.location
    );

    // Recreate equipment with updated tank
    const newTanks = [...this._equipment.tanks];
    newTanks[tankIndex] = updatedTank;
    this._equipment = EquipmentConfiguration.create(newTanks);

    this.touch();
    return newBox;
  }

  /**
   * Business method: Remove tank (and all associated racks/boxes)
   */
  removeTank(tankId: string): void {
    const tank = this._equipment.tanks.find(t => t.id === tankId);
    if (!tank) {
      throw new ValidationError(`Tank '${tankId}' not found`);
    }

    // Remove tank (racks and boxes are automatically removed via composition)
    const remainingTanks = this._equipment.tanks.filter(t => t.id !== tankId);
    this._equipment = EquipmentConfiguration.create(remainingTanks);

    this.touch();
  }

  /**
   * Business method: Update system settings
   */
  updateSystemSettings(updates: {
    labName?: string;
    defaultResearcher?: string;
    autoSave?: boolean;
    auditTrailEnabled?: boolean;
    syncEnabled?: boolean;
  }): Configuration {
    const newSystemSettings = this._systemSettings.update(updates);
    return new Configuration(
      this._equipment,
      newSystemSettings,
      new Date(),
      this._version
    );
  }

  /**
   * Business method: Update tanks configuration
   * Tanks now contain nested racks and boxes
   */
  updateTanks(tanks: Tank[]): Configuration {
    const newEquipment = EquipmentConfiguration.create(tanks);
    return new Configuration(
      newEquipment,
      this._systemSettings,
      new Date(),
      this._version
    );
  }

  /**
   * Business method: Update racks configuration for a specific tank
   */
  updateRacks(tankId: string, racks: Rack[]): Configuration {
    const tankIndex = this._equipment.tanks.findIndex(t => t.id === tankId);
    if (tankIndex === -1) {
      throw new ValidationError(`Tank '${tankId}' not found`);
    }

    const tank = this._equipment.tanks[tankIndex];
    const updatedTank = Tank.create(
      tank.id,
      tank.name,
      racks,
      tank.maxRacks,
      tank.isActive,
      tank.location
    );

    const newTanks = [...this._equipment.tanks];
    newTanks[tankIndex] = updatedTank;

    const newEquipment = EquipmentConfiguration.create(newTanks);
    return new Configuration(
      newEquipment,
      this._systemSettings,
      new Date(),
      this._version
    );
  }

  /**
   * Business method: Update boxes configuration for a specific rack
   */
  updateBoxes(tankId: string, rackId: string | number, boxes: Box[]): Configuration {
    const tankIndex = this._equipment.tanks.findIndex(t => t.id === tankId);
    if (tankIndex === -1) {
      throw new ValidationError(`Tank '${tankId}' not found`);
    }

    const tank = this._equipment.tanks[tankIndex];
    const rackIdStr = String(rackId);
    const rackIndex = tank.racks.findIndex(r => r.id === rackIdStr);
    if (rackIndex === -1) {
      throw new ValidationError(`Rack ${rackId} not found in tank '${tankId}'`);
    }

    const rack = tank.racks[rackIndex];
    const updatedRack = Rack.create(
      rack.id,
      rack.name,
      boxes,
      rack.maxBoxes,
      rack.capacity,
      rack.isActive
    );

    const newRacks = [...tank.racks];
    newRacks[rackIndex] = updatedRack;

    const updatedTank = Tank.create(
      tank.id,
      tank.name,
      newRacks as Rack[],
      tank.maxRacks,
      tank.isActive,
      tank.location
    );

    const newTanks = [...this._equipment.tanks];
    newTanks[tankIndex] = updatedTank;

    const newEquipment = EquipmentConfiguration.create(newTanks);
    return new Configuration(
      newEquipment,
      this._systemSettings,
      new Date(),
      this._version
    );
  }

  /**
   * Update position display configuration for a specific box
   *
   * Maintains immutability by creating new instances of affected objects.
   * Increments configuration version to track changes.
   *
   * @param tankId - Tank identifier
   * @param rackId - Rack identifier
   * @param boxId - Box identifier
   * @param positionDisplay - New position display config (null to reset to default)
   * @returns New Configuration instance with updated box
   */
  updateBoxPositionDisplay(
    tankId: string,
    rackId: string,
    boxId: string,
    positionDisplay: PositionDisplayConfig | null
  ): Configuration {
    const tankIndex = this._equipment.tanks.findIndex(t => t.id === tankId);
    if (tankIndex === -1) {
      throw new ValidationError(`Tank '${tankId}' not found`);
    }

    const tank = this._equipment.tanks[tankIndex];
    const rackIndex = tank.racks.findIndex(r => String(r.id) === rackId);
    if (rackIndex === -1) {
      throw new ValidationError(`Rack ${rackId} not found in tank '${tankId}'`);
    }

    const rack = tank.racks[rackIndex];
    const boxIndex = rack.boxes.findIndex(b => b.name === boxId.toUpperCase());
    if (boxIndex === -1) {
      throw new ValidationError(
        `Box '${boxId}' not found in tank '${tankId}', rack ${rackId}`
      );
    }

    // Create updated box with new position display config
    // Preserve all existing properties including assignedUserId and customLabel
    const oldBox = rack.boxes[boxIndex];
    const updatedBox = Box.create(
      oldBox.name,
      oldBox.gridConfig,
      oldBox.maxPositions,
      positionDisplay === null ? undefined : positionDisplay,
      oldBox.isActive,
      oldBox.assignedUserId,
      oldBox.customLabel
    );

    // Create new boxes array with updated box
    const newBoxes = [...rack.boxes];
    newBoxes[boxIndex] = updatedBox;

    // Create new rack with updated boxes
    // Preserve all existing properties including assignedUserId and customLabel
    const updatedRack = Rack.create(
      rack.id,
      rack.name,
      newBoxes,
      rack.maxBoxes,
      rack.capacity,
      rack.isActive,
      rack.assignedUserId,
      rack.customLabel
    );

    // Create new racks array with updated rack
    const newRacks = [...tank.racks];
    newRacks[rackIndex] = updatedRack;

    // Create new tank with updated racks
    const updatedTank = Tank.create(
      tank.id,
      tank.name,
      newRacks as Rack[],
      tank.maxRacks,
      tank.isActive,
      tank.location
    );

    // Create new tanks array with updated tank
    const newTanks = [...this._equipment.tanks];
    newTanks[tankIndex] = updatedTank;

    // Create new equipment configuration
    const newEquipment = EquipmentConfiguration.create(newTanks);

    // Return new Configuration instance (immutability)
    return new Configuration(
      newEquipment,
      this._systemSettings,
      new Date(),
      this._version
    );
  }

  /**
   * Clear custom labels from boxes that inherit ownership from a rack
   *
   * When a rack is unassigned, boxes that were "inheriting" ownership (no explicit
   * assignedUserId) should have their custom labels cleared since the ownership
   * context is gone. Boxes with explicit assignments are left untouched.
   *
   * @param tankId - Tank containing the rack
   * @param rackId - Rack that was unassigned
   */
  clearInheritedBoxLabelsForRack(tankId: string, rackId: string): void {
    const tankIndex = this._equipment.tanks.findIndex(t => t.id === tankId);
    if (tankIndex === -1) return; // Tank not found, nothing to do

    const tank = this._equipment.tanks[tankIndex];
    const rackIndex = tank.racks.findIndex(r => r.id === rackId);
    if (rackIndex === -1) return; // Rack not found, nothing to do

    const rack = tank.racks[rackIndex];

    // Check if any boxes need label clearing
    const hasInheritingBoxesWithLabels = rack.boxes.some(
      box => !box.assignedUserId && box.customLabel
    );

    if (!hasInheritingBoxesWithLabels) return; // No changes needed

    // Create new boxes, clearing labels on those without explicit assignments
    const updatedBoxes = rack.boxes.map(box => {
      if (!box.assignedUserId && box.customLabel) {
        // This box was inheriting from rack - clear its label
        return Box.create(
          box.name,
          box.gridConfig,
          box.maxPositions,
          box.positionDisplay,
          box.isActive,
          box.assignedUserId,
          undefined // Clear the label
        );
      }
      return box; // Keep boxes with explicit assignments unchanged
    });

    // Rebuild rack with updated boxes
    const updatedRack = Rack.create(
      rack.id,
      rack.name,
      updatedBoxes,
      rack.maxBoxes,
      rack.capacity,
      rack.isActive,
      rack.assignedUserId,
      rack.customLabel
    );

    // Rebuild tank with updated rack
    const updatedRacks = [...tank.racks];
    updatedRacks[rackIndex] = updatedRack;

    const updatedTank = Tank.create(
      tank.id,
      tank.name,
      updatedRacks as Rack[],
      tank.maxRacks,
      tank.isActive,
      tank.location
    );

    // Rebuild equipment with updated tank
    const updatedTanks = [...this._equipment.tanks];
    updatedTanks[tankIndex] = updatedTank;

    this._equipment = EquipmentConfiguration.create(updatedTanks);
    this.touch();
  }

  /**
   * Count resource assignments for a specific user.
   * Used before clearing to report affected resources.
   */
  countAssignmentsForUser(userId: string): { racks: number; boxes: number } {
    let racks = 0;
    let boxes = 0;

    for (const tank of this._equipment.tanks) {
      for (const rack of tank.racks) {
        if (rack.assignedUserId === userId) {
          racks++;
        }
        for (const box of rack.boxes) {
          if (box.assignedUserId === userId) {
            boxes++;
          }
        }
      }
    }

    return { racks, boxes };
  }

  /**
   * Clear all resource assignments for a specific user
   *
   * Called when a user is deleted to prevent orphaned assignment references.
   * Clears both assignedUserId and customLabel on affected racks and boxes.
   *
   * @param userId - The user ID whose assignments should be cleared
   * @returns true if any assignments were cleared, false otherwise
   */
  clearAllAssignmentsForUser(userId: string): boolean {
    let hasChanges = false;

    const updatedTanks = this._equipment.tanks.map(tank => {
      const updatedRacks = tank.racks.map(rack => {
        const rackNeedsUpdate = rack.assignedUserId === userId;

        // Update boxes - clear if explicitly assigned to this user
        const updatedBoxes = rack.boxes.map(box => {
          if (box.assignedUserId === userId) {
            hasChanges = true;
            return Box.create(
              box.name,
              box.gridConfig,
              box.maxPositions,
              box.positionDisplay,
              box.isActive,
              undefined, // Clear assignment
              undefined  // Clear custom label
            );
          }
          // Also clear inherited box labels if rack is being unassigned
          if (rackNeedsUpdate && !box.assignedUserId && box.customLabel) {
            hasChanges = true;
            return Box.create(
              box.name,
              box.gridConfig,
              box.maxPositions,
              box.positionDisplay,
              box.isActive,
              box.assignedUserId,
              undefined // Clear inherited label
            );
          }
          return box;
        });

        if (rackNeedsUpdate) {
          hasChanges = true;
          return Rack.create(
            rack.id,
            rack.name,
            updatedBoxes,
            rack.maxBoxes,
            rack.capacity,
            rack.isActive,
            undefined, // Clear assignment
            undefined  // Clear custom label
          );
        }

        // Return rack with potentially updated boxes
        if (updatedBoxes !== rack.boxes) {
          return Rack.create(
            rack.id,
            rack.name,
            updatedBoxes,
            rack.maxBoxes,
            rack.capacity,
            rack.isActive,
            rack.assignedUserId,
            rack.customLabel
          );
        }

        return rack;
      });

      // Return tank with updated racks if any changed
      if (updatedRacks.some((r, i) => r !== tank.racks[i])) {
        return Tank.create(
          tank.id,
          tank.name,
          updatedRacks as Rack[],
          tank.maxRacks,
          tank.isActive,
          tank.location
        );
      }

      return tank;
    });

    if (hasChanges) {
      this._equipment = EquipmentConfiguration.create(updatedTanks);
      this.touch();
    }

    return hasChanges;
  }

  /**
   * Update custom label for a rack or box
   *
   * Allows resource owners to set a custom label on their assigned resources.
   * Uses mutable pattern (like clearInheritedBoxLabelsForRack) since this is
   * called as part of a command that handles its own persistence.
   *
   * @param resourceType - 'rack' or 'box'
   * @param tankId - Tank containing the resource
   * @param rackId - Rack ID (for rack) or parent rack ID (for box)
   * @param boxId - Box ID (only for box type)
   * @param customLabel - New label (empty string or undefined to clear)
   */
  updateResourceCustomLabel(
    resourceType: 'rack' | 'box',
    tankId: string,
    rackId: string,
    boxId: string | undefined,
    customLabel: string | undefined
  ): void {
    const tankIndex = this._equipment.tanks.findIndex(t => t.id === tankId);
    if (tankIndex === -1) {
      throw new ValidationError(`Tank '${tankId}' not found`);
    }

    const tank = this._equipment.tanks[tankIndex];
    const rackIndex = tank.racks.findIndex(r => r.id === rackId);
    if (rackIndex === -1) {
      throw new ValidationError(`Rack '${rackId}' not found in tank '${tankId}'`);
    }

    const rack = tank.racks[rackIndex];
    const normalizedLabel = customLabel?.trim() || undefined;

    if (resourceType === 'rack') {
      // Update rack label
      const updatedRack = Rack.create(
        rack.id,
        rack.name,
        [...rack.boxes] as Box[],
        rack.maxBoxes,
        rack.capacity,
        rack.isActive,
        rack.assignedUserId,
        normalizedLabel
      );

      const updatedRacks = [...tank.racks];
      updatedRacks[rackIndex] = updatedRack;

      const updatedTank = Tank.create(
        tank.id,
        tank.name,
        updatedRacks as Rack[],
        tank.maxRacks,
        tank.isActive,
        tank.location
      );

      const updatedTanks = [...this._equipment.tanks];
      updatedTanks[tankIndex] = updatedTank;

      this._equipment = EquipmentConfiguration.create(updatedTanks);
    } else {
      // Update box label
      if (!boxId) {
        throw new ValidationError('boxId is required for box label update');
      }

      const boxIndex = rack.boxes.findIndex(b => b.name === boxId.toUpperCase());
      if (boxIndex === -1) {
        throw new ValidationError(`Box '${boxId}' not found in rack '${rackId}'`);
      }

      const box = rack.boxes[boxIndex];
      const updatedBox = Box.create(
        box.name,
        box.gridConfig,
        box.maxPositions,
        box.positionDisplay,
        box.isActive,
        box.assignedUserId,
        normalizedLabel
      );

      const updatedBoxes = [...rack.boxes];
      updatedBoxes[boxIndex] = updatedBox;

      const updatedRack = Rack.create(
        rack.id,
        rack.name,
        updatedBoxes,
        rack.maxBoxes,
        rack.capacity,
        rack.isActive,
        rack.assignedUserId,
        rack.customLabel
      );

      const updatedRacks = [...tank.racks];
      updatedRacks[rackIndex] = updatedRack;

      const updatedTank = Tank.create(
        tank.id,
        tank.name,
        updatedRacks as Rack[],
        tank.maxRacks,
        tank.isActive,
        tank.location
      );

      const updatedTanks = [...this._equipment.tanks];
      updatedTanks[tankIndex] = updatedTank;

      this._equipment = EquipmentConfiguration.create(updatedTanks);
    }

    this.touch();
  }

  /**
   * Get a rack by ID for permission checking
   */
  getRack(tankId: string, rackId: string): { rack: ReturnType<Rack['toData']>; tank: ReturnType<Tank['toData']> } | null {
    const tank = this._equipment.tanks.find(t => t.id === tankId);
    if (!tank) return null;

    const rack = tank.racks.find(r => r.id === rackId);
    if (!rack) return null;

    return { rack: rack.toData(), tank: tank.toData() };
  }

  /**
   * Get a box by ID for permission checking
   */
  getBox(tankId: string, rackId: string, boxId: string): {
    box: ReturnType<Box['toData']>;
    rack: ReturnType<Rack['toData']>;
    tank: ReturnType<Tank['toData']>
  } | null {
    const tank = this._equipment.tanks.find(t => t.id === tankId);
    if (!tank) return null;

    const rack = tank.racks.find(r => r.id === rackId);
    if (!rack) return null;

    const box = rack.boxes.find(b => b.name === boxId.toUpperCase());
    if (!box) return null;

    return { box: box.toData(), rack: rack.toData(), tank: tank.toData() };
  }

  /**
   * Business method: Update lab default position display
   *
   * Sets the lab-wide default for position display format.
   * Pass null to clear the lab default (fall back to system default).
   *
   * @param positionDisplay - New default position display config (null = clear)
   * @returns New Configuration instance (immutability)
   */
  updateLabDefaultPositionDisplay(
    positionDisplay: PositionDisplayConfig | null
  ): Configuration {
    const newSystemSettings = this._systemSettings.update({
      defaultPositionDisplay: positionDisplay
    });

    return new Configuration(
      this._equipment,
      newSystemSettings,
      new Date(),
      this._version
    );
  }

  /**
   * Business query: Validate if location exists in configuration
   */
  isLocationValid(location: Location): boolean {
    return this._equipment.isLocationValid(
      location.tankId,
      location.rackId,
      location.boxId,
      location.position
    );
  }

  /**
   * Business query: Check if location exists in configuration
   */
  locationExists(tankId: string, rackId: string, boxId: string, position: number): boolean {
    return this._equipment.isLocationValid(tankId, rackId, boxId, position);
  }

  /**
   * Business query: Get available positions in a box
   */
  getAvailablePositions(tankId: string, rackId: string | number, boxId: string, occupiedPositions: number[]): number[] {
    const tank = this._equipment.tanks.find(t => t.id === tankId);
    if (!tank) return [];

    const rackIdStr = String(rackId);
    const rack = tank.racks.find(r => r.id === rackIdStr);
    if (!rack) return [];

    const box = rack.boxes.find(b => b.name === boxId.toUpperCase() && b.isActive);
    if (!box) return [];

    const allPositions: number[] = [];
    for (let i = 1; i <= box.maxPositions; i++) {
      if (!occupiedPositions.includes(i)) {
        allPositions.push(i);
      }
    }

    return allPositions;
  }

  /**
   * Update configuration from data (DDD update pattern)
   * Mutates existing aggregate and increments version
   *
   * @param data - New configuration data from client
   */
  public updateFromData(data: {
    tanks: Array<{
      id: string;
      name: string;
      location?: string;
      racks: Array<{
        id: number | string;
        name: string;
        boxes: Array<{
          name: string;
          gridConfig?: { rows: number; cols: number };
          maxPositions?: number;
          positionDisplay?: PositionDisplayConfig;
          isActive?: boolean;
          assignedUserId?: string | null;
          customLabel?: string;
        }>;
        maxBoxes?: number;
        capacity?: number;
        isActive?: boolean;
        assignedUserId?: string;
        customLabel?: string;
      }>;
      maxRacks?: number;
      isActive?: boolean;
    }>;
    systemSettings: {
      labName: string;
      defaultResearcher: string;
      autoSave: boolean;
      auditTrailEnabled: boolean;
      syncEnabled: boolean;
      defaultPositionDisplay?: PositionDisplayConfig;
    };
  }): void {
    // Update equipment configuration
    const tanks = data.tanks.map(tankData => {
      const racks = tankData.racks.map(rackData => {
        const boxes = rackData.boxes.map(boxData =>
          Box.create(
            boxData.name,
            boxData.gridConfig || { rows: EQUIPMENT_DEFAULTS.GRID_ROWS, cols: EQUIPMENT_DEFAULTS.GRID_COLS },
            boxData.maxPositions,
            boxData.positionDisplay,
            boxData.isActive ?? true,
            boxData.assignedUserId,
            boxData.customLabel
          )
        );

        const effectiveCapacity = Math.max(
          boxes.length,
          rackData.maxBoxes || 0,
          rackData.capacity || 0,
          EQUIPMENT_DEFAULTS.BOXES_PER_RACK
        );

        return Rack.create(
          rackData.id,
          rackData.name,
          boxes,
          effectiveCapacity,
          effectiveCapacity,
          rackData.isActive ?? true,
          rackData.assignedUserId,
          rackData.customLabel
        );
      });

      return Tank.create(
        tankData.id,
        tankData.name,
        racks,
        tankData.maxRacks || tankData.racks.length || EQUIPMENT_DEFAULTS.MAX_RACKS_PER_TANK,
        tankData.isActive ?? true,
        tankData.location || 'Main Lab'
      );
    });

    this._equipment = EquipmentConfiguration.create(tanks);
    this._systemSettings = SystemSettings.fromData(data.systemSettings);

    // Increment version and update timestamp
    this.touch();
  }

  /**
   * Update timestamp and increment version
   */
  private touch(): void {
    this._updatedAt = new Date();
  }

  /**
   * Apply the persisted version from the database after a successful save.
   * The database sequence is the single source of truth for version numbers.
   */
  applyPersistedVersion(version: number): void {
    this._version = version;
  }

  /**
   * Convert to data object for persistence
   * Returns nested structure matching shared-schemas
   */
  toData(): {
    tanks: Array<{
      id: string;
      name: string;
      location: string;
      racks: Array<{
        id: string;
        name: string;
        boxes: Array<{
          name: string;
          gridConfig: { rows: number; cols: number };
          maxPositions: number;
          positionDisplay?: PositionDisplayConfig;
          isActive: boolean;
          assignedUserId?: string | null;
          customLabel?: string;
        }>;
        maxBoxes: number;
        capacity: number;
        isActive: boolean;
        assignedUserId?: string;
        customLabel?: string;
      }>;
      maxRacks: number;
      isActive: boolean;
    }>;
    systemSettings: {
      labName: string;
      defaultResearcher: string;
      autoSave: boolean;
      auditTrailEnabled: boolean;
      syncEnabled: boolean;
      defaultPositionDisplay?: PositionDisplayConfig;
    };
    updatedAt: string;
    version: number;
  } {
    const equipmentData = this._equipment.toData();
    const systemSettingsData = this._systemSettings.toData();

    return {
      tanks: equipmentData.tanks,
      systemSettings: systemSettingsData,
      updatedAt: this._updatedAt.toISOString(),
      version: this._version
    };
  }

  /**
   * Convert to API response format
   * Returns nested structure matching shared-schemas
   */
  toApiData(): {
    equipment: {
      tanks: ReturnType<Tank['toData']>[];
    };
    systemSettings: {
      labName: string;
      defaultResearcher: string;
      autoSave: boolean;
      auditTrailEnabled: boolean;
      syncEnabled: boolean;
      defaultPositionDisplay?: PositionDisplayConfig;
    };
    metadata: {
      updatedAt: string;
      version: number;
    };
  } {
    const data = this.toData();

    return {
      equipment: {
        tanks: data.tanks
      },
      systemSettings: data.systemSettings,
      metadata: {
        updatedAt: data.updatedAt,
        version: data.version
      }
    };
  }

  // Getters (immutable access)
  get equipment(): EquipmentConfiguration { return this._equipment; }
  get systemSettings(): SystemSettings { return this._systemSettings; }
  get updatedAt(): Date { return new Date(this._updatedAt); }
  get version(): number { return this._version; }

  // Convenience getter for tanks (most common access pattern)
  get tanks(): readonly Tank[] { return this._equipment.tanks; }
}

/**
 * System Settings Value Object
 * Represents general system configuration settings
 */
class SystemSettings {
  private constructor(
    private readonly _labName: string,
    private readonly _defaultResearcher: string,
    private readonly _autoSave: boolean,
    private readonly _auditTrailEnabled: boolean,
    private readonly _syncEnabled: boolean,
    private readonly _defaultPositionDisplay?: PositionDisplayConfig
  ) {
    this.validate();
  }

  static createDefault(): SystemSettings {
    return new SystemSettings(
      SYSTEM_DEFAULTS.LAB.NAME,
      '',
      SYSTEM_DEFAULTS.SETTINGS.AUTO_BACKUP,
      SYSTEM_DEFAULTS.SETTINGS.AUDIT_TRAIL_ENABLED,
      SYSTEM_DEFAULTS.SETTINGS.ENABLE_REAL_TIME_SYNC,
      undefined // defaultPositionDisplay - use system default (alphanumeric)
    );
  }

  static fromData(data: {
    labName: string;
    defaultResearcher: string;
    autoSave: boolean;
    auditTrailEnabled: boolean;
    syncEnabled: boolean;
    defaultPositionDisplay?: PositionDisplayConfig;
  }): SystemSettings {
    return new SystemSettings(
      data.labName,
      data.defaultResearcher,
      data.autoSave,
      data.auditTrailEnabled,
      data.syncEnabled,
      data.defaultPositionDisplay
    );
  }

  private validate(): void {
    if (!this._labName || this._labName.trim().length === 0) {
      throw new ValidationError('Lab name is required');
    }
    
    if (this._labName.length > 200) {
      throw new ValidationError('Lab name cannot exceed 200 characters');
    }

    if (this._defaultResearcher && this._defaultResearcher.length > 100) {
      throw new ValidationError('Default researcher name cannot exceed 100 characters');
    }
  }

  update(updates: {
    labName?: string;
    defaultResearcher?: string;
    autoSave?: boolean;
    auditTrailEnabled?: boolean;
    syncEnabled?: boolean;
    defaultPositionDisplay?: PositionDisplayConfig | null;
  }): SystemSettings {
    return new SystemSettings(
      updates.labName !== undefined ? updates.labName : this._labName,
      updates.defaultResearcher !== undefined ? updates.defaultResearcher : this._defaultResearcher,
      updates.autoSave !== undefined ? updates.autoSave : this._autoSave,
      updates.auditTrailEnabled !== undefined ? updates.auditTrailEnabled : this._auditTrailEnabled,
      updates.syncEnabled !== undefined ? updates.syncEnabled : this._syncEnabled,
      updates.defaultPositionDisplay !== undefined
        ? (updates.defaultPositionDisplay === null ? undefined : updates.defaultPositionDisplay)
        : this._defaultPositionDisplay
    );
  }

  toData(): {
    labName: string;
    defaultResearcher: string;
    autoSave: boolean;
    auditTrailEnabled: boolean;
    syncEnabled: boolean;
    defaultPositionDisplay?: PositionDisplayConfig;
  } {
    return {
      labName: this._labName,
      defaultResearcher: this._defaultResearcher,
      autoSave: this._autoSave,
      auditTrailEnabled: this._auditTrailEnabled,
      syncEnabled: this._syncEnabled,
      defaultPositionDisplay: this._defaultPositionDisplay
    };
  }

  // Getters
  get labName(): string { return this._labName; }
  get defaultResearcher(): string { return this._defaultResearcher; }
  get autoSave(): boolean { return this._autoSave; }
  get auditTrailEnabled(): boolean { return this._auditTrailEnabled; }
  get syncEnabled(): boolean { return this._syncEnabled; }
  get defaultPositionDisplay(): PositionDisplayConfig | undefined { return this._defaultPositionDisplay; }
}
