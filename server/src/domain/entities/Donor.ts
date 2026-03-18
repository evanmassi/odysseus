/**
 * Donor Record
 *
 * Persistent patient/donor identity independent of tube inventory.
 * Auto-created as uncurated stubs when tubes reference new donor IDs.
 */

import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';

interface DonorCreateData {
  donorSourceId?: string;
  donorInternalId?: string;
  species?: string;
  age?: string;
  sex?: string;
  ethnicity?: string;
  clinicalStatus?: string;
  diagnosis?: string;
  diseaseStage?: string;
  notes?: string;
}

// null = clear field, undefined = preserve current value
interface DonorUpdateData {
  donorSourceId?: string | null;
  donorInternalId?: string | null;
  species?: string | null;
  age?: string | null;
  sex?: string | null;
  ethnicity?: string | null;
  clinicalStatus?: string | null;
  diagnosis?: string | null;
  diseaseStage?: string | null;
  notes?: string | null;
}

export class Donor {
  private constructor(
    private readonly _id: string,
    private readonly _labId: string,
    private _donorSourceId: string | undefined,
    private _donorInternalId: string | undefined,
    private _species: string | undefined,
    private _age: string | undefined,
    private _sex: string | undefined,
    private _ethnicity: string | undefined,
    private _clinicalStatus: string | undefined,
    private _diagnosis: string | undefined,
    private _diseaseStage: string | undefined,
    private _notes: string | undefined,
    private _isCurated: boolean,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {
    this.validate();
  }

  static create(data: DonorCreateData & { labId: string; isCurated?: boolean }): Donor {
    return new Donor(
      generateId('donor'),
      data.labId,
      data.donorSourceId,
      data.donorInternalId,
      data.species,
      data.age,
      data.sex,
      data.ethnicity,
      data.clinicalStatus,
      data.diagnosis,
      data.diseaseStage,
      data.notes,
      data.isCurated ?? false,
      new Date(),
      new Date()
    );
  }

  static fromData(data: {
    id: string;
    labId: string;
    donorSourceId?: string;
    donorInternalId?: string;
    species?: string;
    age?: string;
    sex?: string;
    ethnicity?: string;
    clinicalStatus?: string;
    diagnosis?: string;
    diseaseStage?: string;
    notes?: string;
    isCurated: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
  }): Donor {
    return new Donor(
      data.id,
      data.labId,
      data.donorSourceId,
      data.donorInternalId,
      data.species,
      data.age,
      data.sex,
      data.ethnicity,
      data.clinicalStatus,
      data.diagnosis,
      data.diseaseStage,
      data.notes,
      data.isCurated,
      typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt,
      typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : data.updatedAt
    );
  }

  private validate(): void {
    if (!this._donorSourceId && !this._donorInternalId) {
      throw new ValidationError('At least one donor ID (source or internal) is required');
    }
  }

  update(data: DonorUpdateData): void {
    if (data.donorSourceId !== undefined) this._donorSourceId = data.donorSourceId ?? undefined;
    if (data.donorInternalId !== undefined) this._donorInternalId = data.donorInternalId ?? undefined;
    if (data.species !== undefined) this._species = data.species ?? undefined;
    if (data.age !== undefined) this._age = data.age ?? undefined;
    if (data.sex !== undefined) this._sex = data.sex ?? undefined;
    if (data.ethnicity !== undefined) this._ethnicity = data.ethnicity ?? undefined;
    if (data.clinicalStatus !== undefined) this._clinicalStatus = data.clinicalStatus ?? undefined;
    if (data.diagnosis !== undefined) this._diagnosis = data.diagnosis ?? undefined;
    if (data.diseaseStage !== undefined) this._diseaseStage = data.diseaseStage ?? undefined;
    if (data.notes !== undefined) this._notes = data.notes ?? undefined;

    this.validate();
    this._isCurated = true;
    this._updatedAt = new Date();
  }

  get id(): string { return this._id; }
  get labId(): string { return this._labId; }
  get donorSourceId(): string | undefined { return this._donorSourceId; }
  get donorInternalId(): string | undefined { return this._donorInternalId; }
  get species(): string | undefined { return this._species; }
  get age(): string | undefined { return this._age; }
  get sex(): string | undefined { return this._sex; }
  get ethnicity(): string | undefined { return this._ethnicity; }
  get clinicalStatus(): string | undefined { return this._clinicalStatus; }
  get diagnosis(): string | undefined { return this._diagnosis; }
  get diseaseStage(): string | undefined { return this._diseaseStage; }
  get notes(): string | undefined { return this._notes; }
  get isCurated(): boolean { return this._isCurated; }
  get createdAt(): Date { return new Date(this._createdAt); }
  get updatedAt(): Date { return new Date(this._updatedAt); }
}
