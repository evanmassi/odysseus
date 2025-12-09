import { Location } from '@domain/valueObjects/Location';
import { SampleData } from '@domain/valueObjects/SampleData';
import { MediaData } from '@domain/valueObjects/Media';
import { ValidationError } from '@domain/errors/ValidationError';

/**
 * Tube Entity (Aggregate Root)
 * Represents a physical tube in the lab inventory system
 * Uses nested structure matching shared schemas
 * Domain structure now mirrors API structure - zero transformation needed
 */
export class Tube {
  private constructor(
    private readonly _id: string,
    private _location: Location,
    private _sample: SampleData,
    private _researcherId: string | undefined,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
    private readonly _createdByName?: string,
    // Lock fields
    private _isLocked: boolean = false,
    private _lockedBy?: string,
    private _lockNote?: string,
    private _lockedAt?: Date,
    private _sharedWithUserIds: string[] = []
  ) {
    this.validate();
  }

  /**
   * Factory method to create a new tube with nested structure
   * Accepts CreateTubeRequest structure from shared schemas
   */
  static create(data: {
    id?: string;
    location: { tankId: string; rackId: string; boxId: string; position: number } | Location;
    sample: {
      cellType?: string;
      donorInternalId?: string;
      donorSourceId?: string;
      concentration?: number;
      concentrationUnit?: 'c/v' | 'c/mL';
      date?: string;
      media?: MediaData | string;
      cultureCondition?: string;
      lotNumber?: string;
      notes?: string;
    } | SampleData;
    researcherId?: string;
    createdByName?: string;
  }): Tube {
    // Generate unique ID if not provided
    const id = data.id || Tube.generateId();

    // Create location value object (validates position rules)
    const location = data.location instanceof Location
      ? data.location
      : Location.create(data.location);

    // Create sample data value object (validates sample rules)
    const sample = data.sample instanceof SampleData
      ? data.sample
      : SampleData.create(data.sample);

    const now = new Date();

    return new Tube(
      id,
      location,
      sample,
      data.researcherId,
      now,
      now,
      data.createdByName,
      false, // isLocked
      undefined, // lockedBy
      undefined, // lockNote
      undefined, // lockedAt
      [] // sharedWithUserIds
    );
  }

  /**
   * Factory method to reconstitute tube from persistence data
   * Accepts nested structure matching TubeData schema
   */
  static fromData(data: {
    id: string;
    location: { tankId: string; rackId: string; boxId: string; position: number };
    sample: {
      cellType?: string;
      donorInternalId?: string;
      donorSourceId?: string;
      concentration?: number;
      concentrationUnit?: 'c/v' | 'c/mL';
      date?: string;
      media?: MediaData | string;
      cultureCondition?: string;
      lotNumber?: string;
      notes?: string;
    };
    researcherId?: string;
    createdByName?: string;
    timestamps: {
      createdAt: string | Date;
      updatedAt: string | Date;
    };
    // Lock fields
    isLocked?: boolean;
    lockedBy?: string;
    lockNote?: string;
    lockedAt?: string;
    sharedWithUserIds?: string[];
  }): Tube {
    const location = Location.create(data.location);
    const sample = SampleData.create(data.sample);

    return new Tube(
      data.id,
      location,
      sample,
      data.researcherId,
      typeof data.timestamps.createdAt === 'string'
        ? new Date(data.timestamps.createdAt)
        : data.timestamps.createdAt,
      typeof data.timestamps.updatedAt === 'string'
        ? new Date(data.timestamps.updatedAt)
        : data.timestamps.updatedAt,
      data.createdByName,
      data.isLocked ?? false,
      data.lockedBy,
      data.lockNote,
      data.lockedAt ? new Date(data.lockedAt) : undefined,
      data.sharedWithUserIds ?? []
    );
  }

  /**
   * Generate unique tube ID
   */
  private static generateId(): string {
    return 'tube_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Validate tube state (invariants)
   */
  private validate(): void {
    if (!this._id || this._id.trim().length === 0) {
      throw new ValidationError('Tube ID is required');
    }

    if (this._createdAt > this._updatedAt) {
      throw new ValidationError('Created date cannot be after updated date');
    }
  }

  /**
   * Business method: Move tube to new location
   */
  moveTo(newLocation: Location): void {
    if (this._location.equals(newLocation)) {
      return; // No change needed
    }

    this._location = newLocation;
    this.touch(); // Update timestamp
  }

  /**
   * Business method: Update sample information
   * Implements PATCH tri-state semantics (null = clear)
   */
  updateSample(updates: {
    cellType?: string;
    donorInternalId?: string | null;
    donorSourceId?: string | null;
    concentration?: number | null;
    concentrationUnit?: 'c/v' | 'c/mL' | null;
    date?: string | null;
    media?: string | null;
    cultureCondition?: string | null;
    lotNumber?: string | null;
    notes?: string | null;
  }): void {
    this._sample = this._sample.update(updates);
    this.touch(); // Update timestamp
  }

  /**
   * Business method: Assign tube to researcher
   */
  assignToResearcher(researcherId: string | undefined): void {
    if (this._researcherId !== researcherId) {
      this._researcherId = researcherId;
      this.touch(); // Update timestamp
    }
  }

  /**
   * Business method: Lock the tube
   * Returns a new Tube instance with lock applied
   */
  lock(userId: string, note?: string): Tube {
    if (this._isLocked) {
      throw new ValidationError('Tube is already locked');
    }

    return new Tube(
      this._id,
      this._location,
      this._sample,
      this._researcherId,
      this._createdAt,
      new Date(),
      this._createdByName,
      true, // isLocked
      userId, // lockedBy
      note, // lockNote
      new Date(), // lockedAt
      [] // sharedWithUserIds - starts empty
    );
  }

  /**
   * Business method: Unlock the tube
   * Returns a new Tube instance with lock removed
   */
  unlock(): Tube {
    if (!this._isLocked) {
      throw new ValidationError('Tube is not locked');
    }

    return new Tube(
      this._id,
      this._location,
      this._sample,
      this._researcherId,
      this._createdAt,
      new Date(),
      this._createdByName,
      false, // isLocked
      undefined, // lockedBy - cleared
      undefined, // lockNote - cleared
      undefined, // lockedAt - cleared
      [] // sharedWithUserIds - cleared on unlock
    );
  }

  /**
   * Business method: Share access with additional users
   * Returns a new Tube instance with updated shared users
   */
  shareWith(userIds: string[]): Tube {
    const newSharedIds = [...new Set([...this._sharedWithUserIds, ...userIds])];

    return new Tube(
      this._id,
      this._location,
      this._sample,
      this._researcherId,
      this._createdAt,
      new Date(),
      this._createdByName,
      this._isLocked,
      this._lockedBy,
      this._lockNote,
      this._lockedAt,
      newSharedIds
    );
  }

  /**
   * Business method: Revoke access from specific users
   * Returns a new Tube instance with updated shared users
   */
  revokeAccess(userIds: string[]): Tube {
    const newSharedIds = this._sharedWithUserIds.filter(id => !userIds.includes(id));

    return new Tube(
      this._id,
      this._location,
      this._sample,
      this._researcherId,
      this._createdAt,
      new Date(),
      this._createdByName,
      this._isLocked,
      this._lockedBy,
      this._lockNote,
      this._lockedAt,
      newSharedIds
    );
  }

  /**
   * Business query: Check if tube is locked by a specific user
   */
  isLockedBy(userId: string): boolean {
    return this._isLocked && this._lockedBy === userId;
  }

  /**
   * Business query: Check if a user can access this tube
   * Access granted if: not locked, user owns lock, or user has shared access
   */
  canBeAccessedBy(userId: string): boolean {
    if (!this._isLocked) return true;
    if (this._lockedBy === userId) return true;
    if (this._sharedWithUserIds.includes(userId)) return true;
    return false;
  }

  /**
   * Business method: Update entire tube data (returns new instance)
   * Accepts nested structure matching UpdateTubeRequest schema
   * Implements PATCH tri-state semantics:
   * - Field omitted: preserve existing
   * - Field with value: update
   * - Field with null: clear
   */
  update(updates: {
    location?: Partial<{ tankId: string; rackId: string; boxId: string; position: number }>;
    sample?: {
      cellType?: string;
      donorInternalId?: string | null;
      donorSourceId?: string | null;
      concentration?: number | null;
      concentrationUnit?: 'c/v' | 'c/mL' | null;
      date?: string | null;
      media?: MediaData | string | null;
      cultureCondition?: string | null;
      lotNumber?: string | null;
      notes?: string | null;
    };
    researcherId?: string | null;
  }): Tube {
    // Update location if provided (partial update)
    const newLocation = updates.location
      ? this._location.update(updates.location)
      : this._location;

    // Update sample if provided (with tri-state semantics)
    const newSample = updates.sample
      ? this._sample.update(updates.sample)
      : this._sample;

    // Update researcherId (null clears to undefined)
    const newResearcherId = updates.researcherId === null
      ? undefined
      : (updates.researcherId !== undefined ? updates.researcherId : this._researcherId);

    // Return new tube instance with updates (preserve lock state)
    return new Tube(
      this._id,
      newLocation,
      newSample,
      newResearcherId,
      this._createdAt,
      new Date(), // Update timestamp
      this._createdByName, // Preserve historical creator name
      this._isLocked,
      this._lockedBy,
      this._lockNote,
      this._lockedAt,
      this._sharedWithUserIds
    );
  }

  /**
   * Update timestamp (called by business methods)
   */
  private touch(): void {
    this._updatedAt = new Date();
  }

  /**
   * Business query: Check if tube is expired
   */
  isExpired(): boolean {
    return this._sample.isExpired();
  }

  /**
   * Business query: Check if tube has complete sample information
   */
  hasCompleteSampleData(): boolean {
    return this._sample.isComplete();
  }

  /**
   * Business query: Check if tube has concentration data
   */
  hasConcentrationData(): boolean {
    return this._sample.hasConcentration();
  }

  /**
   * Business query: Check if tube is in the same location as another tube
   */
  isInSameLocationAs(other: Tube): boolean {
    return this._location.equals(other._location);
  }

  /**
   * Business query: Check if tube is in the same rack as another tube
   */
  isInSameRackAs(other: Tube): boolean {
    return this._location.isInSameRack(other._location);
  }

  /**
   * Business query: Get location description
   */
  getLocationDescription(): string {
    return this._location.toString();
  }

  /**
   * Convert to data object for persistence/API response
   * Returns nested structure matching TubeData schema
   * Domain structure = API structure
   */
  toData(): {
    id: string;
    location: { tankId: string; rackId: string; boxId: string; position: number };
    sample: {
      cellType?: string;
      donorInternalId?: string;
      donorSourceId?: string;
      concentration?: number;
      concentrationUnit?: 'c/v' | 'c/mL';
      date?: string;
      media?: MediaData;
      cultureCondition?: string;
      lotNumber?: string;
      notes?: string;
    };
    researcherId?: string;
    createdByName?: string;
    timestamps: {
      createdAt: string;
      updatedAt: string;
    };
    isLocked?: boolean;
    lockedBy?: string;
    lockNote?: string;
    lockedAt?: string;
    sharedWithUserIds?: string[];
  } {
    return {
      id: this._id,
      location: this._location.toData(),
      sample: this._sample.toData(),
      researcherId: this._researcherId,
      createdByName: this._createdByName,
      timestamps: {
        createdAt: this._createdAt.toISOString(),
        updatedAt: this._updatedAt.toISOString()
      },
      isLocked: this._isLocked || undefined,
      lockedBy: this._lockedBy,
      lockNote: this._lockNote,
      lockedAt: this._lockedAt?.toISOString(),
      sharedWithUserIds: this._sharedWithUserIds.length > 0 ? this._sharedWithUserIds : undefined
    };
  }

  /**
   * Equality check (identity-based for entities)
   */
  equals(other: Tube): boolean {
    if (!other) return false;
    return this._id === other._id;
  }

  /**
   * String representation
   */
  toString(): string {
    return `Tube(${this._id}) at ${this._location.toString()}`;
  }

  // GETTERS - Immutable access to entity state

  /**
   * Get tube ID
   */
  get id(): string { 
    return this._id; 
  }

  /**
   * Get location value object
   */
  get location(): Location { 
    return this._location; 
  }

  /**
   * Get sample data value object
   */
  get sample(): SampleData { 
    return this._sample; 
  }

  /**
   * @deprecated Use tube.sample instead - kept for backward compatibility during migration
   */
  get sampleData(): SampleData { 
    return this._sample; 
  }

  /**
   * Get researcher ID
   */
  get researcherId(): string | undefined {
    return this._researcherId;
  }

  /**
   * Get creation timestamp (returns copy for immutability)
   */
  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  /**
   * Get last update timestamp (returns copy for immutability)
   */
  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  /**
   * Get historical creator name (snapshot at creation time)
   */
  get createdByName(): string | undefined {
    return this._createdByName;
  }

  // LOCK GETTERS

  /**
   * Get lock status
   */
  get isLocked(): boolean {
    return this._isLocked;
  }

  /**
   * Get user ID of who locked the tube
   */
  get lockedBy(): string | undefined {
    return this._lockedBy;
  }

  /**
   * Get lock note
   */
  get lockNote(): string | undefined {
    return this._lockNote;
  }

  /**
   * Get lock timestamp (returns copy for immutability)
   */
  get lockedAt(): Date | undefined {
    return this._lockedAt ? new Date(this._lockedAt) : undefined;
  }

  /**
   * Get array of user IDs with shared access
   */
  get sharedWithUserIds(): string[] {
    return [...this._sharedWithUserIds];
  }

  // CONVENIENCE GETTERS - Direct access to nested properties
  // Deprecated in favor of explicit nesting (tube.location.tankId)
  // Kept for gradual migration of existing code

  /**
   * @deprecated Use tube.location.tankId instead
   */
  get tankId(): string { 
    return this._location.tankId; 
  }

  /**
   * @deprecated Use tube.location.rackId instead
   */
  get rackId(): string { 
    return this._location.rackId; 
  }

  /**
   * @deprecated Use tube.location.boxId instead
   */
  get boxId(): string { 
    return this._location.boxId; 
  }

  /**
   * @deprecated Use tube.location.position instead
   */
  get position(): number { 
    return this._location.position; 
  }

  /**
   * @deprecated Use tube.sample.cellType instead
   */
  get cellType(): string | undefined { 
    return this._sample.cellType; 
  }

  /**
   * @deprecated Use tube.sample.donorInternalId instead
   */
  get donorInternalId(): string | undefined { 
    return this._sample.donorInternalId; 
  }

  /**
   * @deprecated Use tube.sample.donorSourceId instead
   */
  get donorSourceId(): string | undefined { 
    return this._sample.donorSourceId; 
  }

  /**
   * @deprecated Use tube.sample.concentration instead
   */
  get concentration(): number | undefined { 
    return this._sample.concentration; 
  }

  /**
   * @deprecated Use tube.sample.concentrationUnit instead
   */
  get concentrationUnit(): 'c/v' | 'c/mL' | undefined { 
    return this._sample.concentrationUnit; 
  }

  /**
   * @deprecated Use tube.sample.date instead
   */
  get date(): string | undefined { 
    return this._sample.date; 
  }

  /**
   * @deprecated Use tube.sample.media instead
   */
  get media(): MediaData | undefined { 
    return this._sample.media; 
  }

  /**
   * @deprecated Use tube.sample.cultureCondition instead
   */
  get cultureCondition(): string | undefined { 
    return this._sample.cultureCondition; 
  }

  /**
   * @deprecated Use tube.sample.lotNumber instead
   */
  get lotNumber(): string | undefined { 
    return this._sample.lotNumber; 
  }

  /**
   * @deprecated Use tube.sample.notes instead
   */
  get notes(): string | undefined { 
    return this._sample.notes; 
  }
}
