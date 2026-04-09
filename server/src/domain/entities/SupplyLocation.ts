/**
 * Supply Storage Location
 *
 * Named storage zone where supplys are kept (e.g., "Back Supply Room", "Main Lab Bench").
 */

import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';

interface LocationCreateData {
  labId: string;
  name: string;
  description?: string;
  sortOrder?: number;
}

interface LocationUpdateData {
  name?: string | null;
  description?: string | null;
  sortOrder?: number | null;
}

export class SupplyLocation {
  private constructor(
    private readonly _id: string,
    private readonly _labId: string,
    private _name: string,
    private _description: string | undefined,
    private _sortOrder: number,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {
    this.validate();
  }

  static create(data: LocationCreateData): SupplyLocation {
    return new SupplyLocation(
      generateId('sloc'),
      data.labId,
      data.name,
      data.description,
      data.sortOrder ?? 0,
      new Date(),
      new Date()
    );
  }

  static fromData(data: {
    id: string;
    labId: string;
    name: string;
    description?: string;
    sortOrder: number;
    createdAt: string | Date;
    updatedAt: string | Date;
  }): SupplyLocation {
    return new SupplyLocation(
      data.id,
      data.labId,
      data.name,
      data.description,
      data.sortOrder,
      typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt,
      typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : data.updatedAt
    );
  }

  private validate(): void {
    if (!this._name || this._name.trim().length === 0) {
      throw new ValidationError('Location name is required');
    }
  }

  update(data: LocationUpdateData): void {
    if (data.name !== undefined) this._name = data.name ?? this._name;
    if (data.description !== undefined) this._description = data.description ?? undefined;
    if (data.sortOrder !== undefined) this._sortOrder = data.sortOrder ?? this._sortOrder;

    this.validate();
    this._updatedAt = new Date();
  }

  get id(): string { return this._id; }
  get labId(): string { return this._labId; }
  get name(): string { return this._name; }
  get description(): string | undefined { return this._description; }
  get sortOrder(): number { return this._sortOrder; }
  get createdAt(): Date { return new Date(this._createdAt); }
  get updatedAt(): Date { return new Date(this._updatedAt); }
}
