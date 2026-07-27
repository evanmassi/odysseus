/**
 * Reagent Storage Location
 *
 * Named storage zone where reagents are kept (e.g., "-20 °C Freezer", "4 °C Fridge").
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

export class ReagentLocation {
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

  static create(data: LocationCreateData): ReagentLocation {
    return new ReagentLocation(
      generateId('rloc'),
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
  }): ReagentLocation {
    return new ReagentLocation(
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

  get id(): string {
    return this._id;
  }
  get labId(): string {
    return this._labId;
  }
  get name(): string {
    return this._name;
  }
  get description(): string | undefined {
    return this._description;
  }
  get sortOrder(): number {
    return this._sortOrder;
  }
  get createdAt(): Date {
    return new Date(this._createdAt);
  }
  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }
}
