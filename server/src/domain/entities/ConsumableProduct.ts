/**
 * Consumable Product
 *
 * A type of lab consumable tracked by quantity (e.g., "200μL filter tips, Corning #4806").
 * Supports manufacturer/vendor info, stock configuration, and flexible lab-defined properties.
 */

import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';

import type { ConsumableProductStatus } from '@odysseus/shared-schemas';

const VALID_STATUSES: ConsumableProductStatus[] = ['active', 'discontinued', 'archived'];

interface ProductCreateData {
  labId: string;
  categoryId: string;
  name: string;
  manufacturer?: string;
  catalogNumber?: string;
  vendorName?: string;
  vendorCatalogNumber?: string;
  stockUnit?: string;
  unitsPerStockUnit?: number;
  reorderThreshold?: number;
  reorderQuantity?: number;
  reorderUnit?: string;
  unitPrice?: number;
  properties?: string[];
  description?: string;
  notes?: string;
}

// null = clear field, undefined = preserve current value
interface ProductUpdateData {
  categoryId?: string | null;
  name?: string | null;
  manufacturer?: string | null;
  catalogNumber?: string | null;
  vendorName?: string | null;
  vendorCatalogNumber?: string | null;
  stockUnit?: string | null;
  unitsPerStockUnit?: number | null;
  reorderThreshold?: number | null;
  reorderQuantity?: number | null;
  reorderUnit?: string | null;
  unitPrice?: number | null;
  properties?: string[] | null;
  currentLotNumber?: string | null;
  description?: string | null;
  notes?: string | null;
}

export class ConsumableProduct {
  private constructor(
    private readonly _id: string,
    private readonly _labId: string,
    private _categoryId: string,
    private _name: string,
    private _manufacturer: string | undefined,
    private _catalogNumber: string | undefined,
    private _vendorName: string | undefined,
    private _vendorCatalogNumber: string | undefined,
    private _stockUnit: string | undefined,
    private _unitsPerStockUnit: number | undefined,
    private _reorderThreshold: number | undefined,
    private _reorderQuantity: number | undefined,
    private _reorderUnit: string | undefined,
    private _unitPrice: number | undefined,
    private _properties: string[],
    private _currentLotNumber: string | undefined,
    private _description: string | undefined,
    private _notes: string | undefined,
    private _status: ConsumableProductStatus,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {
    this.validate();
  }

  static create(data: ProductCreateData): ConsumableProduct {
    return new ConsumableProduct(
      generateId('cprod'),
      data.labId,
      data.categoryId,
      data.name,
      data.manufacturer,
      data.catalogNumber,
      data.vendorName,
      data.vendorCatalogNumber,
      data.stockUnit,
      data.unitsPerStockUnit,
      data.reorderThreshold,
      data.reorderQuantity,
      data.reorderUnit,
      data.unitPrice,
      ConsumableProduct.deduplicateProperties(data.properties ?? []),
      undefined,
      data.description,
      data.notes,
      'active',
      new Date(),
      new Date()
    );
  }

  static fromData(data: {
    id: string;
    labId: string;
    categoryId: string;
    name: string;
    manufacturer?: string;
    catalogNumber?: string;
    vendorName?: string;
    vendorCatalogNumber?: string;
    stockUnit?: string;
    unitsPerStockUnit?: number;
    reorderThreshold?: number;
    reorderQuantity?: number;
    reorderUnit?: string;
    unitPrice?: number;
    properties: string[];
    currentLotNumber?: string;
    description?: string;
    notes?: string;
    status: ConsumableProductStatus;
    createdAt: string | Date;
    updatedAt: string | Date;
  }): ConsumableProduct {
    return new ConsumableProduct(
      data.id,
      data.labId,
      data.categoryId,
      data.name,
      data.manufacturer,
      data.catalogNumber,
      data.vendorName,
      data.vendorCatalogNumber,
      data.stockUnit,
      data.unitsPerStockUnit,
      data.reorderThreshold,
      data.reorderQuantity,
      data.reorderUnit,
      data.unitPrice,
      data.properties,
      data.currentLotNumber,
      data.description,
      data.notes,
      data.status,
      typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt,
      typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : data.updatedAt
    );
  }

  private validate(): void {
    if (!this._name || this._name.trim().length === 0) {
      throw new ValidationError('Product name is required');
    }
    if (!this._categoryId) {
      throw new ValidationError('Category is required');
    }
    if (!VALID_STATUSES.includes(this._status)) {
      throw new ValidationError(`Invalid product status: ${this._status}`);
    }
  }

  private static deduplicateProperties(properties: string[]): string[] {
    return [...new Set(properties)];
  }

  update(data: ProductUpdateData): void {
    if (data.categoryId !== undefined) this._categoryId = data.categoryId ?? this._categoryId;
    if (data.name !== undefined) this._name = data.name ?? this._name;
    if (data.manufacturer !== undefined) this._manufacturer = data.manufacturer ?? undefined;
    if (data.catalogNumber !== undefined) this._catalogNumber = data.catalogNumber ?? undefined;
    if (data.vendorName !== undefined) this._vendorName = data.vendorName ?? undefined;
    if (data.vendorCatalogNumber !== undefined) this._vendorCatalogNumber = data.vendorCatalogNumber ?? undefined;
    if (data.stockUnit !== undefined) this._stockUnit = data.stockUnit ?? undefined;
    if (data.unitsPerStockUnit !== undefined) this._unitsPerStockUnit = data.unitsPerStockUnit ?? undefined;
    if (data.reorderThreshold !== undefined) this._reorderThreshold = data.reorderThreshold ?? undefined;
    if (data.reorderQuantity !== undefined) this._reorderQuantity = data.reorderQuantity ?? undefined;
    if (data.reorderUnit !== undefined) this._reorderUnit = data.reorderUnit ?? undefined;
    if (data.unitPrice !== undefined) this._unitPrice = data.unitPrice ?? undefined;
    if (data.properties !== undefined) this._properties = ConsumableProduct.deduplicateProperties(data.properties ?? []);
    if (data.currentLotNumber !== undefined) this._currentLotNumber = data.currentLotNumber ?? undefined;
    if (data.description !== undefined) this._description = data.description ?? undefined;
    if (data.notes !== undefined) this._notes = data.notes ?? undefined;

    this.validate();
    this._updatedAt = new Date();
  }

  archive(): void {
    this._status = 'archived';
    this._updatedAt = new Date();
  }

  updateCurrentLotNumber(lotNumber: string): void {
    this._currentLotNumber = lotNumber;
    this._updatedAt = new Date();
  }

  get id(): string { return this._id; }
  get labId(): string { return this._labId; }
  get categoryId(): string { return this._categoryId; }
  get name(): string { return this._name; }
  get manufacturer(): string | undefined { return this._manufacturer; }
  get catalogNumber(): string | undefined { return this._catalogNumber; }
  get vendorName(): string | undefined { return this._vendorName; }
  get vendorCatalogNumber(): string | undefined { return this._vendorCatalogNumber; }
  get stockUnit(): string | undefined { return this._stockUnit; }
  get unitsPerStockUnit(): number | undefined { return this._unitsPerStockUnit; }
  get reorderThreshold(): number | undefined { return this._reorderThreshold; }
  get reorderQuantity(): number | undefined { return this._reorderQuantity; }
  get reorderUnit(): string | undefined { return this._reorderUnit; }
  get unitPrice(): number | undefined { return this._unitPrice; }
  get properties(): string[] { return [...this._properties]; }
  get currentLotNumber(): string | undefined { return this._currentLotNumber; }
  get description(): string | undefined { return this._description; }
  get notes(): string | undefined { return this._notes; }
  get status(): ConsumableProductStatus { return this._status; }
  get createdAt(): Date { return new Date(this._createdAt); }
  get updatedAt(): Date { return new Date(this._updatedAt); }
}
