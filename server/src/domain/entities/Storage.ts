/**
 * Lab Storage Aggregate Root
 *
 * Manages the equipment hierarchy (tanks → racks → boxes) and system settings.
 */

import {
  EQUIPMENT_DEFAULTS,
  NAMING_PATTERNS,
  SYSTEM_DEFAULTS,
  type PositionDisplayConfig,
} from '@odysseus/shared-schemas';

import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';
import { EquipmentConfiguration, Tank, Rack, Box } from '@domain/value-objects/Equipment';
import type { Location } from '@domain/value-objects/Location';


export class Storage {
  private constructor(
    private _equipment: EquipmentConfiguration,
    private _systemSettings: SystemSettings,
    private _updatedAt: Date,
    private _version: number
  ) {
    this.validate();
  }

  static createDefault(): Storage {
    // Create default boxes A-J for each rack
    const defaultBoxes: Box[] = [];
    for (let i = 0; i < EQUIPMENT_DEFAULTS.BOXES_PER_RACK; i++) {
      const boxName = NAMING_PATTERNS.BOX.LETTER_NAME(i);
      defaultBoxes.push(Box.create({
        name: boxName,
        gridConfig: { rows: EQUIPMENT_DEFAULTS.GRID_ROWS, cols: EQUIPMENT_DEFAULTS.GRID_COLS },
        maxPositions: EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX,
      }));
    }

    const defaultRacks = [
      Rack.create({ id: generateId('rack'), name: NAMING_PATTERNS.RACK.DEFAULT_NAME(1), boxes: [...defaultBoxes] }),
      Rack.create({ id: generateId('rack'), name: NAMING_PATTERNS.RACK.DEFAULT_NAME(2), boxes: [...defaultBoxes] }),
      Rack.create({ id: generateId('rack'), name: NAMING_PATTERNS.RACK.DEFAULT_NAME(3), boxes: [...defaultBoxes] }),
    ];

    const defaultTanks = [
      Tank.create({ id: generateId('tank'), name: NAMING_PATTERNS.TANK.DEFAULT_NAME(1), racks: defaultRacks }),
    ];

    const equipment = EquipmentConfiguration.create(defaultTanks);
    const systemSettings = SystemSettings.createDefault();

    return new Storage(equipment, systemSettings, new Date(), 1);
  }

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
          sharedWithUserIds?: string[];
          isSeeded?: boolean;
        }>;
        maxBoxes?: number;
        capacity?: number;
        isActive?: boolean;
        assignedUserId?: string;
        customLabel?: string;
        sharedWithUserIds?: string[];
        isSeeded?: boolean;
      }>;
      maxRacks?: number;
      isActive?: boolean;
      isSeeded?: boolean;
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
  }): Storage {
    // Reconstruct tanks with nested racks and boxes
    const tanks = data.tanks.map(tankData => {
      const racks = tankData.racks.map(rackData => {
        const boxes = rackData.boxes.map(boxData =>
          Box.create({
            name: boxData.name,
            gridConfig: boxData.gridConfig,
            maxPositions: boxData.maxPositions,
            positionDisplay: boxData.positionDisplay,
            isActive: boxData.isActive,
            assignedUserId: boxData.assignedUserId,
            customLabel: boxData.customLabel,
            sharedWithUserIds: boxData.sharedWithUserIds,
            isSeeded: boxData.isSeeded,
          })
        );

        const effectiveCapacity = Storage.effectiveRackCapacity(boxes.length, rackData.maxBoxes, rackData.capacity);

        return Rack.create({
          id: rackData.id,
          name: rackData.name,
          boxes,
          maxBoxes: effectiveCapacity,
          capacity: effectiveCapacity,
          isActive: rackData.isActive,
          assignedUserId: rackData.assignedUserId,
          customLabel: rackData.customLabel,
          sharedWithUserIds: rackData.sharedWithUserIds,
          isSeeded: rackData.isSeeded,
        });
      });

      return Tank.create({
        id: tankData.id,
        name: tankData.name,
        racks,
        maxRacks: tankData.maxRacks || tankData.racks.length || EQUIPMENT_DEFAULTS.MAX_RACKS_PER_TANK,
        isActive: tankData.isActive,
        location: tankData.location,
        isSeeded: tankData.isSeeded,
      });
    });

    const equipment = EquipmentConfiguration.create(tanks);
    const systemSettings = SystemSettings.fromData(data.systemSettings);

    return new Storage(
      equipment,
      systemSettings,
      data.updatedAt ? new Date(data.updatedAt) : new Date(),
      data.version || 1
    );
  }

  private validate(): void {
    if (this._version < 1) {
      throw new ValidationError('Storage configuration version must be at least 1');
    }
  }

  /** Handles legacy data migration where old capacity=9 but new boxes.length=10 */
  private static effectiveRackCapacity(
    boxCount: number,
    maxBoxes: number | undefined,
    capacity: number | undefined
  ): number {
    return Math.max(boxCount, maxBoxes || 0, capacity || 0, EQUIPMENT_DEFAULTS.BOXES_PER_RACK);
  }

  addTank(id: string, name: string, maxRacks: number = EQUIPMENT_DEFAULTS.MAX_RACKS_PER_TANK): Tank {
    const newTank = Tank.create({ id, name, maxRacks });

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

  addRack(
    tankId: string,
    rackId: string,
    rackName: string,
    maxBoxes: number = EQUIPMENT_DEFAULTS.BOXES_PER_RACK,
    initialBoxes: Box[] = []
  ): Rack {
    const tankIndex = this._equipment.tanks.findIndex(t => t.id === tankId);
    if (tankIndex === -1) {
      throw new ValidationError(`Tank '${tankId}' not found`);
    }

    const tank = this._equipment.tanks[tankIndex];

    if (!tank.canAccommodateRack()) {
      throw new ValidationError(`Tank '${tankId}' is at maximum rack capacity (${tank.maxRacks})`);
    }

    // Business rule: Rack IDs must be unique within a tank
    if (tank.racks.some(r => r.id === rackId)) {
      throw new ValidationError(`Rack ${rackId} already exists in tank '${tankId}'`);
    }

    const newRack = Rack.create({ id: rackId, name: rackName, boxes: initialBoxes, maxBoxes, capacity: maxBoxes });

    const newRacks = [...tank.racks, newRack] as Rack[];
    const newMaxRacks = Math.max(tank.maxRacks, newRacks.length);

    // Recreate tank with new rack
    const updatedTank = Tank.create({
      id: tank.id,
      name: tank.name,
      racks: newRacks,
      maxRacks: newMaxRacks,
      isActive: tank.isActive,
      location: tank.location,
      isSeeded: tank.isSeeded,
    });

    // Recreate equipment with updated tank
    const newTanks = [...this._equipment.tanks];
    newTanks[tankIndex] = updatedTank;
    this._equipment = EquipmentConfiguration.create(newTanks);

    this.touch();
    return newRack;
  }

  addBox(tankId: string, rackId: string, boxId: string, gridConfig: { rows: number; cols: number } = { rows: EQUIPMENT_DEFAULTS.GRID_ROWS, cols: EQUIPMENT_DEFAULTS.GRID_COLS }): Box {
    const tankIndex = this._equipment.tanks.findIndex(t => t.id === tankId);
    if (tankIndex === -1) {
      throw new ValidationError(`Tank '${tankId}' not found`);
    }

    const tank = this._equipment.tanks[tankIndex];
    const rackIndex = tank.racks.findIndex(r => r.id === rackId);
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

    const newBox = Box.create({ name: boxId, gridConfig, maxPositions: gridConfig.rows * gridConfig.cols });

    const newBoxes = [...rack.boxes, newBox] as Box[];
    const newCapacity = Math.max(rack.maxBoxes, newBoxes.length);

    // Recreate rack with new box
    const updatedRack = Rack.create({
      id: rack.id,
      name: rack.name,
      boxes: newBoxes,
      maxBoxes: newCapacity,
      capacity: newCapacity,
      isActive: rack.isActive,
      assignedUserId: rack.assignedUserId,
      customLabel: rack.customLabel,
      sharedWithUserIds: rack.sharedWithUserIds,
      isSeeded: rack.isSeeded,
    });

    // Recreate tank with updated rack
    const newRacks = [...tank.racks];
    newRacks[rackIndex] = updatedRack;
    const updatedTank = Tank.create({
      id: tank.id,
      name: tank.name,
      racks: newRacks as Rack[],
      maxRacks: tank.maxRacks,
      isActive: tank.isActive,
      location: tank.location,
      isSeeded: tank.isSeeded,
    });

    // Recreate equipment with updated tank
    const newTanks = [...this._equipment.tanks];
    newTanks[tankIndex] = updatedTank;
    this._equipment = EquipmentConfiguration.create(newTanks);

    this.touch();
    return newBox;
  }

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

  updateSystemSettings(updates: {
    labName?: string;
    defaultResearcher?: string;
    autoSave?: boolean;
    auditTrailEnabled?: boolean;
    syncEnabled?: boolean;
  }): Storage {
    const newSystemSettings = this._systemSettings.update(updates);
    return new Storage(
      this._equipment,
      newSystemSettings,
      new Date(),
      this._version
    );
  }

  updateTanks(tanks: Tank[]): Storage {
    const newEquipment = EquipmentConfiguration.create(tanks);
    return new Storage(
      newEquipment,
      this._systemSettings,
      new Date(),
      this._version
    );
  }

  updateRacks(tankId: string, racks: Rack[]): Storage {
    const tankIndex = this._equipment.tanks.findIndex(t => t.id === tankId);
    if (tankIndex === -1) {
      throw new ValidationError(`Tank '${tankId}' not found`);
    }

    const tank = this._equipment.tanks[tankIndex];
    const updatedTank = Tank.create({
      id: tank.id,
      name: tank.name,
      racks,
      maxRacks: tank.maxRacks,
      isActive: tank.isActive,
      location: tank.location,
      isSeeded: tank.isSeeded,
    });

    const newTanks = [...this._equipment.tanks];
    newTanks[tankIndex] = updatedTank;

    const newEquipment = EquipmentConfiguration.create(newTanks);
    return new Storage(
      newEquipment,
      this._systemSettings,
      new Date(),
      this._version
    );
  }

  updateBoxes(tankId: string, rackId: string, boxes: Box[]): Storage {
    const tankIndex = this._equipment.tanks.findIndex(t => t.id === tankId);
    if (tankIndex === -1) {
      throw new ValidationError(`Tank '${tankId}' not found`);
    }

    const tank = this._equipment.tanks[tankIndex];
    const rackIndex = tank.racks.findIndex(r => r.id === rackId);
    if (rackIndex === -1) {
      throw new ValidationError(`Rack ${rackId} not found in tank '${tankId}'`);
    }

    const rack = tank.racks[rackIndex];
    const updatedRack = Rack.create({
      id: rack.id,
      name: rack.name,
      boxes,
      maxBoxes: rack.maxBoxes,
      capacity: rack.capacity,
      isActive: rack.isActive,
      assignedUserId: rack.assignedUserId,
      customLabel: rack.customLabel,
      sharedWithUserIds: rack.sharedWithUserIds,
      isSeeded: rack.isSeeded,
    });

    const newRacks = [...tank.racks];
    newRacks[rackIndex] = updatedRack;

    const updatedTank = Tank.create({
      id: tank.id,
      name: tank.name,
      racks: newRacks as Rack[],
      maxRacks: tank.maxRacks,
      isActive: tank.isActive,
      location: tank.location,
      isSeeded: tank.isSeeded,
    });

    const newTanks = [...this._equipment.tanks];
    newTanks[tankIndex] = updatedTank;

    const newEquipment = EquipmentConfiguration.create(newTanks);
    return new Storage(
      newEquipment,
      this._systemSettings,
      new Date(),
      this._version
    );
  }

  /** Pass null for positionDisplay to reset to system default */
  updateBoxPositionDisplay(
    tankId: string,
    rackId: string,
    boxId: string,
    positionDisplay: PositionDisplayConfig | null
  ): Storage {
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

    const oldBox = rack.boxes[boxIndex];
    const updatedBox = Box.create({
      name: oldBox.name,
      gridConfig: oldBox.gridConfig,
      maxPositions: oldBox.maxPositions,
      positionDisplay: positionDisplay === null ? undefined : positionDisplay,
      isActive: oldBox.isActive,
      assignedUserId: oldBox.assignedUserId,
      customLabel: oldBox.customLabel,
      sharedWithUserIds: oldBox.sharedWithUserIds,
      isSeeded: oldBox.isSeeded,
    });

    const newBoxes = [...rack.boxes];
    newBoxes[boxIndex] = updatedBox;

    const updatedRack = Rack.create({
      id: rack.id,
      name: rack.name,
      boxes: newBoxes,
      maxBoxes: rack.maxBoxes,
      capacity: rack.capacity,
      isActive: rack.isActive,
      assignedUserId: rack.assignedUserId,
      customLabel: rack.customLabel,
      sharedWithUserIds: rack.sharedWithUserIds,
      isSeeded: rack.isSeeded,
    });

    const newRacks = [...tank.racks];
    newRacks[rackIndex] = updatedRack;

    const updatedTank = Tank.create({
      id: tank.id,
      name: tank.name,
      racks: newRacks as Rack[],
      maxRacks: tank.maxRacks,
      isActive: tank.isActive,
      location: tank.location,
      isSeeded: tank.isSeeded,
    });

    // Create new tanks array with updated tank
    const newTanks = [...this._equipment.tanks];
    newTanks[tankIndex] = updatedTank;

    // Create new equipment configuration
    const newEquipment = EquipmentConfiguration.create(newTanks);

    // Return new Storage instance (immutability)
    return new Storage(
      newEquipment,
      this._systemSettings,
      new Date(),
      this._version
    );
  }

  /**
   * When a rack is unassigned, boxes inheriting ownership (no explicit assignedUserId)
   * lose their ownership context, so their custom labels are cleared.
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

    const updatedBoxes = rack.boxes.map(box => {
      if (!box.assignedUserId && box.customLabel) {
        return Box.create({
          name: box.name,
          gridConfig: box.gridConfig,
          maxPositions: box.maxPositions,
          positionDisplay: box.positionDisplay,
          isActive: box.isActive,
          assignedUserId: box.assignedUserId,
          customLabel: undefined,
          sharedWithUserIds: box.sharedWithUserIds,
          isSeeded: box.isSeeded,
        });
      }
      return box;
    });

    const updatedRack = Rack.create({
      id: rack.id,
      name: rack.name,
      boxes: updatedBoxes,
      maxBoxes: rack.maxBoxes,
      capacity: rack.capacity,
      isActive: rack.isActive,
      assignedUserId: rack.assignedUserId,
      customLabel: rack.customLabel,
      sharedWithUserIds: rack.sharedWithUserIds,
      isSeeded: rack.isSeeded,
    });

    const updatedRacks = [...tank.racks];
    updatedRacks[rackIndex] = updatedRack;

    const updatedTank = Tank.create({
      id: tank.id,
      name: tank.name,
      racks: updatedRacks as Rack[],
      maxRacks: tank.maxRacks,
      isActive: tank.isActive,
      location: tank.location,
      isSeeded: tank.isSeeded,
    });

    // Rebuild equipment with updated tank
    const updatedTanks = [...this._equipment.tanks];
    updatedTanks[tankIndex] = updatedTank;

    this._equipment = EquipmentConfiguration.create(updatedTanks);
    this.touch();
  }

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

  /** Called on user deletion to prevent orphaned assignment references */
  clearAllAssignmentsForUser(userId: string): boolean {
    let hasChanges = false;

    const updatedTanks = this._equipment.tanks.map(tank => {
      const updatedRacks = tank.racks.map(rack => {
        const rackNeedsUpdate = rack.assignedUserId === userId;

        const updatedBoxes = rack.boxes.map(box => {
          if (box.assignedUserId === userId) {
            hasChanges = true;
            return Box.create({
              name: box.name,
              gridConfig: box.gridConfig,
              maxPositions: box.maxPositions,
              positionDisplay: box.positionDisplay,
              isActive: box.isActive,
              sharedWithUserIds: box.sharedWithUserIds,
              isSeeded: box.isSeeded,
            });
          }
          if (rackNeedsUpdate && !box.assignedUserId && box.customLabel) {
            hasChanges = true;
            return Box.create({
              name: box.name,
              gridConfig: box.gridConfig,
              maxPositions: box.maxPositions,
              positionDisplay: box.positionDisplay,
              isActive: box.isActive,
              assignedUserId: box.assignedUserId,
              sharedWithUserIds: box.sharedWithUserIds,
              isSeeded: box.isSeeded,
            });
          }
          return box;
        });

        if (rackNeedsUpdate) {
          hasChanges = true;
          return Rack.create({
            id: rack.id,
            name: rack.name,
            boxes: updatedBoxes,
            maxBoxes: rack.maxBoxes,
            capacity: rack.capacity,
            isActive: rack.isActive,
            sharedWithUserIds: rack.sharedWithUserIds,
            isSeeded: rack.isSeeded,
          });
        }

        if (updatedBoxes.some((b, i) => b !== rack.boxes[i])) {
          return Rack.create({
            id: rack.id,
            name: rack.name,
            boxes: updatedBoxes,
            maxBoxes: rack.maxBoxes,
            capacity: rack.capacity,
            isActive: rack.isActive,
            assignedUserId: rack.assignedUserId,
            customLabel: rack.customLabel,
            sharedWithUserIds: rack.sharedWithUserIds,
            isSeeded: rack.isSeeded,
          });
        }

        return rack;
      });

      if (updatedRacks.some((r, i) => r !== tank.racks[i])) {
        return Tank.create({
          id: tank.id,
          name: tank.name,
          racks: updatedRacks as Rack[],
          maxRacks: tank.maxRacks,
          isActive: tank.isActive,
          location: tank.location,
          isSeeded: tank.isSeeded,
        });
      }

      return tank;
    });

    if (hasChanges) {
      this._equipment = EquipmentConfiguration.create(updatedTanks);
      this.touch();
    }

    return hasChanges;
  }

  /** Mutable pattern — called within commands that handle their own persistence */
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
      const updatedRack = Rack.create({
        id: rack.id,
        name: rack.name,
        boxes: [...rack.boxes] as Box[],
        maxBoxes: rack.maxBoxes,
        capacity: rack.capacity,
        isActive: rack.isActive,
        assignedUserId: rack.assignedUserId,
        customLabel: normalizedLabel,
        sharedWithUserIds: rack.sharedWithUserIds,
        isSeeded: rack.isSeeded,
      });

      const updatedRacks = [...tank.racks];
      updatedRacks[rackIndex] = updatedRack;

      const updatedTank = Tank.create({
        id: tank.id,
        name: tank.name,
        racks: updatedRacks as Rack[],
        maxRacks: tank.maxRacks,
        isActive: tank.isActive,
        location: tank.location,
        isSeeded: tank.isSeeded,
      });

      const updatedTanks = [...this._equipment.tanks];
      updatedTanks[tankIndex] = updatedTank;

      this._equipment = EquipmentConfiguration.create(updatedTanks);
    } else {
      if (!boxId) {
        throw new ValidationError('boxId is required for box label update');
      }

      const boxIndex = rack.boxes.findIndex(b => b.name === boxId.toUpperCase());
      if (boxIndex === -1) {
        throw new ValidationError(`Box '${boxId}' not found in rack '${rackId}'`);
      }

      const box = rack.boxes[boxIndex];
      const updatedBox = Box.create({
        name: box.name,
        gridConfig: box.gridConfig,
        maxPositions: box.maxPositions,
        positionDisplay: box.positionDisplay,
        isActive: box.isActive,
        assignedUserId: box.assignedUserId,
        customLabel: normalizedLabel,
        sharedWithUserIds: box.sharedWithUserIds,
        isSeeded: box.isSeeded,
      });

      const updatedBoxes = [...rack.boxes];
      updatedBoxes[boxIndex] = updatedBox;

      const updatedRack = Rack.create({
        id: rack.id,
        name: rack.name,
        boxes: updatedBoxes,
        maxBoxes: rack.maxBoxes,
        capacity: rack.capacity,
        isActive: rack.isActive,
        assignedUserId: rack.assignedUserId,
        customLabel: rack.customLabel,
        sharedWithUserIds: rack.sharedWithUserIds,
        isSeeded: rack.isSeeded,
      });

      const updatedRacks = [...tank.racks];
      updatedRacks[rackIndex] = updatedRack;

      const updatedTank = Tank.create({
        id: tank.id,
        name: tank.name,
        racks: updatedRacks as Rack[],
        maxRacks: tank.maxRacks,
        isActive: tank.isActive,
        location: tank.location,
        isSeeded: tank.isSeeded,
      });

      const updatedTanks = [...this._equipment.tanks];
      updatedTanks[tankIndex] = updatedTank;

      this._equipment = EquipmentConfiguration.create(updatedTanks);
    }

    this.touch();
  }

  getRack(tankId: string, rackId: string): { rack: ReturnType<Rack['toData']>; tank: ReturnType<Tank['toData']> } | null {
    const tank = this._equipment.tanks.find(t => t.id === tankId);
    if (!tank) return null;

    const rack = tank.racks.find(r => r.id === rackId);
    if (!rack) return null;

    return { rack: rack.toData(), tank: tank.toData() };
  }

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

  /** Pass null to clear lab default and fall back to system default */
  updateLabDefaultPositionDisplay(
    positionDisplay: PositionDisplayConfig | null
  ): Storage {
    const newSystemSettings = this._systemSettings.update({
      defaultPositionDisplay: positionDisplay
    });

    return new Storage(
      this._equipment,
      newSystemSettings,
      new Date(),
      this._version
    );
  }

  isLocationValid(location: Location): boolean {
    return this._equipment.isLocationValid(
      location.tankId,
      location.rackId,
      location.boxId,
      location.position
    );
  }

  locationExists(tankId: string, rackId: string, boxId: string, position: number): boolean {
    return this._equipment.isLocationValid(tankId, rackId, boxId, position);
  }

  getAvailablePositions(tankId: string, rackId: string, boxId: string, occupiedPositions: number[]): number[] {
    const tank = this._equipment.tanks.find(t => t.id === tankId);
    if (!tank) return [];

    const rack = tank.racks.find(r => r.id === rackId);
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
          sharedWithUserIds?: string[];
          isSeeded?: boolean;
        }>;
        maxBoxes?: number;
        capacity?: number;
        isActive?: boolean;
        assignedUserId?: string;
        customLabel?: string;
        sharedWithUserIds?: string[];
        isSeeded?: boolean;
      }>;
      maxRacks?: number;
      isActive?: boolean;
      isSeeded?: boolean;
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
    const tanks = data.tanks.map(tankData => {
      const racks = tankData.racks.map(rackData => {
        const boxes = rackData.boxes.map(boxData =>
          Box.create({
            name: boxData.name,
            gridConfig: boxData.gridConfig,
            maxPositions: boxData.maxPositions,
            positionDisplay: boxData.positionDisplay,
            isActive: boxData.isActive,
            assignedUserId: boxData.assignedUserId,
            customLabel: boxData.customLabel,
            sharedWithUserIds: boxData.sharedWithUserIds,
            isSeeded: boxData.isSeeded,
          })
        );

        const effectiveCapacity = Storage.effectiveRackCapacity(boxes.length, rackData.maxBoxes, rackData.capacity);

        return Rack.create({
          id: rackData.id,
          name: rackData.name,
          boxes,
          maxBoxes: effectiveCapacity,
          capacity: effectiveCapacity,
          isActive: rackData.isActive,
          assignedUserId: rackData.assignedUserId,
          customLabel: rackData.customLabel,
          sharedWithUserIds: rackData.sharedWithUserIds,
          isSeeded: rackData.isSeeded,
        });
      });

      return Tank.create({
        id: tankData.id,
        name: tankData.name,
        racks,
        maxRacks: tankData.maxRacks || tankData.racks.length || EQUIPMENT_DEFAULTS.MAX_RACKS_PER_TANK,
        isActive: tankData.isActive,
        location: tankData.location,
        isSeeded: tankData.isSeeded,
      });
    });

    this._equipment = EquipmentConfiguration.create(tanks);
    this._systemSettings = SystemSettings.fromData(data.systemSettings);

    this.touch();
  }

  seedAll(): void {
    const seededTanks = this._equipment.tanks.map(tank => {
      const seededRacks = tank.racks.map(rack => {
        const seededBoxes = rack.boxes.map(box =>
          Box.create({ name: box.name, gridConfig: box.gridConfig, maxPositions: box.maxPositions, positionDisplay: box.positionDisplay, isActive: box.isActive, assignedUserId: box.assignedUserId, customLabel: box.customLabel, sharedWithUserIds: box.sharedWithUserIds, isSeeded: true })
        );
        return Rack.create({ id: rack.id, name: rack.name, boxes: seededBoxes, maxBoxes: rack.maxBoxes, capacity: rack.capacity, isActive: rack.isActive, assignedUserId: rack.assignedUserId, customLabel: rack.customLabel, sharedWithUserIds: rack.sharedWithUserIds, isSeeded: true });
      });
      return Tank.create({ id: tank.id, name: tank.name, racks: seededRacks as Rack[], maxRacks: tank.maxRacks, isActive: tank.isActive, location: tank.location, isSeeded: true });
    });
    this._equipment = EquipmentConfiguration.create(seededTanks);
    this.touch();
  }

  unseedAll(): void {
    const unseededTanks = this._equipment.tanks.map(tank => {
      const unseededRacks = tank.racks.map(rack => {
        const unseededBoxes = rack.boxes.map(box =>
          Box.create({ name: box.name, gridConfig: box.gridConfig, maxPositions: box.maxPositions, positionDisplay: box.positionDisplay, isActive: box.isActive, assignedUserId: box.assignedUserId, customLabel: box.customLabel, sharedWithUserIds: box.sharedWithUserIds, isSeeded: false })
        );
        return Rack.create({ id: rack.id, name: rack.name, boxes: unseededBoxes, maxBoxes: rack.maxBoxes, capacity: rack.capacity, isActive: rack.isActive, assignedUserId: rack.assignedUserId, customLabel: rack.customLabel, sharedWithUserIds: rack.sharedWithUserIds, isSeeded: false });
      });
      return Tank.create({ id: tank.id, name: tank.name, racks: unseededRacks as Rack[], maxRacks: tank.maxRacks, isActive: tank.isActive, location: tank.location, isSeeded: false });
    });
    this._equipment = EquipmentConfiguration.create(unseededTanks);
    this.touch();
  }

  removeNonSeededEquipment(): void {
    const seededTanks = this._equipment.tanks
      .filter(tank => tank.isSeeded)
      .map(tank => {
        const seededRacks = tank.racks
          .filter(rack => rack.isSeeded)
          .map(rack => {
            const seededBoxes = rack.boxes.filter(box => box.isSeeded);
            return Rack.create({ id: rack.id, name: rack.name, boxes: seededBoxes as Box[], maxBoxes: rack.maxBoxes, capacity: rack.capacity, isActive: rack.isActive, assignedUserId: rack.assignedUserId, customLabel: rack.customLabel, sharedWithUserIds: rack.sharedWithUserIds, isSeeded: rack.isSeeded });
          });
        return Tank.create({ id: tank.id, name: tank.name, racks: seededRacks as Rack[], maxRacks: tank.maxRacks, isActive: tank.isActive, location: tank.location, isSeeded: tank.isSeeded });
      });
    this._equipment = EquipmentConfiguration.create(seededTanks);
    this.touch();
  }

  countNonSeededTanks(): number {
    return this._equipment.tanks.filter(t => !t.isSeeded).length;
  }

  countNonSeededRacksInTank(tankId: string): number {
    const tank = this._equipment.tanks.find(t => t.id === tankId);
    if (!tank) return 0;
    return tank.racks.filter(r => !r.isSeeded).length;
  }

  countNonSeededBoxesInRack(tankId: string, rackId: string): number {
    const tank = this._equipment.tanks.find(t => t.id === tankId);
    if (!tank) return 0;
    const rack = tank.racks.find(r => r.id === rackId);
    if (!rack) return 0;
    return rack.boxes.filter(b => !b.isSeeded).length;
  }

  isResourceSeeded(tankId: string, rackId?: string, boxId?: string): boolean {
    const tank = this._equipment.tanks.find(t => t.id === tankId);
    if (!tank) return false;
    if (!rackId) return tank.isSeeded;

    const rack = tank.racks.find(r => r.id === rackId);
    if (!rack) return false;
    if (!boxId) return rack.isSeeded;

    const box = rack.boxes.find(b => b.name === boxId.toUpperCase());
    if (!box) return false;
    return box.isSeeded;
  }

  hasAnySeededResources(): boolean {
    return this._equipment.tanks.some(t =>
      t.isSeeded || t.racks.some(r => r.isSeeded || r.boxes.some(b => b.isSeeded))
    );
  }

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
          sharedWithUserIds?: string[];
          isSeeded?: boolean;
        }>;
        maxBoxes: number;
        capacity: number;
        isActive: boolean;
        assignedUserId?: string;
        customLabel?: string;
        sharedWithUserIds?: string[];
        isSeeded?: boolean;
      }>;
      maxRacks: number;
      isActive: boolean;
      isSeeded?: boolean;
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

  // Getters
  get equipment(): EquipmentConfiguration { return this._equipment; }
  get systemSettings(): SystemSettings { return this._systemSettings; }
  get updatedAt(): Date { return new Date(this._updatedAt); }
  get version(): number { return this._version; }

  // Convenience getter for tanks
  get tanks(): readonly Tank[] { return this._equipment.tanks; }
}

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
