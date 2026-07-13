/**
 * Category
 *
 * Lab-managed grouping shared by the equipment and supply catalogs: top-level categories with
 * optional subcategories, never deeper. Subclasses hold no behaviour — they exist so the two
 * catalogs' categories stay distinct types and cannot be handed to each other's repositories.
 */

import { ValidationError } from '@domain/errors/ValidationError';

export interface CategoryCreateData {
  labId: string;
  name: string;
  parentId?: string;
  sortOrder?: number;
}

export interface CategoryUpdateData {
  name?: string | null;
  parentId?: string | null;
  sortOrder?: number | null;
}

export interface CategoryData {
  id: string;
  labId: string;
  name: string;
  parentId?: string;
  sortOrder: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/** Rehydrates a persisted row into a concrete category. */
export type CategoryFactory<T extends Category> = (data: CategoryData) => T;

export abstract class Category {
  protected constructor(
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

  get id(): string { return this._id; }
  get labId(): string { return this._labId; }
  get name(): string { return this._name; }
  get parentId(): string | undefined { return this._parentId; }
  get sortOrder(): number { return this._sortOrder; }
  get createdAt(): Date { return new Date(this._createdAt); }
  get updatedAt(): Date { return new Date(this._updatedAt); }
}

/** Persisted timestamps arrive as Date from pg, or as ISO strings from a mapper. */
export function toCategoryDate(value: string | Date): Date {
  return typeof value === 'string' ? new Date(value) : value;
}
