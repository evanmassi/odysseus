/**
 * Tube Location
 *
 * Immutable value object representing a physical position: Tank → Rack → Box → Position.
 */

import { EQUIPMENT_DEFAULTS } from '@odysseus/shared-schemas';

import { ValidationError } from '@domain/errors/ValidationError';
export class TubeLocation {
  private constructor(
    private readonly _tankId: string,
    private readonly _rackId: string,
    private readonly _boxId: string,
    private readonly _position: number
  ) {
    this.validate();
  }

  static create(
    tankIdOrData: string | { tankId: string; rackId: string; boxId: string; position: number },
    rackId?: string,
    boxId?: string,
    position?: number
  ): TubeLocation {
    if (typeof tankIdOrData === 'object') {
      return new TubeLocation(
        tankIdOrData.tankId,
        tankIdOrData.rackId,
        tankIdOrData.boxId,
        tankIdOrData.position
      );
    }
    return new TubeLocation(tankIdOrData, rackId!, boxId!, position!);
  }

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
      throw new ValidationError(
        `Position must be between 1 and ${EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX}`
      );
    }
  }

  equals(other: TubeLocation): boolean {
    if (!other) return false;

    return (
      this._tankId === other._tankId &&
      this._rackId === other._rackId &&
      this._boxId.toUpperCase() === other._boxId.toUpperCase() &&
      this._position === other._position
    );
  }

  toString(): string {
    return `Tank-${this._tankId}/Rack-${this._rackId}/Box-${this._boxId}/Pos-${this._position}`;
  }

  toData(): { tankId: string; rackId: string; boxId: string; position: number } {
    return {
      tankId: this._tankId,
      rackId: this._rackId,
      boxId: this._boxId.toUpperCase(),
      position: this._position,
    };
  }

  get tankId(): string {
    return this._tankId;
  }
  get rackId(): string {
    return this._rackId;
  }
  get boxId(): string {
    return this._boxId.toUpperCase();
  }
  get position(): number {
    return this._position;
  }

  isInSameRack(other: TubeLocation): boolean {
    return this._tankId === other._tankId && this._rackId === other._rackId;
  }

  update(updates: {
    tankId?: string;
    rackId?: string;
    boxId?: string;
    position?: number;
  }): TubeLocation {
    return TubeLocation.create({
      tankId: updates.tankId ?? this._tankId,
      rackId: updates.rackId ?? this._rackId,
      boxId: updates.boxId ?? this._boxId,
      position: updates.position ?? this._position,
    });
  }
}
