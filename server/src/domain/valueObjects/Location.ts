import { ValidationError } from '@domain/errors/ValidationError';
import { EQUIPMENT_DEFAULTS } from '@odysseus/shared-schemas';

/**
 * Location Value Object - Encapsulates all tube position logic with flexible identifiers
 * Represents a physical location: Tank -> Rack -> Box -> Position
 * Supports any lab naming convention
 * Immutable and self-validating
 */
export class Location {
  private constructor(
    private readonly _tankId: string,
    private readonly _rackId: string,
    private readonly _boxId: string,
    private readonly _position: number
  ) {
    this.validate();
  }

  /**
   * Factory method to create a Location with validation
   * Accepts either individual parameters or a data object
   */
  static create(
    tankIdOrData: string | { tankId: string; rackId: string; boxId: string; position: number },
    rackId?: string,
    boxId?: string,
    position?: number
  ): Location {
    if (typeof tankIdOrData === 'object') {
      return new Location(
        tankIdOrData.tankId,
        tankIdOrData.rackId,
        tankIdOrData.boxId,
        tankIdOrData.position
      );
    }
    return new Location(tankIdOrData, rackId!, boxId!, position!);
  }

  /**
   * Validates all location parameters according to business rules
   */
  private validate(): void {
    this.validateTankId();
    this.validateRackId();
    this.validateBoxId();
    this.validatePosition();
  }

  private validateTankId(): void {
    if (!this._tankId || this._tankId.trim().length === 0) {
      throw new ValidationError('Tank ID is required');
    }
    if (this._tankId.trim().length > 50) {
      throw new ValidationError('Tank ID cannot exceed 50 characters');
    }
  }

  private validateRackId(): void {
    if (!this._rackId || this._rackId.trim().length === 0) {
      throw new ValidationError('Rack ID is required');
    }
    if (this._rackId.trim().length > 50) {
      throw new ValidationError('Rack ID cannot exceed 50 characters');
    }
    // Allow any string format for lab flexibility
    // Examples: "1", "R1", "Top-Shelf", "Level-A", "Rack-B2"
  }

  private validateBoxId(): void {
    if (!this._boxId || this._boxId.trim().length === 0) {
      throw new ValidationError('Box ID is required');
    }
    if (this._boxId.trim().length > 50) {
      throw new ValidationError('Box ID cannot exceed 50 characters');
    }
    // Allow any string format for lab flexibility
    // Examples: "A", "Box-01", "Front-Left", "Compartment-1"
  }

  private validatePosition(): void {
    if (!Number.isInteger(this._position)) {
      throw new ValidationError('Position must be an integer');
    }
    if (this._position < 1 || this._position > EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX) {
      throw new ValidationError(`Position must be between 1 and ${EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX}`);
    }
  }

  /**
   * Equality check for value objects
   */
  equals(other: Location): boolean {
    if (!other) return false;
    
    return this._tankId === other._tankId &&
           this._rackId === other._rackId &&
           this._boxId.toUpperCase() === other._boxId.toUpperCase() &&
           this._position === other._position;
  }

  /**
   * Human-readable string representation
   */
  toString(): string {
    return `Tank-${this._tankId}/Rack-${this._rackId}/Box-${this._boxId}/Pos-${this._position}`;
  }

  /**
   * Unique identifier for this location
   */
  toKey(): string {
    return `${this._tankId}-${this._rackId}-${this._boxId.toUpperCase()}-${this._position}`;
  }

  /**
   * Convert to data object for persistence/serialization
   */
  toData(): {tankId: string, rackId: string, boxId: string, position: number} {
    return {
      tankId: this._tankId,
      rackId: this._rackId,
      boxId: this._boxId.toUpperCase(),
      position: this._position
    };
  }

  // Getters (immutable access)
  get tankId(): string { return this._tankId; }
  get rackId(): string { return this._rackId; }
  get boxId(): string { return this._boxId.toUpperCase(); }
  get position(): number { return this._position; }

  /**
   * Business logic: Check if this position is in the same rack as another
   */
  isInSameRack(other: Location): boolean {
    return this._tankId === other._tankId && this._rackId === other._rackId;
  }

  /**
   * Business logic: Check if this position is in the same box as another
   */
  isInSameBox(other: Location): boolean {
    return this.isInSameRack(other) && this._boxId.toUpperCase() === other._boxId.toUpperCase();
  }

  /**
   * Update location with new values (returns new instance - immutable)
   * Implements partial update pattern for value objects
   */
  update(updates: Partial<{
    tankId?: string;
    rackId?: string;
    boxId?: string;
    position?: number;
  }>): Location {
    return Location.create({
      tankId: updates.tankId ?? this._tankId,
      rackId: updates.rackId ?? this._rackId,
      boxId: updates.boxId ?? this._boxId,
      position: updates.position ?? this._position
    });
  }
}
