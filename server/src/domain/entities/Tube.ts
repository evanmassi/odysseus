/**
 * Lab Tube Inventory Record
 *
 * Aggregate root for a physical tube with location, sample data, and locking.
 */

import { type ConcentrationUnit } from '@odysseus/shared-schemas';

import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';
import { SampleData } from '@domain/value-objects/SampleData';
import { TubeLocation } from '@domain/value-objects/TubeLocation';

interface TubeLocationData {
  tankId: string;
  rackId: string;
  boxId: string;
  position: number;
}

interface TubeSampleData {
  cellType?: string;
  species?: string;
  donorInternalId?: string;
  donorSourceId?: string;
  concentration?: number;
  concentrationUnit?: ConcentrationUnit;
  date?: string;
  mediaType?: string;
  mediaSupplements?: string;
  mediaSelection?: string;
  cultureCondition?: string;
  lotNumber?: string;
  source?: string;
  catalogNumber?: string;
  passageNumber?: number;
  notes?: string;
}

/** PATCH tri-state variant of {@link TubeSampleData}: null = clear the field. */
interface TubeSampleUpdate {
  cellType?: string;
  species?: string | null;
  donorInternalId?: string | null;
  donorSourceId?: string | null;
  concentration?: number | null;
  concentrationUnit?: ConcentrationUnit | null;
  date?: string | null;
  mediaType?: string | null;
  mediaSupplements?: string | null;
  mediaSelection?: string | null;
  cultureCondition?: string | null;
  lotNumber?: string | null;
  source?: string | null;
  catalogNumber?: string | null;
  passageNumber?: number | null;
  notes?: string | null;
}

export class Tube {
  private constructor(
    private readonly _id: string,
    private _location: TubeLocation,
    private _sample: SampleData,
    private _researcherId: string | undefined,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
    private readonly _createdByName?: string,
    private _version: number = 1,
    private _isLocked: boolean = false,
    private _lockedBy?: string,
    private _lockNote?: string,
    private _lockedAt?: Date,
    private _sharedWithUserIds: string[] = [],
    private readonly _labId?: string,
    private readonly _isSeeded: boolean = false
  ) {
    this.validate();
  }

  static create(data: {
    id?: string;
    location: TubeLocationData | TubeLocation;
    sample: TubeSampleData | SampleData;
    researcherId?: string;
    createdByName?: string;
    labId?: string;
  }): Tube {
    const id = data.id ?? generateId('tube');

    const location =
      data.location instanceof TubeLocation ? data.location : TubeLocation.create(data.location);

    const sample = data.sample instanceof SampleData ? data.sample : SampleData.create(data.sample);

    const now = new Date();

    return new Tube(
      id,
      location,
      sample,
      data.researcherId,
      now,
      now,
      data.createdByName,
      1,
      false,
      undefined,
      undefined,
      undefined,
      [],
      data.labId
    );
  }

  static fromData(data: {
    id: string;
    location: TubeLocationData;
    sample: TubeSampleData;
    researcherId?: string;
    createdByName?: string;
    timestamps: {
      createdAt: string | Date;
      updatedAt: string | Date;
    };
    version?: number;
    isLocked?: boolean;
    lockedBy?: string;
    lockNote?: string;
    lockedAt?: string;
    sharedWithUserIds?: string[];
    labId?: string;
    isSeeded?: boolean;
  }): Tube {
    const location = TubeLocation.create(data.location);
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
      data.version ?? 1,
      data.isLocked ?? false,
      data.lockedBy,
      data.lockNote,
      data.lockedAt ? new Date(data.lockedAt) : undefined,
      data.sharedWithUserIds ?? [],
      data.labId,
      data.isSeeded ?? false
    );
  }

  private validate(): void {
    if (!this._id || this._id.trim().length === 0) {
      throw new ValidationError('Tube ID is required');
    }

    if (this._createdAt > this._updatedAt) {
      throw new ValidationError('Created date cannot be after updated date');
    }
  }

  moveTo(newLocation: TubeLocation): void {
    if (this._location.equals(newLocation)) {
      return; // No change needed
    }

    this._location = newLocation;
    this.touch();
  }

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
      this._version + 1,
      true, // isLocked
      userId, // lockedBy
      note, // lockNote
      new Date(), // lockedAt
      [], // sharedWithUserIds - starts empty
      this._labId,
      this._isSeeded
    );
  }

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
      this._version + 1,
      false, // isLocked
      undefined, // lockedBy - cleared
      undefined, // lockNote - cleared
      undefined, // lockedAt - cleared
      [], // sharedWithUserIds - cleared on unlock
      this._labId,
      this._isSeeded
    );
  }

  updateLockNote(note?: string): Tube {
    if (!this._isLocked) {
      throw new ValidationError('Cannot update lock note on unlocked tube');
    }

    return new Tube(
      this._id,
      this._location,
      this._sample,
      this._researcherId,
      this._createdAt,
      new Date(),
      this._createdByName,
      this._version + 1,
      this._isLocked,
      this._lockedBy,
      note, // Updated lock note
      this._lockedAt,
      this._sharedWithUserIds,
      this._labId,
      this._isSeeded
    );
  }

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
      this._version + 1,
      this._isLocked,
      this._lockedBy,
      this._lockNote,
      this._lockedAt,
      newSharedIds,
      this._labId,
      this._isSeeded
    );
  }

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
      this._version + 1,
      this._isLocked,
      this._lockedBy,
      this._lockNote,
      this._lockedAt,
      newSharedIds,
      this._labId,
      this._isSeeded
    );
  }

  /** PATCH tri-state semantics: omitted = preserve, value = update, null = clear */
  update(updates: {
    location?: Partial<TubeLocationData>;
    sample?: TubeSampleUpdate;
    researcherId?: string | null;
  }): Tube {
    const newLocation = updates.location ? this._location.update(updates.location) : this._location;

    const newSample = updates.sample ? this._sample.update(updates.sample) : this._sample;

    /* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- three-way null/undefined/value logic */
    const newResearcherId =
      updates.researcherId === null
        ? undefined
        : updates.researcherId !== undefined
          ? updates.researcherId
          : this._researcherId;
    /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */

    return new Tube(
      this._id,
      newLocation,
      newSample,
      newResearcherId,
      this._createdAt,
      new Date(),
      this._createdByName,
      this._version + 1,
      this._isLocked,
      this._lockedBy,
      this._lockNote,
      this._lockedAt,
      this._sharedWithUserIds,
      this._labId,
      this._isSeeded
    );
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  toData(): {
    id: string;
    location: TubeLocationData;
    sample: TubeSampleData;
    researcherId?: string;
    createdByName?: string;
    timestamps: {
      createdAt: string;
      updatedAt: string;
    };
    version: number;
    isLocked?: boolean;
    lockedBy?: string;
    lockNote?: string;
    lockedAt?: string;
    sharedWithUserIds?: string[];
    labId?: string;
    isSeeded: boolean;
  } {
    return {
      id: this._id,
      location: this._location.toData(),
      sample: this._sample.toData(),
      researcherId: this._researcherId,
      createdByName: this._createdByName,
      timestamps: {
        createdAt: this._createdAt.toISOString(),
        updatedAt: this._updatedAt.toISOString(),
      },
      version: this._version,
      isLocked: this._isLocked || undefined,
      lockedBy: this._lockedBy,
      lockNote: this._lockNote,
      lockedAt: this._lockedAt?.toISOString(),
      sharedWithUserIds: this._sharedWithUserIds.length > 0 ? this._sharedWithUserIds : undefined,
      labId: this._labId,
      isSeeded: this._isSeeded,
    };
  }

  // GETTERS

  get id(): string {
    return this._id;
  }

  get labId(): string | undefined {
    return this._labId;
  }

  get location(): TubeLocation {
    return this._location;
  }

  get sample(): SampleData {
    return this._sample;
  }

  get researcherId(): string | undefined {
    return this._researcherId;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  get createdByName(): string | undefined {
    return this._createdByName;
  }

  get version(): number {
    return this._version;
  }

  get isSeeded(): boolean {
    return this._isSeeded;
  }

  // LOCK GETTERS

  get isLocked(): boolean {
    return this._isLocked;
  }

  get lockedBy(): string | undefined {
    return this._lockedBy;
  }

  get lockNote(): string | undefined {
    return this._lockNote;
  }

  get lockedAt(): Date | undefined {
    return this._lockedAt ? new Date(this._lockedAt) : undefined;
  }

  get sharedWithUserIds(): string[] {
    return [...this._sharedWithUserIds];
  }
}
