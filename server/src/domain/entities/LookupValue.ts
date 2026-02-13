/**
 * Lookup Value Entity
 *
 * Admin-managed dropdown option for tube metadata (species, source).
 */

import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';

export type LookupCategory = 'species' | 'source';

export class LookupValue {
  private constructor(
    private readonly _id: string,
    private readonly _category: LookupCategory,
    private _value: string,
    private _sortOrder: number,
    private _isActive: boolean,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {
    this.validate();
  }

  static create(data: {
    category: LookupCategory;
    value: string;
    sortOrder?: number;
  }): LookupValue {
    const now = new Date();
    return new LookupValue(
      generateId('lkp'),
      data.category,
      data.value.trim(),
      data.sortOrder ?? 0,
      true,
      now,
      now
    );
  }

  static fromData(data: {
    id: string;
    category: LookupCategory;
    value: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
  }): LookupValue {
    return new LookupValue(
      data.id,
      data.category,
      data.value,
      data.sortOrder,
      data.isActive,
      typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt,
      typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : data.updatedAt
    );
  }

  rename(newValue: string): void {
    const trimmed = newValue.trim();
    if (!trimmed) {
      throw new ValidationError('Lookup value cannot be empty');
    }
    if (trimmed.length > 200) {
      throw new ValidationError('Lookup value cannot exceed 200 characters');
    }
    this._value = trimmed;
    this._updatedAt = new Date();
  }

  private validate(): void {
    if (!this._value || this._value.trim().length === 0) {
      throw new ValidationError('Lookup value cannot be empty');
    }
    if (this._value.length > 200) {
      throw new ValidationError('Lookup value cannot exceed 200 characters');
    }
    if (!['species', 'source'].includes(this._category)) {
      throw new ValidationError('Invalid lookup category');
    }
  }

  toData() {
    return {
      id: this._id,
      category: this._category,
      value: this._value,
      sortOrder: this._sortOrder,
      isActive: this._isActive,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  get id(): string { return this._id; }
  get category(): LookupCategory { return this._category; }
  get value(): string { return this._value; }
  get sortOrder(): number { return this._sortOrder; }
  get isActive(): boolean { return this._isActive; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
}
