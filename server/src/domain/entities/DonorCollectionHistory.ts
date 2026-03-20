/**
 * Donor Collection History
 *
 * Tracks sample collection events for a donor (specimen type, source, date).
 */

import { generateId } from '@domain/utils/generateId';

export class DonorCollectionHistory {
  private constructor(
    private readonly _id: string,
    private readonly _donorId: string,
    private readonly _collectionDate: Date | undefined,
    private readonly _specimenType: string | undefined,
    private readonly _source: string | undefined,
    private readonly _createdAt: Date
  ) {}

  static create(data: {
    donorId: string;
    collectionDate?: string | Date;
    specimenType?: string;
    source?: string;
  }): DonorCollectionHistory {
    return new DonorCollectionHistory(
      generateId('donorCollection'),
      data.donorId,
      data.collectionDate
        ? (typeof data.collectionDate === 'string' ? new Date(data.collectionDate) : data.collectionDate)
        : undefined,
      data.specimenType,
      data.source,
      new Date()
    );
  }

  static fromData(data: {
    id: string;
    donorId: string;
    collectionDate?: string | Date | null;
    specimenType?: string;
    source?: string;
    createdAt: string | Date;
  }): DonorCollectionHistory {
    return new DonorCollectionHistory(
      data.id,
      data.donorId,
      data.collectionDate
        ? (typeof data.collectionDate === 'string' ? new Date(data.collectionDate) : data.collectionDate)
        : undefined,
      data.specimenType,
      data.source,
      typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt
    );
  }

  update(data: {
    collectionDate?: string | Date | null;
    specimenType?: string | null;
    source?: string | null;
  }): DonorCollectionHistory {
    return new DonorCollectionHistory(
      this._id,
      this._donorId,
      data.collectionDate !== undefined
        ? (data.collectionDate ? (typeof data.collectionDate === 'string' ? new Date(data.collectionDate) : data.collectionDate) : undefined)
        : this._collectionDate,
      data.specimenType !== undefined ? (data.specimenType ?? undefined) : this._specimenType,
      data.source !== undefined ? (data.source ?? undefined) : this._source,
      this._createdAt,
    );
  }

  get id(): string { return this._id; }
  get donorId(): string { return this._donorId; }
  get collectionDate(): Date | undefined { return this._collectionDate ? new Date(this._collectionDate) : undefined; }
  get specimenType(): string | undefined { return this._specimenType; }
  get source(): string | undefined { return this._source; }
  get createdAt(): Date { return new Date(this._createdAt); }
}
