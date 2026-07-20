/**
 * Supply Item
 *
 * A type of lab supply tracked by quantity (e.g., "200μL filter tips, Corning #4806").
 * Supports manufacturer/vendor info, stock configuration, and flexible lab-defined properties.
 */

import { supplyItemStatusValues, type SupplyItemStatus } from '@odysseus/shared-schemas';

import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';

interface ItemCreateData {
  labId: string;
  categoryId: string;
  name: string;
  manufacturer?: string;
  catalogNumber?: string;
  vendorName?: string;
  vendorCatalogNumber?: string;
  stockUnit?: string;
  baseItemName?: string;
  reorderThreshold?: number;
  reorderThresholdUnit?: string;
  reorderQuantity?: number;
  reorderUnit?: string;
  unitPrice?: number;
  properties?: string[];
  description?: string;
  notes?: string;
}

// null = clear field, undefined = preserve current value
interface ItemUpdateData {
  categoryId?: string | null;
  name?: string | null;
  manufacturer?: string | null;
  catalogNumber?: string | null;
  vendorName?: string | null;
  vendorCatalogNumber?: string | null;
  stockUnit?: string | null;
  baseItemName?: string | null;
  reorderThreshold?: number | null;
  reorderThresholdUnit?: string | null;
  reorderQuantity?: number | null;
  reorderUnit?: string | null;
  unitPrice?: number | null;
  properties?: string[] | null;
  currentLotNumber?: string | null;
  description?: string | null;
  notes?: string | null;
}

export class SupplyItem {
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
    private _baseItemName: string | undefined,
    private _reorderThreshold: number | undefined,
    private _reorderThresholdUnit: string | undefined,
    private _reorderQuantity: number | undefined,
    private _reorderUnit: string | undefined,
    private _unitPrice: number | undefined,
    private _properties: string[],
    private _currentLotNumber: string | undefined,
    private _description: string | undefined,
    private _notes: string | undefined,
    private _status: SupplyItemStatus,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {
    this.validate();
  }

  static create(data: ItemCreateData): SupplyItem {
    return new SupplyItem(
      generateId('sitm'),
      data.labId,
      data.categoryId,
      data.name,
      data.manufacturer,
      data.catalogNumber,
      data.vendorName,
      data.vendorCatalogNumber,
      data.stockUnit,
      data.baseItemName,
      data.reorderThreshold,
      data.reorderThresholdUnit,
      data.reorderQuantity,
      data.reorderUnit,
      data.unitPrice,
      SupplyItem.deduplicateProperties(data.properties ?? []),
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
    baseItemName?: string;
    reorderThreshold?: number;
    reorderThresholdUnit?: string;
    reorderQuantity?: number;
    reorderUnit?: string;
    unitPrice?: number;
    properties: string[];
    currentLotNumber?: string;
    description?: string;
    notes?: string;
    status: SupplyItemStatus;
    createdAt: string | Date;
    updatedAt: string | Date;
  }): SupplyItem {
    return new SupplyItem(
      data.id,
      data.labId,
      data.categoryId,
      data.name,
      data.manufacturer,
      data.catalogNumber,
      data.vendorName,
      data.vendorCatalogNumber,
      data.stockUnit,
      data.baseItemName,
      data.reorderThreshold,
      data.reorderThresholdUnit,
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
      throw new ValidationError('Item name is required');
    }
    if (!this._categoryId) {
      throw new ValidationError('Category is required');
    }
    if (!supplyItemStatusValues.includes(this._status)) {
      throw new ValidationError('That item status is not valid.');
    }
  }

  private static deduplicateProperties(properties: string[]): string[] {
    return [...new Set(properties)];
  }

  update(data: ItemUpdateData): void {
    if (data.categoryId !== undefined) this._categoryId = data.categoryId ?? this._categoryId;
    if (data.name !== undefined) this._name = data.name ?? this._name;
    if (data.manufacturer !== undefined) this._manufacturer = data.manufacturer ?? undefined;
    if (data.catalogNumber !== undefined) this._catalogNumber = data.catalogNumber ?? undefined;
    if (data.vendorName !== undefined) this._vendorName = data.vendorName ?? undefined;
    if (data.vendorCatalogNumber !== undefined)
      this._vendorCatalogNumber = data.vendorCatalogNumber ?? undefined;
    if (data.stockUnit !== undefined) this._stockUnit = data.stockUnit ?? undefined;
    if (data.baseItemName !== undefined) this._baseItemName = data.baseItemName ?? undefined;
    if (data.reorderThreshold !== undefined)
      this._reorderThreshold = data.reorderThreshold ?? undefined;
    if (data.reorderThresholdUnit !== undefined)
      this._reorderThresholdUnit = data.reorderThresholdUnit ?? undefined;
    if (data.reorderQuantity !== undefined)
      this._reorderQuantity = data.reorderQuantity ?? undefined;
    if (data.reorderUnit !== undefined) this._reorderUnit = data.reorderUnit ?? undefined;
    if (data.unitPrice !== undefined) this._unitPrice = data.unitPrice ?? undefined;
    if (data.properties !== undefined)
      this._properties = SupplyItem.deduplicateProperties(data.properties ?? []);
    if (data.currentLotNumber !== undefined)
      this._currentLotNumber = data.currentLotNumber ?? undefined;
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

  get id(): string {
    return this._id;
  }
  get labId(): string {
    return this._labId;
  }
  get categoryId(): string {
    return this._categoryId;
  }
  get name(): string {
    return this._name;
  }
  get manufacturer(): string | undefined {
    return this._manufacturer;
  }
  get catalogNumber(): string | undefined {
    return this._catalogNumber;
  }
  get vendorName(): string | undefined {
    return this._vendorName;
  }
  get vendorCatalogNumber(): string | undefined {
    return this._vendorCatalogNumber;
  }
  get stockUnit(): string | undefined {
    return this._stockUnit;
  }
  get baseItemName(): string | undefined {
    return this._baseItemName;
  }
  get reorderThreshold(): number | undefined {
    return this._reorderThreshold;
  }
  get reorderThresholdUnit(): string | undefined {
    return this._reorderThresholdUnit;
  }
  get reorderQuantity(): number | undefined {
    return this._reorderQuantity;
  }
  get reorderUnit(): string | undefined {
    return this._reorderUnit;
  }
  get unitPrice(): number | undefined {
    return this._unitPrice;
  }
  get properties(): string[] {
    return [...this._properties];
  }
  get currentLotNumber(): string | undefined {
    return this._currentLotNumber;
  }
  get description(): string | undefined {
    return this._description;
  }
  get notes(): string | undefined {
    return this._notes;
  }
  get status(): SupplyItemStatus {
    return this._status;
  }
  get createdAt(): Date {
    return new Date(this._createdAt);
  }
  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }
}
