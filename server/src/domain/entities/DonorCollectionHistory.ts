/**
 * Donor Collection History
 *
 * Tracks sample collection events for a donor (specimen type, source, date).
 */

import { generateId } from '@domain/utils/generateId';

function toDateOnly(value: string | Date | null | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value.slice(0, 10);
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export class DonorCollectionHistory {
  private constructor(
    private readonly _id: string,
    private readonly _donorId: string,
    private readonly _collectionDate: string | undefined,
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
      toDateOnly(data.collectionDate),
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
      toDateOnly(data.collectionDate),
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
      data.collectionDate !== undefined ? toDateOnly(data.collectionDate) : this._collectionDate,
      data.specimenType !== undefined ? (data.specimenType ?? undefined) : this._specimenType,
      data.source !== undefined ? (data.source ?? undefined) : this._source,
      this._createdAt,
    );
  }

  get id(): string { return this._id; }
  get donorId(): string { return this._donorId; }
  get collectionDate(): string | undefined { return this._collectionDate; }
  get specimenType(): string | undefined { return this._specimenType; }
  get source(): string | undefined { return this._source; }
  get createdAt(): Date { return new Date(this._createdAt); }
}
