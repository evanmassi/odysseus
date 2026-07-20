/**
 * Admin-Managed Dropdown Option
 *
 * Represents a selectable value for a lab-managed metadata field (tube species, supply vendor, maintenance type, etc.).
 */

import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';

export type LookupCategory =
  | 'species'
  | 'source'
  | 'media'
  | 'specimen_type'
  | 'equipment_maintenance_type'
  | 'supply_item_property'
  | 'supply_stock_unit'
  | 'supply_vendor'
  | 'supply_manufacturer';

export class LookupValue {
  private constructor(
    private readonly _id: string,
    private readonly _category: LookupCategory,
    private _value: string,
    private _sortOrder: number,
    private _isActive: boolean,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
    private readonly _labId?: string
  ) {
    this.validate();
  }

  static create(data: {
    category: LookupCategory;
    value: string;
    sortOrder?: number;
    labId?: string;
  }): LookupValue {
    const now = new Date();
    return new LookupValue(
      generateId('lkp'),
      data.category,
      data.value.trim(),
      data.sortOrder ?? 0,
      true,
      now,
      now,
      data.labId
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
    labId?: string;
  }): LookupValue {
    return new LookupValue(
      data.id,
      data.category,
      data.value,
      data.sortOrder,
      data.isActive,
      typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt,
      typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : data.updatedAt,
      data.labId
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
    if (
      ![
        'species',
        'source',
        'media',
        'specimen_type',
        'equipment_maintenance_type',
        'supply_item_property',
        'supply_stock_unit',
        'supply_vendor',
        'supply_manufacturer',
      ].includes(this._category)
    ) {
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
      labId: this._labId,
    };
  }

  get id(): string {
    return this._id;
  }
  get labId(): string | undefined {
    return this._labId;
  }
  get category(): LookupCategory {
    return this._category;
  }
  get value(): string {
    return this._value;
  }
  get sortOrder(): number {
    return this._sortOrder;
  }
  get isActive(): boolean {
    return this._isActive;
  }
  get createdAt(): Date {
    return new Date(this._createdAt);
  }
  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }
}
