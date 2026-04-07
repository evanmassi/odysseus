/**
 * Consumable Category
 *
 * Lab-managed grouping for consumable products. Supports a two-level hierarchy
 * (top-level categories with optional subcategories).
 */

import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';

interface CategoryCreateData {
  labId: string;
  name: string;
  parentId?: string;
  sortOrder?: number;
}

interface CategoryUpdateData {
  name?: string | null;
  parentId?: string | null;
  sortOrder?: number | null;
}

export class ConsumableCategory {
  private constructor(
    private readonly _id: string,
    private readonly _labId: string,
    private _name: string,
    private _parentId: string | undefined,
    private _sortOrder: number,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {
    this.validate();
  }

  static create(data: CategoryCreateData): ConsumableCategory {
    return new ConsumableCategory(
      generateId('ccat'),
      data.labId,
      data.name,
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
    parentId?: string;
    sortOrder: number;
    createdAt: string | Date;
    updatedAt: string | Date;
  }): ConsumableCategory {
    return new ConsumableCategory(
      data.id,
      data.labId,
      data.name,
      data.parentId,
      data.sortOrder,
      typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt,
      typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : data.updatedAt
    );
  }

  private validate(): void {
    if (!this._name || this._name.trim().length === 0) {
      throw new ValidationError('Category name is required');
    }
  }

  update(data: CategoryUpdateData): void {
    if (data.name !== undefined) this._name = data.name ?? this._name;
    if (data.parentId !== undefined) this._parentId = data.parentId ?? undefined;
    if (data.sortOrder !== undefined) this._sortOrder = data.sortOrder ?? this._sortOrder;

    this.validate();
    this._updatedAt = new Date();
  }

  reorder(sortOrder: number): void {
    this._sortOrder = sortOrder;
    this._updatedAt = new Date();
  }

  get id(): string { return this._id; }
  get labId(): string { return this._labId; }
  get name(): string { return this._name; }
  get parentId(): string | undefined { return this._parentId; }
  get sortOrder(): number { return this._sortOrder; }
  get createdAt(): Date { return new Date(this._createdAt); }
  get updatedAt(): Date { return new Date(this._updatedAt); }
}
