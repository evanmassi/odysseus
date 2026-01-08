import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';

/**
 * Researcher Entity
 *
 * Links a Person to research activities (tube ownership).
 * Profile data (name, email, etc.) lives in Person entity.
 */
export class Researcher {
  private constructor(
    private readonly _id: string,
    private readonly _personId: string,
    private _active: boolean,
    private readonly _createdAt: Date
  ) {
    this.validate();
  }

  /**
   * Factory method to create a new researcher
   */
  static create(personId: string): Researcher {
    const id = generateId('researcher');
    const now = new Date();
    return new Researcher(id, personId, true, now);
  }

  /**
   * Factory method to reconstitute researcher from persistence data
   */
  static fromData(data: {
    id: string;
    personId: string;
    active: boolean;
    createdAt: string | Date;
  }): Researcher {
    return new Researcher(
      data.id,
      data.personId,
      data.active,
      typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt
    );
  }

  /**
   * Validate researcher state
   */
  private validate(): void {
    if (!this._personId || this._personId.trim().length === 0) {
      throw new ValidationError('Person ID is required');
    }
  }

  /**
   * Business method: Activate researcher
   */
  activate(): void {
    this._active = true;
  }

  /**
   * Business method: Deactivate researcher
   */
  deactivate(): void {
    this._active = false;
  }

  /**
   * Business method: Toggle active status
   */
  toggleActiveStatus(): void {
    this._active = !this._active;
  }

  /**
   * Business query: Check if researcher is active
   */
  isActive(): boolean {
    return this._active;
  }

  /**
   * Convert to data object for persistence
   */
  toData(): {
    id: string;
    personId: string;
    active: boolean;
    createdAt: string;
  } {
    return {
      id: this._id,
      personId: this._personId,
      active: this._active,
      createdAt: this._createdAt.toISOString()
    };
  }

  /**
   * Equality check (identity-based for entities)
   */
  equals(other: Researcher): boolean {
    if (!other) return false;
    return this._id === other._id;
  }

  /**
   * String representation
   */
  toString(): string {
    return `Researcher(${this._id})${this._active ? '' : ' [Inactive]'}`;
  }

  // Getters
  get id(): string { return this._id; }
  get personId(): string { return this._personId; }
  get active(): boolean { return this._active; }
  get createdAt(): Date { return new Date(this._createdAt); }
}
