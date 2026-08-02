/**
 * Reagent Item
 *
 * A reagent tracked at the SKU level with chemistry and safety metadata
 * (e.g., "Anti-CD3 antibody, BioLegend #300302"). On-hand stock lives in lots.
 */

import { reagentItemStatusValues, type ReagentItemStatus } from '@odysseus/shared-schemas';

import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';
import { toDomainDate } from '@domain/utils/toDomainDate';

interface ItemCreateData {
  labId: string;
  categoryId: string;
  name: string;
  manufacturer?: string;
  catalogNumber?: string;
  vendorName?: string;
  vendorCatalogNumber?: string;
  stockUnit?: string;
  reagentType?: string;
  casNumber?: string;
  concentration?: number;
  concentrationUnit?: string;
  expiryWarningDays?: number;
  reorderThreshold?: number;
  reorderThresholdUnit?: string;
  reorderQuantity?: number;
  reorderUnit?: string;
  unitPrice?: number;
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
  reagentType?: string | null;
  casNumber?: string | null;
  concentration?: number | null;
  concentrationUnit?: string | null;
  expiryWarningDays?: number | null;
  reorderThreshold?: number | null;
  reorderThresholdUnit?: string | null;
  reorderQuantity?: number | null;
  reorderUnit?: string | null;
  unitPrice?: number | null;
  description?: string | null;
  notes?: string | null;
}

export class ReagentItem {
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
    private _reagentType: string | undefined,
    private _casNumber: string | undefined,
    private _concentration: number | undefined,
    private _concentrationUnit: string | undefined,
    private _expiryWarningDays: number | undefined,
    private _reorderThreshold: number | undefined,
    private _reorderThresholdUnit: string | undefined,
    private _reorderQuantity: number | undefined,
    private _reorderUnit: string | undefined,
    private _unitPrice: number | undefined,
    private _description: string | undefined,
    private _notes: string | undefined,
    private _status: ReagentItemStatus,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {
    this.validate();
  }

  static create(data: ItemCreateData): ReagentItem {
    return new ReagentItem(
      generateId('ritm'),
      data.labId,
      data.categoryId,
      data.name,
      data.manufacturer,
      data.catalogNumber,
      data.vendorName,
      data.vendorCatalogNumber,
      data.stockUnit,
      data.reagentType,
      data.casNumber,
      data.concentration,
      data.concentrationUnit,
      data.expiryWarningDays,
      data.reorderThreshold,
      data.reorderThresholdUnit,
      data.reorderQuantity,
      data.reorderUnit,
      data.unitPrice,
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
    reagentType?: string;
    casNumber?: string;
    concentration?: number;
    concentrationUnit?: string;
    expiryWarningDays?: number;
    reorderThreshold?: number;
    reorderThresholdUnit?: string;
    reorderQuantity?: number;
    reorderUnit?: string;
    unitPrice?: number;
    description?: string;
    notes?: string;
    status: ReagentItemStatus;
    createdAt: string | Date;
    updatedAt: string | Date;
  }): ReagentItem {
    return new ReagentItem(
      data.id,
      data.labId,
      data.categoryId,
      data.name,
      data.manufacturer,
      data.catalogNumber,
      data.vendorName,
      data.vendorCatalogNumber,
      data.stockUnit,
      data.reagentType,
      data.casNumber,
      data.concentration,
      data.concentrationUnit,
      data.expiryWarningDays,
      data.reorderThreshold,
      data.reorderThresholdUnit,
      data.reorderQuantity,
      data.reorderUnit,
      data.unitPrice,
      data.description,
      data.notes,
      data.status,
      toDomainDate(data.createdAt),
      toDomainDate(data.updatedAt)
    );
  }

  private validate(): void {
    if (!this._name || this._name.trim().length === 0) {
      throw new ValidationError('Item name is required');
    }
    if (!this._categoryId) {
      throw new ValidationError('Category is required');
    }
    if (!reagentItemStatusValues.includes(this._status)) {
      throw new ValidationError('That item status is not valid.');
    }
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
    if (data.reagentType !== undefined) this._reagentType = data.reagentType ?? undefined;
    if (data.casNumber !== undefined) this._casNumber = data.casNumber ?? undefined;
    if (data.concentration !== undefined) this._concentration = data.concentration ?? undefined;
    if (data.concentrationUnit !== undefined)
      this._concentrationUnit = data.concentrationUnit ?? undefined;
    if (data.expiryWarningDays !== undefined)
      this._expiryWarningDays = data.expiryWarningDays ?? undefined;
    if (data.reorderThreshold !== undefined)
      this._reorderThreshold = data.reorderThreshold ?? undefined;
    if (data.reorderThresholdUnit !== undefined)
      this._reorderThresholdUnit = data.reorderThresholdUnit ?? undefined;
    if (data.reorderQuantity !== undefined)
      this._reorderQuantity = data.reorderQuantity ?? undefined;
    if (data.reorderUnit !== undefined) this._reorderUnit = data.reorderUnit ?? undefined;
    if (data.unitPrice !== undefined) this._unitPrice = data.unitPrice ?? undefined;
    if (data.description !== undefined) this._description = data.description ?? undefined;
    if (data.notes !== undefined) this._notes = data.notes ?? undefined;

    this.validate();
    this._updatedAt = new Date();
  }

  archive(): void {
    this._status = 'archived';
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
  get reagentType(): string | undefined {
    return this._reagentType;
  }
  get casNumber(): string | undefined {
    return this._casNumber;
  }
  get concentration(): number | undefined {
    return this._concentration;
  }
  get concentrationUnit(): string | undefined {
    return this._concentrationUnit;
  }
  get expiryWarningDays(): number | undefined {
    return this._expiryWarningDays;
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
  get description(): string | undefined {
    return this._description;
  }
  get notes(): string | undefined {
    return this._notes;
  }
  get status(): ReagentItemStatus {
    return this._status;
  }
  get createdAt(): Date {
    return new Date(this._createdAt);
  }
  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }
}
