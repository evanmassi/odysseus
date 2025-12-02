import { ValidationError } from '@domain/errors/ValidationError';
import {
  EQUIPMENT_DEFAULTS,
  VALIDATION_LIMITS,
  NAMING_PATTERNS,
  positionToLabel,
  labelToPosition,
  generatePositionLabels,
  getDefaultPositionDisplay,
  type PositionDisplayConfig,
} from '@odysseus/shared-schemas';

/**
 * Equipment Value Objects - Represent physical equipment in the lab
 * Tank, Rack, and Box definitions with validation
 * Immutable and self-validating
 */

/**
 * Tank Value Object - Represents a liquid nitrogen tank
 * Contains nested racks (composition relationship)
 */
export class Tank {
  private constructor(
    private readonly _id: string,
    private readonly _name: string,
    private readonly _racks: Rack[],
    private readonly _maxRacks: number = EQUIPMENT_DEFAULTS.MAX_RACKS_PER_TANK,
    private readonly _isActive: boolean = true,
    private readonly _location: string = 'Main Lab'
  ) {
    this.validate();
  }

  static create(
    id: string,
    name: string,
    racks: Rack[] = [],
    maxRacks: number = EQUIPMENT_DEFAULTS.MAX_RACKS_PER_TANK,
    isActive: boolean = true,
    location: string = 'Main Lab'
  ): Tank {
    return new Tank(id, name, racks, maxRacks, isActive, location);
  }

  private validate(): void {
    if (!this._id || this._id.trim().length === 0) {
      throw new ValidationError('Tank ID is required');
    }
    if (this._id.length > VALIDATION_LIMITS.TANK.ID_MAX_LENGTH) {
      throw new ValidationError(`Tank ID cannot exceed ${VALIDATION_LIMITS.TANK.ID_MAX_LENGTH} characters`);
    }
    if (!this._name || this._name.trim().length === 0) {
      throw new ValidationError('Tank name is required');
    }
    if (this._name.length > VALIDATION_LIMITS.TANK.NAME_MAX_LENGTH) {
      throw new ValidationError(`Tank name cannot exceed ${VALIDATION_LIMITS.TANK.NAME_MAX_LENGTH} characters`);
    }
    if (this._maxRacks < VALIDATION_LIMITS.TANK.MIN_RACKS || this._maxRacks > VALIDATION_LIMITS.TANK.MAX_RACKS) {
      throw new ValidationError(`Tank must support between ${VALIDATION_LIMITS.TANK.MIN_RACKS} and ${VALIDATION_LIMITS.TANK.MAX_RACKS} racks`);
    }

    // Validate rack count doesn't exceed capacity
    if (this._racks.length > this._maxRacks) {
      throw new ValidationError(`Tank '${this._name}' has ${this._racks.length} racks but max capacity is ${this._maxRacks}`);
    }

    // Validate rack IDs are unique within this tank
    const rackIds = this._racks.map(r => r.id);
    if (new Set(rackIds).size !== rackIds.length) {
      throw new ValidationError(`Tank '${this._name}' has duplicate rack IDs`);
    }
  }

  canAccommodateRack(rackId: string | number): boolean {
    const numericId = typeof rackId === 'string' ? parseInt(rackId, 10) : rackId;
    return !isNaN(numericId) && numericId >= 1 && numericId <= this._maxRacks;
  }

  equals(other: Tank): boolean {
    if (!other) return false;
    return this._id === other._id;
  }

  toData(): {
    id: string;
    name: string;
    racks: ReturnType<Rack['toData']>[];
    maxRacks: number;
    isActive: boolean;
    location: string;
  } {
    return {
      id: this._id,
      name: this._name,
      racks: this._racks.map(r => r.toData()),
      maxRacks: this._maxRacks,
      isActive: this._isActive,
      location: this._location
    };
  }

  // Getters
  get id(): string { return this._id; }
  get name(): string { return this._name; }
  get racks(): readonly Rack[] { return this._racks; }
  get maxRacks(): number { return this._maxRacks; }
  get isActive(): boolean { return this._isActive; }
  get location(): string { return this._location; }
}

/**
 * Rack Value Object - Represents a rack within a tank
 * Contains nested boxes (composition relationship)
 */
export class Rack {
  private constructor(
    private readonly _id: string,
    private readonly _name: string,
    private readonly _boxes: Box[],
    private readonly _maxBoxes: number = EQUIPMENT_DEFAULTS.BOXES_PER_RACK,
    private readonly _capacity: number = EQUIPMENT_DEFAULTS.BOXES_PER_RACK,
    private readonly _isActive: boolean = true,
    private readonly _assignedUserId?: string,
    private readonly _customLabel?: string
  ) {
    this.validate();
  }

  static create(
    id: string | number,
    name: string,
    boxes: Box[] = [],
    maxBoxes: number = EQUIPMENT_DEFAULTS.BOXES_PER_RACK,
    capacity: number = EQUIPMENT_DEFAULTS.BOXES_PER_RACK,
    isActive: boolean = true,
    assignedUserId?: string,
    customLabel?: string
  ): Rack {
    return new Rack(String(id), name, boxes, maxBoxes, capacity, isActive, assignedUserId, customLabel);
  }

  private validate(): void {
    if (!this._id || this._id.trim().length === 0) {
      throw new ValidationError('Rack ID is required');
    }
    if (!this._name || this._name.trim().length === 0) {
      throw new ValidationError('Rack name is required');
    }
    if (this._maxBoxes < VALIDATION_LIMITS.RACK.MIN_BOXES || this._maxBoxes > VALIDATION_LIMITS.RACK.MAX_BOXES) {
      throw new ValidationError(`Rack must support between ${VALIDATION_LIMITS.RACK.MIN_BOXES} and ${VALIDATION_LIMITS.RACK.MAX_BOXES} boxes`);
    }

    // Validate box count doesn't exceed capacity
    if (this._boxes.length > this._maxBoxes) {
      throw new ValidationError(`Rack ${this._id} has ${this._boxes.length} boxes but max capacity is ${this._maxBoxes}`);
    }

    // Validate box names are unique within this rack
    const boxNames = this._boxes.map(b => b.name.toUpperCase());
    if (new Set(boxNames).size !== boxNames.length) {
      throw new ValidationError(`Rack ${this._id} has duplicate box names`);
    }
  }

  canAccommodateBox(boxId: string): boolean {
    const validBoxes = this.getValidBoxNames();
    return validBoxes.includes(boxId.toUpperCase());
  }

  private getValidBoxNames(): string[] {
    const boxes = [];
    for (let i = 0; i < this._maxBoxes; i++) {
      boxes.push(NAMING_PATTERNS.BOX.LETTER_NAME(i)); // A, B, C, ...
    }
    return boxes;
  }

  equals(other: Rack): boolean {
    if (!other) return false;
    return this._id === other._id;
  }

  toData(): {
    id: string;
    name: string;
    boxes: ReturnType<Box['toData']>[];
    maxBoxes: number;
    capacity: number;
    isActive: boolean;
    assignedUserId?: string;
    customLabel?: string;
  } {
    return {
      id: this._id,
      name: this._name,
      boxes: this._boxes.map(b => b.toData()),
      maxBoxes: this._maxBoxes,
      capacity: this._capacity,
      isActive: this._isActive,
      assignedUserId: this._assignedUserId,
      customLabel: this._customLabel
    };
  }

  // Getters
  get id(): string { return this._id; }
  get name(): string { return this._name; }
  get boxes(): readonly Box[] { return this._boxes; }
  get maxBoxes(): number { return this._maxBoxes; }
  get capacity(): number { return this._capacity; }
  get isActive(): boolean { return this._isActive; }
  get assignedUserId(): string | undefined { return this._assignedUserId; }
  get customLabel(): string | undefined { return this._customLabel; }
  get validBoxNames(): string[] { return this.getValidBoxNames(); }
}

/**
 * Box Value Object - Represents a storage box within a rack
 * No longer stores parent references (tankId/rackId) - composition handles hierarchy
 */
export class Box {
  private static readonly POSITIONS_PER_BOX = EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX;

  private constructor(
    private readonly _name: string,
    private readonly _gridConfig: { rows: number; cols: number },
    private readonly _maxPositions: number = Box.POSITIONS_PER_BOX,
    private readonly _positionDisplay: PositionDisplayConfig | undefined,
    private readonly _isActive: boolean = true,
    private readonly _assignedUserId?: string | null,
    private readonly _customLabel?: string
  ) {
    this.validate();
  }

  static create(
    name: string,
    gridConfig: { rows: number; cols: number } = {
      rows: EQUIPMENT_DEFAULTS.GRID_ROWS,
      cols: EQUIPMENT_DEFAULTS.GRID_COLS
    },
    maxPositions?: number,
    positionDisplay?: PositionDisplayConfig,
    isActive: boolean = true,
    assignedUserId?: string | null,
    customLabel?: string
  ): Box {
    const positions = maxPositions || (gridConfig.rows * gridConfig.cols);
    return new Box(name, gridConfig, positions, positionDisplay, isActive, assignedUserId, customLabel);
  }

  private validate(): void {
    if (!this._name || this._name.trim().length === 0) {
      throw new ValidationError('Box name is required');
    }

    const validBoxPattern = /^[A-Z]$/i;
    if (!validBoxPattern.test(this._name.trim())) {
      throw new ValidationError('Box name must be a single letter A-Z');
    }

    if (this._maxPositions < VALIDATION_LIMITS.BOX.MIN_POSITIONS || this._maxPositions > VALIDATION_LIMITS.BOX.MAX_POSITIONS) {
      throw new ValidationError(`Box must support between ${VALIDATION_LIMITS.BOX.MIN_POSITIONS} and ${VALIDATION_LIMITS.BOX.MAX_POSITIONS} positions`);
    }

    if (this._gridConfig.rows < VALIDATION_LIMITS.BOX.MIN_GRID_DIMENSION || this._gridConfig.cols < VALIDATION_LIMITS.BOX.MIN_GRID_DIMENSION) {
      throw new ValidationError('Grid configuration must have positive rows and columns');
    }
  }

  canAccommodatePosition(position: number): boolean {
    return Number.isInteger(position) && position >= 1 && position <= this._maxPositions;
  }

  /**
   * Business logic: Convert 1D position to 2D grid coordinates
   */
  positionToGridCoordinates(position: number): { row: number; col: number } {
    if (!this.canAccommodatePosition(position)) {
      throw new ValidationError(`Position ${position} is not valid for this box`);
    }

    const row = Math.ceil(position / this._gridConfig.cols);
    const col = ((position - 1) % this._gridConfig.cols) + 1;

    return { row, col };
  }

  /**
   * Business logic: Convert 2D grid coordinates to 1D position
   */
  gridCoordinatesToPosition(row: number, col: number): number {
    if (row < 1 || row > this._gridConfig.rows || col < 1 || col > this._gridConfig.cols) {
      throw new ValidationError('Grid coordinates are out of bounds');
    }

    return (row - 1) * this._gridConfig.cols + col;
  }

  /**
   * Format position number to display label based on box configuration
   *
   * Uses box-specific position display config, or defaults to alphanumeric format.
   *
   * @param position - 1-based position number
   * @returns Display label (e.g., "C5" or "23")
   */
  formatPosition(position: number): string {
    const config = this._positionDisplay || getDefaultPositionDisplay(
      this._gridConfig.rows,
      this._gridConfig.cols
    );

    return positionToLabel(position, this._gridConfig.rows, this._gridConfig.cols, config);
  }

  /**
   * Parse position label to numeric position based on box configuration
   *
   * @param label - Display label (e.g., "C5" or "23")
   * @returns 1-based position number
   * @throws ValidationError if label is invalid
   */
  parsePositionLabel(label: string): number {
    const config = this._positionDisplay || getDefaultPositionDisplay(
      this._gridConfig.rows,
      this._gridConfig.cols
    );

    try {
      return labelToPosition(label, this._gridConfig.rows, this._gridConfig.cols, config);
    } catch (error: any) {
      throw new ValidationError(`Invalid position label: ${error.message}`);
    }
  }

  /**
   * Get all valid position labels for this box
   *
   * @returns Array of position labels in order
   */
  getAllPositionLabels(): string[] {
    const config = this._positionDisplay || getDefaultPositionDisplay(
      this._gridConfig.rows,
      this._gridConfig.cols
    );

    return generatePositionLabels(this._gridConfig.rows, this._gridConfig.cols, config);
  }

  equals(other: Box): boolean {
    if (!other) return false;
    return this._name.toUpperCase() === other._name.toUpperCase();
  }

  toData(): {
    name: string;
    gridConfig: { rows: number; cols: number };
    maxPositions: number;
    positionDisplay?: PositionDisplayConfig;
    isActive: boolean;
    assignedUserId?: string | null;
    customLabel?: string;
  } {
    return {
      name: this._name.toUpperCase(),
      gridConfig: this._gridConfig,
      maxPositions: this._maxPositions,
      positionDisplay: this._positionDisplay,
      isActive: this._isActive,
      assignedUserId: this._assignedUserId,
      customLabel: this._customLabel
    };
  }

  // Getters
  get name(): string { return this._name.toUpperCase(); }
  get gridConfig(): { rows: number; cols: number } { return this._gridConfig; }
  get maxPositions(): number { return this._maxPositions; }
  get positionDisplay(): PositionDisplayConfig | undefined { return this._positionDisplay; }
  get isActive(): boolean { return this._isActive; }
  get assignedUserId(): string | null | undefined { return this._assignedUserId; }
  get customLabel(): string | undefined { return this._customLabel; }
  get gridSize(): number { return Math.sqrt(this._maxPositions); }
}

/**
 * Equipment Configuration - Manages all equipment in the lab
 * Uses nested composition: Tank -> Rack[] -> Box[]
 */
export class EquipmentConfiguration {
  private constructor(
    private readonly _tanks: Tank[]
  ) {
    this.validate();
  }

  static create(tanks: Tank[]): EquipmentConfiguration {
    return new EquipmentConfiguration(tanks);
  }

  static empty(): EquipmentConfiguration {
    return new EquipmentConfiguration([]);
  }

  private validate(): void {
    // Validate tank IDs are unique
    const tankIds = this._tanks.map(t => t.id);
    if (new Set(tankIds).size !== tankIds.length) {
      throw new ValidationError('Tank IDs must be unique');
    }

    // Tanks validate their own rack/box relationships internally
  }

  /**
   * Business logic: Check if a location is valid in this configuration
   */
  isLocationValid(tankId: string, rackId: string, boxId: string, position: number): boolean {
    const tank = this._tanks.find(t => t.id === tankId && t.isActive);
    if (!tank || !tank.canAccommodateRack(Number(rackId))) {
      return false;
    }

    const rack = tank.racks.find(r => String(r.id) === rackId && r.isActive);
    if (!rack || !rack.canAccommodateBox(boxId)) {
      return false;
    }

    const box = rack.boxes.find(b => b.name === boxId.toUpperCase() && b.isActive);
    if (!box || !box.canAccommodatePosition(position)) {
      return false;
    }

    return true;
  }

  /**
   * Get all active tanks
   */
  getActiveTanks(): Tank[] {
    return this._tanks.filter(t => t.isActive);
  }

  /**
   * Get active racks for a tank
   */
  getActiveRacksForTank(tankId: string): Rack[] {
    const tank = this._tanks.find(t => t.id === tankId);
    if (!tank) return [];
    return tank.racks.filter(r => r.isActive) as Rack[];
  }

  /**
   * Get active boxes for a rack
   */
  getActiveBoxesForRack(tankId: string, rackId: string | number): Box[] {
    const tank = this._tanks.find(t => t.id === tankId);
    if (!tank) return [];

    const rackIdStr = String(rackId);
    const rack = tank.racks.find(r => r.id === rackIdStr);
    if (!rack) return [];

    return rack.boxes.filter(b => b.isActive) as Box[];
  }

  /**
   * Find a specific box in the equipment configuration
   *
   * @param tankId - Tank identifier
   * @param rackId - Rack identifier (as string for compatibility)
   * @param boxId - Box identifier
   * @returns The Box if found, null otherwise
   */
  findBox(tankId: string, rackId: string, boxId: string): Box | null {
    const tank = this._tanks.find(t => t.id === tankId && t.isActive);
    if (!tank) return null;

    const rack = tank.racks.find(r => String(r.id) === rackId && r.isActive);
    if (!rack) return null;

    const box = rack.boxes.find(b => b.name === boxId.toUpperCase() && b.isActive);
    return box || null;
  }

  toData(): {
    tanks: ReturnType<Tank['toData']>[];
  } {
    return {
      tanks: this._tanks.map(t => t.toData())
    };
  }

  // Getters
  get tanks(): readonly Tank[] { return this._tanks; }
}
