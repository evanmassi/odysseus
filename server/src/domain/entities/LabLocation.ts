/**
 * Lab Location
 *
 * A named place in the lab, nestable up to three tiers (e.g. "Room 204" › "Cold Room" › "Shelf 2").
 * Shared by every catalog — a freezer holds supplies and reagents alike.
 */

import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';

interface LabLocationCreateData {
  labId: string;
  name: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
}

interface LabLocationUpdateData {
  name?: string | null;
  description?: string | null;
  parentId?: string | null;
  sortOrder?: number | null;
}

export class LabLocation {
  private constructor(
    private readonly _id: string,
    private readonly _labId: string,
    private _name: string,
    private _description: string | undefined,
    private _parentId: string | undefined,
    private _sortOrder: number,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {
    this.validate();
  }

  static create(data: LabLocationCreateData): LabLocation {
    return new LabLocation(
      generateId('loc'),
      data.labId,
      data.name,
      data.description,
      data.parentId,
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
    parentId?: string;
    sortOrder: number;
    createdAt: string | Date;
    updatedAt: string | Date;
  }): LabLocation {
    return new LabLocation(
      data.id,
      data.labId,
      data.name,
      data.description,
      data.parentId,
      data.sortOrder,
      typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt,
      typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : data.updatedAt
    );
  }

  private validate(): void {
    if (!this._name || this._name.trim().length === 0) {
      throw new ValidationError('Location name is required');
    }
    if (this._parentId === this._id) {
      throw new ValidationError('A location cannot be its own parent');
    }
  }

  update(data: LabLocationUpdateData): void {
    if (data.name !== undefined) this._name = data.name ?? this._name;
    if (data.description !== undefined) this._description = data.description ?? undefined;
    if (data.parentId !== undefined) this._parentId = data.parentId ?? undefined;
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
  get parentId(): string | undefined {
    return this._parentId;
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
