/**
 * Lab Equipment Value Objects
 *
 * Immutable Tank, Rack, and Box definitions with domain validation.
 */

import {
  EQUIPMENT_DEFAULTS,
  VALIDATION_LIMITS,
  positionToLabel,
  labelToPosition,
  getDefaultPositionDisplay,
  type PositionDisplayConfig,
} from '@odysseus/shared-schemas';

import { ValidationError } from '@domain/errors/ValidationError';

export interface CreateTankOptions {
  id: string;
  name: string;
  racks?: Rack[];
  maxRacks?: number;
  isActive?: boolean;
  location?: string;
  isSeeded?: boolean;
}

/** Represents a liquid nitrogen tank containing racks. */
export class Tank {
  private constructor(
    private readonly _id: string,
    private readonly _name: string,
    private readonly _racks: Rack[],
    private readonly _maxRacks: number,
    private readonly _isActive: boolean,
    private readonly _location: string,
    private readonly _isSeeded: boolean
  ) {
    this.validate();
  }

  static create(options: CreateTankOptions): Tank {
    return new Tank(
      options.id,
      options.name,
      options.racks ?? [],
      options.maxRacks ?? EQUIPMENT_DEFAULTS.MAX_RACKS_PER_TANK,
      options.isActive ?? true,
      options.location ?? 'Main Lab',
      options.isSeeded ?? false
    );
  }

  private validate(): void {
    if (!this._id || this._id.trim().length === 0) {
      throw new ValidationError('Tank ID is required');
    }
    if (this._id.length > VALIDATION_LIMITS.TANK.ID_MAX_LENGTH) {
      throw new ValidationError(
        `Tank ID cannot exceed ${VALIDATION_LIMITS.TANK.ID_MAX_LENGTH} characters`
      );
    }
    if (!this._name || this._name.trim().length === 0) {
      throw new ValidationError('Tank name is required');
    }
    if (this._name.length > VALIDATION_LIMITS.TANK.NAME_MAX_LENGTH) {
      throw new ValidationError(
        `Tank name cannot exceed ${VALIDATION_LIMITS.TANK.NAME_MAX_LENGTH} characters`
      );
    }
    if (
      this._maxRacks < VALIDATION_LIMITS.TANK.MIN_RACKS ||
      this._maxRacks > VALIDATION_LIMITS.TANK.MAX_RACKS
    ) {
      throw new ValidationError(
        `Tank must support between ${VALIDATION_LIMITS.TANK.MIN_RACKS} and ${VALIDATION_LIMITS.TANK.MAX_RACKS} racks`
      );
    }

    if (this._racks.length > this._maxRacks) {
      throw new ValidationError(
        `Tank '${this._name}' has ${this._racks.length} racks but max capacity is ${this._maxRacks}`
      );
    }

    const rackIds = this._racks.map(r => r.id);
    if (new Set(rackIds).size !== rackIds.length) {
      throw new ValidationError(`Tank '${this._name}' has duplicate rack IDs`);
    }
  }

  canAccommodateRack(): boolean {
    return this._racks.length < this._maxRacks;
  }

  toData(): {
    id: string;
    name: string;
    racks: ReturnType<Rack['toData']>[];
    maxRacks: number;
    isActive: boolean;
    location: string;
    isSeeded?: boolean;
  } {
    return {
      id: this._id,
      name: this._name,
      racks: this._racks.map(r => r.toData()),
      maxRacks: this._maxRacks,
      isActive: this._isActive,
      location: this._location,
      ...(this._isSeeded && { isSeeded: true }),
    };
  }

  get id(): string {
    return this._id;
  }
  get name(): string {
    return this._name;
  }
  get racks(): readonly Rack[] {
    return this._racks;
  }
  get maxRacks(): number {
    return this._maxRacks;
  }
  get isActive(): boolean {
    return this._isActive;
  }
  get location(): string {
    return this._location;
  }
  get isSeeded(): boolean {
    return this._isSeeded;
  }
}

export interface CreateRackOptions {
  id: string | number;
  name: string;
  boxes?: Box[];
  maxBoxes?: number;
  capacity?: number;
  isActive?: boolean;
  assignedUserId?: string;
  customLabel?: string;
  sharedWithUserIds?: string[];
  isSeeded?: boolean;
}

export class Rack {
  private constructor(
    private readonly _id: string,
    private readonly _name: string,
    private readonly _boxes: Box[],
    private readonly _maxBoxes: number,
    private readonly _capacity: number,
    private readonly _isActive: boolean,
    private readonly _assignedUserId?: string,
    private readonly _customLabel?: string,
    private readonly _sharedWithUserIds: string[] = [],
    private readonly _isSeeded: boolean = false
  ) {
    this.validate();
  }

  static create(options: CreateRackOptions): Rack {
    return new Rack(
      String(options.id),
      options.name,
      options.boxes ?? [],
      options.maxBoxes ?? EQUIPMENT_DEFAULTS.BOXES_PER_RACK,
      options.capacity ?? EQUIPMENT_DEFAULTS.BOXES_PER_RACK,
      options.isActive ?? true,
      options.assignedUserId,
      options.customLabel,
      options.sharedWithUserIds ?? [],
      options.isSeeded ?? false
    );
  }

  private validate(): void {
    if (!this._id || this._id.trim().length === 0) {
      throw new ValidationError('Rack ID is required');
    }
    if (!this._name || this._name.trim().length === 0) {
      throw new ValidationError('Rack name is required');
    }
    if (
      this._maxBoxes < VALIDATION_LIMITS.RACK.MIN_BOXES ||
      this._maxBoxes > VALIDATION_LIMITS.RACK.MAX_BOXES
    ) {
      throw new ValidationError(
        `Rack must support between ${VALIDATION_LIMITS.RACK.MIN_BOXES} and ${VALIDATION_LIMITS.RACK.MAX_BOXES} boxes`
      );
    }

    if (this._boxes.length > this._maxBoxes) {
      throw new ValidationError(
        `Rack ${this._id} has ${this._boxes.length} boxes but max capacity is ${this._maxBoxes}`
      );
    }

    const boxNames = this._boxes.map(b => b.name.toUpperCase());
    if (new Set(boxNames).size !== boxNames.length) {
      throw new ValidationError(`Rack ${this._id} has duplicate box names`);
    }
  }

  canAccommodateBox(boxId: string): boolean {
    const letter = boxId.toUpperCase();
    if (!/^[A-Z]$/.test(letter)) return false;
    return this._boxes.length < VALIDATION_LIMITS.RACK.MAX_BOXES;
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
    sharedWithUserIds?: string[];
    isSeeded?: boolean;
  } {
    return {
      id: this._id,
      name: this._name,
      boxes: this._boxes.map(b => b.toData()),
      maxBoxes: this._maxBoxes,
      capacity: this._capacity,
      isActive: this._isActive,
      assignedUserId: this._assignedUserId,
      customLabel: this._customLabel,
      sharedWithUserIds: this._sharedWithUserIds.length > 0 ? this._sharedWithUserIds : undefined,
      ...(this._isSeeded && { isSeeded: true }),
    };
  }

  get id(): string {
    return this._id;
  }
  get name(): string {
    return this._name;
  }
  get boxes(): readonly Box[] {
    return this._boxes;
  }
  get maxBoxes(): number {
    return this._maxBoxes;
  }
  get capacity(): number {
    return this._capacity;
  }
  get isActive(): boolean {
    return this._isActive;
  }
  get assignedUserId(): string | undefined {
    return this._assignedUserId;
  }
  get customLabel(): string | undefined {
    return this._customLabel;
  }
  get sharedWithUserIds(): string[] {
    return [...this._sharedWithUserIds];
  }
  get isSeeded(): boolean {
    return this._isSeeded;
  }
}

export interface CreateBoxOptions {
  name: string;
  gridConfig?: { rows: number; cols: number };
  maxPositions?: number;
  positionDisplay?: PositionDisplayConfig;
  isActive?: boolean;
  assignedUserId?: string | null;
  customLabel?: string;
  sharedWithUserIds?: string[];
  isSeeded?: boolean;
}

export class Box {
  private static readonly POSITIONS_PER_BOX = EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX;

  private constructor(
    private readonly _name: string,
    private readonly _gridConfig: { rows: number; cols: number },
    private readonly _maxPositions: number,
    private readonly _positionDisplay: PositionDisplayConfig | undefined,
    private readonly _isActive: boolean,
    private readonly _assignedUserId?: string | null,
    private readonly _customLabel?: string,
    private readonly _sharedWithUserIds: string[] = [],
    private readonly _isSeeded: boolean = false
  ) {
    this.validate();
  }

  static create(options: CreateBoxOptions): Box {
    const gridConfig = options.gridConfig ?? {
      rows: EQUIPMENT_DEFAULTS.GRID_ROWS,
      cols: EQUIPMENT_DEFAULTS.GRID_COLS,
    };
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- 0 is not a valid position count; fall back to the grid size
    const positions = options.maxPositions || gridConfig.rows * gridConfig.cols;
    return new Box(
      options.name,
      gridConfig,
      positions,
      options.positionDisplay,
      options.isActive ?? true,
      options.assignedUserId,
      options.customLabel,
      options.sharedWithUserIds ?? [],
      options.isSeeded ?? false
    );
  }

  private validate(): void {
    if (!this._name || this._name.trim().length === 0) {
      throw new ValidationError('Box name is required');
    }

    const validBoxPattern = /^[A-Z]$/i;
    if (!validBoxPattern.test(this._name.trim())) {
      throw new ValidationError('Box name must be a single letter A-Z');
    }

    if (
      this._maxPositions < VALIDATION_LIMITS.BOX.MIN_POSITIONS ||
      this._maxPositions > VALIDATION_LIMITS.BOX.MAX_POSITIONS
    ) {
      throw new ValidationError(
        `Box must support between ${VALIDATION_LIMITS.BOX.MIN_POSITIONS} and ${VALIDATION_LIMITS.BOX.MAX_POSITIONS} positions`
      );
    }

    if (
      this._gridConfig.rows < VALIDATION_LIMITS.BOX.MIN_GRID_DIMENSION ||
      this._gridConfig.cols < VALIDATION_LIMITS.BOX.MIN_GRID_DIMENSION
    ) {
      throw new ValidationError('Grid configuration must have positive rows and columns');
    }
  }

  canAccommodatePosition(position: number): boolean {
    return Number.isInteger(position) && position >= 1 && position <= this._maxPositions;
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
    const config =
      this._positionDisplay ??
      getDefaultPositionDisplay(this._gridConfig.rows, this._gridConfig.cols);

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
    const config =
      this._positionDisplay ??
      getDefaultPositionDisplay(this._gridConfig.rows, this._gridConfig.cols);

    try {
      return labelToPosition(label, this._gridConfig.rows, this._gridConfig.cols, config);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ValidationError(`Invalid position label: ${message}`);
    }
  }

  toData(): {
    name: string;
    gridConfig: { rows: number; cols: number };
    maxPositions: number;
    positionDisplay?: PositionDisplayConfig;
    isActive: boolean;
    assignedUserId?: string | null;
    customLabel?: string;
    sharedWithUserIds?: string[];
    isSeeded?: boolean;
  } {
    return {
      name: this._name.toUpperCase(),
      gridConfig: this._gridConfig,
      maxPositions: this._maxPositions,
      positionDisplay: this._positionDisplay,
      isActive: this._isActive,
      assignedUserId: this._assignedUserId,
      customLabel: this._customLabel,
      sharedWithUserIds: this._sharedWithUserIds.length > 0 ? this._sharedWithUserIds : undefined,
      ...(this._isSeeded && { isSeeded: true }),
    };
  }

  get name(): string {
    return this._name.toUpperCase();
  }
  get gridConfig(): { rows: number; cols: number } {
    return this._gridConfig;
  }
  get maxPositions(): number {
    return this._maxPositions;
  }
  get positionDisplay(): PositionDisplayConfig | undefined {
    return this._positionDisplay;
  }
  get isActive(): boolean {
    return this._isActive;
  }
  get assignedUserId(): string | null | undefined {
    return this._assignedUserId;
  }
  get customLabel(): string | undefined {
    return this._customLabel;
  }
  get sharedWithUserIds(): string[] {
    return [...this._sharedWithUserIds];
  }
  get isSeeded(): boolean {
    return this._isSeeded;
  }
}

/** Top-level equipment container: Tank → Rack[] → Box[]. */
export class EquipmentConfiguration {
  private constructor(private readonly _tanks: Tank[]) {
    this.validate();
  }

  static create(tanks: Tank[]): EquipmentConfiguration {
    return new EquipmentConfiguration(tanks);
  }

  static empty(): EquipmentConfiguration {
    return new EquipmentConfiguration([]);
  }

  private validate(): void {
    const tankIds = this._tanks.map(t => t.id);
    if (new Set(tankIds).size !== tankIds.length) {
      throw new ValidationError('Tank IDs must be unique');
    }

    // Tanks validate their own rack/box relationships internally
  }

  isLocationValid(tankId: string, rackId: string, boxId: string, position: number): boolean {
    const tank = this._tanks.find(t => t.id === tankId && t.isActive);
    if (!tank) {
      return false;
    }

    const rack = tank.racks.find(r => r.id === rackId && r.isActive);
    if (!rack || !rack.canAccommodateBox(boxId)) {
      return false;
    }

    const box = rack.boxes.find(b => b.name === boxId.toUpperCase() && b.isActive);
    if (!box || !box.canAccommodatePosition(position)) {
      return false;
    }

    return true;
  }

  getActiveTanks(): Tank[] {
    return this._tanks.filter(t => t.isActive);
  }

  getActiveRacksForTank(tankId: string): Rack[] {
    const tank = this._tanks.find(t => t.id === tankId);
    if (!tank) return [];
    return tank.racks.filter(r => r.isActive);
  }

  getActiveBoxesForRack(tankId: string, rackId: string): Box[] {
    const tank = this._tanks.find(t => t.id === tankId);
    if (!tank) return [];

    const rack = tank.racks.find(r => r.id === rackId);
    if (!rack) return [];

    return rack.boxes.filter(b => b.isActive);
  }

  findBox(tankId: string, rackId: string, boxId: string): Box | null {
    const tank = this._tanks.find(t => t.id === tankId && t.isActive);
    if (!tank) return null;

    const rack = tank.racks.find(r => r.id === rackId && r.isActive);
    if (!rack) return null;

    const box = rack.boxes.find(b => b.name === boxId.toUpperCase() && b.isActive);
    return box ?? null;
  }

  toData(): {
    tanks: ReturnType<Tank['toData']>[];
  } {
    return {
      tanks: this._tanks.map(t => t.toData()),
    };
  }

  get tanks(): readonly Tank[] {
    return this._tanks;
  }
}
